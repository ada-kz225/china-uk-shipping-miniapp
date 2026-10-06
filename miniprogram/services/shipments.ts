import { apiClient } from "./api";
import type { PackageDto } from "./packages";

export type ShipmentScope = "active" | "history";

export type UKAddressInput = {
  recipientName: string;
  phone: string;
  postcode: string;
  addressLine: string;
};

export type ShipmentDto = {
  id: string;
  reference: string | null;
  status: string;
  statusLabel: string;
  statusDescription: string;
  nextAction: string;
  packageCount: number;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  packages?: PackageDto[];
  address?: UKAddressInput | null;
  quote?: QuoteDto | null;
  latestPayment?: PaymentDto | null;
  trackingEvents?: TrackingEventDto[];
  activeException?: ActiveExceptionDto | null;
  unselectedReadyPackageCount?: number;
};

export type QuoteDto = {
  finalWeightG: number;
  finalWeightDisplay: string;
  chargeableWeightG: number;
  chargeableWeightDisplay: string;
  shippingFeeMinor: number;
  shippingFeeDisplay: string;
  serviceFeeMinor: number;
  serviceFeeDisplay: string;
  totalAmountMinor: number;
  totalAmountDisplay: string;
  currency: string;
  generatedAt: string;
};

export type PaymentDto = {
  status: string;
  statusLabel: string;
  statusDescription: string;
  completedAt: string | null;
};

export type TrackingEventDto = {
  title: string;
  description: string;
  occurredAt: string;
};

export type ActiveExceptionDto = {
  title: string;
  description: string;
  impact: string;
  requiredAction: string;
  progress: string;
  support: string;
};

type ShipmentResponse = {
  data: ShipmentDto;
};

type ShipmentListResponse = {
  data: ShipmentDto[];
};

export function listShipments(scope: ShipmentScope): Promise<ShipmentDto[]> {
  return apiClient
    .get<ShipmentListResponse>("/shipments?scope=" + scope)
    .then((response) => response.data);
}

export function getShipment(id: string): Promise<ShipmentDto> {
  return apiClient
    .get<ShipmentResponse>("/shipments/" + encodeURIComponent(id))
    .then((response) => response.data);
}

export function createShipmentDraft(packageIds: string[]): Promise<ShipmentDto> {
  return apiClient
    .post<ShipmentResponse>("/shipments", { packageIds })
    .then((response) => response.data);
}

export function removeShipmentPackage(
  shipmentId: string,
  packageId: string
): Promise<ShipmentDto> {
  return apiClient
    .delete<ShipmentResponse>(
      "/shipments/" +
        encodeURIComponent(shipmentId) +
        "/packages/" +
        encodeURIComponent(packageId)
    )
    .then((response) => response.data);
}

export function submitShipment(
  shipmentId: string,
  address: UKAddressInput
): Promise<ShipmentDto> {
  return apiClient
    .post<ShipmentResponse>(
      "/shipments/" + encodeURIComponent(shipmentId) + "/submit",
      { address }
    )
    .then((response) => response.data);
}

export function cancelShipmentDraft(shipmentId: string): Promise<void> {
  return apiClient
    .post<{ data: { shipmentId: string } }>(
      "/shipments/" + encodeURIComponent(shipmentId) + "/cancel"
    )
    .then(() => undefined);
}

export function simulateShipmentPayment(shipmentId: string): Promise<ShipmentDto> {
  return apiClient
    .post<ShipmentResponse>(
      "/shipments/" + encodeURIComponent(shipmentId) + "/payments",
      undefined,
      { "Idempotency-Key": createPaymentIdempotencyKey() }
    )
    .then((response) => response.data);
}

export function formatShipmentDate(value: string | null): string {
  if (!value) {
    return "";
  }

  return value.replace("T", " ").slice(0, 16);
}

function createPaymentIdempotencyKey(): string {
  return "mini-payment-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
}
