import type { Migration } from "./types.js";

export const shipmentFinalWeightMigration: Migration = {
  id: "003-shipment-final-weight",
  apply(database) {
    database.exec(
      [
        "ALTER TABLE shipments ADD COLUMN final_weight_g INTEGER CHECK (",
        "  final_weight_g IS NULL OR final_weight_g > 0",
        ");"
      ].join("\n")
    );
  }
};
