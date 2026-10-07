import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config/env.js";
import { createDatabase, type SqliteDatabase } from "../src/db/database.js";
import { runMigrations } from "../src/db/migrate.js";
import { AuditLogRepository } from "../src/repositories/audit-log-repository.js";
import { insertUserWarehouseAndAddress } from "./helpers/database.js";

const demoOpsKey = "test-mock-ops-key";

describe("Package API", () => {
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
  }> {
    directory = mkdtempSync(join(tmpdir(), "china-uk-shipping-package-api-"));
    const databasePath = join(directory, "test.sqlite");
    const config = loadConfig({
      NODE_ENV: "test",
      HOST: "127.0.0.1",
      PORT: "3001",
      SQLITE_DB_PATH: databasePath,
      DEMO_OPS_KEY: demoOpsKey
    });

    app = await buildApp({ config });
    database = createDatabase(databasePath);
    runMigrations(database);
    const primary = insertUserWarehouseAndAddress(database, "primary");
    const secondary = insertUserWarehouseAndAddress(database, "secondary");

    return {
      primaryUserId: primary.userId,
      secondaryUserId: secondary.userId
    };
  }

  it("declares, lists, filters and reads a package through user APIs", async () => {
    const users = await createApi();
    const createResponse = await app?.inject({
      method: "POST",
      url: "/packages",
      headers: { "x-demo-user-id": users.primaryUserId },
      payload: {
        domesticTrackingNumber: "YT1001",
        description: "生活用品"
      }
    });

    expect(createResponse?.statusCode).toBe(200);
    const created = createResponse?.json().data as {
      id: string;
      status: string;
      statusLabel: string;
      statusDescription: string;
      availableActions: string[];
    };
    expect(created.status).toBe("DECLARED");
    expect(created.statusLabel).toBe("已预报，等待送往仓库");
    expect(created.statusDescription).toContain("预报");
    expect(created.availableActions[0]).toContain("无需操作");

    const listResponse = await app?.inject({
      method: "GET",
      url: "/packages?filter=inbound",
      headers: { "x-demo-user-id": users.primaryUserId }
    });
    expect(listResponse?.statusCode).toBe(200);
    expect(listResponse?.json().data).toHaveLength(1);
    expect(listResponse?.json().statusCounts).toEqual({
      all: 1,
      inbound: 1,
      pending_match: 0,
      ready: 0,
      in_shipment: 0,
      needs_action: 0
    });

    const detailResponse = await app?.inject({
      method: "GET",
      url: "/packages/" + created.id,
      headers: { "x-demo-user-id": users.primaryUserId }
    });
    expect(detailResponse?.statusCode).toBe(200);
    expect(detailResponse?.json().data.domesticTrackingNumber).toBe("YT1001");
  });

  it("returns a Chinese duplicate tracking number error", async () => {
    const users = await createApi();
    const payload = {
      domesticTrackingNumber: "YT1002",
      description: "衣物"
    };

    await app?.inject({
      method: "POST",
      url: "/packages",
      headers: { "x-demo-user-id": users.primaryUserId },
      payload
    });
    const response = await app?.inject({
      method: "POST",
      url: "/packages",
      headers: { "x-demo-user-id": users.primaryUserId },
      payload
    });

    expect(response?.statusCode).toBe(409);
    expect(response?.json()).toMatchObject({
      error: {
        code: "DUPLICATE_TRACKING_NUMBER",
        message: "该运单号已预报，无需重复提交。"
      }
    });
  });

  it("does not expose a package to another user", async () => {
    const users = await createApi();
    const created = await app?.inject({
      method: "POST",
      url: "/packages",
      headers: { "x-demo-user-id": users.primaryUserId },
      payload: {
        domesticTrackingNumber: "YT1003",
        description: "配饰"
      }
    });
    const packageId = created?.json().data.id as string;

    const response = await app?.inject({
      method: "GET",
      url: "/packages/" + packageId,
      headers: { "x-demo-user-id": users.secondaryUserId }
    });

    expect(response?.statusCode).toBe(403);
    expect(response?.json().error.code).toBe("FORBIDDEN");
  });

  it("uses protected Mock Ops endpoints for the receive-to-ready sequence", async () => {
    const users = await createApi();
    const created = await app?.inject({
      method: "POST",
      url: "/packages",
      headers: { "x-demo-user-id": users.primaryUserId },
      payload: {
        domesticTrackingNumber: "YT1004",
        description: "零食"
      }
    });
    const packageId = created?.json().data.id as string;

    const unauthorizedResponse = await app?.inject({
      method: "POST",
      url: "/internal/mock/packages/" + packageId + "/receive"
    });
    expect(unauthorizedResponse?.statusCode).toBe(403);
    expect(unauthorizedResponse?.json().error.code).toBe("FORBIDDEN");

    const receiveResponse = await app?.inject({
      method: "POST",
      url: "/internal/mock/packages/" + packageId + "/receive",
      headers: { "x-demo-ops-key": demoOpsKey }
    });
    expect(receiveResponse?.json().data.status).toBe("ARRIVED_PENDING_MATCH");

    const matchResponse = await app?.inject({
      method: "POST",
      url: "/internal/mock/packages/" + packageId + "/match",
      headers: { "x-demo-ops-key": demoOpsKey }
    });
    expect(matchResponse?.json().data.status).toBe("READY_FOR_SHIPMENT");

    const readyPackages = await app?.inject({
      method: "GET",
      url: "/packages?filter=ready",
      headers: { "x-demo-user-id": users.primaryUserId }
    });
    expect(readyPackages?.json().data).toHaveLength(1);
    expect(
      new AuditLogRepository(database as SqliteDatabase)
        .listByEntity("PACKAGE", packageId)
        .map((item) => item.action)
    ).toEqual([
      "PACKAGE_DECLARED",
      "PACKAGE_RECEIVED",
      "PACKAGE_MATCHED",
      "PACKAGE_MARKED_READY"
    ]);
  });
});
