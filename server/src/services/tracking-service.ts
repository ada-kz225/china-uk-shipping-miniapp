import type { SqliteDatabase } from "../db/database.js";
import {
  type Shipment,
  type TrackingEvent,
  ShipmentStatus,
  TrackingEventType
} from "../domain/index.js";
import {
  ShipmentEvent,
  validateShipmentStatusTransition
} from "../domain/shipment-state-machine.js";
import { AuditLogRepository } from "../repositories/audit-log-repository.js";
import { ExceptionRepository } from "../repositories/exception-repository.js";
import { ShipmentRepository } from "../repositories/shipment-repository.js";
import { TrackingRepository } from "../repositories/tracking-repository.js";
import { AppError } from "../utils/app-error.js";
import { nowIso } from "../utils/identifiers.js";

type TrackingStage =
  | TrackingEventType.INTERNATIONAL_TRANSIT
  | TrackingEventType.CUSTOMS_CLEARANCE
  | TrackingEventType.UK_LAST_MILE
  | TrackingEventType.DELIVERED;

type TrackingStageDefinition = {
  shipmentEvent: ShipmentEvent;
  displayMessage: string;
  description: string;
  auditAction: string;
};

const trackingStages: Record<TrackingStage, TrackingStageDefinition> = {
  [TrackingEventType.INTERNATIONAL_TRANSIT]: {
    shipmentEvent: ShipmentEvent.ENTER_INTERNATIONAL_TRANSIT,
    displayMessage: "国际运输中",
    description: "转运单正在跨境运输中。",
    auditAction: "INTERNATIONAL_TRANSIT_STARTED"
  },
  [TrackingEventType.CUSTOMS_CLEARANCE]: {
    shipmentEvent: ShipmentEvent.ENTER_CUSTOMS_CLEARANCE,
    displayMessage: "清关处理中",
    description: "转运单正在清关阶段。",
    auditAction: "CUSTOMS_CLEARANCE_STARTED"
  },
  [TrackingEventType.UK_LAST_MILE]: {
    shipmentEvent: ShipmentEvent.ENTER_UK_LAST_MILE,
    displayMessage: "英国派送中",
    description: "转运单已进入英国本地派送阶段。",
    auditAction: "UK_LAST_MILE_STARTED"
  },
  [TrackingEventType.DELIVERED]: {
    shipmentEvent: ShipmentEvent.MARK_DELIVERED,
    displayMessage: "已签收",
    description: "已收到签收事件，本次转运已完成。",
    auditAction: "SHIPMENT_DELIVERED"
  }
};

/** Appends ordered, user-visible fulfillment facts after warehouse dispatch. */
export class TrackingService {
  constructor(
    private readonly database: SqliteDatabase,
    private readonly shipmentRepository: ShipmentRepository,
    private readonly exceptionRepository: ExceptionRepository,
    private readonly trackingRepository: TrackingRepository,
    private readonly auditLogRepository: AuditLogRepository
  ) {}

  appendTrackingEvent(input: {
    shipmentId: string;
    eventType: TrackingStage;
    displayMessage: string;
    occurredAt: string;
  }): TrackingEvent {
    this.ensureEventIsNotEarlierThanTimeline(input.shipmentId, input.occurredAt);

    return this.trackingRepository.create({
      ...input,
      source: "MOCK_OPS"
    });
  }

  advanceShipmentStage(
    shipmentId: string,
    stage: TrackingStage,
    actorId = "mock-ops",
    occurredAt = nowIso()
  ): Shipment {
    return this.database.transaction(() => {
      const shipment = this.findRequiredShipment(shipmentId);

      if (shipment.status === ShipmentStatus.DELIVERED) {
        throw new AppError(
          "SHIPMENT_ALREADY_DELIVERED",
          409,
          "该转运单已签收，不能继续更新运输进度。"
        );
      }

      if (this.exceptionRepository.findOpenByShipmentId(shipment.id)?.isBlocking) {
      throw new AppError(
          "WORKFLOW_BLOCKED_BY_EXCEPTION",
          409,
          "当前转运单存在需要处理的问题，暂不能更新运输进度。"
        );
      }

      const definition = trackingStages[stage];
      const nextStatus = this.validateTrackingTransition(
        shipment.status,
        definition.shipmentEvent
      );
      const updated = this.shipmentRepository.update(shipment.id, {
        status: nextStatus,
        ...(stage === TrackingEventType.DELIVERED ? { deliveredAt: occurredAt } : {})
      }) as Shipment;
      this.appendTrackingEvent({
        shipmentId: shipment.id,
        eventType: stage,
        displayMessage: definition.displayMessage,
        occurredAt
      });
      this.auditLogRepository.create({
        actorType: "MOCK_OPS",
        actorId,
        action: definition.auditAction,
        entityType: "SHIPMENT",
        entityId: shipment.id,
        metadata: { from: shipment.status, to: updated.status, occurredAt }
      });

      return updated;
    })();
  }

  listTrackingEvents(shipmentId: string): TrackingEvent[] {
    this.findRequiredShipment(shipmentId);
    return this.trackingRepository.listByShipmentId(shipmentId);
  }

  private validateTrackingTransition(
    status: ShipmentStatus,
    event: ShipmentEvent
  ): ShipmentStatus {
    try {
      return validateShipmentStatusTransition(status, event);
    } catch (error) {
      if (error instanceof AppError && error.code === "INVALID_SHIPMENT_STATE") {
        throw new AppError(
          "TRACKING_TRANSITION_NOT_ALLOWED",
          409,
          "当前运输阶段不支持此进度更新，请按顺序推进。"
        );
      }

      throw error;
    }
  }

  private ensureEventIsNotEarlierThanTimeline(
    shipmentId: string,
    occurredAt: string
  ): void {
    const events = this.trackingRepository.listByShipmentId(shipmentId);
    const latest = events.at(-1);

    if (latest && occurredAt < latest.occurredAt) {
      throw new AppError(
        "INVALID_INPUT",
        400,
        "运输事件时间不能早于已有进度。"
      );
    }
  }

  private findRequiredShipment(shipmentId: string): Shipment {
    const shipment = this.shipmentRepository.findById(shipmentId);

    if (!shipment) {
      throw new AppError("SHIPMENT_NOT_FOUND", 404, "未找到该转运单。");
    }

    return shipment;
  }
}

export function getTrackingEventDescription(eventType: TrackingEventType): string {
  const descriptions: Record<TrackingEventType, string> = {
    [TrackingEventType.DISPATCHED]: "仓库已确认本次转运实际离仓。",
    [TrackingEventType.INTERNATIONAL_TRANSIT]:
      trackingStages[TrackingEventType.INTERNATIONAL_TRANSIT].description,
    [TrackingEventType.CUSTOMS_CLEARANCE]:
      trackingStages[TrackingEventType.CUSTOMS_CLEARANCE].description,
    [TrackingEventType.UK_LAST_MILE]:
      trackingStages[TrackingEventType.UK_LAST_MILE].description,
    [TrackingEventType.DELIVERED]: trackingStages[TrackingEventType.DELIVERED].description
  };

  return descriptions[eventType];
}
