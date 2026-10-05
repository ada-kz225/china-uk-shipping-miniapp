import type { Package, PackageStatus } from "../domain/index.js";
import type { SqliteDatabase } from "../db/database.js";
import { createId, nowIso } from "../utils/identifiers.js";

export type CreatePackageInput = {
  id?: string;
  userId: string;
  warehouseId: string;
  domesticTrackingNumber: string;
  description: string;
  status: PackageStatus;
  arrivedAt?: string | null;
  weightG?: number | null;
};

export type UpdatePackageInput = Partial<
  Pick<
    Package,
    "description" | "status" | "arrivedAt" | "weightG" | "warehouseId"
  >
>;

const packageFields = [
  "id",
  "user_id AS userId",
  "warehouse_id AS warehouseId",
  "domestic_tracking_number AS domesticTrackingNumber",
  "description",
  "status",
  "arrived_at AS arrivedAt",
  "weight_g AS weightG",
  "version",
  "created_at AS createdAt",
  "updated_at AS updatedAt"
].join(", ");

export class PackageRepository {
  constructor(private readonly database: SqliteDatabase) {}

  create(input: CreatePackageInput): Package {
    const id = input.id ?? createId();
    const timestamp = nowIso();

    this.database
      .prepare(
        [
          "INSERT INTO packages (",
          "id, user_id, warehouse_id, domestic_tracking_number, description,",
          "status, arrived_at, weight_g, created_at, updated_at",
          ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ].join(" ")
      )
      .run(
        id,
        input.userId,
        input.warehouseId,
        input.domesticTrackingNumber.trim(),
        input.description,
        input.status,
        input.arrivedAt ?? null,
        input.weightG ?? null,
        timestamp,
        timestamp
      );

    return this.findById(id) as Package;
  }

  findById(id: string): Package | undefined {
    return this.database
      .prepare("SELECT " + packageFields + " FROM packages WHERE id = ?")
      .get(id) as Package | undefined;
  }

  listByUserId(userId: string): Package[] {
    return this.database
      .prepare(
        "SELECT " +
          packageFields +
          " FROM packages WHERE user_id = ? ORDER BY updated_at DESC"
      )
      .all(userId) as Package[];
  }

  update(id: string, input: UpdatePackageInput): Package | undefined {
    const entries = Object.entries(input).filter(([, value]) => value !== undefined);

    if (entries.length === 0) {
      return this.findById(id);
    }

    const columnByField: Record<string, string> = {
      description: "description",
      status: "status",
      arrivedAt: "arrived_at",
      weightG: "weight_g",
      warehouseId: "warehouse_id"
    };

    const assignments = entries.map(
      ([field]) => columnByField[field] + " = ?"
    );
    const values = entries.map(([, value]) => value);

    this.database
      .prepare(
        [
          "UPDATE packages SET",
          assignments.join(", "),
          ", version = version + 1, updated_at = ? WHERE id = ?"
        ].join(" ")
      )
      .run(...values, nowIso(), id);

    return this.findById(id);
  }
}
