import type { SqliteDatabase } from "../db/database.js";
import {
  type DomainException,
  type Package,
  type Shipment,
  ExceptionStatus,
  PackageStatus,
  ShipmentStatus
} from "../domain/index.js";
import {
  validatePackageExceptionRaise,
  validatePackageExceptionResolution
} from "../domain/package-state-machine.js";
import {
  validateShipmentExceptionRaise,
  validateShipmentExceptionResolution
} from "../domain/shipment-state-machine.js";
import { AuditLogRepository } from "../repositories/audit-log-repository.js";
import { ExceptionRepository } from "../repositories/exception-repository.js";
import { PackageRepository } from "../repositories/package-repository.js";
import { ShipmentRepository } from "../repositories/shipment-repository.js";
import { AppError } from "../utils/app-error.js";
import { nowIso } from "../utils/identifiers.js";

export type ExceptionEntityType = "PACKAGE" | "SHIPMENT";

export type RaiseExceptionInput = {
  entityType: ExceptionEntityType;
  entityId: string;
  type: string;
  title: string;
  description: string;
  impact: string;
  requiredAction: string;
};

/**
 * Owns the exception lifecycle. Raising an exception stores the exact normal
 * state that was interrupted; resolving restores only that recorded state.
 */
export class ExceptionService {
  constructor(
    private readonly database: SqliteDatabase,
    private readonly exceptionRepository: ExceptionRepository,
    private readonly packageRepository: PackageRepository,
    private readonly shipmentRepository: ShipmentRepository,
    private readonly auditLogRepository: AuditLogRepository
  ) {}

  raiseException(
    input: RaiseExceptionInput,
    actorId = "mock-ops"
  ): DomainException {
    return this.database.transaction(() => {
      const entity = this.findRequiredEntity(input.entityType, input.entityId);
      this.ensureNoOpenException(input.entityType, entity.id);
      this.validateRaiseState(input.entityType, entity);
      const resumeState = entity.status;
      const exception = this.exceptionRepository.create({
        packageId: input.entityType === "PACKAGE" ? entity.id : null,
        shipmentId: input.entityType === "SHIPMENT" ? entity.id : null,
        type: input.type,
        status: ExceptionStatus.OPEN,
        title: input.title,
        description: input.description,
        impact: input.impact,
        requiredAction: input.requiredAction,
        resumeState,
        isBlocking: true
      });

      this.setEntityStatus(input.entityType, entity.id, "EXCEPTION");
      this.auditLogRepository.create({
        actorType: "MOCK_OPS",
        actorId,
        action:
          input.entityType === "PACKAGE"
            ? "PACKAGE_EXCEPTION_RAISED"
            : "SHIPMENT_EXCEPTION_RAISED",
        entityType: input.entityType,
        entityId: entity.id,
        metadata: {
          exceptionId: exception.id,
          type: exception.type,
          from: resumeState,
          to: "EXCEPTION"
        }
      });

      return exception;
    })();
  }

  getException(userId: string, exceptionId: string): DomainException {
    const exception = this.findRequiredException(exceptionId);
    this.validateEntityOwnership(userId, this.entityTypeFor(exception), this.entityIdFor(exception));

    return exception;
  }

  listExceptionsForEntity(
    userId: string,
    entityType: ExceptionEntityType,
    entityId: string
  ): DomainException[] {
    this.validateEntityOwnership(userId, entityType, entityId);

    return entityType === "PACKAGE"
      ? this.exceptionRepository.listByPackageId(entityId)
      : this.exceptionRepository.listByShipmentId(entityId);
  }

  resolveException(exceptionId: string, actorId = "mock-ops"): DomainException {
    return this.database.transaction(() => {
      const exception = this.findRequiredException(exceptionId);
      this.validateResolution(exception);
      const entityType = this.entityTypeFor(exception);
      const entityId = this.entityIdFor(exception);

      this.resumeWorkflow(exception);
      const resolved = this.exceptionRepository.updateStatus(
        exception.id,
        ExceptionStatus.RESOLVED,
        nowIso()
      ) as DomainException;
      this.auditLogRepository.create({
        actorType: "MOCK_OPS",
        actorId,
        action:
          entityType === "PACKAGE"
            ? "PACKAGE_EXCEPTION_RESOLVED"
            : "SHIPMENT_EXCEPTION_RESOLVED",
        entityType,
        entityId,
        metadata: {
          exceptionId: exception.id,
          from: "EXCEPTION",
          to: exception.resumeState
        }
      });

      return resolved;
    })();
  }

