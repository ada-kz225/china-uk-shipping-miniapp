import type { SqliteDatabase } from "../db/database.js";
import {
  type Quote,
  type Shipment,
  ShipmentStatus
} from "../domain/index.js";
import {
  ShipmentEvent,
  validateShipmentStatusTransition
} from "../domain/shipment-state-machine.js";
import { AuditLogRepository } from "../repositories/audit-log-repository.js";
import { ExceptionRepository } from "../repositories/exception-repository.js";
import { QuoteRepository } from "../repositories/quote-repository.js";
import { ShipmentRepository } from "../repositories/shipment-repository.js";
import { AppError } from "../utils/app-error.js";

export type RecordFinalWeightInput = {
  finalWeightG: number;
  chargeableWeightG?: number;
};

export type GenerateQuoteInput = {
  shippingFeeMinor: number;
  serviceFeeMinor: number;
  currency: string;
};

const maximumWeightG = 100_000;

export class QuoteService {
  constructor(
    private readonly database: SqliteDatabase,
    private readonly shipmentRepository: ShipmentRepository,
    private readonly quoteRepository: QuoteRepository,
    private readonly exceptionRepository: ExceptionRepository,
    private readonly auditLogRepository: AuditLogRepository
  ) {}

  recordFinalWeight(
    shipmentId: string,
    input: RecordFinalWeightInput,
    actorId = "mock-ops"
  ): Shipment {
    const finalWeightG = validateWeight(input.finalWeightG, "finalWeightG");
    const chargeableWeightG = validateWeight(
      input.chargeableWeightG ?? finalWeightG,
      "chargeableWeightG"
    );

    return this.database.transaction(() => {
      const shipment = this.findRequiredShipment(shipmentId);
      this.ensureWarehouseProcessing(shipment);
      this.ensureNoBlockingException(shipment.id);

      const updated = this.shipmentRepository.update(shipment.id, {
        finalWeightG,
        finalChargeableWeightG: chargeableWeightG,
        packingCompletedAt: new Date().toISOString()
      }) as Shipment;

      this.auditLogRepository.create({
        actorType: "MOCK_OPS",
        actorId,
        action: "FINAL_WEIGHT_RECORDED",
        entityType: "SHIPMENT",
        entityId: shipment.id,
        metadata: { finalWeightG, chargeableWeightG }
      });

      return updated;
    })();
  }

  generateQuote(
    shipmentId: string,
    input: GenerateQuoteInput,
    actorId = "mock-ops"
  ): Quote {
    const currency = validateCurrency(input.currency);
    const shippingFeeMinor = validateAmount(
      input.shippingFeeMinor,
      "shippingFeeMinor"
    );
    const serviceFeeMinor = validateAmount(
      input.serviceFeeMinor,
      "serviceFeeMinor"
    );

    return this.database.transaction(() => {
      const shipment = this.findRequiredShipment(shipmentId);

      if (this.quoteRepository.findByShipmentId(shipment.id)) {
        throw new AppError(
          "QUOTE_ALREADY_EXISTS",
          409,
          "本次转运已有最终报价，不能重复生成。"
        );
      }

      this.ensureWarehouseProcessing(shipment);
      this.ensureNoBlockingException(shipment.id);

      if (
        !shipment.packingCompletedAt ||
        !shipment.finalWeightG ||
        !shipment.finalChargeableWeightG
      ) {
        throw new AppError(
          "QUOTE_NOT_READY",
          409,
          "请先完成打包并记录最终重量后再生成报价。"
        );
      }

      const totalAmountMinor = shippingFeeMinor + serviceFeeMinor;
      const quote = this.quoteRepository.create({
        shipmentId: shipment.id,
        finalWeightG: shipment.finalWeightG,
        chargeableWeightG: shipment.finalChargeableWeightG,
        shippingFeeMinor,
        serviceFeeMinor,
        totalAmountMinor,
        currency,
        source: "MOCK_OPS"
      });
      const nextStatus = validateShipmentStatusTransition(
        shipment.status,
        ShipmentEvent.GENERATE_QUOTE
      );
      this.shipmentRepository.update(shipment.id, { status: nextStatus });
      this.auditLogRepository.create({
        actorType: "MOCK_OPS",
        actorId,
        action: "QUOTE_GENERATED",
        entityType: "SHIPMENT",
        entityId: shipment.id,
        metadata: {
          quoteId: quote.id,
          finalWeightG: quote.finalWeightG,
          chargeableWeightG: quote.chargeableWeightG,
          totalAmountMinor: quote.totalAmountMinor,
          currency: quote.currency
        }
      });

      return quote;
    })();
  }

  getQuote(shipmentId: string): Quote {
    const quote = this.quoteRepository.findByShipmentId(shipmentId);

    if (!quote) {
      throw new AppError("QUOTE_NOT_READY", 404, "当前转运单尚未生成最终报价。");
    }

    return quote;
  }

  private findRequiredShipment(shipmentId: string): Shipment {
    const shipment = this.shipmentRepository.findById(shipmentId);

    if (!shipment) {
      throw new AppError("SHIPMENT_NOT_FOUND", 404, "未找到该转运单。");
    }

    return shipment;
  }

  private ensureWarehouseProcessing(shipment: Shipment): void {
    if (shipment.status !== ShipmentStatus.WAREHOUSE_PROCESSING) {
      throw new AppError(
        "INVALID_SHIPMENT_STATE",
        409,
        "当前转运单不处于仓库处理阶段，暂不能执行此操作。"
      );
    }
  }

  private ensureNoBlockingException(shipmentId: string): void {
    if (this.exceptionRepository.findOpenByShipmentId(shipmentId)?.isBlocking) {
      throw new AppError(
        "WORKFLOW_BLOCKED_BY_EXCEPTION",
        409,
        "当前存在需要处理的问题，暂不能生成报价。"
      );
    }
  }
}

function validateWeight(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0 || value > maximumWeightG) {
    throw new AppError(
      "INVALID_WEIGHT",
      400,
      "重量需为 1 至 100000 克之间的整数。",
      [{ field, message: "重量需为 1 至 100000 克之间的整数。" }]
    );
  }

  return value;
}

function validateAmount(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 10_000_000) {
    throw new AppError(
      "INVALID_AMOUNT",
      400,
      "金额格式不正确。",
      [{ field, message: "金额必须为非负整数。" }]
    );
  }

  return value;
}

function validateCurrency(value: string): string {
  const currency = value.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new AppError("INVALID_AMOUNT", 400, "币种格式不正确。", [
      { field: "currency", message: "币种必须为三位大写字母。" }
    ]);
  }

  return currency;
}
