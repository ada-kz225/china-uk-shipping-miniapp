import { apiClient } from "./api";

export type PackageFilter =
  | "all"
  | "inbound"
  | "pending_match"
  | "ready"
  | "in_shipment"
  | "needs_action";

export type PackageDto = {
  id: string;
  domesticTrackingNumber: string;
  description: string;
  status: string;
  statusLabel: string;
  statusDescription: string;
  availableActions: string[];
  arrivedAt: string | null;
  weightG: number | null;
  shipmentReference: string | null;
  isEligibleForShipment: boolean;
  selectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  exception: {
    title: string;
    description: string;
    impact: string;
    requiredAction: string;
  } | null;
};

export type PackageStatusCounts = Record<PackageFilter, number>;

export type PackageListResult = {
  packages: PackageDto[];
  statusCounts: PackageStatusCounts;
};

type PackageResponse = {
  data: PackageDto;
};

type PackageListResponse = {
  data: PackageDto[];
  statusCounts: PackageStatusCounts;
};

export function listPackages(filter: PackageFilter): Promise<PackageListResult> {
  return apiClient
    .get<PackageListResponse>("/packages?filter=" + filter)
    .then((response) => ({
      packages: response.data,
      statusCounts: response.statusCounts
    }));
}

export function getPackage(id: string): Promise<PackageDto> {
  return apiClient
    .get<PackageResponse>("/packages/" + encodeURIComponent(id))
    .then((response) => response.data);
}

export function declarePackage(input: {
  domesticTrackingNumber: string;
  description: string;
}): Promise<PackageDto> {
  return apiClient
    .post<PackageResponse>("/packages", input)
    .then((response) => response.data);
}

export function formatPackageDate(value: string | null): string {
  if (!value) {
    return "";
  }

  return value.replace("T", " ").slice(0, 16);
}