  resolveOpenExceptionForEntity(
    entityType: ExceptionEntityType,
    entityId: string,
    actorId = "mock-ops"
  ): DomainException {
    const exception =
      entityType === "PACKAGE"
        ? this.exceptionRepository.findOpenByPackageId(entityId)
        : this.exceptionRepository.findOpenByShipmentId(entityId);

    if (!exception) {
      throw new AppError("EXCEPTION_NOT_FOUND", 404, "未找到待解决的问题记录。");
    }

    return this.resolveException(exception.id, actorId);
  }

  validateResolution(exception: DomainException): void {
    if (exception.status === ExceptionStatus.RESOLVED) {
      throw new AppError(
        "EXCEPTION_ALREADY_RESOLVED",
        409,
        "该问题已解决，无需重复操作。"
      );
    }

    const entity = this.findRequiredEntity(
      this.entityTypeFor(exception),
      this.entityIdFor(exception)
    );

    if (entity.status !== "EXCEPTION") {
      throw new AppError(
        "INVALID_EXCEPTION_RESOLUTION",
        409,
        "当前业务状态无法按该问题记录恢复。"
      );
    }
  }

  resumeWorkflow(exception: DomainException): Package | Shipment {
    const entityType = this.entityTypeFor(exception);
    const entityId = this.entityIdFor(exception);
    const entity = this.findRequiredEntity(entityType, entityId);

    if (entityType === "PACKAGE") {
      const resumeStatus = validatePackageExceptionResolution(
        entity.status as PackageStatus,
        exception.resumeState as PackageStatus
      );
      return this.packageRepository.update(entity.id, { status: resumeStatus }) as Package;
    }

    const resumeStatus = validateShipmentExceptionResolution(
      entity.status as ShipmentStatus,
      exception.resumeState as ShipmentStatus
    );
    return this.shipmentRepository.update(entity.id, { status: resumeStatus }) as Shipment;
  }

  private ensureNoOpenException(
    entityType: ExceptionEntityType,
    entityId: string
  ): void {
    const existing =
      entityType === "PACKAGE"
        ? this.exceptionRepository.findOpenByPackageId(entityId)
        : this.exceptionRepository.findOpenByShipmentId(entityId);

    if (existing) {
      throw new AppError(
        "EXCEPTION_ALREADY_OPEN",
        409,
        "当前对象已有需要处理的问题，不能重复创建。"
      );
    }
  }

  private validateRaiseState(
    entityType: ExceptionEntityType,
    entity: Package | Shipment
  ): void {
    if (entityType === "PACKAGE") {
      validatePackageExceptionRaise(entity.status as PackageStatus);
      return;
    }

    validateShipmentExceptionRaise(entity.status as ShipmentStatus);
  }

  private setEntityStatus(
    entityType: ExceptionEntityType,
    entityId: string,
    status: "EXCEPTION"
  ): void {
    if (entityType === "PACKAGE") {
      this.packageRepository.update(entityId, { status: PackageStatus.EXCEPTION });
      return;
    }

    this.shipmentRepository.update(entityId, { status: ShipmentStatus.EXCEPTION });
  }

  private validateEntityOwnership(
    userId: string,
    entityType: ExceptionEntityType,
    entityId: string
  ): void {
    const entity = this.findRequiredEntity(entityType, entityId);

    if (entity.userId !== userId) {
      throw new AppError("FORBIDDEN", 403, "你无权查看该问题。");
    }
  }

  private findRequiredException(exceptionId: string): DomainException {
    const exception = this.exceptionRepository.findById(exceptionId);

    if (!exception) {
      throw new AppError("EXCEPTION_NOT_FOUND", 404, "未找到该问题记录。");
    }

    return exception;
  }

  private findRequiredEntity(
    entityType: ExceptionEntityType,
    entityId: string
  ): Package | Shipment {
    const entity =
      entityType === "PACKAGE"
        ? this.packageRepository.findById(entityId)
        : this.shipmentRepository.findById(entityId);

    if (!entity) {
      throw new AppError("ENTITY_NOT_FOUND", 404, "未找到需要处理的业务对象。");
    }

    return entity;
  }

  private entityTypeFor(exception: DomainException): ExceptionEntityType {
    return exception.packageId ? "PACKAGE" : "SHIPMENT";
  }

  private entityIdFor(exception: DomainException): string {
    return exception.packageId ?? (exception.shipmentId as string);
  }
}
