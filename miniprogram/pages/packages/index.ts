import { ApiError } from "../../services/api";
import {
  formatPackageDate,
  listPackages,
  type PackageDto,
  type PackageFilter
} from "../../services/packages";

type FilterOption = {
  key: PackageFilter;
  label: string;
};

type PackageCard = PackageDto & {
  arrivedAtDisplay: string;
  weightDisplay: string;
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
    errorMessage: ""
  },

  onShow() {
    this.loadPackages();
  },

  onPullDownRefresh() {
    this.loadPackages(true);
  },

  onFilterTap(event: { currentTarget: { dataset: { filter: PackageFilter } } }) {
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

  onDeclareTap() {
    wx.navigateTo({
      url: "/pages/package-declare/index"
    });
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
      this.setData({
        packages: packages.map(toPackageCard)
      });
    } catch (error) {
      this.setData({
        packages: [],
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
  }
});

function toPackageCard(item: PackageDto): PackageCard {
  return {
    ...item,
    arrivedAtDisplay: formatPackageDate(item.arrivedAt),
    weightDisplay: item.weightG === null ? "" : item.weightG + " 克"
  };
}
