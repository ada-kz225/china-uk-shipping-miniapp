import { afterEach, describe, expect, it } from "vitest";

import { AuditLogRepository } from "../src/repositories/audit-log-repository.js";
import { ExceptionRepository } from "../src/repositories/exception-repository.js";
import { PackageRepository } from "../src/repositories/package-repository.js";
import { PackageService } from "../src/services/package-service.js";
import { AppError } from "../src/utils/app-error.js";
import {
  createTestDatabase,
  insertUserWarehouseAndAddress
} from "./helpers/database.js";
import type { SqliteDatabase } from "../src/db/database.js";

describe("PackageService", () => {
  let database: SqliteDatabase | undefined;

  afterEach(() => {
    database?.close();
    database = undefined;
  });

  function createService(): PackageService {
    database = createTestDatabase();

    return new PackageService(
      database,
      new PackageRepository(database),
      new ExceptionRepository(database),
      new AuditLogRepository(database)
    );
  }

  it("declares a package and records an audit log", () => {
    const service = createService();
    const { userId } = insertUserWarehouseAndAddress(database as SqliteDatabase);

    const created = service.declarePackage(userId, {
      domesticTrackingNumber: " sf123 ",
      description: "生活用品"
    });

    expect(created.domesticTrackingNumber).toBe("SF123");
    expect(created.status).toBe("DECLARED");
    expect(
      new AuditLogRepository(database as SqliteDatabase).listByEntity(
        "PACKAGE",
        created.id
      )
    ).toEqual([
      expect.objectContaining({
        action: "PACKAGE_DECLARED",
        actorType: "USER"
      })
    ]);
  });

  it("rejects a duplicate tracking number after normalization", () => {
    const service = createService();
    const { userId } = insertUserWarehouseAndAddress(database as SqliteDatabase);

    service.declarePackage(userId, {
      domesticTrackingNumber: "SF123",
      description: "第一件商品"
    });

    expect(() =>
      service.declarePackage(userId, {
        domesticTrackingNumber: " sf123 ",
        description: "第二件商品"
      })
    ).toThrow(
      expect.objectContaining({
        code: "DUPLICATE_TRACKING_NUMBER"
      })
    );
  });

  it("allows the receiving and matching state sequence", () => {
    const service = createService();
    const { userId } = insertUserWarehouseAndAddress(database as SqliteDatabase);
    const created = service.declarePackage(userId, {
      domesticTrackingNumber: "SF124",
      description: "衣物"
    });

    const received = service.receivePackage(created.id);
    const matched = service.matchPackage(created.id);
    const audits = new AuditLogRepository(database as SqliteDatabase).listByEntity(
      "PACKAGE",
      created.id
    );

    expect(received.status).toBe("ARRIVED_PENDING_MATCH");
    expect(received.arrivedAt).not.toBeNull();
    expect(matched.status).toBe("READY_FOR_SHIPMENT");
    expect(audits.map((item) => item.action)).toEqual([
      "PACKAGE_DECLARED",
      "PACKAGE_RECEIVED",
      "PACKAGE_MATCHED",
      "PACKAGE_MARKED_READY"
    ]);
  });

  it("supports the explicit in-transit-to-warehouse event before receiving", () => {
    const service = createService();
    const { userId } = insertUserWarehouseAndAddress(database as SqliteDatabase);
    const created = service.declarePackage(userId, {
      domesticTrackingNumber: "SF124-INBOUND",
      description: "日用品"
    });

    const inbound = service.markPackageInbound(created.id);
    const received = service.receivePackage(created.id);

    expect(inbound.status).toBe("INBOUND_TO_WAREHOUSE");
    expect(received.status).toBe("ARRIVED_PENDING_MATCH");
  });

  it("rejects an invalid state transition", () => {
    const service = createService();
    const { userId } = insertUserWarehouseAndAddress(database as SqliteDatabase);
    const created = service.declarePackage(userId, {
      domesticTrackingNumber: "SF125",
      description: "配饰"
    });

    try {
      service.markPackageReady(created.id);
      throw new Error("Expected markPackageReady to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("INVALID_STATE_TRANSITION");
    }
  });

  it("does not allow a user to read another user's package", () => {
    const service = createService();
    const firstUser = insertUserWarehouseAndAddress(database as SqliteDatabase, "one");
    const secondUser = insertUserWarehouseAndAddress(database as SqliteDatabase, "two");
    const created = service.declarePackage(firstUser.userId, {
      domesticTrackingNumber: "SF126",
      description: "零食"
    });

    try {
      service.getPackage(secondUser.userId, created.id);
      throw new Error("Expected ownership validation to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("FORBIDDEN");
    }
  });
});
