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
  "packages.id AS id",
  "packages.user_id AS userId",
  "packages.warehouse_id AS warehouseId",
  "packages.domestic_tracking_number AS domesticTrackingNumber",
  "packages.description AS description",
  "packages.status AS status",
  "packages.arrived_at AS arrivedAt",
  "packages.weight_g AS weightG",
  "packages.version AS version",
  "packages.created_at AS createdAt",
  "packages.updated_at AS updatedAt",
  "shipments.reference AS shipmentReference"
].join(", ");

const packageFromClause = [
  "FROM packages",
  "LEFT JOIN shipment_packages",
  "ON shipment_packages.package_id = packages.id",
  "AND shipment_packages.released_at IS NULL",
  "LEFT JOIN shipments ON shipments.id = shipment_packages.shipment_id"
].join(" ");

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
      .prepare("SELECT " + packageFields + " " + packageFromClause + " WHERE packages.id = ?")
      .get(id) as Package | undefined;
  }

  findByTrackingNumber(domesticTrackingNumber: string): Package | undefined {
    return this.database
      .prepare(
        "SELECT " +
          packageFields +
          " " +
          packageFromClause +
          " WHERE packages.domestic_tracking_number = ?"
      )
      .get(domesticTrackingNumber) as Package | undefined;
  }

  listByUserId(userId: string, statuses?: PackageStatus[]): Package[] {
    const statusFilter =
      statuses && statuses.length > 0
        ? " AND packages.status IN (" + statuses.map(() => "?").join(", ") + ")"
        : "";

    return this.database
      .prepare(
        "SELECT " +
          packageFields +
          " " +
          packageFromClause +
          " WHERE packages.user_id = ?" +
          statusFilter +
          " ORDER BY packages.updated_at DESC"
      )
      .all(userId, ...(statuses ?? [])) as Package[];
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
