import { ShipmentStatus } from "./statuses.js";
import { AppError } from "../utils/app-error.js";

export enum ShipmentEvent {
  SUBMIT_SHIPMENT = "SUBMIT_SHIPMENT",
  START_WAREHOUSE_PROCESSING = "START_WAREHOUSE_PROCESSING",
  GENERATE_QUOTE = "GENERATE_QUOTE",
  START_PAYMENT = "START_PAYMENT",
  PAYMENT_SUCCEEDED = "PAYMENT_SUCCEEDED",
  PAYMENT_FAILED = "PAYMENT_FAILED"
}

const transitions: Record<
  ShipmentEvent,
  { from: ShipmentStatus; to: ShipmentStatus }
> = {
  [ShipmentEvent.SUBMIT_SHIPMENT]: {
    from: ShipmentStatus.DRAFT,
    to: ShipmentStatus.SUBMITTED
  },
  [ShipmentEvent.START_WAREHOUSE_PROCESSING]: {
    from: ShipmentStatus.SUBMITTED,
    to: ShipmentStatus.WAREHOUSE_PROCESSING
  },
  [ShipmentEvent.GENERATE_QUOTE]: {
    from: ShipmentStatus.WAREHOUSE_PROCESSING,
    to: ShipmentStatus.AWAITING_PAYMENT
  },
  [ShipmentEvent.START_PAYMENT]: {
    from: ShipmentStatus.AWAITING_PAYMENT,
    to: ShipmentStatus.PAYMENT_PROCESSING
  },
  [ShipmentEvent.PAYMENT_SUCCEEDED]: {
    from: ShipmentStatus.PAYMENT_PROCESSING,
    to: ShipmentStatus.PAID_AWAITING_DISPATCH
  },
  [ShipmentEvent.PAYMENT_FAILED]: {
    from: ShipmentStatus.PAYMENT_PROCESSING,
    to: ShipmentStatus.AWAITING_PAYMENT
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
