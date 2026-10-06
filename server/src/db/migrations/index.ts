import { initialSchemaMigration } from "./001-initial-schema.js";
import { shipmentDraftPackagesMigration } from "./002-shipment-draft-packages.js";
import { shipmentFinalWeightMigration } from "./003-shipment-final-weight.js";
import { shipmentDeliveredAtMigration } from "./004-shipment-delivered-at.js";
import type { Migration } from "./types.js";

export const migrations: Migration[] = [
  initialSchemaMigration,
  shipmentDraftPackagesMigration,
  shipmentFinalWeightMigration,
  shipmentDeliveredAtMigration
];
