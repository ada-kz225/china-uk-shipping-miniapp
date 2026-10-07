import { PackageStatus } from "./statuses.js";
import { AppError } from "../utils/app-error.js";

export enum PackageEvent {
  PACKAGE_MARKED_INBOUND = "PACKAGE_MARKED_INBOUND",
  PACKAGE_RECEIVED = "PACKAGE_RECEIVED",
  PACKAGE_MATCHED = "PACKAGE_MATCHED",
  PACKAGE_MARKED_READY = "PACKAGE_MARKED_READY"
}

export function validatePackageExceptionRaise(
  currentStatus: PackageStatus
): PackageStatus {
  if (
    ![
      PackageStatus.DECLARED,
      PackageStatus.INBOUND_TO_WAREHOUSE,
      PackageStatus.ARRIVED_PENDING_MATCH,
      PackageStatus.READY_FOR_SHIPMENT
    ].includes(currentStatus)
  ) {
    throw new AppError(
      "INVALID_EXCEPTION_RESOLUTION",
      409,
      "当前包裹状态不支持创建需要处理的问题。"
    );
  }

  return PackageStatus.EXCEPTION;
}

export function validatePackageExceptionResolution(
  currentStatus: PackageStatus,
  resumeStatus: PackageStatus
): PackageStatus {
  if (
    currentStatus !== PackageStatus.EXCEPTION ||
    resumeStatus === PackageStatus.EXCEPTION
  ) {
    throw new AppError(
      "INVALID_EXCEPTION_RESOLUTION",
      409,
      "当前包裹不能恢复到记录的业务状态。"
    );
  }

  return resumeStatus;
}

const transitions: Record<
  PackageEvent,
  { from: PackageStatus[]; to: PackageStatus }
> = {
  [PackageEvent.PACKAGE_MARKED_INBOUND]: {
    from: [PackageStatus.DECLARED],
    to: PackageStatus.INBOUND_TO_WAREHOUSE
  },
  [PackageEvent.PACKAGE_RECEIVED]: {
    from: [
      PackageStatus.DECLARED,
      PackageStatus.INBOUND_TO_WAREHOUSE
    ],
    to: PackageStatus.ARRIVED_PENDING_MATCH
  },
  [PackageEvent.PACKAGE_MATCHED]: {
    from: [PackageStatus.ARRIVED_PENDING_MATCH],
    to: PackageStatus.READY_FOR_SHIPMENT
  },
  [PackageEvent.PACKAGE_MARKED_READY]: {
    from: [PackageStatus.ARRIVED_PENDING_MATCH],
    to: PackageStatus.READY_FOR_SHIPMENT
  }
};

export function validatePackageStatusTransition(
  currentStatus: PackageStatus,
  event: PackageEvent
): PackageStatus {
  const transition = transitions[event];

  if (!transition.from.includes(currentStatus)) {
    throw new AppError(
      "INVALID_STATE_TRANSITION",
      409,
      "当前包裹状态不支持此操作，请刷新后再试。"
    );
  }

  return transition.to;
}
