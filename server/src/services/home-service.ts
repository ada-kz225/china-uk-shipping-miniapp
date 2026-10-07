import {
  PackageStatus,
  ShipmentStatus,
  type Package
} from "../domain/index.js";
import { PackageRepository } from "../repositories/package-repository.js";
import {
  ShipmentRepository,
  type ShipmentListItem
} from "../repositories/shipment-repository.js";
import {
  WarehouseRepository,
  type WarehouseInformation
} from "../repositories/warehouse-repository.js";

export type HomePackageCounts = {
  inbound: number;
  pendingMatch: number;
  ready: number;
  inShipment: number;
  needsAction: number;
};

export type HomeShipmentCounts = {
  awaitingPayment: number;
  exceptions: number;
  paidAwaitingDispatch: number;
  inTransit: number;
};

export type HomeAction =
  | {
      kind: "SHIPMENT_EXCEPTION";
      shipment: ShipmentListItem;
    }
  | {
      kind: "PACKAGE_EXCEPTION";
      count: number;
    }
  | {
      kind: "AWAITING_PAYMENT";
      shipment: ShipmentListItem;
    }
  | {
      kind: "PENDING_MATCH";
      count: number;
    }
  | {
      kind: "READY_FOR_SHIPMENT";
      count: number;
    };

export type HomeDashboard = {
  actions: HomeAction[];
  currentShipment: ShipmentListItem | undefined;
  packageCounts: HomePackageCounts;
  shipmentCounts: HomeShipmentCounts;
  warehouse: WarehouseInformation | undefined;
};

const transitStatuses = [
  ShipmentStatus.DISPATCHED,
  ShipmentStatus.INTERNATIONAL_TRANSIT,
  ShipmentStatus.CUSTOMS_CLEARANCE,
  ShipmentStatus.UK_LAST_MILE
];

/** Builds all user-owned homepage facts in one server-side aggregation. */
export class HomeService {
  constructor(
    private readonly packageRepository: PackageRepository,
    private readonly shipmentRepository: ShipmentRepository,
    private readonly warehouseRepository: WarehouseRepository
  ) {}

  getHome(userId: string): HomeDashboard {
    const packages = this.packageRepository.listByUserId(userId);
    const shipments = this.shipmentRepository.listWithPackageCountByUserId(userId);
    const packageCounts = countPackages(packages);
    const shipmentCounts = countShipments(shipments);

    return {
      actions: buildActions(shipments, packageCounts),
      currentShipment: shipments.find((shipment) =>
        transitStatuses.includes(shipment.status)
      ),
      packageCounts,
      shipmentCounts,
      warehouse: this.warehouseRepository.findActiveForUser(userId)
    };
  }
}

function countPackages(packages: Package[]): HomePackageCounts {
  return {
    inbound: packages.filter(
      (item) =>
        item.status === PackageStatus.DECLARED ||
        item.status === PackageStatus.INBOUND_TO_WAREHOUSE
    ).length,
    pendingMatch: packages.filter(
      (item) => item.status === PackageStatus.ARRIVED_PENDING_MATCH
    ).length,
    ready: packages.filter(
      (item) => item.status === PackageStatus.READY_FOR_SHIPMENT
    ).length,
    inShipment: packages.filter(
      (item) => item.status === PackageStatus.IN_SHIPMENT
    ).length,
    needsAction: packages.filter(
      (item) => item.status === PackageStatus.EXCEPTION
    ).length
  };
}

function countShipments(shipments: ShipmentListItem[]): HomeShipmentCounts {
  return {
    awaitingPayment: shipments.filter(
      (item) => item.status === ShipmentStatus.AWAITING_PAYMENT
    ).length,
    exceptions: shipments.filter((item) => item.status === ShipmentStatus.EXCEPTION)
      .length,
    paidAwaitingDispatch: shipments.filter(
      (item) => item.status === ShipmentStatus.PAID_AWAITING_DISPATCH
    ).length,
    inTransit: shipments.filter((item) => transitStatuses.includes(item.status))
      .length
  };
}

function buildActions(
  shipments: ShipmentListItem[],
  packageCounts: HomePackageCounts
): HomeAction[] {
  const actions: HomeAction[] = [];

  // Priority is fixed: exception → payment → package confirmation → ready packages.
  for (const shipment of shipments.filter(
    (item) => item.status === ShipmentStatus.EXCEPTION
  )) {
    actions.push({ kind: "SHIPMENT_EXCEPTION", shipment });
  }

  if (packageCounts.needsAction > 0) {
    actions.push({ kind: "PACKAGE_EXCEPTION", count: packageCounts.needsAction });
  }

  for (const shipment of shipments.filter(
    (item) => item.status === ShipmentStatus.AWAITING_PAYMENT
  )) {
    actions.push({ kind: "AWAITING_PAYMENT", shipment });
  }

  if (packageCounts.pendingMatch > 0) {
    actions.push({ kind: "PENDING_MATCH", count: packageCounts.pendingMatch });
  }

  if (packageCounts.ready > 0) {
    actions.push({ kind: "READY_FOR_SHIPMENT", count: packageCounts.ready });
  }

  return actions;
}
