import { ApiError } from "../../services/api";
import {
  formatShipmentDate,
  listShipments,
  ShipmentDto,
  ShipmentScope
} from "../../services/shipments";
import { shipmentStatusTone, StatusTone } from "../../services/status-ui";

type ShipmentCard = ShipmentDto & {
  updatedAtDisplay: string;
  referenceDisplay: string;
  statusTone: StatusTone;
};

Page({
  data: {
    selectedScope: "active" as ShipmentScope,
    shipments: [] as ShipmentCard[],
    isLoading: false,
    errorMessage: ""
  },

  onShow() {
    this.loadShipments();
  },

  onScopeTap(event: { currentTarget: { dataset: { scope: ShipmentScope } } }) {
    const scope = event.currentTarget.dataset.scope;

    if (scope === this.data.selectedScope) {
      return;
    }

    this.setData({ selectedScope: scope });
    this.loadShipments();
  },

  onShipmentTap(event: { currentTarget: { dataset: { id: string } } }) {
    wx.navigateTo({
      url: "/pages/shipment-detail/index?id=" + encodeURIComponent(event.currentTarget.dataset.id)
    });
  },

  onRetryTap() {
    this.loadShipments();
  },

  async loadShipments() {
    this.setData({ isLoading: true, errorMessage: "" });

    try {
      const shipments = await listShipments(this.data.selectedScope);
      this.setData({ shipments: shipments.map(toShipmentCard) });
    } catch (error) {
      this.setData({
        shipments: [],
        errorMessage:
          error instanceof ApiError ? error.message : "暂时无法加载转运单，请重试。"
      });
    } finally {
      this.setData({ isLoading: false });
    }
  }
});

function toShipmentCard(item: ShipmentDto): ShipmentCard {
  return {
    ...item,
    updatedAtDisplay: formatShipmentDate(item.updatedAt),
    referenceDisplay: item.reference ?? "草稿转运",
    statusTone: shipmentStatusTone(item.status)
  };
}
