import type { TrackingEvent, TrackingEventType } from "../domain/index.js";
import type { SqliteDatabase } from "../db/database.js";
import { createId, nowIso } from "../utils/identifiers.js";

export type CreateTrackingEventInput = Omit<TrackingEvent, "id" | "createdAt"> & {
  id?: string;
  createdAt?: string;
};

const trackingEventFields = [
  "id",
  "shipment_id AS shipmentId",
  "event_type AS eventType",
  "display_message AS displayMessage",
  "source",
  "occurred_at AS occurredAt",
  "created_at AS createdAt"
].join(", ");

export class TrackingRepository {
  constructor(private readonly database: SqliteDatabase) {}

  create(input: CreateTrackingEventInput): TrackingEvent {
    const id = input.id ?? createId();
    const createdAt = input.createdAt ?? nowIso();

    this.database
      .prepare(
        [
          "INSERT INTO tracking_events (",
          "id, shipment_id, event_type, display_message, source, occurred_at, created_at",
          ") VALUES (?, ?, ?, ?, ?, ?, ?)"
        ].join(" ")
      )
      .run(
        id,
        input.shipmentId,
        input.eventType,
        input.displayMessage,
        input.source,
        input.occurredAt,
        createdAt
      );

    return this.findById(id) as TrackingEvent;
  }

  findById(id: string): TrackingEvent | undefined {
    return this.database
      .prepare(
        "SELECT " + trackingEventFields + " FROM tracking_events WHERE id = ?"
      )
      .get(id) as TrackingEvent | undefined;
  }

  listByShipmentId(shipmentId: string): TrackingEvent[] {
    return this.database
      .prepare(
        "SELECT " +
          trackingEventFields +
          " FROM tracking_events WHERE shipment_id = ? ORDER BY occurred_at ASC, created_at ASC"
      )
      .all(shipmentId) as TrackingEvent[];
  }
}
