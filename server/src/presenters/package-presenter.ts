import type { DomainException, Package } from "../domain/index.js";
import { PackageStatus } from "../domain/index.js";

type PackageCopy = {
  label: string;
  description: string;
  availableActions: string[];
};

const packageCopy: Record<PackageStatus, PackageCopy> = {
  [PackageStatus.DECLARED]: {
    label: "已预报，等待送往仓库",
    description: "已收到你的预报信息，这不代表包裹已经到仓。",
    availableActions: ["当前无需操作；包裹送达仓库后会进入确认流程。"]
  },
  [PackageStatus.INBOUND_TO_WAREHOUSE]: {
    label: "正在送往仓库",
    description: "包裹正在前往中国仓，尚未完成收货与归属确认。",
    availableActions: ["当前无需操作。"]
  },
  [PackageStatus.ARRIVED_PENDING_MATCH]: {
    label: "已到仓，正在确认归属",
    description: "仓库已记录收货，正在确认包裹是否归入你的包裹集合。",
    availableActions: ["当前无需操作；如需补充信息会明确提示。"]
  },
  [PackageStatus.READY_FOR_SHIPMENT]: {
    label: "可合箱",
    description: "包裹已确认归属，可以选择加入本次转运单。",
    availableActions: ["可加入转运单，也可以继续等待其他包裹。"]
  },
  [PackageStatus.IN_SHIPMENT]: {
    label: "已加入转运",
    description: "该包裹已锁定在关联转运单中，不能再次选择。",
    availableActions: ["查看关联转运单，了解处理和运输进度。"]
  },
  [PackageStatus.EXCEPTION]: {
    label: "需处理",
    description: "此包裹暂时不能按正常流程继续。",
    availableActions: ["请查看具体影响和下一步；如无需操作会明确说明。"]
  }
};

export type PackageDto = {
  id: string;
  domesticTrackingNumber: string;
  description: string;
  status: PackageStatus;
  statusLabel: string;
  statusDescription: string;
  availableActions: string[];
  arrivedAt: string | null;
  weightG: number | null;
  shipmentReference: string | null;
  createdAt: string;
  updatedAt: string;
  exception: {
    title: string;
    description: string;
    impact: string;
    requiredAction: string;
  } | null;
};

export function presentPackage(
  entity: Package,
  exception?: DomainException
): PackageDto {
  const copy = packageCopy[entity.status];

  return {
    id: entity.id,
    domesticTrackingNumber: entity.domesticTrackingNumber,
    description: entity.description,
    status: entity.status,
    statusLabel: copy.label,
    statusDescription: copy.description,
    availableActions: copy.availableActions,
    arrivedAt: entity.arrivedAt,
    weightG: entity.weightG,
    shipmentReference: entity.shipmentReference ?? null,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    exception: exception
      ? {
          title: exception.title,
          description: exception.description,
          impact: exception.impact,
          requiredAction: exception.requiredAction
        }
      : null
  };
}
