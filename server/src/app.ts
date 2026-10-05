import Fastify, { type FastifyInstance } from "fastify";

import type { AppConfig } from "./config/env.js";
import { createDatabase } from "./db/database.js";
import { registerHealthRoute } from "./routes/health.js";

export type BuildAppOptions = {
  config: AppConfig;
  logger?: boolean;
};

export async function buildApp(
  options: BuildAppOptions
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false
  });
  const database = createDatabase(options.config.sqliteDbPath);

  app.addHook("onClose", async () => {
    database.close();
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    return reply.status(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "服务暂时不可用，请稍后重试。"
      }
    });
  });

  await registerHealthRoute(app, { database });

  return app;
}
