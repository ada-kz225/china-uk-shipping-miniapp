import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";

export type SqliteDatabase = Database.Database;

export function createDatabase(databasePath: string): SqliteDatabase {
  if (databasePath !== ":memory:") {
    mkdirSync(dirname(databasePath), { recursive: true });
  }

  const database = new Database(databasePath);
  database.pragma("foreign_keys = ON");

  if (databasePath !== ":memory:") {
    database.pragma("journal_mode = WAL");
  }

  database.exec(
    [
      "CREATE TABLE IF NOT EXISTS app_metadata (",
      "  key TEXT PRIMARY KEY,",
      "  value TEXT NOT NULL,",
      "  created_at TEXT NOT NULL",
      ");"
    ].join("\n")
  );

  database
    .prepare(
      [
        "INSERT OR IGNORE INTO app_metadata (key, value, created_at)",
        "VALUES (?, ?, ?)"
      ].join(" ")
    )
    .run("schema_phase", "phase-0", new Date().toISOString());

  return database;
}

export function verifyDatabaseConnection(database: SqliteDatabase): void {
  const result = database.prepare("SELECT 1 AS connected").get() as {
    connected: number;
  };

  if (result.connected !== 1) {
    throw new Error("SQLite 数据库连接不可用。");
  }
}
