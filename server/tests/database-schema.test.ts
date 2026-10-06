import { afterEach, describe, expect, it } from "vitest";

import { runMigrations } from "../src/db/migrate.js";
import {
  ExceptionStatus,
  PackageStatus,
  PaymentStatus,
  ShipmentStatus,
  TrackingEventType
} from "../src/domain/index.js";
import { ExceptionRepository } from "../src/repositories/exception-repository.js";
import { PackageRepository } from "../src/repositories/package-repository.js";
import { PaymentRepository } from "../src/repositories/payment-repository.js";
import { QuoteRepository } from "../src/repositories/quote-repository.js";
import { ShipmentRepository } from "../src/repositories/shipment-repository.js";
import { TrackingRepository } from "../src/repositories/tracking-repository.js";
import type { SqliteDatabase } from "../src/db/database.js";
import {
  createTestDatabase,
  insertUserWarehouseAndAddress
} from "./helpers/database.js";

describe("Phase 1 SQLite schema", () => {
  let database: SqliteDatabase | undefined;

  afterEach(() => {
    database?.close();
    database = undefined;
  });

  it("initializes all core tables and applies migrations repeatedly", () => {
    database = createTestDatabase();
    runMigrations(database);

    const tableNames = database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => (row as { name: string }).name);

    expect(tableNames).toEqual(
      expect.arrayContaining([
        "users",
        "warehouses",
        "packages",
        "shipments",
        "shipment_packages",
        "shipment_draft_packages",
        "addresses",
        "quotes",
        "payments",
        "tracking_events",
        "exceptions",
        "audit_logs",
        "schema_migrations"
      ])
    );

    const migrationCount = database
      .prepare("SELECT COUNT(*) AS count FROM schema_migrations")
      .get() as { count: number };
    expect(migrationCount.count).toBe(2);
  });

  it("enforces package foreign keys and globally unique domestic tracking numbers", () => {
    database = createTestDatabase();
    const packageRepository = new PackageRepository(database);
    const fixture = insertUserWarehouseAndAddress(database);

    expect(() =>
      packageRepository.create({
        userId: "missing-user",
        warehouseId: fixture.warehouseId,
        domesticTrackingNumber: "TEST-TRACK-000",
        description: "测试商品",
        status: PackageStatus.DECLARED
      })
    ).toThrow();

    packageRepository.create({
      id: "package-one",
      userId: fixture.userId,
      warehouseId: fixture.warehouseId,
      domesticTrackingNumber: "TEST-TRACK-001",
      description: "测试商品",
      status: PackageStatus.DECLARED
    });

    expect(() =>
      packageRepository.create({
        id: "package-two",
        userId: fixture.userId,
        warehouseId: fixture.warehouseId,
        domesticTrackingNumber: "TEST-TRACK-001",
        description: "重复测试商品",
        status: PackageStatus.DECLARED
      })
    ).toThrow();
  });

  it("enforces unique shipment references and active package ownership", () => {
    database = createTestDatabase();
    const fixture = insertUserWarehouseAndAddress(database);
    const packageRepository = new PackageRepository(database);
    const shipmentRepository = new ShipmentRepository(database);

    packageRepository.create({
      id: "package-ready",
      userId: fixture.userId,
      warehouseId: fixture.warehouseId,
      domesticTrackingNumber: "TEST-TRACK-010",
      description: "可合箱商品",
      status: PackageStatus.READY_FOR_SHIPMENT
    });

    const shipmentOne = shipmentRepository.create({
      id: "shipment-one",
      reference: "TEST-REF-001",
      userId: fixture.userId,
      warehouseId: fixture.warehouseId,
      addressId: fixture.addressId,
      status: ShipmentStatus.SUBMITTED,
      submittedAt: "2026-10-05T10:00:00.000Z"
    });
    const shipmentTwo = shipmentRepository.create({
      id: "shipment-two",
      reference: "TEST-REF-002",
      userId: fixture.userId,
      warehouseId: fixture.warehouseId,
      addressId: fixture.addressId,
      status: ShipmentStatus.SUBMITTED,
      submittedAt: "2026-10-05T10:00:00.000Z"
    });

    shipmentRepository.addPackageRelation({
      shipmentId: shipmentOne.id,
      packageId: "package-ready"
    });

    expect(shipmentRepository.findWithPackages(shipmentOne.id)?.packages).toHaveLength(1);
    expect(() =>
      shipmentRepository.addPackageRelation({
        shipmentId: shipmentTwo.id,
        packageId: "package-ready"
      })
    ).toThrow();

    expect(() =>
      shipmentRepository.create({
        id: "shipment-duplicate-reference",
        reference: "TEST-REF-001",
        userId: fixture.userId,
        warehouseId: fixture.warehouseId,
        addressId: fixture.addressId,
        status: ShipmentStatus.SUBMITTED,
        submittedAt: "2026-10-05T10:00:00.000Z"
      })
    ).toThrow();
  });

  it("stores an immutable quote snapshot and payment attempts", () => {
    database = createTestDatabase();
    const fixture = insertUserWarehouseAndAddress(database);
    const shipmentRepository = new ShipmentRepository(database);
    const quoteRepository = new QuoteRepository(database);
    const paymentRepository = new PaymentRepository(database);

    const shipment = shipmentRepository.create({
      id: "shipment-quote",
      reference: "TEST-REF-QUOTE",
      userId: fixture.userId,
      warehouseId: fixture.warehouseId,
      addressId: fixture.addressId,
      status: ShipmentStatus.AWAITING_PAYMENT,
      submittedAt: "2026-10-05T10:00:00.000Z",
      packingCompletedAt: "2026-10-05T11:00:00.000Z",
      finalChargeableWeightG: 2500
    });
    const quote = quoteRepository.create({
      id: "quote-one",
      shipmentId: shipment.id,
      finalWeightG: 2400,
      chargeableWeightG: 2500,
      shippingFeeMinor: 5000,
      serviceFeeMinor: 200,
      totalAmountMinor: 5200,
      currency: "GBP",
      source: "MOCK_OPS"
    });

    expect(quoteRepository.findByShipmentId(shipment.id)?.totalAmountMinor).toBe(5200);
    expect(() =>
      database
        ?.prepare("UPDATE quotes SET total_amount_minor = 1 WHERE id = ?")
        .run(quote.id)
    ).toThrow();

    paymentRepository.create({
      shipmentId: shipment.id,
      quoteId: quote.id,
      amountMinor: quote.totalAmountMinor,
      currency: quote.currency,
      status: PaymentStatus.FAILED,
      provider: "MOCK_PAYMENT",
      providerReference: "failed-test",
      idempotencyKey: "payment-attempt-one",
      completedAt: "2026-10-05T12:00:00.000Z"
    });
    paymentRepository.create({
      shipmentId: shipment.id,
      quoteId: quote.id,
      amountMinor: quote.totalAmountMinor,
      currency: quote.currency,
      status: PaymentStatus.SUCCEEDED,
      provider: "MOCK_PAYMENT",
      providerReference: "success-test",
      idempotencyKey: "payment-attempt-two",
      completedAt: "2026-10-05T12:01:00.000Z"
    });

    expect(paymentRepository.listByShipmentId(shipment.id)).toHaveLength(2);
  });

  it("reads tracking events in time order and stores entity exceptions", () => {
    database = createTestDatabase();
    const fixture = insertUserWarehouseAndAddress(database);
    const shipmentRepository = new ShipmentRepository(database);
    const trackingRepository = new TrackingRepository(database);
    const exceptionRepository = new ExceptionRepository(database);

    const shipment = shipmentRepository.create({
      id: "shipment-tracking",
      reference: "TEST-REF-TRACKING",
      userId: fixture.userId,
      warehouseId: fixture.warehouseId,
      addressId: fixture.addressId,
      status: ShipmentStatus.INTERNATIONAL_TRANSIT,
      submittedAt: "2026-10-05T10:00:00.000Z",
      dispatchedAt: "2026-10-05T11:00:00.000Z"
    });

    trackingRepository.create({
      shipmentId: shipment.id,
      eventType: TrackingEventType.INTERNATIONAL_TRANSIT,
      displayMessage: "国际运输中",
      source: "MOCK_OPS",
      occurredAt: "2026-10-05T13:00:00.000Z"
    });
    trackingRepository.create({
      shipmentId: shipment.id,
      eventType: TrackingEventType.DISPATCHED,
      displayMessage: "已从仓库发出",
      source: "MOCK_OPS",
      occurredAt: "2026-10-05T11:00:00.000Z"
    });

    expect(
      trackingRepository
        .listByShipmentId(shipment.id)
        .map((event) => event.eventType)
    ).toEqual([
      TrackingEventType.DISPATCHED,
      TrackingEventType.INTERNATIONAL_TRANSIT
    ]);

    const exception = exceptionRepository.create({
      shipmentId: shipment.id,
      packageId: null,
      type: "TEST_EXCEPTION",
      status: ExceptionStatus.OPEN,
      title: "演示异常",
      description: "异常说明",
      impact: "影响转运进度",
      requiredAction: "当前无需操作。",
      resumeState: ShipmentStatus.INTERNATIONAL_TRANSIT,
      isBlocking: true
    });

    expect(exceptionRepository.listByShipmentId(shipment.id)).toHaveLength(1);
    expect(exception.isBlocking).toBe(true);
  });

  it("keeps the test database in memory rather than using the development path", () => {
    database = createTestDatabase();

    const databases = database
      .prepare("PRAGMA database_list")
      .all() as Array<{ seq: number; name: string; file: string }>;
    const mainDatabase = databases.find((item) => item.name === "main");

    expect(mainDatabase?.file).not.toContain("server/data/dev.sqlite");
  });
});
