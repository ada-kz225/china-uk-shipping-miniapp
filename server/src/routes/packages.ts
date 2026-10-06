import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";

import { presentPackage } from "../presenters/package-presenter.js";
import {
  type PackageListFilter,
  PackageService
} from "../services/package-service.js";
import { AppError, type FieldError } from "../utils/app-error.js";
import { getCurrentDemoUserId } from "./request-context.js";

const filters = [
  "all",
  "inbound",
  "pending_match",
  "ready",
  "in_shipment",
  "needs_action"
] as const;

const packageListQuerySchema = z
  .object({
    filter: z.enum(filters).optional().default("all")
  })
  .strict();

const packageParamsSchema = z
  .object({
    id: z.string().trim().min(1, "包裹标识无效。")
  })
  .strict();

const declarePackageSchema = z
  .object({
    domesticTrackingNumber: z
      .string()
      .trim()
      .min(1, "请填写国内运单号。")
      .max(80, "国内运单号不能超过 80 个字符。"),
    description: z
      .string()
      .trim()
      .min(1, "请填写商品描述。")
      .max(200, "商品描述不能超过 200 个字符。")
  })
  .strict();

type PackageRouteOptions = {
  packageService: PackageService;
};

export async function registerPackageRoutes(
  app: FastifyInstance,
  options: PackageRouteOptions
): Promise<void> {
  app.get("/packages", async (request) => {
    const query = parseRequest(packageListQuerySchema, request.query);
    const userId = getCurrentDemoUserId(request);
    const packages = options.packageService.listPackages(
      userId,
      query.filter as PackageListFilter
    );

    return {
      data: packages.map((item) =>
        presentPackage(item.package, item.exception)
      )
    };
  });

  app.get("/packages/:id", async (request) => {
    const params = parseRequest(packageParamsSchema, request.params);
    const userId = getCurrentDemoUserId(request);
    const result = options.packageService.getPackage(userId, params.id);

    return {
      data: presentPackage(result.package, result.exception)
    };
  });

  app.post("/packages", async (request) => {
    const body = parseRequest(declarePackageSchema, request.body);
    const userId = getCurrentDemoUserId(request);
    const entity = options.packageService.declarePackage(userId, body);

    return {
      data: presentPackage(entity)
    };
  });
}

function parseRequest<T>(
  schema: z.ZodType<T>,
  value: unknown
): T {
  const result = schema.safeParse(value);

  if (result.success) {
    return result.data;
  }

  const fieldErrors: FieldError[] = result.error.issues.map((issue) => ({
    field: issue.path.join(".") || "request",
    message:
      issue.code === "unrecognized_keys"
        ? "请求包含不支持的字段。"
        : issue.message || "字段格式不正确。"
  }));

  throw new AppError(
    "INVALID_INPUT",
    400,
    fieldErrors[0]?.message ?? "请求参数不正确。",
    fieldErrors
  );
}
