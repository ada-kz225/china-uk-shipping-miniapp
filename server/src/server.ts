import { buildApp } from "./app.js";
import { loadConfig } from "./config/env.js";

async function start(): Promise<void> {
  const config = loadConfig();
  const app = await buildApp({
    config,
    logger: true
  });

  try {
    await app.listen({
      host: config.host,
      port: config.port
    });
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
    await app.close();
  }
}

void start();
