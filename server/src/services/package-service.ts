import type { SqliteDatabase } from "../db/database.js";
import type { DomainException, Package, PackageStatus } from "../domain/index.js";
import { PackageStatus as PackageStatusValue } from "../domain/index.js";
import {
  PackageEvent,
  validatePackageStatusTransition
} from "../domain/package-state-machine.js";
import { AuditLogRepository } from "../repositories/audit-log-repository.js";
import { ExceptionRepository } from "../repositories/exception-repository.js";
import { PackageRepository } from "../repositories/package-repository.js";
import { AppError } from "../utils/app-error.js";

export type DeclarePackageInput = {
  domesticTrackingNumber: string;
  description: string;
};

export type PackageListFilter =
  | "all"
  | "inbound"
  | "pending_match"
  | "ready"
  | "in_shipment"
  | "needs_action";

export type PackageWithException = {
  package: Package;
  exception: DomainException | undefined;
};

export type PackageStatusCounts = Record<PackageListFilter, number>;

const statusesByFilter: Record<
  Exclude<PackageListFilter, "all">,
  PackageStatus[]
> = {
  inbound: [
    PackageStatusValue.DECLARED,
    PackageStatusValue.INBOUND_TO_WAREHOUSE
  ],
  pending_match: [PackageStatusValue.ARRIVED_PENDING_MATCH],
  ready: [PackageStatusValue.READY_FOR_SHIPMENT],
  in_shipment: [PackageStatusValue.IN_SHIPMENT],
  needs_action: [PackageStatusValue.EXCEPTION]
};

export class PackageService {
  constructor(
    private readonly database: SqliteDatabase,
    private readonly packageRepository: PackageRepository,
    private readonly exceptionRepository: ExceptionRepository,
    private readonly auditLogRepository: AuditLogRepository
  ) {}

  declarePackage(userId: string, input: DeclarePackageInput): Package {
    const domesticTrackingNumber = normalizeTrackingNumber(
      input.domesticTrackingNumber
    );
    const description = input.description.trim();

    if (!domesticTrackingNumber) {
      throw new AppError(
        "INVALID_INPUT",
        400,
        "请填写国内运单号。",
        [{ field: "domesticTrackingNumber", message: "请填写国内运单号。" }]
      );
    }

    if (!description) {
      throw new AppError(
        "INVALID_INPUT",
        400,
        "请填写商品描述。",
        [{ field: "description", message: "请填写商品描述。" }]
      );
    }

    this.validateDuplicateTrackingNumber(domesticTrackingNumber);
    const warehouseId = this.findActiveWarehouseId();

    try {
      return this.database.transaction(() => {
        const entity = this.packageRepository.create({
          userId,
          warehouseId,
          domesticTrackingNumber,
          description,
          status: PackageStatusValue.DECLARED
        });

        this.auditLogRepository.create({
          actorType: "USER",
          actorId: userId,
          action: "PACKAGE_DECLARED",
          entityType: "PACKAGE",
          entityId: entity.id,
          metadata: { status: entity.status }
        });

        return entity;
      })();
    } catch (error) {
      if (isTrackingNumberConstraintError(error)) {
        throw duplicateTrackingNumberError();
      }

      throw error;
    }
  }

  getPackage(userId: string, packageId: string): PackageWithException {
    const entity = this.findRequiredPackage(packageId);
    this.validateOwnership(userId, entity);

    return {
      package: entity,
      exception: this.exceptionRepository.findOpenByPackageId(entity.id)
    };
  }

  listPackages(
    userId: string,
    filter: PackageListFilter = "all"
  ): PackageWithException[] {
    const statuses = filter === "all" ? undefined : statusesByFilter[filter];

    return this.packageRepository.listByUserId(userId, statuses).map((entity) => ({
      package: entity,
      exception: this.exceptionRepository.findOpenByPackageId(entity.id)
    }));
  }

  /**
   * Counts deliberately use the same filter definitions as listPackages.
   * The client needs the counts for every filter even while one filter is active.
   */
  getStatusCounts(userId: string): PackageStatusCounts {
    const packages = this.packageRepository.listByUserId(userId);

    return {
      all: packages.length,
      inbound: countByFilter(packages, "inbound"),
      pending_match: countByFilter(packages, "pending_match"),
      ready: countByFilter(packages, "ready"),
      in_shipment: countByFilter(packages, "in_shipment"),
      needs_action: countByFilter(packages, "needs_action")
    };
  }

  receivePackage(packageId: string, actorId = "mock-ops"): Package {
    return this.transitionForOps(
      packageId,
      PackageEvent.PACKAGE_RECEIVED,
      "PACKAGE_RECEIVED",
      actorId,
      true
    );
  }

