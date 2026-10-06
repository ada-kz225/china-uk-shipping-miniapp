import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { PaymentService } from "../services/payment-service.js";
import { QuoteService } from "../services/quote-service.js";
import { ShipmentService } from "../services/shipment-service.js";
import { AppError } from "../utils/app-error.js";
import { verifyDemoOpsKey } from "./request-context.js";

const shipmentParamsSchema = z
  .object({
    id: z.string().trim().min(1, "转运单标识无效。")
  })
  .strict();

const weightSchema = z
  .object({
    finalWeightG: z.number().int(),
    chargeableWeightG: z.number().int().optional()
  })
  .strict();

const quoteSchema = z
  .object({
    shippingFeeMinor: z.number().int(),
    serviceFeeMinor: z.number().int(),
    currency: z.string().trim()
  })
  .strict();

const paymentOutcomeSchema = z
  .object({
    outcome: z.enum(["success", "failure"]),
    idempotencyKey: z.string().trim().min(1).max(120).optional()
  })
  .strict();

type MockShipmentRouteOptions = {
  shipmentService: ShipmentService;
  quoteService: QuoteService;
  paymentService: PaymentService;
  demoOpsKey: string;
};

export async function registerMockShipmentRoutes(
  app: FastifyInstance,
  options: MockShipmentRouteOptions
): Promise<void> {
  app.post("/internal/mock/shipments/:id/start-processing", async (request) => {
    const params = parse(shipmentParamsSchema, request.params);
    verifyDemoOpsKey(request, options.demoOpsKey);
    const shipment = options.shipmentService.startWarehouseProcessing(params.id);

    return { data: { id: shipment.id, status: shipment.status } };
  });

  app.post("/internal/mock/shipments/:id/record-weight", async (request) => {
    const params = parse(shipmentParamsSchema, request.params);
    const body = parse(weightSchema, request.body);
    verifyDemoOpsKey(request, options.demoOpsKey);
    const shipment = options.quoteService.recordFinalWeight(params.id, body);

    return { data: { id: shipment.id, status: shipment.status } };
  });

  app.post("/internal/mock/shipments/:id/generate-quote", async (request) => {
    const params = parse(shipmentParamsSchema, request.params);
    const body = parse(quoteSchema, request.body);
    verifyDemoOpsKey(request, options.demoOpsKey);
    const quote = options.quoteService.generateQuote(params.id, body);

    return { data: { id: quote.id, shipmentId: quote.shipmentId } };
  });

  app.post("/internal/mock/shipments/:id/payment", async (request) => {
    const params = parse(shipmentParamsSchema, request.params);
    const body = parse(paymentOutcomeSchema, request.body);
    verifyDemoOpsKey(request, options.demoOpsKey);
    const payment = options.paymentService.createMockPayment(
      params.id,
      body.outcome,
      body.idempotencyKey ?? "mock-payment-" + params.id + "-" + Date.now()
    );

    return { data: { id: payment.id, status: payment.status } };
  });
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (result.success) {
    return result.data;
  }

  throw new AppError("INVALID_INPUT", 400, result.error.issues[0]?.message ?? "请求参数不正确。");
}
