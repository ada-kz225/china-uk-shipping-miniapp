import type { FastifyInstance } from "fastify";
import { z } from "zod";

import {
  verifyDatabaseConnection,
  type SqliteDatabase
} from "../db/database.js";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("china-uk-shipping-api"),
  database: z.object({
    status: z.literal("connected")
  }),
  timestamp: z.string().datetime()
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

type HealthRouteOptions = {
  database: SqliteDatabase;
};

export async function registerHealthRoute(
  app: FastifyInstance,
  options: HealthRouteOptions
): Promise<void> {
  app.get("/health", async (): Promise<HealthResponse> => {
    verifyDatabaseConnection(options.database);

    return healthResponseSchema.parse({
      status: "ok",
      service: "china-uk-shipping-api",
      database: {
        status: "connected"
      },
      timestamp: new Date().toISOString()
    });
  });
}
