import { createId, nowIso } from "../utils/identifiers.js";
import type { SqliteDatabase } from "../db/database.js";
import type {
  Address,
  Package,
  Payment,
  Quote,
  Shipment,
  ShipmentStatus
} from "../domain/index.js";
import {
  PackageStatus,
  ShipmentStatus as ShipmentStatusValue
} from "../domain/index.js";
import {
  ShipmentEvent,
  validateShipmentStatusTransition
} from "../domain/shipment-state-machine.js";
import { AddressRepository } from "../repositories/address-repository.js";
import { AuditLogRepository } from "../repositories/audit-log-repository.js";
import { ExceptionRepository } from "../repositories/exception-repository.js";
import { PackageRepository } from "../repositories/package-repository.js";
import { PaymentRepository } from "../repositories/payment-repository.js";
import { QuoteRepository } from "../repositories/quote-repository.js";
import {
  ShipmentRepository,
  type ShipmentListItem,
  type ShipmentWithPackages
} from "../repositories/shipment-repository.js";
import { AppError, type FieldError } from "../utils/app-error.js";

export type UKAddressInput = {
  recipientName: string;
  phone: string;
  postcode: string;
  addressLine: string;
};

export type ShipmentScope = "active" | "history";

export type ShipmentDetails = ShipmentWithPackages & {
  address: Address | undefined;
  readyPackageCount: number;
  quote: Quote | undefined;
  latestPayment: Payment | undefined;
};

const historyStatuses = [
  ShipmentStatusValue.DELIVERED,
  ShipmentStatusValue.CANCELLED
];

export class ShipmentService {
  constructor(
    private readonly database: SqliteDatabase,
    private readonly shipmentRepository: ShipmentRepository,
    private readonly packageRepository: PackageRepository,
    private readonly exceptionRepository: ExceptionRepository,
    private readonly addressRepository: AddressRepository,
    private readonly quoteRepository: QuoteRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly auditLogRepository: AuditLogRepository
  ) {}

  createDraft(userId: string, packageIds: string[]): ShipmentDetails {
    return this.database.transaction(() => {
      const packages = this.validatePackageEligibility(userId, packageIds);
      const shipment = this.shipmentRepository.create({
        userId,
        warehouseId: packages[0].warehouseId,
        status: ShipmentStatusValue.DRAFT
      });

      this.auditLogRepository.create({
        actorType: "USER",
        actorId: userId,
        action: "SHIPMENT_DRAFT_CREATED",
        entityType: "SHIPMENT",
        entityId: shipment.id,
        metadata: { packageCount: packages.length }
      });

      this.addPackagesToDraft(shipment, packages, userId);
      return this.getShipment(userId, shipment.id);
    })();
  }

  getShipment(userId: string, shipmentId: string): ShipmentDetails {
    const shipment = this.findRequiredShipment(shipmentId);
    this.validateOwnership(userId, shipment);
    const entity = this.shipmentRepository.findWithPackages(shipmentId) as ShipmentWithPackages;

    return {
      ...entity,
      address: entity.addressId
        ? this.addressRepository.findById(entity.addressId)
        : undefined,
      readyPackageCount: this.shipmentRepository.countReadyPackagesForUser(userId),
      quote: this.quoteRepository.findByShipmentId(entity.id),
      latestPayment: this.paymentRepository.findLatestByShipmentId(entity.id)
    };
  }

  listShipments(
    userId: string,
    scope: ShipmentScope = "active"
  ): ShipmentListItem[] {
    if (scope === "history") {
      return this.shipmentRepository.listWithPackageCountByUserId(
        userId,
        historyStatuses
      );
    }

    return this.shipmentRepository
      .listWithPackageCountByUserId(userId)
      .filter((shipment) => !historyStatuses.includes(shipment.status));
  }

  addPackages(
    userId: string,
    shipmentId: string,
    packageIds: string[]
  ): ShipmentDetails {
    return this.database.transaction(() => {
      const shipment = this.findRequiredShipment(shipmentId);
      this.validateOwnership(userId, shipment);
      this.ensureDraft(shipment);
      const packages = this.validatePackageEligibility(userId, packageIds);
      this.ensureSameWarehouse(shipment.warehouseId, packages);
      this.addPackagesToDraft(shipment, packages, userId);

      return this.getShipment(userId, shipmentId);
    })();
  }

  removePackage(
    userId: string,
    shipmentId: string,
    packageId: string
  ): ShipmentDetails {
    return this.database.transaction(() => {
      const shipment = this.findRequiredShipment(shipmentId);
      this.validateOwnership(userId, shipment);
      this.ensureDraft(shipment);

      if (!this.shipmentRepository.removeDraftPackage(shipmentId, packageId)) {
        throw new AppError(
          "PACKAGE_NOT_ELIGIBLE",
          409,
          "当前草稿未包含该包裹，请刷新后再试。"
        );
      }

      this.auditLogRepository.create({
        actorType: "USER",
        actorId: userId,
        action: "DRAFT_PACKAGE_REMOVED",
        entityType: "SHIPMENT",
        entityId: shipmentId,
        metadata: { packageId }
      });

      return this.getShipment(userId, shipmentId);
    })();
  }

