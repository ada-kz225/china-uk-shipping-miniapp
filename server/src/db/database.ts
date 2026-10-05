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
