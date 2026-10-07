import { ApiError } from "../../services/api";
import { getHome, type HomeDto } from "../../services/home";
import type { PackageFilter } from "../../services/packages";

type PackageOverviewItem = {
  label: string;
  count: number;
  filter: PackageFilter;
};

Page({
  data: {
    home: null as HomeDto | null,
    packageOverviewItems: [] as PackageOverviewItem[],
    isLoading: false,
    errorMessage: ""
  },

  onShow() {
    this.loadHome();
  },

  onPullDownRefresh() {
    this.loadHome(true);
  },

  onRetryTap() {
    this.loadHome();
  },

  onActionTap(event: {
    currentTarget: {
      dataset: {
        targetType: "SHIPMENT_DETAIL" | "PACKAGE_FILTER";
        shipmentId?: string;
        filter?: PackageFilter;
      };
    };
  }) {
    const target = event.currentTarget.dataset;

    if (target.targetType === "SHIPMENT_DETAIL" && target.shipmentId) {
      this.openShipment(target.shipmentId);
      return;
    }

    if (target.targetType === "PACKAGE_FILTER" && target.filter) {
      this.openPackageFilter(target.filter);
    }
  },

  onCurrentShipmentTap(event: { currentTarget: { dataset: { id: string } } }) {
    this.openShipment(event.currentTarget.dataset.id);
  },

  onPackageOverviewTap(event: {
    currentTarget: { dataset: { filter: PackageFilter } };
  }) {
    this.openPackageFilter(event.currentTarget.dataset.filter);
  },

  onCopyWarehouseTap() {
    const warehouse = this.data.home?.warehouse;

    if (!warehouse) {
      return;
    }

    const content = [
      warehouse.name,
      "收件人：" + warehouse.recipientName + "（" + warehouse.recipientCode + "）",
      "电话：" + warehouse.phone,
      "地址：" + warehouse.addressLine,
      warehouse.instructions ? "备注：" + warehouse.instructions : ""
    ]
      .filter(Boolean)
      .join("\n");

    wx.setClipboardData({
      data: content,
      success: () => wx.showToast({ title: "仓库地址已复制", icon: "success" })
    });
  },

  async loadHome(stopPullDownRefresh = false) {
    this.setData({ isLoading: true, errorMessage: "" });

    try {
      const home = await getHome();
      this.setData({
        home,
        packageOverviewItems: [
          { label: "待到仓", count: home.packageOverview.inbound, filter: "inbound" },
          { label: "待确认", count: home.packageOverview.pendingMatch, filter: "pending_match" },
          { label: "可合箱", count: home.packageOverview.ready, filter: "ready" },
          { label: "已转运", count: home.packageOverview.inShipment, filter: "in_shipment" },
          { label: "需处理", count: home.packageOverview.needsAction, filter: "needs_action" }
        ]
      });
    } catch (error) {
      this.setData({
        home: null,
        packageOverviewItems: [],
        errorMessage:
          error instanceof ApiError ? error.message : "加载首页失败，请重试。"
      });
    } finally {
      this.setData({ isLoading: false });
      if (stopPullDownRefresh) {
        wx.stopPullDownRefresh();
      }
    }
  },

  openShipment(id: string) {
    wx.navigateTo({
      url: "/pages/shipment-detail/index?id=" + encodeURIComponent(id)
    });
  },

  openPackageFilter(filter: PackageFilter) {
    getApp<IAppOption>().globalData.pendingPackageFilter = filter;
    wx.switchTab({ url: "/pages/packages/index" });
  }
});
