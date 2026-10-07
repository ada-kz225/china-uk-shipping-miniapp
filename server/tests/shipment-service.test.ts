import { afterEach, describe, expect, it } from "vitest";

import type { SqliteDatabase } from "../src/db/database.js";
import { PackageStatus } from "../src/domain/index.js";
import { AddressRepository } from "../src/repositories/address-repository.js";
import { AuditLogRepository } from "../src/repositories/audit-log-repository.js";
import { ExceptionRepository } from "../src/repositories/exception-repository.js";
import { PackageRepository } from "../src/repositories/package-repository.js";
import { PaymentRepository } from "../src/repositories/payment-repository.js";
import { QuoteRepository } from "../src/repositories/quote-repository.js";
import { ShipmentRepository } from "../src/repositories/shipment-repository.js";
import { ShipmentService } from "../src/services/shipment-service.js";
import { AppError } from "../src/utils/app-error.js";
import {
  createTestDatabase,
  insertUserWarehouseAndAddress
} from "./helpers/database.js";

describe("ShipmentService", () => {
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
    const auditLogRepository = new AuditLogRepository(database);
    const service = new ShipmentService(
      database,
      shipmentRepository,
      packageRepository,
      new ExceptionRepository(database),
      new AddressRepository(database),
      quoteRepository,
      paymentRepository,
      auditLogRepository
    );
    const primary = insertUserWarehouseAndAddress(database, "primary");
    const secondary = insertUserWarehouseAndAddress(database, "secondary");

    return {
      service,
      packageRepository,
      shipmentRepository,
      quoteRepository,
      paymentRepository,
      auditLogRepository,
      primary,
      secondary
    };
  }

  function createPackage(
    packageRepository: PackageRepository,
    userId: string,
    warehouseId: string,
    suffix: string,
    status = PackageStatus.READY_FOR_SHIPMENT
  ) {
    return packageRepository.create({
      id: "package-" + suffix,
      userId,
      warehouseId,
      domesticTrackingNumber: "TEST-SHIP-" + suffix,
      description: "测试商品 " + suffix,
      status
    });
  }

  const address = {
    recipientName: "测试收件人",
    phone: "07123456789",
    postcode: "SW1A 1AA",
    addressLine: "测试英国地址 1 号"
  };

  it("creates an unlocked draft from ready packages", () => {
    const fixture = createFixture();
    const candidate = createPackage(
      fixture.packageRepository,
      fixture.primary.userId,
      fixture.primary.warehouseId,
      "one"
    );

    const draft = fixture.service.createDraft(fixture.primary.userId, [
      candidate.id
    ]);

    expect(draft.status).toBe("DRAFT");
    expect(draft.reference).toBeNull();
    expect(draft.packages).toHaveLength(1);
    expect(fixture.packageRepository.findById(candidate.id)?.status).toBe(
      "READY_FOR_SHIPMENT"
    );
    expect(fixture.shipmentRepository.hasActivePackageRelation(candidate.id)).toBe(
      false
    );
  });

  it("adds and removes ready packages from a draft", () => {
    const fixture = createFixture();
    const first = createPackage(
      fixture.packageRepository,
      fixture.primary.userId,
      fixture.primary.warehouseId,
      "two-a"
    );
    const second = createPackage(
      fixture.packageRepository,
      fixture.primary.userId,
      fixture.primary.warehouseId,
      "two-b"
    );
    const draft = fixture.service.createDraft(fixture.primary.userId, [first.id]);

    const updated = fixture.service.addPackages(fixture.primary.userId, draft.id, [
      second.id
    ]);
    expect(updated.packages).toHaveLength(2);

    const removed = fixture.service.removePackage(
      fixture.primary.userId,
      draft.id,
      first.id
    );
    expect(removed.packages.map((item) => item.id)).toEqual([second.id]);
    expect(fixture.packageRepository.findById(first.id)?.status).toBe(
      "READY_FOR_SHIPMENT"
    );

    const replacementDraft = fixture.service.createDraft(fixture.primary.userId, [
      first.id
    ]);
    expect(replacementDraft.packages.map((item) => item.id)).toEqual([first.id]);
  });

  it("does not remove another package when a draft package is removed", () => {
    const fixture = createFixture();
    const first = createPackage(
      fixture.packageRepository,
      fixture.primary.userId,
      fixture.primary.warehouseId,
      "remove-first"
    );
    const second = createPackage(
      fixture.packageRepository,
      fixture.primary.userId,
      fixture.primary.warehouseId,
      "remove-second"
    );
    const draft = fixture.service.createDraft(fixture.primary.userId, [
      first.id,
      second.id
    ]);

    const result = fixture.service.removePackage(
      fixture.primary.userId,
      draft.id,
      first.id
    );

    expect(result.packages.map((item) => item.id)).toEqual([second.id]);
    expect(fixture.service.getShipment(fixture.primary.userId, draft.id).packages).toEqual([
      expect.objectContaining({ id: second.id })
    ]);
  });

  it("does not allow another user to remove a draft package", () => {
    const fixture = createFixture();
    const candidate = createPackage(
      fixture.packageRepository,
      fixture.primary.userId,
      fixture.primary.warehouseId,
      "remove-forbidden"
    );
    const draft = fixture.service.createDraft(fixture.primary.userId, [candidate.id]);

    expectAppError(
      () =>
        fixture.service.removePackage(
          fixture.secondary.userId,
          draft.id,
          candidate.id
        ),
      "FORBIDDEN"
    );
  });

  it("does not allow a package to be removed after submission", () => {
    const fixture = createFixture();
    const candidate = createPackage(
      fixture.packageRepository,
      fixture.primary.userId,
      fixture.primary.warehouseId,
      "remove-submitted"
    );
    const draft = fixture.service.createDraft(fixture.primary.userId, [candidate.id]);
    fixture.service.submitShipment(fixture.primary.userId, draft.id, address);

    expectAppError(
      () =>
        fixture.service.removePackage(
          fixture.primary.userId,
          draft.id,
          candidate.id
        ),
      "INVALID_SHIPMENT_STATE"
    );
  });

  it("rejects packages that are not ready or owned by another user", () => {
    const fixture = createFixture();
    const notReady = createPackage(
      fixture.packageRepository,
      fixture.primary.userId,
      fixture.primary.warehouseId,
      "three-a",
      PackageStatus.ARRIVED_PENDING_MATCH
    );
    const otherUserPackage = createPackage(
      fixture.packageRepository,
      fixture.primary.userId,
      fixture.primary.warehouseId,
      "three-b"
    );

    expectAppError(
      () => fixture.service.createDraft(fixture.primary.userId, [notReady.id]),
      "PACKAGE_NOT_ELIGIBLE"
    );
    expectAppError(
      () =>
        fixture.service.createDraft(fixture.secondary.userId, [
          otherUserPackage.id
        ]),
      "FORBIDDEN"
    );
  });

  it("submits a draft with a stable reference and locks packages", () => {
    const fixture = createFixture();
    const first = createPackage(
      fixture.packageRepository,
      fixture.primary.userId,
      fixture.primary.warehouseId,
      "four-a"
    );
    const second = createPackage(
      fixture.packageRepository,
      fixture.primary.userId,
      fixture.primary.warehouseId,
      "four-b"
    );
    const draft = fixture.service.createDraft(fixture.primary.userId, [
      first.id,
      second.id
    ]);

    const submitted = fixture.service.submitShipment(
      fixture.primary.userId,
      draft.id,
      address
    );

    expect(submitted.status).toBe("SUBMITTED");
    expect(submitted.reference).toMatch(/^UKS-\d{8}-[A-F0-9]{8}$/);
    expect(submitted.address?.postcode).toBe(address.postcode);
    expect(submitted.packages).toHaveLength(2);
    expect(fixture.packageRepository.findById(first.id)?.status).toBe(
      "IN_SHIPMENT"
    );
    expect(fixture.shipmentRepository.hasActivePackageRelation(second.id)).toBe(
      true
    );
  });

  it("returns the same shipment when submit is repeated", () => {
    const fixture = createFixture();
    const candidate = createPackage(
      fixture.packageRepository,
      fixture.primary.userId,
      fixture.primary.warehouseId,
      "five"
    );
    const draft = fixture.service.createDraft(fixture.primary.userId, [
      candidate.id
    ]);
    const first = fixture.service.submitShipment(
      fixture.primary.userId,
      draft.id,
      address
    );
    const second = fixture.service.submitShipment(
      fixture.primary.userId,
      draft.id,
      address
    );

    expect(second.reference).toBe(first.reference);
    expect(second.packages).toHaveLength(1);
  });

  it("allows only one of two drafts to submit the same package", () => {
    const fixture = createFixture();
    const candidate = createPackage(
      fixture.packageRepository,
      fixture.primary.userId,
      fixture.primary.warehouseId,
      "six"
    );
    const firstDraft = fixture.service.createDraft(fixture.primary.userId, [
      candidate.id
    ]);
    const secondDraft = fixture.service.createDraft(fixture.primary.userId, [
      candidate.id
    ]);

    fixture.service.submitShipment(fixture.primary.userId, firstDraft.id, address);
    expectAppError(
      () =>
        fixture.service.submitShipment(
          fixture.primary.userId,
          secondDraft.id,
          address
        ),
      "PACKAGE_NOT_ELIGIBLE"
    );
  });

  it("rolls back the complete submission when one package becomes ineligible", () => {
    const fixture = createFixture();
    const first = createPackage(
      fixture.packageRepository,
      fixture.primary.userId,
      fixture.primary.warehouseId,
      "seven-a"
    );
    const second = createPackage(
      fixture.packageRepository,
      fixture.primary.userId,
      fixture.primary.warehouseId,
      "seven-b"
    );
    const draft = fixture.service.createDraft(fixture.primary.userId, [
      first.id,
      second.id
    ]);
    fixture.packageRepository.update(second.id, {
      status: PackageStatus.ARRIVED_PENDING_MATCH
    });

    expectAppError(
      () => fixture.service.submitShipment(fixture.primary.userId, draft.id, address),
      "PACKAGE_NOT_ELIGIBLE"
    );
    expect(fixture.packageRepository.findById(first.id)?.status).toBe(
      "READY_FOR_SHIPMENT"
    );
    expect(fixture.shipmentRepository.hasActivePackageRelation(first.id)).toBe(
      false
    );
    expect(fixture.service.getShipment(fixture.primary.userId, draft.id).packages).toHaveLength(2);
  });

  it("cancels a draft and releases its candidate selection without changing package state", () => {
    const fixture = createFixture();
    const candidate = createPackage(
      fixture.packageRepository,
      fixture.primary.userId,
      fixture.primary.warehouseId,
      "eight"
    );
    const draft = fixture.service.createDraft(fixture.primary.userId, [
      candidate.id
    ]);

    fixture.service.cancelShipment(fixture.primary.userId, draft.id);

    expect(fixture.packageRepository.findById(candidate.id)?.status).toBe(
      "READY_FOR_SHIPMENT"
    );
    expectAppError(
      () => fixture.service.getShipment(fixture.primary.userId, draft.id),
      "SHIPMENT_NOT_FOUND"
    );
    expect(
      fixture.auditLogRepository
        .listByEntity("SHIPMENT", draft.id)
        .map((item) => item.action)
    ).toContain("SHIPMENT_DRAFT_CANCELLED");
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
