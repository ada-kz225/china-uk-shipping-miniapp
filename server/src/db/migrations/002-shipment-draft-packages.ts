import type { Migration } from "./types.js";

export const shipmentDraftPackagesMigration: Migration = {
  id: "002-shipment-draft-packages",
  apply(database) {
    database.exec(
      [
        "CREATE TABLE shipment_draft_packages (",
        "  shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,",
        "  package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,",
        "  created_at TEXT NOT NULL,",
        "  PRIMARY KEY (shipment_id, package_id)",
        ");",
        "",
        "CREATE INDEX shipment_draft_packages_by_package",
        "  ON shipment_draft_packages(package_id);"
      ].join("\n")
    );
  }
};
