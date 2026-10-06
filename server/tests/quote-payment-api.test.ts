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

describe("Quote and Payment API", () => {
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
    directory = mkdtempSync(join(tmpdir(), "china-uk-shipping-quote-api-"));
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
    const primary = insertUserWarehouseAndAddress(database, "quote-api-primary");
    const secondary = insertUserWarehouseAndAddress(database, "quote-api-secondary");

    return { primary, secondary };
  }

  async function createSubmittedShipment(userId: string, warehouseId: string, suffix: string) {
    const packageEntity = new PackageRepository(database as SqliteDatabase).create({
      id: "quote-api-package-" + suffix,
      userId,
      warehouseId,
      domesticTrackingNumber: "QUOTE-API-" + suffix,
      description: "报价接口测试商品",
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

  async function prepareQuote(shipmentId: string) {
    const opsHeaders = { "x-demo-ops-key": opsKey };
    const started = await app?.inject({
      method: "POST",
      url: "/internal/mock/shipments/" + shipmentId + "/start-processing",
      headers: opsHeaders
    });
    expect(started?.statusCode).toBe(200);
    const weight = await app?.inject({
      method: "POST",
      url: "/internal/mock/shipments/" + shipmentId + "/record-weight",
      headers: opsHeaders,
      payload: { finalWeightG: 2100, chargeableWeightG: 2500 }
    });
    expect(weight?.statusCode).toBe(200);
    const quote = await app?.inject({
      method: "POST",
      url: "/internal/mock/shipments/" + shipmentId + "/generate-quote",
      headers: opsHeaders,
      payload: {
        shippingFeeMinor: 4500,
        serviceFeeMinor: 200,
        currency: "GBP"
      }
    });
    expect(quote?.statusCode).toBe(200);
  }

  it("returns a user-friendly quote in shipment detail and completes simulated payment without dispatching", async () => {
    const users = await createApi();
    const shipmentId = await createSubmittedShipment(
      users.primary.userId,
      users.primary.warehouseId,
      "success"
    );
    await prepareQuote(shipmentId);

    const detail = await app?.inject({
      method: "GET",
      url: "/shipments/" + shipmentId,
      headers: { "x-demo-user-id": users.primary.userId }
    });
    expect(detail?.json().data).toMatchObject({
      status: "AWAITING_PAYMENT",
      statusLabel: "最终报价已生成，请确认并付款",
      quote: {
        finalWeightDisplay: "2.10 千克",
        chargeableWeightDisplay: "2.50 千克",
        totalAmountDisplay: "£47.00"
      }
    });

    const payment = await app?.inject({
      method: "POST",
      url: "/shipments/" + shipmentId + "/payments",
      headers: {
        "x-demo-user-id": users.primary.userId,
        "idempotency-key": "quote-api-payment-success"
      }
    });
    expect(payment?.statusCode).toBe(200);
    expect(payment?.json().data).toMatchObject({
      status: "PAID_AWAITING_DISPATCH",
      statusLabel: "已付款，等待仓库发出"
    });
    expect(
      (database as SqliteDatabase)
        .prepare("SELECT dispatched_at AS dispatchedAt FROM shipments WHERE id = ?")
        .get(shipmentId)
    ).toEqual({ dispatchedAt: null });
  });

  it("supports a mock payment failure, then a user retry, with structured ownership and state errors", async () => {
    const users = await createApi();
    const shipmentId = await createSubmittedShipment(
      users.primary.userId,
      users.primary.warehouseId,
      "failure"
    );
    const tooEarly = await app?.inject({
      method: "POST",
      url: "/shipments/" + shipmentId + "/payments",
      headers: {
        "x-demo-user-id": users.primary.userId,
        "idempotency-key": "quote-api-too-early"
      }
    });
    expect(tooEarly?.statusCode).toBe(409);
    expect(tooEarly?.json().error.code).toBe("INVALID_SHIPMENT_STATE");

    await prepareQuote(shipmentId);
    const forbidden = await app?.inject({
      method: "POST",
      url: "/shipments/" + shipmentId + "/payments",
      headers: {
        "x-demo-user-id": users.secondary.userId,
        "idempotency-key": "quote-api-forbidden"
      }
    });
    expect(forbidden?.statusCode).toBe(403);
    expect(forbidden?.json().error.code).toBe("FORBIDDEN");

    const failed = await app?.inject({
      method: "POST",
      url: "/internal/mock/shipments/" + shipmentId + "/payment",
      headers: { "x-demo-ops-key": opsKey },
      payload: { outcome: "failure", idempotencyKey: "quote-api-mock-failure" }
    });
    expect(failed?.statusCode).toBe(200);

    const afterFailure = await app?.inject({
      method: "GET",
      url: "/shipments/" + shipmentId,
      headers: { "x-demo-user-id": users.primary.userId }
    });
    expect(afterFailure?.json().data).toMatchObject({
      status: "AWAITING_PAYMENT",
      latestPayment: {
        status: "FAILED",
        statusLabel: "付款未完成"
      }
    });

    const retry = await app?.inject({
      method: "POST",
      url: "/shipments/" + shipmentId + "/payments",
      headers: {
        "x-demo-user-id": users.primary.userId,
        "idempotency-key": "quote-api-retry"
      }
    });
    expect(retry?.statusCode).toBe(200);
    expect(retry?.json().data.status).toBe("PAID_AWAITING_DISPATCH");
  });
});
