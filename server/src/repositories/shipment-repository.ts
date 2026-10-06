import type {
  Package,
  Shipment,
  ShipmentStatus
} from "../domain/index.js";
import type { SqliteDatabase } from "../db/database.js";
import { createId, nowIso } from "../utils/identifiers.js";

export type CreateShipmentInput = {
  id?: string;
  reference?: string | null;
  userId: string;
  warehouseId: string;
  addressId?: string | null;
  status: ShipmentStatus;
  submittedAt?: string | null;
  packingCompletedAt?: string | null;
  finalWeightG?: number | null;
  finalChargeableWeightG?: number | null;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
};

export type UpdateShipmentInput = Partial<
  Pick<
    Shipment,
    | "reference"
    | "addressId"
    | "status"
    | "submittedAt"
    | "packingCompletedAt"
    | "finalWeightG"
    | "finalChargeableWeightG"
    | "dispatchedAt"
    | "deliveredAt"
  >
>;

export type ShipmentWithPackages = Shipment & {
  packages: Package[];
};

export type ShipmentListItem = Shipment & {
  packageCount: number;
};

const shipmentFields = [
  "id",
  "reference",
  "user_id AS userId",
  "warehouse_id AS warehouseId",
  "address_id AS addressId",
  "status",
  "submitted_at AS submittedAt",
  "packing_completed_at AS packingCompletedAt",
  "final_weight_g AS finalWeightG",
  "final_chargeable_weight_g AS finalChargeableWeightG",
  "dispatched_at AS dispatchedAt",
  "delivered_at AS deliveredAt",
  "version",
  "created_at AS createdAt",
  "updated_at AS updatedAt"
].join(", ");

const packageFields = [
  "p.id",
  "p.user_id AS userId",
  "p.warehouse_id AS warehouseId",
  "p.domestic_tracking_number AS domesticTrackingNumber",
  "p.description",
  "p.status",
  "p.arrived_at AS arrivedAt",
  "p.weight_g AS weightG",
  "p.version",
  "p.created_at AS createdAt",
  "p.updated_at AS updatedAt"
].join(", ");

export class ShipmentRepository {
  constructor(private readonly database: SqliteDatabase) {}

  create(input: CreateShipmentInput): Shipment {
    const id = input.id ?? createId();
    const timestamp = nowIso();

    this.database
      .prepare(
        [
          "INSERT INTO shipments (",
          "id, reference, user_id, warehouse_id, address_id, status, submitted_at,",
          "packing_completed_at, final_weight_g, final_chargeable_weight_g, dispatched_at, delivered_at, created_at, updated_at",
          ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ].join(" ")
      )
      .run(
        id,
        input.reference ?? null,
        input.userId,
        input.warehouseId,
        input.addressId ?? null,
        input.status,
        input.submittedAt ?? null,
        input.packingCompletedAt ?? null,
        input.finalWeightG ?? null,
        input.finalChargeableWeightG ?? null,
        input.dispatchedAt ?? null,
        input.deliveredAt ?? null,
        timestamp,
        timestamp
      );

    return this.findById(id) as Shipment;
  }

  findById(id: string): Shipment | undefined {
    return this.database
      .prepare("SELECT " + shipmentFields + " FROM shipments WHERE id = ?")
      .get(id) as Shipment | undefined;
  }

  listByUserId(userId: string): Shipment[] {
    return this.database
      .prepare(
        "SELECT " +
          shipmentFields +
          " FROM shipments WHERE user_id = ? ORDER BY updated_at DESC"
      )
      .all(userId) as Shipment[];
  }

  listWithPackageCountByUserId(
    userId: string,
    statuses?: ShipmentStatus[]
  ): ShipmentListItem[] {
    const statusFilter =
      statuses && statuses.length > 0
        ? " AND shipments.status IN (" + statuses.map(() => "?").join(", ") + ")"
        : "";

    return this.database
      .prepare(
        [
          "SELECT " + shipmentFields + ",",
          "(",
          "  SELECT COUNT(*) FROM shipment_packages sp",
          "  WHERE sp.shipment_id = shipments.id AND sp.released_at IS NULL",
          ") + (",
          "  SELECT COUNT(*) FROM shipment_draft_packages dp",
          "  WHERE dp.shipment_id = shipments.id",
          ") AS packageCount",
          "FROM shipments",
          "WHERE shipments.user_id = ?" + statusFilter,
          "ORDER BY shipments.updated_at DESC"
        ].join(" ")
      )
      .all(userId, ...(statuses ?? [])) as ShipmentListItem[];
  }

