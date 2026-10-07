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
import { ExceptionService } from "../src/services/exception-service.js";
import { PaymentService } from "../src/services/payment-service.js";
import { QuoteService } from "../src/services/quote-service.js";
import { ShipmentService } from "../src/services/shipment-service.js";
import { TrackingService } from "../src/services/tracking-service.js";
import { AppError } from "../src/utils/app-error.js";
import {
  createTestDatabase,
  insertUserWarehouseAndAddress
} from "./helpers/database.js";

describe("ExceptionService", () => {
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
    const shipmentService = new ShipmentService(
      database,
      shipmentRepository,
      packageRepository,
      exceptionRepository,
      new AddressRepository(database),
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
    const exceptionService = new ExceptionService(
      database,
      exceptionRepository,
      packageRepository,
      shipmentRepository,
      auditLogRepository
    );
    const primary = insertUserWarehouseAndAddress(database, "exception-primary");
    const secondary = insertUserWarehouseAndAddress(database, "exception-secondary");

    return {
      primary,
      secondary,
      packageRepository,
      shipmentRepository,
      shipmentService,
      quoteService,
      paymentService,
      dispatchService,
      trackingService,
      exceptionService,
      auditLogRepository
    };
  }

  function createReadyPackage(fixture: ReturnType<typeof createFixture>, suffix: string) {
    return fixture.packageRepository.create({
      id: "exception-package-" + suffix,
      userId: fixture.primary.userId,
      warehouseId: fixture.primary.warehouseId,
      domesticTrackingNumber: "EXCEPTION-TRACK-" + suffix,
      description: "异常测试商品",
      status: PackageStatus.READY_FOR_SHIPMENT
    });
  }

  function createInternationalShipment(fixture: ReturnType<typeof createFixture>) {
    const packageEntity = createReadyPackage(fixture, "shipment");
    const draft = fixture.shipmentService.createDraft(fixture.primary.userId, [
      packageEntity.id
    ]);
    const submitted = fixture.shipmentService.submitShipment(
      fixture.primary.userId,
      draft.id,
      {
        recipientName: "测试收件人",
        phone: "07123456789",
        postcode: "SW1A 1AA",
        addressLine: "测试英国地址"
      }
    );
    fixture.shipmentService.startWarehouseProcessing(submitted.id);
    fixture.quoteService.recordFinalWeight(submitted.id, { finalWeightG: 2100 });
    fixture.quoteService.generateQuote(submitted.id, {
      shippingFeeMinor: 4500,
      serviceFeeMinor: 200,
      currency: "GBP"
    });
    const payment = fixture.paymentService.createPaymentAttempt(
      fixture.primary.userId,
      submitted.id,
      "exception-payment"
    );
    fixture.paymentService.markPaymentSuccess(payment.id);
    fixture.dispatchService.dispatchShipment(
      submitted.id,
      "test-ops",
      "2026-10-06T10:00:00.000Z"
    );
    fixture.trackingService.advanceShipmentStage(
      submitted.id,
      TrackingEventType.INTERNATIONAL_TRANSIT,
      "test-ops",
      "2026-10-06T11:00:00.000Z"
    );

    return submitted.id;
  }

  it("blocks a package, prevents consolidation, and restores its recorded state on resolution", () => {
    const fixture = createFixture();
    const packageEntity = createReadyPackage(fixture, "package");
    const exception = fixture.exceptionService.raiseException({
      entityType: "PACKAGE",
      entityId: packageEntity.id,
      type: "PACKAGE_MATCHING_UNCONFIRMED",
      title: "包裹信息待确认",
      description: "仓库暂时无法确认该包裹归属。",
      impact: "当前不能加入转运单。",
      requiredAction: "请核对国内快递单号或补充必要信息。"
    });

    expect(exception.resumeState).toBe(PackageStatus.READY_FOR_SHIPMENT);
    expect(fixture.packageRepository.findById(packageEntity.id)?.status).toBe(
      PackageStatus.EXCEPTION
    );
    expectAppError(
      () => fixture.shipmentService.createDraft(fixture.primary.userId, [packageEntity.id]),
      "PACKAGE_NOT_ELIGIBLE"
    );
    expectAppError(
      () => fixture.exceptionService.getException(fixture.secondary.userId, exception.id),
      "FORBIDDEN"
    );
    expect(
      fixture.exceptionService.listExceptionsForEntity(
        fixture.primary.userId,
        "PACKAGE",
        packageEntity.id
      )
    ).toHaveLength(1);

    const resolved = fixture.exceptionService.resolveException(exception.id);
    expect(resolved.status).toBe("RESOLVED");
    expect(resolved.resolvedAt).not.toBeNull();
    expect(fixture.packageRepository.findById(packageEntity.id)?.status).toBe(
      PackageStatus.READY_FOR_SHIPMENT
    );
    expect(
      fixture.shipmentService.createDraft(fixture.primary.userId, [packageEntity.id])
        .status
    ).toBe(ShipmentStatus.DRAFT);
    expect(
      fixture.auditLogRepository
        .listByEntity("PACKAGE", packageEntity.id)
        .map((item) => item.action)
    ).toEqual(
      expect.arrayContaining([
        "PACKAGE_EXCEPTION_RAISED",
        "PACKAGE_EXCEPTION_RESOLVED"
      ])
    );
    expectAppError(
      () => fixture.exceptionService.resolveException(exception.id),
      "EXCEPTION_ALREADY_RESOLVED"
    );
  });

  it("blocks shipment tracking, restores the saved international state, and preserves timeline events", () => {
    const fixture = createFixture();
    const shipmentId = createInternationalShipment(fixture);
    const exception = fixture.exceptionService.raiseException({
      entityType: "SHIPMENT",
      entityId: shipmentId,
      type: "UK_LAST_MILE_INFORMATION_PENDING",
      title: "末端派送信息待确认",
      description: "英国本地派送状态暂未更新，正在核实。",
      impact: "本次转运暂时无法继续更新后续进度。",
      requiredAction: "当前无需操作，正在处理。"
    });

    expect(exception.resumeState).toBe(ShipmentStatus.INTERNATIONAL_TRANSIT);
    expect(fixture.shipmentRepository.findById(shipmentId)?.status).toBe(
      ShipmentStatus.EXCEPTION
    );
    expectAppError(
      () =>
        fixture.trackingService.advanceShipmentStage(
          shipmentId,
          TrackingEventType.CUSTOMS_CLEARANCE
        ),
      "WORKFLOW_BLOCKED_BY_EXCEPTION"
    );

    fixture.exceptionService.resolveException(exception.id);
    expect(fixture.shipmentRepository.findById(shipmentId)?.status).toBe(
      ShipmentStatus.INTERNATIONAL_TRANSIT
    );
    fixture.trackingService.advanceShipmentStage(
      shipmentId,
      TrackingEventType.CUSTOMS_CLEARANCE,
      "test-ops",
      "2026-10-06T12:00:00.000Z"
    );
    expect(
      fixture.trackingService
        .listTrackingEvents(shipmentId)
        .map((event) => event.eventType)
    ).toEqual([
      TrackingEventType.DISPATCHED,
      TrackingEventType.INTERNATIONAL_TRANSIT,
      TrackingEventType.CUSTOMS_CLEARANCE
    ]);
    expect(
      fixture.auditLogRepository
        .listByEntity("SHIPMENT", shipmentId)
        .map((item) => item.action)
    ).toEqual(
      expect.arrayContaining([
        "SHIPMENT_EXCEPTION_RAISED",
        "SHIPMENT_EXCEPTION_RESOLVED"
      ])
    );
  });

  it("rejects a duplicate active exception for the same entity", () => {
    const fixture = createFixture();
    const packageEntity = createReadyPackage(fixture, "duplicate");
    const input = {
      entityType: "PACKAGE" as const,
      entityId: packageEntity.id,
      type: "PACKAGE_MATCHING_UNCONFIRMED",
      title: "包裹信息待确认",
      description: "仓库暂时无法确认该包裹归属。",
      impact: "当前不能加入转运单。",
      requiredAction: "请核对国内快递单号或补充必要信息。"
    };

    fixture.exceptionService.raiseException(input);
    expectAppError(
      () => fixture.exceptionService.raiseException(input),
      "EXCEPTION_ALREADY_OPEN"
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
