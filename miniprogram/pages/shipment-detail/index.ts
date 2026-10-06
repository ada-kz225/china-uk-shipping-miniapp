import { ApiError } from "../../services/api";
import {
  formatShipmentDate,
  getShipment,
  simulateShipmentPayment,
  type ShipmentDto
} from "../../services/shipments";

type ShipmentDetail = ShipmentDto & {
  referenceDisplay: string;
  createdAtDisplay: string;
  submittedAtDisplay: string;
  quoteGeneratedAtDisplay: string;
  trackingEventsDisplay: Array<{
    title: string;
    description: string;
    occurredAtDisplay: string;
  }>;
};

Page({
  data: {
    shipmentId: "",
    shipment: null as ShipmentDetail | null,
    isLoading: false,
    isPaying: false,
    errorMessage: ""
  },

  onLoad(options: { id?: string }) {
    if (!options.id) {
      this.setData({ errorMessage: "未找到该转运单。" });
      return;
    }

    this.setData({ shipmentId: options.id });
    this.loadShipment();
  },

  onShow() {
    if (this.data.shipmentId) {
      this.loadShipment();
    }
  },

  onPullDownRefresh() {
    this.loadShipment(true);
  },

  onRetryTap() {
    this.loadShipment();
  },

  onPackageTap(event: { currentTarget: { dataset: { id: string } } }) {
    wx.navigateTo({
      url: "/pages/package-detail/index?id=" + encodeURIComponent(event.currentTarget.dataset.id)
    });
  },

  onContinueDraftTap() {
    wx.navigateTo({
      url: "/pages/shipment-create/index?id=" + encodeURIComponent(this.data.shipmentId)
    });
  },

  async onPaymentTap() {
    if (this.data.isPaying || !this.data.shipment) {
      return;
    }

    this.setData({ isPaying: true });

    try {
      // Keep the simulated confirmation state visible long enough to prevent
      // repeated taps and make the payment transition understandable.
      await wait(350);
      const shipment = await simulateShipmentPayment(this.data.shipmentId);
      this.setData({ shipment: toShipmentDetail(shipment) });
      wx.showToast({ title: "模拟付款成功", icon: "success" });
    } catch (error) {
      wx.showToast({
        title: error instanceof ApiError ? error.message : "付款未完成，请重新尝试。",
        icon: "none"
      });
    } finally {
      this.setData({ isPaying: false });
    }
  },

  async loadShipment(stopPullDownRefresh = false) {
    if (!this.data.shipmentId) {
      return;
    }

    this.setData({ isLoading: true, errorMessage: "" });

    try {
      const shipment = await getShipment(this.data.shipmentId);
      this.setData({ shipment: toShipmentDetail(shipment) });
    } catch (error) {
      this.setData({
        shipment: null,
        errorMessage:
          error instanceof ApiError ? error.message : "加载失败，请重试。"
      });
    } finally {
      this.setData({ isLoading: false });

      if (stopPullDownRefresh) {
        wx.stopPullDownRefresh();
      }
    }
  }
});

function toShipmentDetail(item: ShipmentDto): ShipmentDetail {
  return {
    ...item,
    referenceDisplay: item.reference ?? "草稿转运",
    createdAtDisplay: formatShipmentDate(item.createdAt),
    submittedAtDisplay: formatShipmentDate(item.submittedAt),
    quoteGeneratedAtDisplay: item.quote
      ? formatShipmentDate(item.quote.generatedAt)
      : "",
    trackingEventsDisplay: (item.trackingEvents ?? []).map((event) => ({
      title: event.title,
      description: event.description,
      occurredAtDisplay: formatShipmentDate(event.occurredAt)
    }))
  };
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
