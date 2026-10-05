import type { Payment, PaymentStatus } from "../domain/index.js";
import type { SqliteDatabase } from "../db/database.js";
import { createId, nowIso } from "../utils/identifiers.js";

export type CreatePaymentInput = Omit<Payment, "id" | "createdAt"> & {
  id?: string;
  createdAt?: string;
};

const paymentFields = [
  "id",
  "shipment_id AS shipmentId",
  "quote_id AS quoteId",
  "amount_minor AS amountMinor",
  "currency",
  "status",
  "provider",
  "provider_reference AS providerReference",
  "idempotency_key AS idempotencyKey",
  "created_at AS createdAt",
  "completed_at AS completedAt"
].join(", ");

export class PaymentRepository {
  constructor(private readonly database: SqliteDatabase) {}

  create(input: CreatePaymentInput): Payment {
    const id = input.id ?? createId();
    const createdAt = input.createdAt ?? nowIso();

    this.database
      .prepare(
        [
          "INSERT INTO payments (",
          "id, shipment_id, quote_id, amount_minor, currency, status, provider,",
          "provider_reference, idempotency_key, created_at, completed_at",
          ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ].join(" ")
      )
      .run(
        id,
        input.shipmentId,
        input.quoteId,
        input.amountMinor,
        input.currency,
        input.status,
        input.provider,
        input.providerReference,
        input.idempotencyKey,
        createdAt,
        input.completedAt
      );

    return this.findById(id) as Payment;
  }

  findById(id: string): Payment | undefined {
    return this.database
      .prepare("SELECT " + paymentFields + " FROM payments WHERE id = ?")
      .get(id) as Payment | undefined;
  }

  listByShipmentId(shipmentId: string): Payment[] {
    return this.database
      .prepare(
        "SELECT " +
          paymentFields +
          " FROM payments WHERE shipment_id = ? ORDER BY created_at ASC"
      )
      .all(shipmentId) as Payment[];
  }

  updateStatus(
    id: string,
    status: PaymentStatus,
    completedAt: string | null
  ): Payment | undefined {
    this.database
      .prepare(
        "UPDATE payments SET status = ?, completed_at = ? WHERE id = ?"
      )
      .run(status, completedAt, id);

    return this.findById(id);
  }
}
