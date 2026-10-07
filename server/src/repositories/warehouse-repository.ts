import type { SqliteDatabase } from "../db/database.js";

export type WarehouseInformation = {
  name: string;
  recipientName: string;
  recipientCode: string;
  phone: string;
  addressLine: string;
  instructions: string | null;
};

/** Reads the active Chinese warehouse and the current user's recipient code. */
export class WarehouseRepository {
  constructor(private readonly database: SqliteDatabase) {}

  findActiveForUser(userId: string): WarehouseInformation | undefined {
    return this.database
      .prepare(
        [
          "SELECT warehouses.name AS name,",
          "warehouses.recipient_name AS recipientName,",
          "users.warehouse_recipient_code AS recipientCode,",
          "warehouses.phone AS phone,",
          "warehouses.address_line AS addressLine,",
          "warehouses.instructions AS instructions",
          "FROM users",
          "JOIN warehouses ON warehouses.is_active = 1",
          "WHERE users.id = ?",
          "ORDER BY warehouses.created_at ASC LIMIT 1"
        ].join(" ")
      )
      .get(userId) as WarehouseInformation | undefined;
  }
}
