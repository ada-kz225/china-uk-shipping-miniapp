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

describe("Shipment API", () => {
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

  async function createApi(): Promise<{
    primaryUserId: string;
    secondaryUserId: string;
    warehouseId: string;
  }> {
    directory = mkdtempSync(join(tmpdir(), "china-uk-shipping-shipment-api-"));
    const databasePath = join(directory, "test.sqlite");
    const config = loadConfig({
      NODE_ENV: "test",
      HOST: "127.0.0.1",
      PORT: "3001",
      SQLITE_DB_PATH: databasePath,
      DEMO_OPS_KEY: "test-mock-ops-key"
    });
    app = await buildApp({ config });
    database = createDatabase(databasePath);
    runMigrations(database);
    const primary = insertUserWarehouseAndAddress(database, "shipment-primary");
    const secondary = insertUserWarehouseAndAddress(database, "shipment-secondary");

    return {
      primaryUserId: primary.userId,
      secondaryUserId: secondary.userId,
      warehouseId: primary.warehouseId
    };
  }

  function createReadyPackage(
    userId: string,
    warehouseId: string,
    suffix: string
  ): string {
    const entity = new PackageRepository(database as SqliteDatabase).create({
      id: "api-package-" + suffix,
      userId,
      warehouseId,
      domesticTrackingNumber: "API-SHIP-" + suffix,
      description: "接口测试商品",
      status: PackageStatus.READY_FOR_SHIPMENT
    });

    return entity.id;
  }

  const address = {
    recipientName: "测试收件人",
    phone: "07123456789",
    postcode: "SW1A 1AA",
    addressLine: "测试英国地址 1 号"
  };

  it("creates a draft, adds/removes packages, submits and lists it", async () => {
    const users = await createApi();
    const first = createReadyPackage(
      users.primaryUserId,
      users.warehouseId,
      "one"
    );
    const second = createReadyPackage(
      users.primaryUserId,
      users.warehouseId,
      "two"
    );

    const createResponse = await app?.inject({
      method: "POST",
      url: "/shipments",
      headers: { "x-demo-user-id": users.primaryUserId },
      payload: { packageIds: [first] }
    });
    expect(createResponse?.statusCode).toBe(200);
    const draftId = createResponse?.json().data.id as string;
    expect(createResponse?.json().data.statusLabel).toBe("草稿");

    const addResponse = await app?.inject({
      method: "POST",
      url: "/shipments/" + draftId + "/packages",
      headers: { "x-demo-user-id": users.primaryUserId },
      payload: { packageIds: [second] }
    });
    expect(addResponse?.json().data.packageCount).toBe(2);

    const removeResponse = await app?.inject({
      method: "DELETE",
      url: "/shipments/" + draftId + "/packages/" + second,
      headers: { "x-demo-user-id": users.primaryUserId }
    });
    expect(removeResponse?.json().data.packageCount).toBe(1);

    const detailResponse = await app?.inject({
      method: "GET",
      url: "/shipments/" + draftId,
      headers: { "x-demo-user-id": users.primaryUserId }
    });
    expect(detailResponse?.statusCode).toBe(200);
    expect(detailResponse?.json().data.packages).toHaveLength(1);

    const submitResponse = await app?.inject({
      method: "POST",
      url: "/shipments/" + draftId + "/submit",
      headers: { "x-demo-user-id": users.primaryUserId },
      payload: { address }
    });
    expect(submitResponse?.statusCode).toBe(200);
    expect(submitResponse?.json().data.statusLabel).toBe(
      "已提交，等待仓库处理"
    );
    expect(submitResponse?.json().data.reference).toMatch(/^UKS-/);

    const listResponse = await app?.inject({
      method: "GET",
      url: "/shipments?scope=active",
      headers: { "x-demo-user-id": users.primaryUserId }
    });
    expect(listResponse?.statusCode).toBe(200);
    expect(listResponse?.json().data).toHaveLength(1);
  });

  it("rejects forbidden access to another user's shipment", async () => {
    const users = await createApi();
    const packageId = createReadyPackage(
      users.primaryUserId,
      users.warehouseId,
      "three"
    );
    const created = await app?.inject({
      method: "POST",
      url: "/shipments",
      headers: { "x-demo-user-id": users.primaryUserId },
      payload: { packageIds: [packageId] }
    });
    const shipmentId = created?.json().data.id as string;

    const response = await app?.inject({
      method: "GET",
      url: "/shipments/" + shipmentId,
      headers: { "x-demo-user-id": users.secondaryUserId }
    });

    expect(response?.statusCode).toBe(403);
    expect(response?.json().error.code).toBe("FORBIDDEN");
  });

  it("rejects adding a package that is no longer eligible", async () => {
    const users = await createApi();
    const first = createReadyPackage(
      users.primaryUserId,
      users.warehouseId,
      "four-a"
    );
    const notReady = new PackageRepository(database as SqliteDatabase).create({
      id: "api-package-four-b",
      userId: users.primaryUserId,
      warehouseId: users.warehouseId,
      domesticTrackingNumber: "API-SHIP-four-b",
      description: "待确认商品",
      status: PackageStatus.ARRIVED_PENDING_MATCH
    });
    const created = await app?.inject({
      method: "POST",
      url: "/shipments",
      headers: { "x-demo-user-id": users.primaryUserId },
      payload: { packageIds: [first] }
    });

    const response = await app?.inject({
      method: "POST",
      url: "/shipments/" + created?.json().data.id + "/packages",
      headers: { "x-demo-user-id": users.primaryUserId },
      payload: { packageIds: [notReady.id] }
    });

    expect(response?.statusCode).toBe(409);
    expect(response?.json()).toMatchObject({
      error: {
        code: "PACKAGE_NOT_ELIGIBLE",
        message: "正在确认归属，暂不可选。"
      }
    });
  });
});
