import { loadConfig } from "../../config/env.js";
import { createDatabase } from "../database.js";
import { runMigrations } from "../migrate.js";

const config = loadConfig();
const database = createDatabase(config.sqliteDbPath);

try {
  runMigrations(database);
  console.log("数据库初始化完成。");
} finally {
  database.close();
}
