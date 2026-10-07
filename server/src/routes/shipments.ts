import type { FastifyInstance } from "fastify";
import { z } from "zod";

import {
  presentShipmentDetail,
  presentShipmentSummary
} from "../presenters/shipment-presenter.js";
import { ShipmentService, type ShipmentScope } from "../services/shipment-service.js";
import { PaymentService } from "../services/payment-service.js";
import { AppError, type FieldError } from "../utils/app-error.js";
import { getCurrentDemoUserId } from "./request-context.js";

const shipmentParamsSchema = z
  .object({
    id: z.string().trim().min(1, "转运单标识无效。")
  })
  .strict();

const shipmentPackageParamsSchema = shipmentParamsSchema
  .extend({
    packageId: z.string().trim().min(1, "包裹标识无效。")
  })
  .strict();

const packageIdsSchema = z
  .object({
    packageIds: z
      .array(z.string().trim().min(1, "包裹标识无效。"))
      .min(1, "请至少选择 1 件可合箱包裹。")
      .max(20, "一次最多选择 20 件包裹。")
  })
  .strict();

const submitShipmentSchema = z
  .object({
    address: z
      .object({
        recipientName: z.string().trim().min(1, "请填写收件人。").max(80),
        phone: z.string().trim().min(1, "请填写联系电话。").max(40),
        postcode: z.string().trim().min(1, "请填写邮编。").max(20),
        addressLine: z.string().trim().min(1, "请填写详细地址。").max(240)
      })
      .strict()
  })
  .strict();

const shipmentListQuerySchema = z
  .object({
    scope: z.enum(["active", "history"]).optional().default("active")
  })
  .strict();

type ShipmentRouteOptions = {
  shipmentService: ShipmentService;
  paymentService: PaymentService;
};

export async function registerShipmentRoutes(
  app: FastifyInstance,
  options: ShipmentRouteOptions
): Promise<void> {
  app.get("/shipments", async (request) => {
    const userId = getCurrentDemoUserId(request);
    const query = parseRequest(shipmentListQuerySchema, request.query);
    const shipments = options.shipmentService.listShipments(
      userId,
      query.scope as ShipmentScope
    );

    return { data: shipments.map(presentShipmentSummary) };
  });

  app.get("/shipments/:id", async (request) => {
    const userId = getCurrentDemoUserId(request);
    const params = parseRequest(shipmentParamsSchema, request.params);
    const shipment = options.shipmentService.getShipment(userId, params.id);

    return { data: presentShipmentDetail(shipment) };
  });

  app.post("/shipments", async (request) => {
    const userId = getCurrentDemoUserId(request);
    const body = parseRequest(packageIdsSchema, request.body);
    const shipment = options.shipmentService.createDraft(userId, body.packageIds);

    return { data: presentShipmentDetail(shipment) };
  });

  app.post("/shipments/:id/packages", async (request) => {
    const userId = getCurrentDemoUserId(request);
    const params = parseRequest(shipmentParamsSchema, request.params);
    const body = parseRequest(packageIdsSchema, request.body);
    const shipment = options.shipmentService.addPackages(
      userId,
      params.id,
      body.packageIds
    );

    return { data: presentShipmentDetail(shipment) };
  });

  app.delete("/shipments/:id/packages/:packageId", async (request) => {
    const userId = getCurrentDemoUserId(request);
    const params = parseRequest(shipmentPackageParamsSchema, request.params);
    const shipment = options.shipmentService.removePackage(
      userId,
      params.id,
      params.packageId
    );

    return { data: presentShipmentDetail(shipment) };
  });

  app.post("/shipments/:id/submit", async (request) => {
    const userId = getCurrentDemoUserId(request);
    const params = parseRequest(shipmentParamsSchema, request.params);
    const body = parseRequest(submitShipmentSchema, request.body);
    const shipment = options.shipmentService.submitShipment(
      userId,
      params.id,
      body.address
    );

    return { data: presentShipmentDetail(shipment) };
  });

  app.post("/shipments/:id/cancel", async (request) => {
    const userId = getCurrentDemoUserId(request);
    const params = parseRequest(shipmentParamsSchema, request.params);
    const result = options.shipmentService.cancelShipment(userId, params.id);

    return { data: result };
  });

  app.post("/shipments/:id/payments", async (request) => {
    const userId = getCurrentDemoUserId(request);
    const params = parseRequest(shipmentParamsSchema, request.params);
    const idempotencyKey = getIdempotencyKey(request);
    const payment = options.paymentService.createPaymentAttempt(
      userId,
      params.id,
      idempotencyKey
    );
    options.paymentService.markPaymentSuccess(payment.id);
    const shipment = options.shipmentService.getShipment(userId, params.id);

    return { data: presentShipmentDetail(shipment) };
  });
}

function getIdempotencyKey(request: { headers: Record<string, string | string[] | undefined> }): string {
  const value = request.headers["idempotency-key"];
  const idempotencyKey = (Array.isArray(value) ? value[0] : value)?.trim();

  if (!idempotencyKey) {
    throw new AppError("INVALID_INPUT", 400, "缺少付款请求标识，请重试。", [
      { field: "Idempotency-Key", message: "缺少付款请求标识，请重试。" }
    ]);
  }

  return idempotencyKey;
}

function parseRequest<T>(schema: z.ZodType<T>, value: unknown): T {
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
