import {
  ExceptionStatus,
  PackageStatus,
  PaymentStatus,
  ShipmentStatus,
  TrackingEventType
} from "./statuses.js";

export type Package = {
  id: string;
  userId: string;
  warehouseId: string;
  domesticTrackingNumber: string;
  description: string;
  status: PackageStatus;
  arrivedAt: string | null;
  weightG: number | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type Shipment = {
  id: string;
  reference: string | null;
  userId: string;
  warehouseId: string;
  addressId: string | null;
  status: ShipmentStatus;
  submittedAt: string | null;
  packingCompletedAt: string | null;
  finalChargeableWeightG: number | null;
  dispatchedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type Quote = {
  id: string;
  shipmentId: string;
  finalWeightG: number;
  chargeableWeightG: number;
  shippingFeeMinor: number;
  serviceFeeMinor: number;
  totalAmountMinor: number;
  currency: string;
  source: string;
  createdAt: string;
};

export type Payment = {
  id: string;
  shipmentId: string;
  quoteId: string;
  amountMinor: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  providerReference: string | null;
  idempotencyKey: string;
  createdAt: string;
  completedAt: string | null;
};

export type TrackingEvent = {
  id: string;
  shipmentId: string;
  eventType: TrackingEventType;
  displayMessage: string;
  source: string;
  occurredAt: string;
  createdAt: string;
};

export type DomainException = {
  id: string;
  packageId: string | null;
  shipmentId: string | null;
  type: string;
  status: ExceptionStatus;
  title: string;
  description: string;
  impact: string;
  requiredAction: string;
  resumeState: string;
  isBlocking: boolean;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};
