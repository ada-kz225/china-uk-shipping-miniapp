import type {
  DomainException,
  ExceptionStatus
} from "../domain/index.js";
import type { SqliteDatabase } from "../db/database.js";
import { createId, nowIso } from "../utils/identifiers.js";

export type CreateExceptionInput = Omit<
  DomainException,
  "id" | "createdAt" | "updatedAt" | "resolvedAt"
> & {
  id?: string;
  createdAt?: string;
  resolvedAt?: string | null;
};

const exceptionFields = [
  "id",
  "package_id AS packageId",
  "shipment_id AS shipmentId",
  "type",
  "status",
  "title",
  "description",
  "impact",
  "required_action AS requiredAction",
  "resume_state AS resumeState",
  "is_blocking AS isBlocking",
  "created_at AS createdAt",
  "updated_at AS updatedAt",
  "resolved_at AS resolvedAt"
].join(", ");

type ExceptionRow = Omit<DomainException, "isBlocking"> & {
  isBlocking: number;
};

export class ExceptionRepository {
  constructor(private readonly database: SqliteDatabase) {}

  create(input: CreateExceptionInput): DomainException {
    const id = input.id ?? createId();
    const createdAt = input.createdAt ?? nowIso();

    this.database
      .prepare(
        [
          "INSERT INTO exceptions (",
          "id, package_id, shipment_id, type, status, title, description, impact,",
          "required_action, resume_state, is_blocking, created_at, updated_at, resolved_at",
          ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ].join(" ")
      )
      .run(
        id,
        input.packageId,
        input.shipmentId,
        input.type,
        input.status,
        input.title,
        input.description,
        input.impact,
        input.requiredAction,
        input.resumeState,
        input.isBlocking ? 1 : 0,
        createdAt,
        createdAt,
        input.resolvedAt ?? null
      );

    return this.findById(id) as DomainException;
  }

  findById(id: string): DomainException | undefined {
    const result = this.database
      .prepare("SELECT " + exceptionFields + " FROM exceptions WHERE id = ?")
      .get(id) as ExceptionRow | undefined;

    return result ? { ...result, isBlocking: Boolean(result.isBlocking) } : undefined;
  }

  listByPackageId(packageId: string): DomainException[] {
    return this.listBy("package_id", packageId);
  }

  findOpenByPackageId(packageId: string): DomainException | undefined {
    const row = this.database
      .prepare(
        "SELECT " +
          exceptionFields +
          " FROM exceptions WHERE package_id = ? AND status = 'OPEN' ORDER BY created_at DESC LIMIT 1"
      )
      .get(packageId) as ExceptionRow | undefined;

    return row ? { ...row, isBlocking: Boolean(row.isBlocking) } : undefined;
  }

  findOpenByShipmentId(shipmentId: string): DomainException | undefined {
    const row = this.database
      .prepare(
        "SELECT " +
          exceptionFields +
          " FROM exceptions WHERE shipment_id = ? AND status = 'OPEN' ORDER BY created_at DESC LIMIT 1"
      )
      .get(shipmentId) as ExceptionRow | undefined;

    return row ? { ...row, isBlocking: Boolean(row.isBlocking) } : undefined;
  }

  listByShipmentId(shipmentId: string): DomainException[] {
    return this.listBy("shipment_id", shipmentId);
  }

  updateStatus(
    id: string,
    status: ExceptionStatus,
    resolvedAt: string | null
  ): DomainException | undefined {
    this.database
      .prepare(
        "UPDATE exceptions SET status = ?, resolved_at = ?, updated_at = ? WHERE id = ?"
      )
      .run(status, resolvedAt, nowIso(), id);

    return this.findById(id);
  }

  private listBy(column: "package_id" | "shipment_id", id: string): DomainException[] {
    const rows = this.database
      .prepare(
        "SELECT " +
          exceptionFields +
          " FROM exceptions WHERE " +
          column +
          " = ? ORDER BY created_at DESC"
      )
      .all(id) as ExceptionRow[];

    return rows.map((row) => ({
      ...row,
      isBlocking: Boolean(row.isBlocking)
    }));
  }
}
