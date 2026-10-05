import { loadConfig } from "../../config/env.js";
import { createDatabase } from "../database.js";
import { runMigrations } from "../migrate.js";
import { seedDemoData } from "../seed.js";

const config = loadConfig();
const database = createDatabase(config.sqliteDbPath);

try {
  runMigrations(database);
  seedDemoData(database);
  console.log("演示数据写入完成。");
} finally {
  database.close();
}
