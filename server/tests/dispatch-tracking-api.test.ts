import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config/env.js";
import { createDatabase, type SqliteDatabase } from "../src/db/database.js";
import { runMigrations } from "../src/db/migrate.js";
import { PackageStatus } from "../src/domain/index.js";
import { PackageRepository } from "../src/repositories/package-repository.js";
import { insertUserWarehouseAndAddress } from "./helpers/database.js";

const opsKey = "test-mock-ops-key";
const address = {
  recipientName: "测试收件人",
  phone: "07123456789",
  postcode: "SW1A 1AA",
  addressLine: "测试英国地址"
};

describe("Dispatch and Tracking API", () => {
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
    directory = mkdtempSync(join(tmpdir(), "china-uk-shipping-dispatch-api-"));
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
    const primary = insertUserWarehouseAndAddress(database, "dispatch-api-primary");
    const secondary = insertUserWarehouseAndAddress(database, "dispatch-api-secondary");

    return { primary, secondary };
  }

  async function createSubmittedShipment(userId: string, warehouseId: string) {
    const packageEntity = new PackageRepository(database as SqliteDatabase).create({
      id: "dispatch-api-package",
      userId,
      warehouseId,
      domesticTrackingNumber: "DISPATCH-API-001",
      description: "运输接口测试商品",
      status: PackageStatus.READY_FOR_SHIPMENT
    });
    const draft = await app?.inject({
      method: "POST",
      url: "/shipments",
      headers: { "x-demo-user-id": userId },
      payload: { packageIds: [packageEntity.id] }
    });
    const shipmentId = draft?.json().data.id as string;
    const submitted = await app?.inject({
      method: "POST",
      url: "/shipments/" + shipmentId + "/submit",
      headers: { "x-demo-user-id": userId },
      payload: { address }
    });
    expect(submitted?.statusCode).toBe(200);

    return shipmentId;
  }

  async function moveToPaidAwaitingDispatch(shipmentId: string, userId: string) {
    const opsHeaders = { "x-demo-ops-key": opsKey };
    expect(
      (
        await app?.inject({
          method: "POST",
          url: "/internal/mock/shipments/" + shipmentId + "/start-processing",
          headers: opsHeaders
        })
      )?.statusCode
    ).toBe(200);
    expect(
      (
        await app?.inject({
          method: "POST",
          url: "/internal/mock/shipments/" + shipmentId + "/record-weight",
          headers: opsHeaders,
          payload: { finalWeightG: 2100, chargeableWeightG: 2500 }
        })
      )?.statusCode
    ).toBe(200);
    expect(
      (
        await app?.inject({
          method: "POST",
          url: "/internal/mock/shipments/" + shipmentId + "/generate-quote",
          headers: opsHeaders,
          payload: {
            shippingFeeMinor: 4500,
            serviceFeeMinor: 200,
            currency: "GBP"
          }
        })
      )?.statusCode
    ).toBe(200);
    const payment = await app?.inject({
      method: "POST",
      url: "/shipments/" + shipmentId + "/payments",
      headers: {
        "x-demo-user-id": userId,
        "idempotency-key": "dispatch-api-payment"
      }
    });
    expect(payment?.statusCode).toBe(200);
    expect(payment?.json().data.status).toBe("PAID_AWAITING_DISPATCH");
  }

  it("enforces the dispatch payment gate and returns a complete Chinese tracking timeline", async () => {
    const users = await createApi();
    const shipmentId = await createSubmittedShipment(
      users.primary.userId,
      users.primary.warehouseId
    );
    const opsHeaders = { "x-demo-ops-key": opsKey };

    const tooEarly = await app?.inject({
      method: "POST",
      url: "/internal/mock/shipments/" + shipmentId + "/dispatch",
      headers: opsHeaders
    });
    expect(tooEarly?.statusCode).toBe(409);
    expect(tooEarly?.json().error.code).toBe("PAYMENT_REQUIRED");

    await moveToPaidAwaitingDispatch(shipmentId, users.primary.userId);
    for (const endpoint of [
      "dispatch",
      "start-international-transit",
      "start-customs-clearance",
      "start-uk-last-mile",
      "mark-delivered"
    ]) {
      const response = await app?.inject({
        method: "POST",
        url: "/internal/mock/shipments/" + shipmentId + "/" + endpoint,
        headers: opsHeaders
      });
      expect(response?.statusCode).toBe(200);
    }

    const detail = await app?.inject({
      method: "GET",
      url: "/shipments/" + shipmentId,
      headers: { "x-demo-user-id": users.primary.userId }
    });
    expect(detail?.statusCode).toBe(200);
    expect(detail?.json().data).toMatchObject({
      status: "DELIVERED",
      statusLabel: "已签收",
      nextAction: "本次转运已完成。",
      trackingEvents: [
        { title: "已从中国仓库发出" },
        { title: "国际运输中" },
        { title: "清关处理中" },
        { title: "英国派送中" },
        { title: "已签收" }
      ]
    });
    expect(detail?.json().data.trackingEvents[0].eventType).toBeUndefined();

    const forbidden = await app?.inject({
      method: "GET",
      url: "/shipments/" + shipmentId,
      headers: { "x-demo-user-id": users.secondary.userId }
    });
    expect(forbidden?.statusCode).toBe(403);
    expect(forbidden?.json().error.code).toBe("FORBIDDEN");
  });

  it("rejects skipped tracking updates with a structured business error", async () => {
    const users = await createApi();
    const shipmentId = await createSubmittedShipment(
      users.primary.userId,
      users.primary.warehouseId
    );
    await moveToPaidAwaitingDispatch(shipmentId, users.primary.userId);

    const response = await app?.inject({
      method: "POST",
      url: "/internal/mock/shipments/" + shipmentId + "/start-uk-last-mile",
      headers: { "x-demo-ops-key": opsKey }
    });
    expect(response?.statusCode).toBe(409);
    expect(response?.json()).toMatchObject({
      error: {
        code: "TRACKING_TRANSITION_NOT_ALLOWED",
        message: "当前运输阶段不支持此进度更新，请按顺序推进。"
      }
    });
  });
});
