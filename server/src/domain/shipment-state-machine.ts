import { ShipmentStatus } from "./statuses.js";
import { AppError } from "../utils/app-error.js";

export enum ShipmentEvent {
  SUBMIT_SHIPMENT = "SUBMIT_SHIPMENT"
}

const transitions: Record<
  ShipmentEvent,
  { from: ShipmentStatus; to: ShipmentStatus }
> = {
  [ShipmentEvent.SUBMIT_SHIPMENT]: {
    from: ShipmentStatus.DRAFT,
    to: ShipmentStatus.SUBMITTED
  }
};

export function validateShipmentStatusTransition(
  currentStatus: ShipmentStatus,
  event: ShipmentEvent
): ShipmentStatus {
  const transition = transitions[event];

  if (transition.from !== currentStatus) {
    throw new AppError(
      "INVALID_SHIPMENT_STATE",
      409,
      "当前转运单状态不支持此操作，请刷新后再试。"
    );
  }

  return transition.to;
}
