import type { SqliteDatabase } from "../../src/db/database.js";
import { createDatabase } from "../../src/db/database.js";
import { runMigrations } from "../../src/db/migrate.js";

const timestamp = "2026-10-05T09:00:00.000Z";

export function createTestDatabase(): SqliteDatabase {
  const database = createDatabase(":memory:");
  runMigrations(database);
  return database;
}

export function insertUserWarehouseAndAddress(
  database: SqliteDatabase,
  suffix = "one"
): { userId: string; warehouseId: string; addressId: string } {
  const userId = "user-" + suffix;
  const warehouseId = "warehouse-" + suffix;
  const addressId = "address-" + suffix;

  database
    .prepare(
      [
        "INSERT INTO users (",
        "id, external_subject, display_name, warehouse_recipient_code, created_at, updated_at",
        ") VALUES (?, ?, ?, ?, ?, ?)"
      ].join(" ")
    )
    .run(
      userId,
      "subject-" + suffix,
      "测试用户",
      "TEST-" + suffix,
      timestamp,
      timestamp
    );

  database
    .prepare(
      [
        "INSERT INTO warehouses (",
        "id, name, recipient_name, phone, address_line, is_active, created_at, updated_at",
        ") VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ].join(" ")
    )
    .run(
      warehouseId,
      "测试中国仓",
      "测试仓收件人",
      "00000000000",
      "测试中国仓地址",
      1,
      timestamp,
      timestamp
    );

  database
    .prepare(
      [
        "INSERT INTO addresses (",
        "id, user_id, recipient_name, phone, postcode, address_line, created_at, updated_at",
        ") VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ].join(" ")
    )
    .run(
      addressId,
      userId,
      "测试收件人",
      "00000000000",
      "SW1A 1AA",
      "测试英国地址",
      timestamp,
      timestamp
    );

  return { userId, warehouseId, addressId };
}
