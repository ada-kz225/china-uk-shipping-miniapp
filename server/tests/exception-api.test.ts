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

describe("Exception API", () => {
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
    directory = mkdtempSync(join(tmpdir(), "china-uk-shipping-exception-api-"));
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
    const primary = insertUserWarehouseAndAddress(database, "exception-api-primary");
    const secondary = insertUserWarehouseAndAddress(database, "exception-api-secondary");

    return { primary, secondary };
  }

  it("returns a complete Chinese active exception only to the owning package user", async () => {
    const users = await createApi();
    const packageEntity = new PackageRepository(database as SqliteDatabase).create({
      id: "exception-api-package",
      userId: users.primary.userId,
      warehouseId: users.primary.warehouseId,
      domesticTrackingNumber: "EXCEPTION-API-001",
      description: "异常接口测试商品",
      status: PackageStatus.READY_FOR_SHIPMENT
    });

    const raised = await app?.inject({
      method: "POST",
      url: "/internal/mock/packages/" + packageEntity.id + "/raise-exception",
      headers: { "x-demo-ops-key": opsKey }
    });
    expect(raised?.statusCode).toBe(200);
    expect(raised?.json().data.status).toBe("OPEN");

    const detail = await app?.inject({
      method: "GET",
      url: "/packages/" + packageEntity.id,
      headers: { "x-demo-user-id": users.primary.userId }
    });
    expect(detail?.statusCode).toBe(200);
    expect(detail?.json().data).toMatchObject({
      status: "EXCEPTION",
      statusLabel: "需处理",
      activeException: {
        title: "包裹信息待确认",
        impact: "当前不能加入转运单。",
        requiredAction: "请核对国内快递单号或补充必要信息。",
        progress: "等待信息确认。",
        support: "如需帮助，请联系人工客服。"
      }
    });

    const forbidden = await app?.inject({
      method: "GET",
      url: "/packages/" + packageEntity.id,
      headers: { "x-demo-user-id": users.secondary.userId }
    });
    expect(forbidden?.statusCode).toBe(403);

    const resolved = await app?.inject({
      method: "POST",
      url: "/internal/mock/packages/" + packageEntity.id + "/resolve-exception",
      headers: { "x-demo-ops-key": opsKey }
    });
    expect(resolved?.statusCode).toBe(200);
    const afterResolve = await app?.inject({
      method: "GET",
      url: "/packages/" + packageEntity.id,
      headers: { "x-demo-user-id": users.primary.userId }
    });
    expect(afterResolve?.json().data).toMatchObject({
      status: "READY_FOR_SHIPMENT",
      activeException: null
    });
  });
});
