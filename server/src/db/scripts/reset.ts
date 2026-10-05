import { existsSync, rmSync } from "node:fs";
import { resolve, sep } from "node:path";

import { loadConfig } from "../../config/env.js";
import { createDatabase } from "../database.js";
import { runMigrations } from "../migrate.js";

if (process.env.CONFIRM_DB_RESET !== "1") {
  throw new Error("重置数据库前请设置 CONFIRM_DB_RESET=1。");
}

const config = loadConfig();

if (config.sqliteDbPath === ":memory:") {
  throw new Error("内存数据库无需重置。");
}

const databasePath = resolve(process.cwd(), config.sqliteDbPath);
const allowedDirectory = resolve(process.cwd(), "data") + sep;

if (!databasePath.startsWith(allowedDirectory)) {
  throw new Error("仅允许重置 server/data/ 目录中的本地数据库。");
}

for (const path of [databasePath, databasePath + "-wal", databasePath + "-shm"]) {
  if (existsSync(path)) {
    rmSync(path);
  }
}

const database = createDatabase(config.sqliteDbPath);

try {
  runMigrations(database);
  console.log("本地开发数据库已重置并初始化。");
} finally {
  database.close();
}
