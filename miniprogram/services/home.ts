import { apiClient } from "./api";
import { PackageFilter } from "./packages";
import { ShipmentDto } from "./shipments";

export type HomeActionDto = {
  title: string;
  description: string;
  target:
    | { type: "SHIPMENT_DETAIL"; shipmentId: string }
    | { type: "PACKAGE_FILTER"; filter: Extract<PackageFilter, "pending_match" | "ready" | "needs_action"> };
};

export type HomeDto = {
  actionRequired: HomeActionDto[];
  currentJourney: ShipmentDto | null;
  packageOverview: {
    inbound: number;
    pendingMatch: number;
    ready: number;
    inShipment: number;
    needsAction: number;
  };
  shipmentOverview: {
    awaitingPayment: number;
    exceptions: number;
    paidAwaitingDispatch: number;
    inTransit: number;
  };
  warehouse: {
    name: string;
    recipientName: string;
    recipientCode: string;
    phone: string;
    addressLine: string;
    instructions: string | null;
  } | null;
};

type HomeResponse = {
  data: HomeDto;
};

export function getHome(): Promise<HomeDto> {
  return apiClient.get<HomeResponse>("/home").then((response) => response.data);
}
