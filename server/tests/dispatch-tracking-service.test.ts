import { afterEach, describe, expect, it } from "vitest";

import type { SqliteDatabase } from "../src/db/database.js";
import {
  PackageStatus,
  ShipmentStatus,
  TrackingEventType
} from "../src/domain/index.js";
import { AddressRepository } from "../src/repositories/address-repository.js";
import { AuditLogRepository } from "../src/repositories/audit-log-repository.js";
import { ExceptionRepository } from "../src/repositories/exception-repository.js";
import { PackageRepository } from "../src/repositories/package-repository.js";
import { PaymentRepository } from "../src/repositories/payment-repository.js";
import { QuoteRepository } from "../src/repositories/quote-repository.js";
import { ShipmentRepository } from "../src/repositories/shipment-repository.js";
import { TrackingRepository } from "../src/repositories/tracking-repository.js";
import { DispatchService } from "../src/services/dispatch-service.js";
import { PaymentService } from "../src/services/payment-service.js";
import { QuoteService } from "../src/services/quote-service.js";
import { ShipmentService } from "../src/services/shipment-service.js";
import { TrackingService } from "../src/services/tracking-service.js";
import { AppError } from "../src/utils/app-error.js";
import {
  createTestDatabase,
  insertUserWarehouseAndAddress
} from "./helpers/database.js";

