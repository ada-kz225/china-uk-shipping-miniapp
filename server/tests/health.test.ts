import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config/env.js";
import { healthResponseSchema } from "../src/routes/health.js";

describe("GET /health", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("returns an API and SQLite health status", async () => {
    const config = loadConfig({
      NODE_ENV: "test",
      HOST: "127.0.0.1",
      PORT: "3001",
      SQLITE_DB_PATH: ":memory:"
    });

    app = await buildApp({ config });

    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    expect(response.statusCode).toBe(200);

    const body = healthResponseSchema.parse(response.json());
    expect(body.status).toBe("ok");
    expect(body.database.status).toBe("connected");
  });
});