  submitShipment(
    userId: string,
    shipmentId: string,
    addressInput: UKAddressInput
  ): ShipmentDetails {
    try {
      return this.database.transaction(() => {
        const shipment = this.findRequiredShipment(shipmentId);
        this.validateOwnership(userId, shipment);

        if (shipment.status === ShipmentStatusValue.SUBMITTED) {
          return this.getShipment(userId, shipmentId);
        }

        this.ensureDraft(shipment);
        const packages = this.shipmentRepository.listDraftPackages(shipmentId);
        this.validatePackageEligibility(
          userId,
          packages.map((item) => item.id)
        );
        const address = this.validateAddress(addressInput);
        const nextStatus = this.validateStatusTransition(
          shipment.status,
          ShipmentEvent.SUBMIT_SHIPMENT
        );
        const addressSnapshot = this.addressRepository.create({
          userId,
          ...address
        });
        const reference = createShipmentReference();

        this.lockPackages(shipment, packages, userId);
        this.shipmentRepository.clearDraftPackages(shipmentId);
        this.shipmentRepository.update(shipmentId, {
          reference,
          addressId: addressSnapshot.id,
          status: nextStatus,
          submittedAt: nowIso()
        });
        this.auditLogRepository.create({
          actorType: "USER",
          actorId: userId,
          action: "SHIPMENT_SUBMITTED",
          entityType: "SHIPMENT",
          entityId: shipmentId,
          metadata: {
            reference,
            packageCount: packages.length
          }
        });

        return this.getShipment(userId, shipmentId);
      })();
    } catch (error) {
      if (isPackageLockConflict(error)) {
        throw packageEligibilityError("已有包裹被其他转运单占用，请返回调整后再提交。");
      }

      throw error;
    }
  }

  cancelShipment(userId: string, shipmentId: string): { shipmentId: string } {
    return this.database.transaction(() => {
      const shipment = this.findRequiredShipment(shipmentId);
      this.validateOwnership(userId, shipment);
      this.ensureDraft(shipment);
      const releasedPackageIds = this.releasePackages(userId, shipment);

      if (!this.shipmentRepository.deleteDraft(shipmentId)) {
        throw new AppError(
          "INVALID_SHIPMENT_STATE",
          409,
          "当前转运单状态不支持此操作，请刷新后再试。"
        );
      }

      this.auditLogRepository.create({
        actorType: "USER",
        actorId: userId,
        action: "SHIPMENT_DRAFT_CANCELLED",
        entityType: "SHIPMENT",
        entityId: shipmentId,
        metadata: { releasedPackageIds }
      });

      return { shipmentId };
    })();
  }

  startWarehouseProcessing(
    shipmentId: string,
    actorId = "mock-ops"
  ): Shipment {
    return this.database.transaction(() => {
      const shipment = this.findRequiredShipment(shipmentId);

      if (this.exceptionRepository.findOpenByShipmentId(shipment.id)?.isBlocking) {
        throw new AppError(
          "INVALID_SHIPMENT_STATE",
          409,
          "当前转运单存在需要处理的问题，暂不能开始仓库处理。"
        );
      }

      const nextStatus = this.validateStatusTransition(
        shipment.status,
        ShipmentEvent.START_WAREHOUSE_PROCESSING
      );
      const updated = this.shipmentRepository.update(shipment.id, {
        status: nextStatus
      }) as Shipment;
      this.auditLogRepository.create({
        actorType: "MOCK_OPS",
        actorId,
        action: "WAREHOUSE_PROCESSING_STARTED",
        entityType: "SHIPMENT",
        entityId: shipment.id,
        metadata: { from: shipment.status, to: updated.status }
      });

      return updated;
    })();
  }

  validateOwnership(userId: string, shipment: Shipment | Package): void {
    if (shipment.userId !== userId) {
      throw new AppError("FORBIDDEN", 403, "你无权操作此转运单或包裹。");
    }
  }

  validatePackageEligibility(userId: string, packageIds: string[]): Package[] {
    const uniqueIds = Array.from(new Set(packageIds.filter(Boolean)));

    if (uniqueIds.length === 0) {
      throw packageEligibilityError("请至少选择 1 件可合箱包裹。");
    }

    const packages = uniqueIds.map((packageId) => {
      const item = this.packageRepository.findById(packageId);

      if (!item) {
        throw new AppError("PACKAGE_NOT_FOUND", 404, "未找到该包裹。");
      }

      this.validateOwnership(userId, item);

      if (item.status !== PackageStatus.READY_FOR_SHIPMENT) {
        throw packageEligibilityError(selectionReasonForPackage(item));
      }

      if (this.exceptionRepository.findOpenByPackageId(item.id)?.isBlocking) {
        throw packageEligibilityError("包裹存在需要处理的问题，暂不可选。");
      }

      if (this.shipmentRepository.hasActivePackageRelation(item.id)) {
        throw packageEligibilityError("已加入其他转运单，暂不可选。");
      }

      return item;
    });

    const warehouseIds = new Set(packages.map((item) => item.warehouseId));

    if (warehouseIds.size > 1) {
      throw new AppError(
        "INVALID_INPUT",
        400,
        "本次转运只能选择同一仓库的包裹。"
      );
    }

    return packages;
  }

