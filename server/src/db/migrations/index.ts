import { initialSchemaMigration } from "./001-initial-schema.js";
import type { Migration } from "./types.js";

export const migrations: Migration[] = [initialSchemaMigration];
