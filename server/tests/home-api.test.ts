import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config/env.js";
import { createDatabase, type SqliteDatabase } from "../src/db/database.js";
import { runMigrations } from "../src/db/migrate.js";
import { PackageStatus, ShipmentStatus } from "../src/domain/index.js";
import { PackageRepository } from "../src/repositories/package-repository.js";
import { ShipmentRepository } from "../src/repositories/shipment-repository.js";
import { insertUserWarehouseAndAddress } from "./helpers/database.js";

describe("Home API", () => {
  let app: FastifyInstance | undefined;
  let database: SqliteDatabase | undefined;
  let directory: string | undefined;

  afterEach(async () => {
    database?.close();
    database = undefined;
    await app?.close();
    app = undefined;

    if (directory) {
      rmSync(directory, { recursive: true, force: true });
      directory = undefined;
    }
  });

  async function createApi() {
    directory = mkdtempSync(join(tmpdir(), "china-uk-shipping-home-api-"));
    const databasePath = join(directory, "test.sqlite");
    app = await buildApp({
      config: loadConfig({
        NODE_ENV: "test",
        HOST: "127.0.0.1",
        PORT: "3001",
        SQLITE_DB_PATH: databasePath,
        DEMO_OPS_KEY: "test-mock-ops-key"
      })
    });
    database = createDatabase(databasePath);
    runMigrations(database);
    const primary = insertUserWarehouseAndAddress(database, "home-primary");
    const secondary = insertUserWarehouseAndAddress(database, "home-secondary");

    return { primary, secondary };
  }

  function addPackage(
    userId: string,
    warehouseId: string,
    id: string,
    status: PackageStatus
  ): void {
    new PackageRepository(database as SqliteDatabase).create({
      id,
      userId,
      warehouseId,
      domesticTrackingNumber: "HOME-TRACK-" + id,
      description: "首页测试包裹",
      status
    });
  }

  function addShipment(
    userId: string,
    warehouseId: string,
    id: string,
    status: ShipmentStatus
  ): void {
    new ShipmentRepository(database as SqliteDatabase).create({
      id,
      reference: "HOME-" + id,
      userId,
      warehouseId,
      status
    });
  }

  it("aggregates only the current user's homepage data and prioritises exceptions", async () => {
    const users = await createApi();
    addPackage(users.primary.userId, users.primary.warehouseId, "inbound", PackageStatus.DECLARED);
    addPackage(users.primary.userId, users.primary.warehouseId, "pending", PackageStatus.ARRIVED_PENDING_MATCH);
    addPackage(users.primary.userId, users.primary.warehouseId, "ready", PackageStatus.READY_FOR_SHIPMENT);
    addPackage(users.primary.userId, users.primary.warehouseId, "locked", PackageStatus.IN_SHIPMENT);
    addPackage(users.primary.userId, users.primary.warehouseId, "exception", PackageStatus.EXCEPTION);
    addShipment(users.primary.userId, users.primary.warehouseId, "exception", ShipmentStatus.EXCEPTION);
    addShipment(users.primary.userId, users.primary.warehouseId, "payment", ShipmentStatus.AWAITING_PAYMENT);
    addShipment(users.primary.userId, users.primary.warehouseId, "paid", ShipmentStatus.PAID_AWAITING_DISPATCH);
    addShipment(users.primary.userId, users.primary.warehouseId, "transit", ShipmentStatus.INTERNATIONAL_TRANSIT);

    addPackage(users.secondary.userId, users.secondary.warehouseId, "other-ready", PackageStatus.READY_FOR_SHIPMENT);
    addShipment(users.secondary.userId, users.secondary.warehouseId, "other-payment", ShipmentStatus.AWAITING_PAYMENT);

    const response = await app?.inject({
      method: "GET",
      url: "/home",
      headers: { "x-demo-user-id": users.primary.userId }
    });

    expect(response?.statusCode).toBe(200);
    const data = response?.json().data;
    expect(data.packageOverview).toEqual({
      inbound: 1,
      pendingMatch: 1,
      ready: 1,
      inShipment: 1,
      needsAction: 1
    });
    expect(data.shipmentOverview).toEqual({
      awaitingPayment: 1,
      exceptions: 1,
      paidAwaitingDispatch: 1,
      inTransit: 1
    });
    expect(data.actionRequired.map((item: { title: string }) => item.title)).toEqual([
      "转运单需要处理",
      "1 件包裹需要处理",
      "有转运单待付款",
      "1 件包裹待确认",
      "1 件包裹可合箱"
    ]);
    expect(data.actionRequired.map((item: { description: string }) => item.description).join(" ")).not.toContain("HOME-paid");
    expect(data.currentJourney).toMatchObject({
      id: "transit",
      statusLabel: "国际运输中"
    });
    expect(data.warehouse).toMatchObject({ recipientCode: "TEST-home-primary" });
  });

  it("matches package-list filter counts and does not expose another user's work", async () => {
    const users = await createApi();
    addPackage(users.primary.userId, users.primary.warehouseId, "inbound", PackageStatus.INBOUND_TO_WAREHOUSE);
    addPackage(users.primary.userId, users.primary.warehouseId, "pending", PackageStatus.ARRIVED_PENDING_MATCH);
    addPackage(users.primary.userId, users.primary.warehouseId, "ready", PackageStatus.READY_FOR_SHIPMENT);
    addPackage(users.primary.userId, users.primary.warehouseId, "locked", PackageStatus.IN_SHIPMENT);
    addPackage(users.primary.userId, users.primary.warehouseId, "exception", PackageStatus.EXCEPTION);
    addPackage(users.secondary.userId, users.secondary.warehouseId, "other", PackageStatus.EXCEPTION);

    const headers = { "x-demo-user-id": users.primary.userId };
    const [home, inbound, pending, ready, inShipment, needsAction] = await Promise.all([
      app?.inject({ method: "GET", url: "/home", headers }),
      app?.inject({ method: "GET", url: "/packages?filter=inbound", headers }),
      app?.inject({ method: "GET", url: "/packages?filter=pending_match", headers }),
      app?.inject({ method: "GET", url: "/packages?filter=ready", headers }),
      app?.inject({ method: "GET", url: "/packages?filter=in_shipment", headers }),
      app?.inject({ method: "GET", url: "/packages?filter=needs_action", headers })
    ]);
    const counts = home?.json().data.packageOverview;

    expect(counts).toEqual({
      inbound: inbound?.json().data.length,
      pendingMatch: pending?.json().data.length,
      ready: ready?.json().data.length,
      inShipment: inShipment?.json().data.length,
      needsAction: needsAction?.json().data.length
    });

    const secondaryHome = await app?.inject({
      method: "GET",
      url: "/home",
      headers: { "x-demo-user-id": users.secondary.userId }
    });
    expect(secondaryHome?.json().data.packageOverview).toMatchObject({
      needsAction: 1,
      inbound: 0,
      ready: 0
    });
    expect(secondaryHome?.json().data.actionRequired).toHaveLength(1);
  });
});
