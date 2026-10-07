import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { presentPackage } from "../presenters/package-presenter.js";
import { PackageService } from "../services/package-service.js";
import { ExceptionService } from "../services/exception-service.js";
import { AppError } from "../utils/app-error.js";
import { verifyDemoOpsKey } from "./request-context.js";

const packageParamsSchema = z
  .object({
    id: z.string().trim().min(1, "包裹标识无效。")
  })
  .strict();

type MockPackageRouteOptions = {
  packageService: PackageService;
  exceptionService: ExceptionService;
  demoOpsKey: string;
};

export async function registerMockPackageRoutes(
  app: FastifyInstance,
  options: MockPackageRouteOptions
): Promise<void> {
  app.post("/internal/mock/packages/:id/inbound", async (request) => {
    const params = parsePackageParams(request.params);
    verifyDemoOpsKey(request, options.demoOpsKey);
    const entity = options.packageService.markPackageInbound(params.id);

    return { data: presentPackage(entity) };
  });

  app.post("/internal/mock/packages/:id/receive", async (request) => {
    const params = parsePackageParams(request.params);
    verifyDemoOpsKey(request, options.demoOpsKey);
    const entity = options.packageService.receivePackage(params.id);

    return { data: presentPackage(entity) };
  });

  app.post("/internal/mock/packages/:id/match", async (request) => {
    const params = parsePackageParams(request.params);
    verifyDemoOpsKey(request, options.demoOpsKey);
    const entity = options.packageService.matchPackage(params.id);

    return { data: presentPackage(entity) };
  });

  app.post("/internal/mock/packages/:id/ready", async (request) => {
    const params = parsePackageParams(request.params);
    verifyDemoOpsKey(request, options.demoOpsKey);
    const entity = options.packageService.markPackageReady(params.id);

    return { data: presentPackage(entity) };
  });

  app.post("/internal/mock/packages/:id/raise-exception", async (request) => {
    const params = parsePackageParams(request.params);
    verifyDemoOpsKey(request, options.demoOpsKey);
    const exception = options.exceptionService.raiseException({
      entityType: "PACKAGE",
      entityId: params.id,
      type: "PACKAGE_MATCHING_UNCONFIRMED",
      title: "包裹信息待确认",
      description: "仓库暂时无法确认该包裹归属。",
      impact: "当前不能加入转运单。",
      requiredAction: "请核对国内快递单号或补充必要信息。"
    });

    return { data: { id: exception.id, status: exception.status } };
  });

  app.post("/internal/mock/packages/:id/resolve-exception", async (request) => {
    const params = parsePackageParams(request.params);
    verifyDemoOpsKey(request, options.demoOpsKey);
    const exception = options.exceptionService.resolveOpenExceptionForEntity(
      "PACKAGE",
      params.id
    );

    return { data: { id: exception.id, status: exception.status } };
  });
}

function parsePackageParams(value: unknown): { id: string } {
  const result = packageParamsSchema.safeParse(value);

  if (result.success) {
    return result.data;
  }

  throw new AppError("INVALID_INPUT", 400, "包裹标识无效。");
}
