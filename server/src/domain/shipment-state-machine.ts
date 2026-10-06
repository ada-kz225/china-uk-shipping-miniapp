import { ShipmentStatus } from "./statuses.js";
import { AppError } from "../utils/app-error.js";

export enum ShipmentEvent {
  SUBMIT_SHIPMENT = "SUBMIT_SHIPMENT",
  START_WAREHOUSE_PROCESSING = "START_WAREHOUSE_PROCESSING",
  GENERATE_QUOTE = "GENERATE_QUOTE",
  START_PAYMENT = "START_PAYMENT",
  PAYMENT_SUCCEEDED = "PAYMENT_SUCCEEDED",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  DISPATCH_SHIPMENT = "DISPATCH_SHIPMENT",
  ENTER_INTERNATIONAL_TRANSIT = "ENTER_INTERNATIONAL_TRANSIT",
  ENTER_CUSTOMS_CLEARANCE = "ENTER_CUSTOMS_CLEARANCE",
  ENTER_UK_LAST_MILE = "ENTER_UK_LAST_MILE",
  MARK_DELIVERED = "MARK_DELIVERED"
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
  },
  [ShipmentEvent.DISPATCH_SHIPMENT]: {
    from: ShipmentStatus.PAID_AWAITING_DISPATCH,
    to: ShipmentStatus.DISPATCHED
  },
  [ShipmentEvent.ENTER_INTERNATIONAL_TRANSIT]: {
    from: ShipmentStatus.DISPATCHED,
    to: ShipmentStatus.INTERNATIONAL_TRANSIT
  },
  [ShipmentEvent.ENTER_CUSTOMS_CLEARANCE]: {
    from: ShipmentStatus.INTERNATIONAL_TRANSIT,
    to: ShipmentStatus.CUSTOMS_CLEARANCE
  },
  [ShipmentEvent.ENTER_UK_LAST_MILE]: {
    from: ShipmentStatus.CUSTOMS_CLEARANCE,
    to: ShipmentStatus.UK_LAST_MILE
  },
  [ShipmentEvent.MARK_DELIVERED]: {
    from: ShipmentStatus.UK_LAST_MILE,
    to: ShipmentStatus.DELIVERED
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
