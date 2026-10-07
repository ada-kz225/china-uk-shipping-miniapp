import { afterEach, describe, expect, it } from "vitest";

import type { SqliteDatabase } from "../src/db/database.js";
import { PackageStatus, ShipmentStatus } from "../src/domain/index.js";
import { AddressRepository } from "../src/repositories/address-repository.js";
import { AuditLogRepository } from "../src/repositories/audit-log-repository.js";
import { ExceptionRepository } from "../src/repositories/exception-repository.js";
import { PackageRepository } from "../src/repositories/package-repository.js";
import { PaymentRepository } from "../src/repositories/payment-repository.js";
import { QuoteRepository } from "../src/repositories/quote-repository.js";
import { ShipmentRepository } from "../src/repositories/shipment-repository.js";
import { PaymentService } from "../src/services/payment-service.js";
import { QuoteService } from "../src/services/quote-service.js";
import { ShipmentService } from "../src/services/shipment-service.js";
import { AppError } from "../src/utils/app-error.js";
import {
  createTestDatabase,
  insertUserWarehouseAndAddress
} from "./helpers/database.js";

describe("Quote and Payment services", () => {
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
    const addressRepository = new AddressRepository(database);
    const shipmentService = new ShipmentService(
      database,
      shipmentRepository,
      packageRepository,
      exceptionRepository,
      addressRepository,
      quoteRepository,
      paymentRepository,
      auditLogRepository
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
    const primary = insertUserWarehouseAndAddress(database, "quote-primary");
    const secondary = insertUserWarehouseAndAddress(database, "quote-secondary");
    const packageEntity = packageRepository.create({
      id: "quote-ready-package",
      userId: primary.userId,
      warehouseId: primary.warehouseId,
      domesticTrackingNumber: "QUOTE-READY-001",
      description: "报价测试商品",
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
      secondary,
      shipmentService,
      quoteService,
      paymentService,
      quoteRepository,
      paymentRepository,
      shipmentRepository,
      auditLogRepository,
      shipmentId: submitted.id
    };
  }

  function moveToAwaitingPayment(fixture: ReturnType<typeof createFixture>) {
    fixture.shipmentService.startWarehouseProcessing(fixture.shipmentId);
    fixture.quoteService.recordFinalWeight(fixture.shipmentId, {
      finalWeightG: 2100,
      chargeableWeightG: 2500
    });
    return fixture.quoteService.generateQuote(fixture.shipmentId, {
      shippingFeeMinor: 4500,
      serviceFeeMinor: 200,
      currency: "GBP"
    });
  }

  it("requires warehouse processing and a valid final weight before generating an immutable quote", () => {
    const fixture = createFixture();

    expectAppError(
      () =>
        fixture.quoteService.recordFinalWeight(fixture.shipmentId, {
          finalWeightG: 0
        }),
      "INVALID_WEIGHT"
    );
    expectAppError(
      () =>
        fixture.quoteService.generateQuote(fixture.shipmentId, {
          shippingFeeMinor: 4500,
          serviceFeeMinor: 200,
          currency: "GBP"
        }),
      "INVALID_SHIPMENT_STATE"
    );

    fixture.shipmentService.startWarehouseProcessing(fixture.shipmentId);
    expectAppError(
      () =>
        fixture.quoteService.generateQuote(fixture.shipmentId, {
          shippingFeeMinor: 4500,
          serviceFeeMinor: 200,
          currency: "GBP"
        }),
      "QUOTE_NOT_READY"
    );
    fixture.quoteService.recordFinalWeight(fixture.shipmentId, {
      finalWeightG: 2100,
      chargeableWeightG: 2500
    });
    const quote = fixture.quoteService.generateQuote(fixture.shipmentId, {
      shippingFeeMinor: 4500,
      serviceFeeMinor: 200,
      currency: "GBP"
    });

    expect(quote.totalAmountMinor).toBe(4700);
    expect(
      fixture.shipmentRepository.findById(fixture.shipmentId)?.status
    ).toBe(ShipmentStatus.AWAITING_PAYMENT);
    expect(() =>
      (database as SqliteDatabase)
        .prepare("UPDATE quotes SET total_amount_minor = 1 WHERE id = ?")
        .run(quote.id)
    ).toThrow();
    expectAppError(
      () =>
        fixture.quoteService.generateQuote(fixture.shipmentId, {
          shippingFeeMinor: 1,
          serviceFeeMinor: 1,
          currency: "GBP"
        }),
      "QUOTE_ALREADY_EXISTS"
    );
    expect(
      fixture.auditLogRepository
        .listByEntity("SHIPMENT", fixture.shipmentId)
        .map((item) => item.action)
    ).toEqual(
      expect.arrayContaining([
        "WAREHOUSE_PROCESSING_STARTED",
        "FINAL_WEIGHT_RECORDED",
        "QUOTE_GENERATED"
      ])
    );
  });

  it("creates a payment attempt and moves only to paid-awaiting-dispatch on success", () => {
    const fixture = createFixture();
    const quote = moveToAwaitingPayment(fixture);
    const payment = fixture.paymentService.createPaymentAttempt(
      fixture.primary.userId,
      fixture.shipmentId,
      "payment-success"
    );

    expect(payment.amountMinor).toBe(quote.totalAmountMinor);
    expect(
      fixture.shipmentRepository.findById(fixture.shipmentId)?.status
    ).toBe(ShipmentStatus.PAYMENT_PROCESSING);
    const paid = fixture.paymentService.markPaymentSuccess(payment.id);
    const shipment = fixture.shipmentRepository.findById(fixture.shipmentId);

    expect(paid.status).toBe("SUCCEEDED");
    expect(shipment?.status).toBe(ShipmentStatus.PAID_AWAITING_DISPATCH);
    expect(shipment?.dispatchedAt).toBeNull();
    expectAppError(
      () =>
        fixture.paymentService.createPaymentAttempt(
          fixture.primary.userId,
          fixture.shipmentId,
          "payment-duplicate"
        ),
      "PAYMENT_ALREADY_COMPLETED"
    );
    expect(
      fixture.auditLogRepository
        .listByEntity("SHIPMENT", fixture.shipmentId)
        .map((item) => item.action)
    ).toEqual(
      expect.arrayContaining(["PAYMENT_ATTEMPT_CREATED", "PAYMENT_SUCCEEDED"])
    );
  });

  it("returns to awaiting payment after a failed attempt and permits a later retry", () => {
    const fixture = createFixture();
    moveToAwaitingPayment(fixture);
    const first = fixture.paymentService.createPaymentAttempt(
      fixture.primary.userId,
      fixture.shipmentId,
      "payment-failure"
    );
    const failed = fixture.paymentService.markPaymentFailure(first.id);

    expect(failed.status).toBe("FAILED");
    expect(
      fixture.shipmentRepository.findById(fixture.shipmentId)?.status
    ).toBe(ShipmentStatus.AWAITING_PAYMENT);
    const retry = fixture.paymentService.createPaymentAttempt(
      fixture.primary.userId,
      fixture.shipmentId,
      "payment-retry"
    );
    expect(retry.status).toBe("PROCESSING");
    expect(
      fixture.auditLogRepository
        .listByEntity("SHIPMENT", fixture.shipmentId)
        .map((item) => item.action)
    ).toContain("PAYMENT_FAILED");
  });

  it("rejects payments before a quote and from another user", () => {
    const fixture = createFixture();

    expectAppError(
      () =>
        fixture.paymentService.createPaymentAttempt(
          fixture.primary.userId,
          fixture.shipmentId,
          "payment-too-early"
        ),
      "INVALID_SHIPMENT_STATE"
    );

    moveToAwaitingPayment(fixture);
    expectAppError(
      () =>
        fixture.paymentService.createPaymentAttempt(
          fixture.secondary.userId,
          fixture.shipmentId,
          "payment-forbidden"
        ),
      "FORBIDDEN"
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
