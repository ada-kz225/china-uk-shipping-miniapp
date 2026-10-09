export type StatusTone =
  | "neutral"
  | "action"
  | "paid"
  | "progress"
  | "completed"
  | "exception";

/** Maps internal state codes to a small, user-interface-only visual vocabulary. */
export function packageStatusTone(status: string): StatusTone {
  switch (status) {
    case "READY_FOR_SHIPMENT":
      return "action";
    case "EXCEPTION":
      return "exception";
    case "IN_SHIPMENT":
    case "DECLARED":
    case "INBOUND_TO_WAREHOUSE":
    case "ARRIVED_PENDING_MATCH":
      return "progress";
    default:
      return "neutral";
  }
}

export function shipmentStatusTone(status: string): StatusTone {
  switch (status) {
    case "DRAFT":
    case "AWAITING_PAYMENT":
      return "action";
    case "PAID_AWAITING_DISPATCH":
      return "paid";
    case "SUBMITTED":
    case "WAREHOUSE_PROCESSING":
    case "PAYMENT_PROCESSING":
    case "DISPATCHED":
    case "INTERNATIONAL_TRANSIT":
    case "CUSTOMS_CLEARANCE":
    case "UK_LAST_MILE":
      return "progress";
    case "DELIVERED":
      return "completed";
    case "EXCEPTION":
      return "exception";
    default:
      return "neutral";
  }
}
