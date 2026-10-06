import { ApiError } from "../../services/api";
import {
  formatPackageDate,
  listPackages,
  type PackageDto,
  type PackageFilter
} from "../../services/packages";
import { createShipmentDraft } from "../../services/shipments";

type FilterOption = {
  key: PackageFilter;
  label: string;
};

type PackageCard = PackageDto & {
  arrivedAtDisplay: string;
  weightDisplay: string;
  isSelected?: boolean;
};

const filters: FilterOption[] = [
  { key: "all", label: "全部" },
  { key: "inbound", label: "待到仓" },
  { key: "pending_match", label: "待确认" },
  { key: "ready", label: "可合箱" },
  { key: "in_shipment", label: "已转运" },
  { key: "needs_action", label: "需处理" }
];

Page({
  data: {
    filters,
    selectedFilter: "all" as PackageFilter,
    packages: [] as PackageCard[],
    isLoading: false,
    errorMessage: "",
    isSelectionMode: false,
    selectedPackageIds: [] as string[],
    readyPackageCount: 0,
    isCreatingShipment: false
  },

  onShow() {
    const app = getApp<IAppOption>();

    if (app.globalData.resetPackageSelection) {
      this.setData({
        isSelectionMode: false,
        selectedPackageIds: []
      });
      app.globalData.resetPackageSelection = false;
    }

    this.loadPackages();
  },

  onPullDownRefresh() {
    this.loadPackages(true);
  },

  onFilterTap(event: { currentTarget: { dataset: { filter: PackageFilter } } }) {
    if (this.data.isSelectionMode) {
      return;
    }

    const filter = event.currentTarget.dataset.filter;

    if (filter === this.data.selectedFilter) {
      return;
    }

    this.setData({ selectedFilter: filter });
    this.loadPackages();
  },

  onPackageTap(event: { currentTarget: { dataset: { id: string } } }) {
    wx.navigateTo({
      url: "/pages/package-detail/index?id=" + encodeURIComponent(event.currentTarget.dataset.id)
    });
  },

  onCardTap(event: { currentTarget: { dataset: { id: string } } }) {
    if (this.data.isSelectionMode) {
      this.onSelectionPackageTap(event);
      return;
    }

    this.onPackageTap(event);
  },

  onDeclareTap() {
    wx.navigateTo({
      url: "/pages/package-declare/index"
    });
  },

  onStartConsolidation() {
    this.setData({
      isSelectionMode: true,
      selectedPackageIds: [],
      selectedFilter: "all"
    });
    this.loadPackages();
  },

  onExitSelection() {
    this.setData({
      isSelectionMode: false,
      selectedPackageIds: []
    });
    this.applySelectionToCards();
  },

  onSelectionPackageTap(event: {
    currentTarget: { dataset: { id: string } };
  }) {
    const packageId = event.currentTarget.dataset.id;
    const item = this.data.packages.find((candidate) => candidate.id === packageId);

    if (!item) {
      return;
    }

    if (!item.isEligibleForShipment) {
      wx.showToast({
        title: item.selectionReason ?? "该包裹暂不可选。",
        icon: "none"
      });
      return;
    }

    const isSelected = this.data.selectedPackageIds.includes(packageId);
    const selectedPackageIds = isSelected
      ? this.data.selectedPackageIds.filter((id) => id !== packageId)
      : [...this.data.selectedPackageIds, packageId];

    this.setData({ selectedPackageIds });
    this.applySelectionToCards();
  },

  async onCreateShipmentTap() {
    if (this.data.selectedPackageIds.length === 0) {
      wx.showToast({ title: "请至少选择 1 件可合箱包裹。", icon: "none" });
      return;
    }

    if (this.data.isCreatingShipment) {
      return;
    }

    this.setData({ isCreatingShipment: true });

    try {
      const shipment = await createShipmentDraft(this.data.selectedPackageIds);
      wx.navigateTo({
        url: "/pages/shipment-create/index?id=" + encodeURIComponent(shipment.id)
      });
    } catch (error) {
      wx.showToast({
        title:
          error instanceof ApiError
            ? error.message
            : "暂未创建成功，请重试。",
        icon: "none"
      });
    } finally {
      this.setData({ isCreatingShipment: false });
    }
  },

  onRetryTap() {
    this.loadPackages();
  },

  async loadPackages(stopPullDownRefresh = false) {
    this.setData({
      isLoading: true,
      errorMessage: ""
    });

    try {
      const packages = await listPackages(this.data.selectedFilter);
      const selectableIds = new Set(
        packages
          .filter((item) => item.isEligibleForShipment)
          .map((item) => item.id)
      );
      const selectedPackageIds = this.data.isSelectionMode
        ? this.data.selectedPackageIds.filter((id) => selectableIds.has(id))
        : this.data.selectedPackageIds;

      this.setData({
        packages: packages.map(toPackageCard),
        selectedPackageIds,
        readyPackageCount: packages.filter(
          (item) => item.isEligibleForShipment
        ).length
      });
      this.applySelectionToCards();
    } catch (error) {
      this.setData({
        packages: [],
        readyPackageCount: 0,
        errorMessage:
          error instanceof ApiError
            ? error.message
            : "加载失败，请重试。"
      });
    } finally {
      this.setData({ isLoading: false });

      if (stopPullDownRefresh) {
        wx.stopPullDownRefresh();
      }
    }
  },

  applySelectionToCards() {
    this.setData({
      packages: this.data.packages.map((item) => ({
        ...item,
        isSelected: this.data.selectedPackageIds.includes(item.id)
      }))
    });
  }
});

function toPackageCard(item: PackageDto): PackageCard {
  return {
    ...item,
    arrivedAtDisplay: formatPackageDate(item.arrivedAt),
    weightDisplay: item.weightG === null ? "" : item.weightG + " 克"
  };
}