describe("Dispatch and Tracking services", () => {
  let database: SqliteDatabase | undefined;

  afterEach(() => {
    database?.close();
    database = undefined;
  });

  function createFixture() {
    database = createTestDatabase();
    const packageRepository = new PackageRepository(database);
    const shipmentRepository = new ShipmentRepository(database);
    const quoteRepository = new QuoteRepository(database);
    const paymentRepository = new PaymentRepository(database);
    const exceptionRepository = new ExceptionRepository(database);
    const auditLogRepository = new AuditLogRepository(database);
    const trackingRepository = new TrackingRepository(database);
    const addressRepository = new AddressRepository(database);
    const shipmentService = new ShipmentService(
      database,
      shipmentRepository,
      packageRepository,
      exceptionRepository,
      addressRepository,
      quoteRepository,
      paymentRepository,
      auditLogRepository,
      trackingRepository
    );
    const quoteService = new QuoteService(
      database,
      shipmentRepository,
      quoteRepository,
      exceptionRepository,
      auditLogRepository
    );
    const paymentService = new PaymentService(
      database,
      shipmentRepository,
      quoteRepository,
      paymentRepository,
      exceptionRepository,
      auditLogRepository
    );
    const dispatchService = new DispatchService(
      database,
      shipmentRepository,
      quoteRepository,
      paymentRepository,
      exceptionRepository,
      trackingRepository,
      auditLogRepository
    );
    const trackingService = new TrackingService(
      database,
      shipmentRepository,
      exceptionRepository,
      trackingRepository,
      auditLogRepository
    );
    const primary = insertUserWarehouseAndAddress(database, "dispatch-primary");
    const packageEntity = packageRepository.create({
      id: "dispatch-ready-package",
      userId: primary.userId,
      warehouseId: primary.warehouseId,
      domesticTrackingNumber: "DISPATCH-READY-001",
      description: "出库测试商品",
      status: PackageStatus.READY_FOR_SHIPMENT
    });
    const draft = shipmentService.createDraft(primary.userId, [packageEntity.id]);
    const submitted = shipmentService.submitShipment(primary.userId, draft.id, {
      recipientName: "测试收件人",
      phone: "07123456789",
      postcode: "SW1A 1AA",
      addressLine: "测试英国地址"
    });

    return {
      primary,
      shipmentId: submitted.id,
      shipmentService,
      quoteService,
      paymentService,
      dispatchService,
      trackingService,
      shipmentRepository,
      trackingRepository,
      auditLogRepository
    };
  }

  function moveToPaidAwaitingDispatch(fixture: ReturnType<typeof createFixture>) {
    fixture.shipmentService.startWarehouseProcessing(fixture.shipmentId);
    fixture.quoteService.recordFinalWeight(fixture.shipmentId, {
      finalWeightG: 2100,
      chargeableWeightG: 2500
    });
    fixture.quoteService.generateQuote(fixture.shipmentId, {
      shippingFeeMinor: 4500,
      serviceFeeMinor: 200,
      currency: "GBP"
    });
    const payment = fixture.paymentService.createPaymentAttempt(
      fixture.primary.userId,
      fixture.shipmentId,
      "dispatch-payment"
    );
    fixture.paymentService.markPaymentSuccess(payment.id);
  }

  it("dispatches only after a successful payment, records the departure fact and creates a timeline event", () => {
    const fixture = createFixture();

    expectAppError(
      () => fixture.dispatchService.dispatchShipment(fixture.shipmentId),
      "PAYMENT_REQUIRED"
    );

    moveToPaidAwaitingDispatch(fixture);
    const dispatched = fixture.dispatchService.dispatchShipment(
      fixture.shipmentId,
      "test-ops",
      "2026-10-06T10:00:00.000Z"
    );

    expect(dispatched.status).toBe(ShipmentStatus.DISPATCHED);
    expect(dispatched.dispatchedAt).toBe("2026-10-06T10:00:00.000Z");
    expect(
      fixture.trackingRepository.listByShipmentId(fixture.shipmentId)
    ).toMatchObject([
      {
        eventType: TrackingEventType.DISPATCHED,
        displayMessage: "已从中国仓库发出",
        occurredAt: "2026-10-06T10:00:00.000Z"
      }
    ]);
    expect(
      fixture.auditLogRepository
        .listByEntity("SHIPMENT", fixture.shipmentId)
        .map((item) => item.action)
    ).toContain("SHIPMENT_DISPATCHED");
    expectAppError(
      () => fixture.dispatchService.dispatchShipment(fixture.shipmentId),
      "DISPATCH_NOT_ALLOWED"
    );
  });

  it("advances tracking only through every required stage and writes the delivered fact", () => {
    const fixture = createFixture();
    moveToPaidAwaitingDispatch(fixture);
    fixture.dispatchService.dispatchShipment(
      fixture.shipmentId,
      "test-ops",
      "2026-10-06T10:00:00.000Z"
    );

    fixture.trackingService.advanceShipmentStage(
      fixture.shipmentId,
      TrackingEventType.INTERNATIONAL_TRANSIT,
      "test-ops",
      "2026-10-06T11:00:00.000Z"
    );
    fixture.trackingService.advanceShipmentStage(
      fixture.shipmentId,
      TrackingEventType.CUSTOMS_CLEARANCE,
      "test-ops",
      "2026-10-06T12:00:00.000Z"
    );
    fixture.trackingService.advanceShipmentStage(
      fixture.shipmentId,
      TrackingEventType.UK_LAST_MILE,
      "test-ops",
      "2026-10-06T13:00:00.000Z"
    );
    const delivered = fixture.trackingService.advanceShipmentStage(
      fixture.shipmentId,
      TrackingEventType.DELIVERED,
      "test-ops",
      "2026-10-06T14:00:00.000Z"
    );

    expect(delivered.status).toBe(ShipmentStatus.DELIVERED);
    expect(delivered.deliveredAt).toBe("2026-10-06T14:00:00.000Z");
    expect(
      fixture.trackingService
        .listTrackingEvents(fixture.shipmentId)
        .map((event) => event.eventType)
    ).toEqual([
      TrackingEventType.DISPATCHED,
      TrackingEventType.INTERNATIONAL_TRANSIT,
      TrackingEventType.CUSTOMS_CLEARANCE,
      TrackingEventType.UK_LAST_MILE,
      TrackingEventType.DELIVERED
    ]);
    expect(
      fixture.auditLogRepository
        .listByEntity("SHIPMENT", fixture.shipmentId)
        .map((item) => item.action)
    ).toEqual(
      expect.arrayContaining([
        "INTERNATIONAL_TRANSIT_STARTED",
        "CUSTOMS_CLEARANCE_STARTED",
        "UK_LAST_MILE_STARTED",
        "SHIPMENT_DELIVERED"
      ])
    );
  });

  it("rejects skipped, reversed and post-delivery tracking transitions", () => {
    const fixture = createFixture();
    moveToPaidAwaitingDispatch(fixture);
    fixture.dispatchService.dispatchShipment(fixture.shipmentId);

    expectAppError(
      () =>
        fixture.trackingService.advanceShipmentStage(
          fixture.shipmentId,
          TrackingEventType.DELIVERED
        ),
      "TRACKING_TRANSITION_NOT_ALLOWED"
    );
    fixture.trackingService.advanceShipmentStage(
      fixture.shipmentId,
      TrackingEventType.INTERNATIONAL_TRANSIT
    );
    expectAppError(
      () =>
        fixture.trackingService.advanceShipmentStage(
          fixture.shipmentId,
          TrackingEventType.UK_LAST_MILE
        ),
      "TRACKING_TRANSITION_NOT_ALLOWED"
    );
    fixture.trackingService.advanceShipmentStage(
      fixture.shipmentId,
      TrackingEventType.CUSTOMS_CLEARANCE
    );
    fixture.trackingService.advanceShipmentStage(
      fixture.shipmentId,
      TrackingEventType.UK_LAST_MILE
    );
    fixture.trackingService.advanceShipmentStage(
      fixture.shipmentId,
      TrackingEventType.DELIVERED
    );

    expectAppError(
      () =>
        fixture.trackingService.advanceShipmentStage(
          fixture.shipmentId,
          TrackingEventType.INTERNATIONAL_TRANSIT
        ),
      "SHIPMENT_ALREADY_DELIVERED"
    );
  });
});

function expectAppError(action: () => unknown, expectedCode: string): void {
  try {
    action();
    throw new Error("Expected an AppError.");
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(expectedCode);
  }
}
