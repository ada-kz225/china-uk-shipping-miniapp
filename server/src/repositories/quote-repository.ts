import type { Quote } from "../domain/index.js";
import type { SqliteDatabase } from "../db/database.js";
import { createId, nowIso } from "../utils/identifiers.js";

export type CreateQuoteInput = Omit<Quote, "id" | "createdAt"> & {
  id?: string;
  createdAt?: string;
};

const quoteFields = [
  "id",
  "shipment_id AS shipmentId",
  "final_weight_g AS finalWeightG",
  "chargeable_weight_g AS chargeableWeightG",
  "shipping_fee_minor AS shippingFeeMinor",
  "service_fee_minor AS serviceFeeMinor",
  "total_amount_minor AS totalAmountMinor",
  "currency",
  "source",
  "created_at AS createdAt"
].join(", ");

export class QuoteRepository {
  constructor(private readonly database: SqliteDatabase) {}

  create(input: CreateQuoteInput): Quote {
    const id = input.id ?? createId();
    const createdAt = input.createdAt ?? nowIso();

    this.database
      .prepare(
        [
          "INSERT INTO quotes (",
          "id, shipment_id, final_weight_g, chargeable_weight_g,",
          "shipping_fee_minor, service_fee_minor, total_amount_minor,",
          "currency, source, created_at",
          ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ].join(" ")
      )
      .run(
        id,
        input.shipmentId,
        input.finalWeightG,
        input.chargeableWeightG,
        input.shippingFeeMinor,
        input.serviceFeeMinor,
        input.totalAmountMinor,
        input.currency,
        input.source,
        createdAt
      );

    return this.findById(id) as Quote;
  }

  findById(id: string): Quote | undefined {
    return this.database
      .prepare("SELECT " + quoteFields + " FROM quotes WHERE id = ?")
      .get(id) as Quote | undefined;
  }

  findByShipmentId(shipmentId: string): Quote | undefined {
    return this.database
      .prepare("SELECT " + quoteFields + " FROM quotes WHERE shipment_id = ?")
      .get(shipmentId) as Quote | undefined;
  }

  list(): Quote[] {
    return this.database
      .prepare("SELECT " + quoteFields + " FROM quotes ORDER BY created_at DESC")
      .all() as Quote[];
  }
}
