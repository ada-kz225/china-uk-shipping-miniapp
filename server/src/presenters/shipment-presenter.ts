import type {
  Address,
  Payment,
  Quote,
  Shipment,
  TrackingEvent
} from "../domain/index.js";
import { PaymentStatus, ShipmentStatus } from "../domain/index.js";
import type { ShipmentDetails } from "../services/shipment-service.js";
import { getTrackingEventDescription } from "../services/tracking-service.js";
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
    description: "仓库正在打包并确认本次转运的最终重量。",
    nextAction: "等待仓库完成处理并生成报价。"
  },
  [ShipmentStatus.AWAITING_PAYMENT]: {
    label: "最终报价已生成，请确认并付款",
    description: "本次最终计费重量和费用已经生成。",
    nextAction: "请核对报价后确认并模拟付款。"
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
    nextAction: "当前无需操作，等待进入国际运输。"
  },
  [ShipmentStatus.INTERNATIONAL_TRANSIT]: {
    label: "国际运输中",
    description: "转运单正在跨境运输中。",
    nextAction: "当前无需操作，等待清关。"
  },
  [ShipmentStatus.CUSTOMS_CLEARANCE]: {
    label: "清关处理中",
    description: "转运单正在清关阶段。",
    nextAction: "当前无需操作，等待完成清关。"
  },
  [ShipmentStatus.UK_LAST_MILE]: {
    label: "英国派送中",
    description: "转运单已进入英国本地派送阶段。",
    nextAction: "请留意末端派送信息。"
  },
  [ShipmentStatus.DELIVERED]: {
    label: "已签收",
    description: "已收到签收事件，本次转运已完成。",
    nextAction: "本次转运已完成。"
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
  quote?: QuoteDto | null;
  latestPayment?: PaymentDto | null;
  trackingEvents?: TrackingEventDto[];
  unselectedReadyPackageCount?: number;
};

type QuoteDto = {
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

type PaymentDto = {
  status: PaymentStatus;
  statusLabel: string;
  statusDescription: string;
  completedAt: string | null;
};

type TrackingEventDto = {
  title: string;
  description: string;
  occurredAt: string;
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
    quote: entity.quote ? presentQuote(entity.quote) : null,
    latestPayment: entity.latestPayment
      ? presentLatestPayment(entity.latestPayment)
      : null,
    trackingEvents: entity.trackingEvents.map(presentTrackingEvent),
    unselectedReadyPackageCount:
      entity.status === ShipmentStatus.DRAFT
        ? Math.max(entity.readyPackageCount - entity.packages.length, 0)
        : undefined
  };
}

function presentTrackingEvent(entity: TrackingEvent): TrackingEventDto {
  return {
    title: entity.displayMessage,
    description: getTrackingEventDescription(entity.eventType),
    occurredAt: entity.occurredAt
  };
}

function presentQuote(entity: Quote): QuoteDto {
  return {
    finalWeightG: entity.finalWeightG,
    finalWeightDisplay: formatWeight(entity.finalWeightG),
    chargeableWeightG: entity.chargeableWeightG,
    chargeableWeightDisplay: formatWeight(entity.chargeableWeightG),
    shippingFeeMinor: entity.shippingFeeMinor,
    shippingFeeDisplay: formatAmount(entity.shippingFeeMinor, entity.currency),
    serviceFeeMinor: entity.serviceFeeMinor,
    serviceFeeDisplay: formatAmount(entity.serviceFeeMinor, entity.currency),
    totalAmountMinor: entity.totalAmountMinor,
    totalAmountDisplay: formatAmount(entity.totalAmountMinor, entity.currency),
    currency: entity.currency,
    generatedAt: entity.createdAt
  };
}

function presentLatestPayment(entity: Payment): PaymentDto {
  const copy: Record<PaymentStatus, Omit<PaymentDto, "status" | "completedAt">> = {
    [PaymentStatus.PROCESSING]: {
      statusLabel: "付款处理中",
      statusDescription: "正在确认付款结果，请勿重复操作。"
    },
    [PaymentStatus.SUCCEEDED]: {
      statusLabel: "付款成功",
      statusDescription: "付款已成功，仓库正在安排出库。"
    },
    [PaymentStatus.FAILED]: {
      statusLabel: "付款未完成",
      statusDescription: "本次付款未成功，请重新尝试。"
    },
    [PaymentStatus.UNKNOWN]: {
      statusLabel: "付款结果待确认",
      statusDescription: "暂未确认付款结果，请稍后刷新后再试。"
    }
  };

  return {
    status: entity.status,
    completedAt: entity.completedAt,
    ...copy[entity.status]
  };
}

function formatWeight(weightG: number): string {
  return (weightG / 1000).toFixed(2) + " 千克";
}

function formatAmount(amountMinor: number, currency: string): string {
  const prefixByCurrency: Record<string, string> = {
    GBP: "£",
    CNY: "¥"
  };
  const prefix = prefixByCurrency[currency] ?? currency + " ";

  return prefix + (amountMinor / 100).toFixed(2);
}

function presentAddress(entity: Address): AddressDto {
  return {
    recipientName: entity.recipientName,
    phone: entity.phone,
    postcode: entity.postcode,
    addressLine: entity.addressLine
  };
}
