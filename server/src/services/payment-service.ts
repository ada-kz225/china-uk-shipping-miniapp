import type { SqliteDatabase } from "../db/database.js";
import {
  type Payment,
  type Quote,
  type Shipment,
  PaymentStatus,
  ShipmentStatus
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
import { AppError } from "../utils/app-error.js";
import { nowIso } from "../utils/identifiers.js";

export type MockPaymentOutcome = "success" | "failure";

export class PaymentService {
  constructor(
    private readonly database: SqliteDatabase,
    private readonly shipmentRepository: ShipmentRepository,
    private readonly quoteRepository: QuoteRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly exceptionRepository: ExceptionRepository,
    private readonly auditLogRepository: AuditLogRepository
  ) {}

  createPaymentAttempt(
    userId: string,
    shipmentId: string,
    idempotencyKey: string
  ): Payment {
    return this.markPaymentProcessing(userId, shipmentId, idempotencyKey);
  }

  markPaymentProcessing(
    userId: string,
    shipmentId: string,
    idempotencyKey: string
  ): Payment {
    return this.database.transaction(() => {
      const existing = this.paymentRepository.findByIdempotencyKey(idempotencyKey);

      if (existing) {
        if (existing.shipmentId !== shipmentId) {
          throw new AppError("INVALID_INPUT", 400, "付款请求标识无效。");
        }
        return existing;
      }

      const shipment = this.findRequiredShipment(shipmentId);
      this.validateOwnership(userId, shipment);

      if (this.paymentRepository.hasSucceededPayment(shipment.id)) {
        throw new AppError(
          "PAYMENT_ALREADY_COMPLETED",
          409,
          "本次转运已完成付款，无需重复操作。"
        );
      }

      this.ensureAwaitingPayment(shipment);
      this.ensureNoBlockingException(shipment.id);

      const quote = this.findRequiredQuote(shipment.id);
      const nextStatus = validateShipmentStatusTransition(
        shipment.status,
        ShipmentEvent.START_PAYMENT
      );
      const payment = this.paymentRepository.create({
        shipmentId: shipment.id,
        quoteId: quote.id,
        amountMinor: quote.totalAmountMinor,
        currency: quote.currency,
        status: PaymentStatus.PROCESSING,
        provider: "MOCK_PAYMENT",
        providerReference: null,
        idempotencyKey,
        completedAt: null
      });
      this.shipmentRepository.update(shipment.id, { status: nextStatus });
      this.auditLogRepository.create({
        actorType: "USER",
        actorId: userId,
        action: "PAYMENT_ATTEMPT_CREATED",
        entityType: "SHIPMENT",
        entityId: shipment.id,
        metadata: { paymentId: payment.id, amountMinor: payment.amountMinor }
      });

      return payment;
    })();
  }

  markPaymentSuccess(paymentId: string, actorId = "mock-payment"): Payment {
    return this.resolvePayment(paymentId, "success", actorId);
  }

  markPaymentFailure(paymentId: string, actorId = "mock-payment"): Payment {
    return this.resolvePayment(paymentId, "failure", actorId);
  }

  createMockPayment(
    shipmentId: string,
    outcome: MockPaymentOutcome,
    idempotencyKey: string
  ): Payment {
    const shipment = this.findRequiredShipment(shipmentId);
    const payment = this.createPaymentAttempt(
      shipment.userId,
      shipment.id,
      idempotencyKey
    );

    return outcome === "success"
      ? this.markPaymentSuccess(payment.id, "mock-ops")
      : this.markPaymentFailure(payment.id, "mock-ops");
  }

  private resolvePayment(
    paymentId: string,
    outcome: MockPaymentOutcome,
    actorId: string
  ): Payment {
    return this.database.transaction(() => {
      const payment = this.findRequiredPayment(paymentId);

      if (payment.status === PaymentStatus.SUCCEEDED && outcome === "success") {
        return payment;
      }

      if (payment.status !== PaymentStatus.PROCESSING) {
        throw new AppError(
          "INVALID_SHIPMENT_STATE",
          409,
          "当前付款记录不处于处理中，无法更新付款结果。"
        );
      }

      const shipment = this.findRequiredShipment(payment.shipmentId);
      const quote = this.findRequiredQuote(shipment.id);

      if (
        shipment.status !== ShipmentStatus.PAYMENT_PROCESSING ||
        payment.quoteId !== quote.id ||
        payment.amountMinor !== quote.totalAmountMinor ||
        payment.currency !== quote.currency
      ) {
        throw new AppError("INVALID_AMOUNT", 409, "付款金额与当前报价不一致。");
      }

      const event =
        outcome === "success"
          ? ShipmentEvent.PAYMENT_SUCCEEDED
          : ShipmentEvent.PAYMENT_FAILED;
      const nextStatus = validateShipmentStatusTransition(shipment.status, event);
      const resolved = this.paymentRepository.updateStatus(
        payment.id,
        outcome === "success" ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED,
        nowIso(),
        outcome === "success" ? "mock-success" : "mock-failure"
      ) as Payment;
      this.shipmentRepository.update(shipment.id, { status: nextStatus });
      this.auditLogRepository.create({
        actorType: outcome === "success" ? "SYSTEM" : "MOCK_OPS",
        actorId,
        action: outcome === "success" ? "PAYMENT_SUCCEEDED" : "PAYMENT_FAILED",
        entityType: "SHIPMENT",
        entityId: shipment.id,
        metadata: { paymentId: payment.id, amountMinor: payment.amountMinor }
      });

      return resolved;
    })();
  }

  private findRequiredPayment(paymentId: string): Payment {
    const payment = this.paymentRepository.findById(paymentId);

    if (!payment) {
      throw new AppError("PAYMENT_FAILED", 404, "未找到付款记录。");
    }

    return payment;
  }

  private findRequiredShipment(shipmentId: string): Shipment {
    const shipment = this.shipmentRepository.findById(shipmentId);

    if (!shipment) {
      throw new AppError("SHIPMENT_NOT_FOUND", 404, "未找到该转运单。");
    }

    return shipment;
  }

  private findRequiredQuote(shipmentId: string): Quote {
    const quote = this.quoteRepository.findByShipmentId(shipmentId);

    if (!quote) {
      throw new AppError("QUOTE_NOT_READY", 409, "当前转运单尚未生成最终报价。");
    }

    return quote;
  }

  private ensureAwaitingPayment(shipment: Shipment): void {
    if (shipment.status !== ShipmentStatus.AWAITING_PAYMENT) {
      throw new AppError(
        "INVALID_SHIPMENT_STATE",
        409,
        "当前转运单暂不能发起付款。"
      );
    }
  }

  private ensureNoBlockingException(shipmentId: string): void {
    if (this.exceptionRepository.findOpenByShipmentId(shipmentId)?.isBlocking) {
      throw new AppError(
        "PAYMENT_FAILED",
        409,
        "当前转运单存在需要处理的问题，暂不能付款。"
      );
    }
  }

  private validateOwnership(userId: string, shipment: Shipment): void {
    if (shipment.userId !== userId) {
      throw new AppError("FORBIDDEN", 403, "你无权操作此转运单。");
    }
  }
}
