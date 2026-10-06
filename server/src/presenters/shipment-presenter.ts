import type { Address, Shipment } from "../domain/index.js";
import { ShipmentStatus } from "../domain/index.js";
import type { ShipmentDetails } from "../services/shipment-service.js";
import { presentPackage, type PackageDto } from "./package-presenter.js";

type ShipmentCopy = {
  label: string;
  description: string;
  nextAction: string;
};

const shipmentCopy: Record<ShipmentStatus, ShipmentCopy> = {
  [ShipmentStatus.DRAFT]: {
    label: "草稿",
    description: "请确认本次转运包裹和英国收货地址。",
    nextAction: "确认包裹和地址后提交转运单。"
  },
  [ShipmentStatus.SUBMITTED]: {
    label: "已提交，等待仓库处理",
    description: "本次转运已提交，仓库尚未开始处理。",
    nextAction: "仓库将开始打包和称重；当前无需操作。"
  },
  [ShipmentStatus.WAREHOUSE_PROCESSING]: {
    label: "仓库正在处理",
    description: "仓库正在检查、打包和称重。",
    nextAction: "当前无需操作；如需补充信息会明确提示。"
  },
  [ShipmentStatus.AWAITING_PAYMENT]: {
    label: "最终报价已生成，请确认并付款",
    description: "本次最终计费重量和费用已经生成。",
    nextAction: "报价与付款将在后续阶段开放。"
  },
  [ShipmentStatus.PAYMENT_PROCESSING]: {
    label: "正在确认付款结果",
    description: "已收到付款请求，正在确认结果。",
    nextAction: "请勿重复发起付款。"
  },
  [ShipmentStatus.PAID_AWAITING_DISPATCH]: {
    label: "已付款，等待仓库发出",
    description: "费用已支付成功，但转运单尚未实际离开仓库。",
    nextAction: "当前无需操作；仓库实际出库后会更新进度。"
  },
  [ShipmentStatus.DISPATCHED]: {
    label: "已从仓库发出",
    description: "仓库已确认本次转运实际离仓。",
    nextAction: "可查看运输进度。"
  },
  [ShipmentStatus.INTERNATIONAL_TRANSIT]: {
    label: "国际运输中",
    description: "转运单正在跨境运输中。",
    nextAction: "当前无需操作；可查看最近运输进度。"
  },
  [ShipmentStatus.CUSTOMS_CLEARANCE]: {
    label: "清关中",
    description: "转运单正在清关阶段。",
    nextAction: "默认无需操作；如需配合会明确提示。"
  },
  [ShipmentStatus.UK_LAST_MILE]: {
    label: "英国派送中",
    description: "转运单已进入英国本地派送阶段。",
    nextAction: "当前无需操作；等待签收或按异常指引处理。"
  },
  [ShipmentStatus.DELIVERED]: {
    label: "已签收",
    description: "已收到签收事件，本次转运已完成。",
    nextAction: "无需操作；可查看完整记录。"
  },
  [ShipmentStatus.EXCEPTION]: {
    label: "需处理",
    description: "当前问题影响转运单继续推进。",
    nextAction: "请查看发生什么、影响什么和明确下一步。"
  },
  [ShipmentStatus.CANCELLED]: {
    label: "已取消",
    description: "本次转运已取消。",
    nextAction: "可重新选择可合箱包裹创建转运单。"
  }
};

export type ShipmentDto = {
  id: string;
  reference: string | null;
  status: ShipmentStatus;
  statusLabel: string;
  statusDescription: string;
  nextAction: string;
  packageCount: number;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  packages?: PackageDto[];
  address?: AddressDto | null;
  unselectedReadyPackageCount?: number;
};

type AddressDto = {
  recipientName: string;
  phone: string;
  postcode: string;
  addressLine: string;
};

export function presentShipmentSummary(
  entity: Shipment & { packageCount: number }
): ShipmentDto {
  const copy = shipmentCopy[entity.status];

  return {
    id: entity.id,
    reference: entity.reference,
    status: entity.status,
    statusLabel: copy.label,
    statusDescription: copy.description,
    nextAction: copy.nextAction,
    packageCount: entity.packageCount,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    submittedAt: entity.submittedAt
  };
}

export function presentShipmentDetail(entity: ShipmentDetails): ShipmentDto {
  const copy = shipmentCopy[entity.status];

  return {
    id: entity.id,
    reference: entity.reference,
    status: entity.status,
    statusLabel: copy.label,
    statusDescription: copy.description,
    nextAction: copy.nextAction,
    packageCount: entity.packages.length,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    submittedAt: entity.submittedAt,
    packages: entity.packages.map((item) => presentPackage(item)),
    address: entity.address ? presentAddress(entity.address) : null,
    unselectedReadyPackageCount:
      entity.status === ShipmentStatus.DRAFT
        ? Math.max(entity.readyPackageCount - entity.packages.length, 0)
        : undefined
  };
}

function presentAddress(entity: Address): AddressDto {
  return {
    recipientName: entity.recipientName,
    phone: entity.phone,
    postcode: entity.postcode,
    addressLine: entity.addressLine
  };
}