  markPackageInbound(packageId: string, actorId = "mock-ops"): Package {
    return this.transitionForOps(
      packageId,
      PackageEvent.PACKAGE_MARKED_INBOUND,
      "PACKAGE_MARKED_INBOUND",
      actorId,
      false
    );
  }

  matchPackage(packageId: string, actorId = "mock-ops"): Package {
    return this.database.transaction(() => {
      const entity = this.findRequiredPackage(packageId);
      this.ensureNoBlockingException(entity.id);
      const nextStatus = this.validateStatusTransition(
        entity.status,
        PackageEvent.PACKAGE_MATCHED
      );
      const updated = this.packageRepository.update(entity.id, {
        status: nextStatus
      }) as Package;

      this.auditLogRepository.create({
        actorType: "MOCK_OPS",
        actorId,
        action: "PACKAGE_MATCHED",
        entityType: "PACKAGE",
        entityId: updated.id,
        metadata: { from: entity.status, to: updated.status }
      });
      this.auditLogRepository.create({
        actorType: "MOCK_OPS",
        actorId,
        action: "PACKAGE_MARKED_READY",
        entityType: "PACKAGE",
        entityId: updated.id,
        metadata: { from: entity.status, to: updated.status }
      });

      return updated;
    })();
  }

  markPackageReady(packageId: string, actorId = "mock-ops"): Package {
    return this.transitionForOps(
      packageId,
      PackageEvent.PACKAGE_MARKED_READY,
      "PACKAGE_MARKED_READY",
      actorId,
      false
    );
  }

  validateOwnership(userId: string, entity: Package): void {
    if (entity.userId !== userId) {
      throw new AppError(
        "FORBIDDEN",
        403,
        "你无权查看此包裹。"
      );
    }
  }

  validateDuplicateTrackingNumber(domesticTrackingNumber: string): void {
    if (this.packageRepository.findByTrackingNumber(domesticTrackingNumber)) {
      throw duplicateTrackingNumberError();
    }
  }

  validateStatusTransition(
    currentStatus: PackageStatus,
    event: PackageEvent
  ): PackageStatus {
    return validatePackageStatusTransition(currentStatus, event);
  }

  private transitionForOps(
    packageId: string,
    event: PackageEvent,
    action:
      | "PACKAGE_MARKED_INBOUND"
      | "PACKAGE_RECEIVED"
      | "PACKAGE_MARKED_READY",
    actorId: string,
    recordsArrival: boolean
  ): Package {
    return this.database.transaction(() => {
      const entity = this.findRequiredPackage(packageId);
      this.ensureNoBlockingException(entity.id);
      const nextStatus = this.validateStatusTransition(entity.status, event);
      const updated = this.packageRepository.update(entity.id, {
        status: nextStatus,
        ...(recordsArrival && !entity.arrivedAt
          ? { arrivedAt: new Date().toISOString() }
          : {})
      }) as Package;

      this.auditLogRepository.create({
        actorType: "MOCK_OPS",
        actorId,
        action,
        entityType: "PACKAGE",
        entityId: updated.id,
        metadata: { from: entity.status, to: updated.status }
      });

      return updated;
    })();
  }

  private findRequiredPackage(packageId: string): Package {
    const entity = this.packageRepository.findById(packageId);

    if (!entity) {
      throw new AppError("PACKAGE_NOT_FOUND", 404, "未找到该包裹。");
    }

    return entity;
  }

  private ensureNoBlockingException(packageId: string): void {
    const exception = this.exceptionRepository.findOpenByPackageId(packageId);

    if (exception?.isBlocking) {
      throw new AppError(
        "WORKFLOW_BLOCKED_BY_EXCEPTION",
        409,
        "该包裹存在需要处理的问题，暂时不能继续操作。"
      );
    }
  }

  private findActiveWarehouseId(): string {
    const warehouse = this.database
      .prepare("SELECT id FROM warehouses WHERE is_active = 1 ORDER BY created_at ASC LIMIT 1")
      .get() as { id: string } | undefined;

    if (!warehouse) {
      throw new AppError(
        "INVALID_STATE_TRANSITION",
        409,
        "当前暂无可用仓库，暂时无法预报包裹。"
      );
    }

    return warehouse.id;
  }
}

function countByFilter(
  packages: Package[],
  filter: Exclude<PackageListFilter, "all">
): number {
  return packages.filter((item) => statusesByFilter[filter].includes(item.status)).length;
}

function normalizeTrackingNumber(value: string): string {
  return value.trim().toUpperCase();
}

function duplicateTrackingNumberError(): AppError {
  return new AppError(
    "DUPLICATE_TRACKING_NUMBER",
    409,
    "该运单号已预报，无需重复提交。",
    [
      {
        field: "domesticTrackingNumber",
        message: "该运单号已预报，无需重复提交。"
      }
    ]
  );
}

function isTrackingNumberConstraintError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("packages.domestic_tracking_number")
  );
}
