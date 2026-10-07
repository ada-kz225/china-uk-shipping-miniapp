import { presentShipmentSummary, type ShipmentDto } from "./shipment-presenter.js";
import type {
  HomeAction,
  HomeDashboard,
  HomePackageCounts,
  HomeShipmentCounts
} from "../services/home-service.js";

type HomeActionDto = {
  title: string;
  description: string;
  target:
    | { type: "SHIPMENT_DETAIL"; shipmentId: string }
    | { type: "PACKAGE_FILTER"; filter: "needs_action" | "pending_match" | "ready" };
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
  shipmentOverview: HomeShipmentCounts;
  warehouse: {
    name: string;
    recipientName: string;
    recipientCode: string;
    phone: string;
    addressLine: string;
    instructions: string | null;
  } | null;
};

export function presentHome(entity: HomeDashboard): HomeDto {
  return {
    actionRequired: entity.actions.map(presentAction),
    currentJourney: entity.currentShipment
      ? presentShipmentSummary(entity.currentShipment)
      : null,
    packageOverview: presentPackageOverview(entity.packageCounts),
    shipmentOverview: entity.shipmentCounts,
    warehouse: entity.warehouse
      ? {
          name: entity.warehouse.name,
          recipientName: entity.warehouse.recipientName,
          recipientCode: entity.warehouse.recipientCode,
          phone: entity.warehouse.phone,
          addressLine: entity.warehouse.addressLine,
          instructions: entity.warehouse.instructions
        }
      : null
  };
}

function presentAction(action: HomeAction): HomeActionDto {
  switch (action.kind) {
    case "SHIPMENT_EXCEPTION":
      return {
        title: "转运单需要处理",
        description:
          (action.shipment.reference ?? "该转运单") + " 当前存在需要处理的问题。",
        target: { type: "SHIPMENT_DETAIL", shipmentId: action.shipment.id }
      };
    case "PACKAGE_EXCEPTION":
      return {
        title: action.count + " 件包裹需要处理",
        description: "请查看包裹问题、影响和下一步。",
        target: { type: "PACKAGE_FILTER", filter: "needs_action" }
      };
    case "AWAITING_PAYMENT":
      return {
        title: "有转运单待付款",
        description:
          (action.shipment.reference ?? "该转运单") + " 已生成最终报价，请确认并付款。",
        target: { type: "SHIPMENT_DETAIL", shipmentId: action.shipment.id }
      };
    case "PENDING_MATCH":
      return {
        title: action.count + " 件包裹待确认",
        description: "仓库正在确认包裹归属。",
        target: { type: "PACKAGE_FILTER", filter: "pending_match" }
      };
    case "READY_FOR_SHIPMENT":
      return {
        title: action.count + " 件包裹可合箱",
        description: "可选择本次要转运的包裹。",
        target: { type: "PACKAGE_FILTER", filter: "ready" }
      };
  }
}

function presentPackageOverview(counts: HomePackageCounts): HomeDto["packageOverview"] {
  return {
    inbound: counts.inbound,
    pendingMatch: counts.pendingMatch,
    ready: counts.ready,
    inShipment: counts.inShipment,
    needsAction: counts.needsAction
  };
}
