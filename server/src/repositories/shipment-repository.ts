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
  finalChargeableWeightG?: number | null;
  dispatchedAt?: string | null;
};

export type UpdateShipmentInput = Partial<
  Pick<
    Shipment,
    | "reference"
    | "addressId"
    | "status"
    | "submittedAt"
    | "packingCompletedAt"
    | "finalChargeableWeightG"
    | "dispatchedAt"
  >
>;

const shipmentFields = [
  "id",
  "reference",
  "user_id AS userId",
  "warehouse_id AS warehouseId",
  "address_id AS addressId",
  "status",
  "submitted_at AS submittedAt",
  "packing_completed_at AS packingCompletedAt",
  "final_chargeable_weight_g AS finalChargeableWeightG",
  "dispatched_at AS dispatchedAt",
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
          "packing_completed_at, final_chargeable_weight_g, dispatched_at, created_at, updated_at",
          ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
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
        input.finalChargeableWeightG ?? null,
        input.dispatchedAt ?? null,
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
      finalChargeableWeightG: "final_chargeable_weight_g",
      dispatchedAt: "dispatched_at"
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

  findWithPackages(
    id: string
  ): (Shipment & { packages: Package[] }) | undefined {
    const shipment = this.findById(id);

    if (!shipment) {
      return undefined;
    }

    return {
      ...shipment,
      packages: this.listPackages(id)
    };
  }
}
