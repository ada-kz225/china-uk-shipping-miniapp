import type { SqliteDatabase } from "../db/database.js";
import {
  type Shipment,
  PaymentStatus,
  ShipmentStatus,
  TrackingEventType
} from "../domain/index.js";
import {
  ShipmentEvent,
  validateShipmentStatusTransition
} from "../domain/shipment-state-machine.js";
import { AuditLogRepository } from "../repositories/audit-log-repository.js";
import { ExceptionRepository } from "../repositories/exception-repository.js";
import { PaymentRepository } from "../repositories/payment-repository.js";
import { QuoteRepository } from "../repositories/quote-repository.js";
import { ShipmentRepository } from "../repositories/shipment-repository.js";
import { TrackingRepository } from "../repositories/tracking-repository.js";
import { AppError } from "../utils/app-error.js";
import { nowIso } from "../utils/identifiers.js";

/**
 * Records the physical warehouse departure fact. This service deliberately
 * does not run as part of payment settlement: a successful payment only makes
 * a shipment eligible for dispatch.
 */
export class DispatchService {
  constructor(
    private readonly database: SqliteDatabase,
    private readonly shipmentRepository: ShipmentRepository,
    private readonly quoteRepository: QuoteRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly exceptionRepository: ExceptionRepository,
    private readonly trackingRepository: TrackingRepository,
    private readonly auditLogRepository: AuditLogRepository
  ) {}

  validateDispatchEligibility(shipmentId: string): Shipment {
    const shipment = this.findRequiredShipment(shipmentId);

    if (shipment.status === ShipmentStatus.DELIVERED) {
      throw new AppError(
        "SHIPMENT_ALREADY_DELIVERED",
        409,
        "该转运单已签收，不能再次出库。"
      );
    }

    if (!this.paymentRepository.hasSucceededPayment(shipment.id)) {
      throw new AppError(
        "PAYMENT_REQUIRED",
        409,
        "付款成功后才能安排仓库出库。"
      );
    }

    if (shipment.status !== ShipmentStatus.PAID_AWAITING_DISPATCH) {
      throw new AppError(
        "DISPATCH_NOT_ALLOWED",
        409,
        "当前转运单不处于等待仓库发出的阶段，暂不能出库。"
      );
    }

    if (!this.quoteRepository.findByShipmentId(shipment.id)) {
      throw new AppError(
        "DISPATCH_NOT_ALLOWED",
        409,
        "当前转运单缺少最终报价，暂不能出库。"
      );
    }

    if (
      !shipment.packingCompletedAt ||
      !shipment.finalWeightG ||
      !shipment.finalChargeableWeightG
    ) {
      throw new AppError(
        "DISPATCH_NOT_ALLOWED",
        409,
        "仓库尚未完成打包和最终重量确认，暂不能出库。"
      );
    }

    if (this.exceptionRepository.findOpenByShipmentId(shipment.id)?.isBlocking) {
      throw new AppError(
        "DISPATCH_NOT_ALLOWED",
        409,
        "当前转运单存在需要处理的问题，暂不能出库。"
      );
    }

    return shipment;
  }

  dispatchShipment(
    shipmentId: string,
    actorId = "mock-ops",
    dispatchedAt = nowIso()
  ): Shipment {
    return this.database.transaction(() => {
      const shipment = this.validateDispatchEligibility(shipmentId);
      const nextStatus = validateShipmentStatusTransition(
        shipment.status,
        ShipmentEvent.DISPATCH_SHIPMENT
      );
      const updated = this.shipmentRepository.update(shipment.id, {
        status: nextStatus,
        dispatchedAt
      }) as Shipment;

      this.trackingRepository.create({
        shipmentId: shipment.id,
        eventType: TrackingEventType.DISPATCHED,
        displayMessage: "已从中国仓库发出",
        source: "MOCK_OPS",
        occurredAt: dispatchedAt
      });
      this.auditLogRepository.create({
        actorType: "MOCK_OPS",
        actorId,
        action: "SHIPMENT_DISPATCHED",
        entityType: "SHIPMENT",
        entityId: shipment.id,
        metadata: { from: shipment.status, to: updated.status, dispatchedAt }
      });

      return updated;
    })();
  }

  private findRequiredShipment(shipmentId: string): Shipment {
    const shipment = this.shipmentRepository.findById(shipmentId);

    if (!shipment) {
      throw new AppError("SHIPMENT_NOT_FOUND", 404, "未找到该转运单。");
    }

    return shipment;
  }
}