  update(id: string, input: UpdateShipmentInput): Shipment | undefined {
    const entries = Object.entries(input).filter(([, value]) => value !== undefined);

    if (entries.length === 0) {
      return this.findById(id);
    }

    const columnByField: Record<string, string> = {
      reference: "reference",
      addressId: "address_id",
      status: "status",
      submittedAt: "submitted_at",
      packingCompletedAt: "packing_completed_at",
      finalWeightG: "final_weight_g",
      finalChargeableWeightG: "final_chargeable_weight_g",
      dispatchedAt: "dispatched_at",
      deliveredAt: "delivered_at"
    };
    const assignments = entries.map(
      ([field]) => columnByField[field] + " = ?"
    );
    const values = entries.map(([, value]) => value);

    this.database
      .prepare(
        [
          "UPDATE shipments SET",
          assignments.join(", "),
          ", version = version + 1, updated_at = ? WHERE id = ?"
        ].join(" ")
      )
      .run(...values, nowIso(), id);

    return this.findById(id);
  }

  addPackageRelation(input: {
    id?: string;
    shipmentId: string;
    packageId: string;
    lockedAt?: string;
  }): void {
    const timestamp = input.lockedAt ?? nowIso();

    this.database
      .prepare(
        [
          "INSERT INTO shipment_packages (",
          "id, shipment_id, package_id, locked_at, created_at",
          ") VALUES (?, ?, ?, ?, ?)"
        ].join(" ")
      )
      .run(
        input.id ?? createId(),
        input.shipmentId,
        input.packageId,
        timestamp,
        timestamp
      );
  }

  hasActivePackageRelation(packageId: string): boolean {
    const row = this.database
      .prepare(
        "SELECT 1 AS existsFlag FROM shipment_packages WHERE package_id = ? AND released_at IS NULL LIMIT 1"
      )
      .get(packageId) as { existsFlag: number } | undefined;

    return Boolean(row);
  }

  addDraftPackage(shipmentId: string, packageId: string): boolean {
    const result = this.database
      .prepare(
        [
          "INSERT OR IGNORE INTO shipment_draft_packages (",
          "shipment_id, package_id, created_at",
          ") VALUES (?, ?, ?)"
        ].join(" ")
      )
      .run(shipmentId, packageId, nowIso());

    return result.changes > 0;
  }

  removeDraftPackage(shipmentId: string, packageId: string): boolean {
    const result = this.database
      .prepare(
        "DELETE FROM shipment_draft_packages WHERE shipment_id = ? AND package_id = ?"
      )
      .run(shipmentId, packageId);

    return result.changes > 0;
  }

  clearDraftPackages(shipmentId: string): string[] {
    const packages = this.listDraftPackages(shipmentId);
    this.database
      .prepare("DELETE FROM shipment_draft_packages WHERE shipment_id = ?")
      .run(shipmentId);

    return packages.map((item) => item.id);
  }

  deleteDraft(id: string): boolean {
    const result = this.database
      .prepare("DELETE FROM shipments WHERE id = ? AND status = 'DRAFT'")
      .run(id);

    return result.changes > 0;
  }

  listPackages(shipmentId: string): Package[] {
    return this.database
      .prepare(
        [
          "SELECT " + packageFields,
          "FROM shipment_packages sp",
          "JOIN packages p ON p.id = sp.package_id",
          "WHERE sp.shipment_id = ? AND sp.released_at IS NULL",
          "ORDER BY sp.locked_at ASC"
        ].join(" ")
      )
      .all(shipmentId) as Package[];
  }

  listDraftPackages(shipmentId: string): Package[] {
    return this.database
      .prepare(
        [
          "SELECT " + packageFields,
          "FROM shipment_draft_packages dp",
          "JOIN packages p ON p.id = dp.package_id",
          "WHERE dp.shipment_id = ?",
          "ORDER BY dp.created_at ASC"
        ].join(" ")
      )
      .all(shipmentId) as Package[];
  }

  countReadyPackagesForUser(userId: string): number {
    const row = this.database
      .prepare(
        "SELECT COUNT(*) AS count FROM packages WHERE user_id = ? AND status = 'READY_FOR_SHIPMENT'"
      )
      .get(userId) as { count: number };

    return row.count;
  }

  findWithPackages(id: string): ShipmentWithPackages | undefined {
    const shipment = this.findById(id);

    if (!shipment) {
      return undefined;
    }

    return {
      ...shipment,
      packages:
        shipment.status === "DRAFT"
          ? this.listDraftPackages(id)
          : this.listPackages(id)
    };
  }
}
