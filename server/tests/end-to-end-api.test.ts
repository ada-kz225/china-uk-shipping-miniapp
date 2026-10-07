import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config/env.js";
import { createDatabase, type SqliteDatabase } from "../src/db/database.js";
import { runMigrations } from "../src/db/migrate.js";
import { insertUserWarehouseAndAddress } from "./helpers/database.js";

const opsKey = "test-mock-ops-key";
const address = {
  recipientName: "演示收件人",
  phone: "07123456789",
  postcode: "SW1A 1AA",
  addressLine: "英国演示地址"
};

describe("V1 end-to-end API flows", () => {
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
    directory = mkdtempSync(join(tmpdir(), "china-uk-shipping-e2e-"));
    const databasePath = join(directory, "test.sqlite");
    app = await buildApp({
      config: loadConfig({
        NODE_ENV: "test",
        HOST: "127.0.0.1",
        PORT: "3001",
        SQLITE_DB_PATH: databasePath,
        DEMO_OPS_KEY: opsKey
      })
    });
    database = createDatabase(databasePath);
    runMigrations(database);

    return insertUserWarehouseAndAddress(database, "e2e-primary");
  }

  async function declareAndMakeReady(userId: string, number: number): Promise<string> {
    const declared = await app?.inject({
      method: "POST",
      url: "/packages",
      headers: { "x-demo-user-id": userId },
      payload: {
        domesticTrackingNumber: "E2E-TRACK-" + String(number).padStart(2, "0"),
        description: "端到端测试包裹 " + number
      }
    });
    expect(declared?.statusCode).toBe(200);
    const packageId = declared?.json().data.id as string;

    for (const operation of ["receive", "match"]) {
      const response = await app?.inject({
        method: "POST",
        url: "/internal/mock/packages/" + packageId + "/" + operation,
        headers: { "x-demo-ops-key": opsKey }
      });
      expect(response?.statusCode).toBe(200);
    }

    return packageId;
  }

  async function createSubmittedShipment(userId: string, packageIds: string[]): Promise<string> {
    const draft = await app?.inject({
      method: "POST",
      url: "/shipments",
      headers: { "x-demo-user-id": userId },
      payload: { packageIds }
    });
    expect(draft?.statusCode).toBe(200);
    const shipmentId = draft?.json().data.id as string;

    const submitted = await app?.inject({
      method: "POST",
      url: "/shipments/" + shipmentId + "/submit",
      headers: { "x-demo-user-id": userId },
      payload: { address }
    });
    expect(submitted?.statusCode).toBe(200);
    expect(submitted?.json().data.status).toBe("SUBMITTED");

    return shipmentId;
  }

  async function progressToInternationalTransit(shipmentId: string, userId: string): Promise<void> {
    for (const operation of ["start-processing", "record-weight", "generate-quote"]) {
      const payload =
        operation === "record-weight"
          ? { finalWeightG: 2300, chargeableWeightG: 2500 }
          : operation === "generate-quote"
            ? { shippingFeeMinor: 4500, serviceFeeMinor: 200, currency: "GBP" }
            : undefined;
      const response = await app?.inject({
        method: "POST",
        url: "/internal/mock/shipments/" + shipmentId + "/" + operation,
        headers: { "x-demo-ops-key": opsKey },
        payload
      });
      expect(response?.statusCode).toBe(200);
    }

    const payment = await app?.inject({
      method: "POST",
      url: "/shipments/" + shipmentId + "/payments",
      headers: {
        "x-demo-user-id": userId,
        "idempotency-key": "e2e-payment-" + shipmentId
      }
    });
    expect(payment?.statusCode).toBe(200);
    expect(payment?.json().data.status).toBe("PAID_AWAITING_DISPATCH");
    expect(payment?.json().data.trackingEvents).toHaveLength(0);

    for (const operation of ["dispatch", "start-international-transit"]) {
      const response = await app?.inject({
        method: "POST",
        url: "/internal/mock/shipments/" + shipmentId + "/" + operation,
        headers: { "x-demo-ops-key": opsKey }
      });
      expect(response?.statusCode).toBe(200);
    }
  }

  it("completes the happy path using user APIs and Mock Ops without direct data changes", async () => {
    const user = await createApi();
    const userHeaders = { "x-demo-user-id": user.userId };

    const home = await app?.inject({ method: "GET", url: "/home", headers: userHeaders });
    expect(home?.statusCode).toBe(200);
    expect(home?.json().data.warehouse).toMatchObject({
      name: "测试中国仓",
      recipientCode: "TEST-e2e-primary"
    });

    const packageIds: string[] = [];
    for (let number = 1; number <= 10; number += 1) {
      packageIds.push(await declareAndMakeReady(user.userId, number));
    }
    const readyBefore = await app?.inject({
      method: "GET",
      url: "/packages?filter=ready",
      headers: userHeaders
    });
    expect(readyBefore?.json().data).toHaveLength(10);

    const shipmentId = await createSubmittedShipment(user.userId, packageIds.slice(0, 8));
    const readyAfter = await app?.inject({
      method: "GET",
      url: "/packages?filter=ready",
      headers: userHeaders
    });
    const inShipment = await app?.inject({
      method: "GET",
      url: "/packages?filter=in_shipment",
      headers: userHeaders
    });
    expect(readyAfter?.json().data).toHaveLength(2);
    expect(inShipment?.json().data).toHaveLength(8);

    await progressToInternationalTransit(shipmentId, user.userId);
    const afterDispatch = await app?.inject({
      method: "GET",
      url: "/shipments/" + shipmentId,
      headers: userHeaders
    });
    expect(afterDispatch?.json().data).toMatchObject({
      status: "INTERNATIONAL_TRANSIT",
      statusLabel: "国际运输中"
    });

    for (const operation of [
      "start-customs-clearance",
      "start-uk-last-mile",
      "mark-delivered"
    ]) {
      const response = await app?.inject({
        method: "POST",
        url: "/internal/mock/shipments/" + shipmentId + "/" + operation,
        headers: { "x-demo-ops-key": opsKey }
      });
      expect(response?.statusCode).toBe(200);
    }

    const delivered = await app?.inject({
      method: "GET",
      url: "/shipments/" + shipmentId,
      headers: userHeaders
    });
    expect(delivered?.json().data).toMatchObject({
      status: "DELIVERED",
      statusLabel: "已签收",
      trackingEvents: [
        { title: "已从中国仓库发出" },
        { title: "国际运输中" },
        { title: "清关处理中" },
        { title: "英国派送中" },
        { title: "已签收" }
      ]
    });
  });

  it("blocks and restores Package and Shipment workflows through the exception APIs", async () => {
    const user = await createApi();
    const userHeaders = { "x-demo-user-id": user.userId };
    const packageId = await declareAndMakeReady(user.userId, 1);

    const packageException = await app?.inject({
      method: "POST",
      url: "/internal/mock/packages/" + packageId + "/raise-exception",
      headers: { "x-demo-ops-key": opsKey }
    });
    expect(packageException?.statusCode).toBe(200);
    const blockedDraft = await app?.inject({
      method: "POST",
      url: "/shipments",
      headers: userHeaders,
      payload: { packageIds: [packageId] }
    });
    expect(blockedDraft?.statusCode).toBe(409);
    expect(blockedDraft?.json().error.code).toBe("PACKAGE_NOT_ELIGIBLE");

    const packageResolved = await app?.inject({
      method: "POST",
      url: "/internal/mock/packages/" + packageId + "/resolve-exception",
      headers: { "x-demo-ops-key": opsKey }
    });
    expect(packageResolved?.statusCode).toBe(200);
    const restoredPackage = await app?.inject({
      method: "GET",
      url: "/packages/" + packageId,
      headers: userHeaders
    });
    expect(restoredPackage?.json().data).toMatchObject({
      status: "READY_FOR_SHIPMENT",
      activeException: null
    });

    const shipmentId = await createSubmittedShipment(user.userId, [packageId]);
    await progressToInternationalTransit(shipmentId, user.userId);
    const shipmentException = await app?.inject({
      method: "POST",
      url: "/internal/mock/shipments/" + shipmentId + "/raise-exception",
      headers: { "x-demo-ops-key": opsKey }
    });
    expect(shipmentException?.statusCode).toBe(200);

    const blockedTracking = await app?.inject({
      method: "POST",
      url: "/internal/mock/shipments/" + shipmentId + "/start-customs-clearance",
      headers: { "x-demo-ops-key": opsKey }
    });
    expect(blockedTracking?.statusCode).toBe(409);
    expect(blockedTracking?.json().error.code).toBe("WORKFLOW_BLOCKED_BY_EXCEPTION");

    const shipmentResolved = await app?.inject({
      method: "POST",
      url: "/internal/mock/shipments/" + shipmentId + "/resolve-exception",
      headers: { "x-demo-ops-key": opsKey }
    });
    expect(shipmentResolved?.statusCode).toBe(200);
    const restoredShipment = await app?.inject({
      method: "GET",
      url: "/shipments/" + shipmentId,
      headers: userHeaders
    });
    expect(restoredShipment?.json().data).toMatchObject({
      status: "INTERNATIONAL_TRANSIT",
      activeException: null,
      trackingEvents: [{ title: "已从中国仓库发出" }, { title: "国际运输中" }]
    });

    for (const operation of [
      "start-customs-clearance",
      "start-uk-last-mile",
      "mark-delivered"
    ]) {
      const response = await app?.inject({
        method: "POST",
        url: "/internal/mock/shipments/" + shipmentId + "/" + operation,
        headers: { "x-demo-ops-key": opsKey }
      });
      expect(response?.statusCode).toBe(200);
    }
    const delivered = await app?.inject({
      method: "GET",
      url: "/shipments/" + shipmentId,
      headers: userHeaders
    });
    expect(delivered?.json().data.status).toBe("DELIVERED");
    expect(delivered?.json().data.trackingEvents).toHaveLength(5);
  });
});
