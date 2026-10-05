import type { SqliteDatabase } from "../database.js";

export type Migration = {
  id: string;
  apply: (database: SqliteDatabase) => void;
};
