import type { Migration } from "./types.js";

export const shipmentDeliveredAtMigration: Migration = {
  id: "004-shipment-delivered-at",
  apply(database) {
    database.exec("ALTER TABLE shipments ADD COLUMN delivered_at TEXT;");
  }
};
