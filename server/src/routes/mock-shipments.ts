import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { PaymentService } from "../services/payment-service.js";
import { QuoteService } from "../services/quote-service.js";
import { DispatchService } from "../services/dispatch-service.js";
import { ShipmentService } from "../services/shipment-service.js";
import { TrackingService } from "../services/tracking-service.js";
import { ExceptionService } from "../services/exception-service.js";
import { TrackingEventType } from "../domain/index.js";
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
  dispatchService: DispatchService;
  trackingService: TrackingService;
  exceptionService: ExceptionService;
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

  app.post("/internal/mock/shipments/:id/dispatch", async (request) => {
    const params = parse(shipmentParamsSchema, request.params);
    verifyDemoOpsKey(request, options.demoOpsKey);
    const shipment = options.dispatchService.dispatchShipment(params.id);

    return { data: { id: shipment.id, status: shipment.status } };
  });

  registerTrackingRoute(
    app,
    options,
    "/internal/mock/shipments/:id/start-international-transit",
    TrackingEventType.INTERNATIONAL_TRANSIT
  );
  registerTrackingRoute(
    app,
    options,
    "/internal/mock/shipments/:id/start-customs-clearance",
    TrackingEventType.CUSTOMS_CLEARANCE
  );
  registerTrackingRoute(
    app,
    options,
    "/internal/mock/shipments/:id/start-uk-last-mile",
    TrackingEventType.UK_LAST_MILE
  );
  registerTrackingRoute(
    app,
    options,
    "/internal/mock/shipments/:id/mark-delivered",
    TrackingEventType.DELIVERED
  );

  app.post("/internal/mock/shipments/:id/raise-exception", async (request) => {
    const params = parse(shipmentParamsSchema, request.params);
    verifyDemoOpsKey(request, options.demoOpsKey);
    const exception = options.exceptionService.raiseException({
      entityType: "SHIPMENT",
      entityId: params.id,
      type: "UK_LAST_MILE_INFORMATION_PENDING",
      title: "末端派送信息待确认",
      description: "英国本地派送状态暂未更新，正在核实。",
      impact: "本次转运暂时无法继续更新后续进度。",
      requiredAction: "当前无需操作，正在处理。"
    });

    return { data: { id: exception.id, status: exception.status } };
  });

  app.post("/internal/mock/shipments/:id/resolve-exception", async (request) => {
    const params = parse(shipmentParamsSchema, request.params);
    verifyDemoOpsKey(request, options.demoOpsKey);
    const exception = options.exceptionService.resolveOpenExceptionForEntity(
      "SHIPMENT",
      params.id
    );

    return { data: { id: exception.id, status: exception.status } };
  });
}

function registerTrackingRoute(
  app: FastifyInstance,
  options: MockShipmentRouteOptions,
  url: string,
  stage:
    | TrackingEventType.INTERNATIONAL_TRANSIT
    | TrackingEventType.CUSTOMS_CLEARANCE
    | TrackingEventType.UK_LAST_MILE
    | TrackingEventType.DELIVERED
): void {
  app.post(url, async (request) => {
    const params = parse(shipmentParamsSchema, request.params);
    verifyDemoOpsKey(request, options.demoOpsKey);
    const shipment = options.trackingService.advanceShipmentStage(
      params.id,
      stage
    );

    return { data: { id: shipment.id, status: shipment.status } };
  });
}

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (result.success) {
    return result.data;
  }

  throw new AppError("INVALID_INPUT", 400, result.error.issues[0]?.message ?? "请求参数不正确。");
}
