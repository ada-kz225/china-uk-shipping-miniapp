import type { SqliteDatabase } from "../db/database.js";
import { createId, nowIso } from "../utils/identifiers.js";

export type CreateAuditLogInput = {
  actorType: "USER" | "MOCK_OPS" | "SYSTEM";
  actorId?: string | null;
  action: string;
  entityType: "PACKAGE" | "SHIPMENT";
  entityId: string;
  metadata?: Record<string, unknown>;
};

export class AuditLogRepository {
  constructor(private readonly database: SqliteDatabase) {}

  create(input: CreateAuditLogInput): void {
    this.database
      .prepare(
        [
          "INSERT INTO audit_logs (",
          "id, actor_type, actor_id, action, entity_type, entity_id, metadata, created_at",
          ") VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ].join(" ")
      )
      .run(
        createId(),
        input.actorType,
        input.actorId ?? null,
        input.action,
        input.entityType,
        input.entityId,
        input.metadata ? JSON.stringify(input.metadata) : null,
        nowIso()
      );
  }

  listByEntity(entityType: "PACKAGE" | "SHIPMENT", entityId: string): Array<{
    action: string;
    actorType: string;
    createdAt: string;
  }> {
    return this.database
      .prepare(
        [
          "SELECT action, actor_type AS actorType, created_at AS createdAt",
          "FROM audit_logs",
          "WHERE entity_type = ? AND entity_id = ?",
          "ORDER BY created_at ASC"
        ].join(" ")
      )
      .all(entityType, entityId) as Array<{
      action: string;
      actorType: string;
      createdAt: string;
    }>;
  }
}