  validateStatusTransition(
    currentStatus: ShipmentStatus,
    event: ShipmentEvent
  ): ShipmentStatus {
    return validateShipmentStatusTransition(currentStatus, event);
  }

  lockPackages(
    shipment: Shipment,
    packages: Package[],
    userId: string
  ): void {
    for (const item of packages) {
      this.shipmentRepository.addPackageRelation({
        shipmentId: shipment.id,
        packageId: item.id
      });
      this.packageRepository.update(item.id, {
        status: PackageStatus.IN_SHIPMENT
      });
      this.auditLogRepository.create({
        actorType: "USER",
        actorId: userId,
        action: "PACKAGE_LOCKED_IN_SHIPMENT",
        entityType: "PACKAGE",
        entityId: item.id,
        metadata: { shipmentId: shipment.id }
      });
    }
  }

  releasePackages(userId: string, shipment: Shipment): string[] {
    const releasedPackageIds = this.shipmentRepository.clearDraftPackages(
      shipment.id
    );

    for (const packageId of releasedPackageIds) {
      this.auditLogRepository.create({
        actorType: "USER",
        actorId: userId,
        action: "DRAFT_PACKAGE_RELEASED",
        entityType: "SHIPMENT",
        entityId: shipment.id,
        metadata: { packageId }
      });
    }

    return releasedPackageIds;
  }

  private addPackagesToDraft(
    shipment: Shipment,
    packages: Package[],
    userId: string
  ): void {
    for (const item of packages) {
      const added = this.shipmentRepository.addDraftPackage(shipment.id, item.id);

      if (!added) {
        continue;
      }

      this.auditLogRepository.create({
        actorType: "USER",
        actorId: userId,
        action: "DRAFT_PACKAGE_ADDED",
        entityType: "SHIPMENT",
        entityId: shipment.id,
        metadata: { packageId: item.id }
      });
    }
  }

  private findRequiredShipment(shipmentId: string): Shipment {
    const shipment = this.shipmentRepository.findById(shipmentId);

    if (!shipment) {
      throw new AppError("SHIPMENT_NOT_FOUND", 404, "未找到该转运单。");
    }

    return shipment;
  }

  private ensureDraft(shipment: Shipment): void {
    if (shipment.status !== ShipmentStatusValue.DRAFT) {
      throw new AppError(
        "INVALID_SHIPMENT_STATE",
        409,
        "已提交的转运单暂不支持修改包裹。"
      );
    }
  }

  private ensureSameWarehouse(warehouseId: string, packages: Package[]): void {
    if (packages.some((item) => item.warehouseId !== warehouseId)) {
      throw new AppError(
        "INVALID_INPUT",
        400,
        "本次转运只能选择同一仓库的包裹。"
      );
    }
  }

  private validateAddress(input: UKAddressInput): UKAddressInput {
    const normalized = {
      recipientName: input.recipientName.trim(),
      phone: input.phone.trim(),
      postcode: input.postcode.trim(),
      addressLine: input.addressLine.trim()
    };
    const fieldErrors: FieldError[] = [];

    if (!normalized.recipientName) {
      fieldErrors.push({ field: "recipientName", message: "请填写收件人。" });
    }
    if (!normalized.phone) {
      fieldErrors.push({ field: "phone", message: "请填写联系电话。" });
    }
    if (!normalized.postcode) {
      fieldErrors.push({ field: "postcode", message: "请填写邮编。" });
    }
    if (!normalized.addressLine) {
      fieldErrors.push({ field: "addressLine", message: "请填写详细地址。" });
    }

    if (fieldErrors.length > 0) {
      throw new AppError(
        "INVALID_INPUT",
        400,
        fieldErrors[0].message,
        fieldErrors
      );
    }

    return normalized;
  }
}

function createShipmentReference(): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = createId().replaceAll("-", "").slice(0, 8).toUpperCase();

  return "UKS-" + date + "-" + suffix;
}

function packageEligibilityError(message: string): AppError {
  return new AppError("PACKAGE_NOT_ELIGIBLE", 409, message, [
    { field: "packageIds", message }
  ]);
}

function selectionReasonForPackage(item: Package): string {
  switch (item.status) {
    case PackageStatus.ARRIVED_PENDING_MATCH:
      return "正在确认归属，暂不可选。";
    case PackageStatus.IN_SHIPMENT:
      return "已加入其他转运单，暂不可选。";
    case PackageStatus.EXCEPTION:
      return "包裹存在需要处理的问题，暂不可选。";
    default:
      return "包裹当前不可合箱，请返回调整后再试。";
  }
}

function isPackageLockConflict(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("shipment_packages_one_active_shipment_per_package") ||
      error.message.includes("UNIQUE constraint failed: shipment_packages.package_id"))
  );
}
