import { ApiError } from "../../services/api";
import {
  formatPackageDate,
  getPackage,
  type PackageDto
} from "../../services/packages";

type PackageDetail = PackageDto & {
  arrivedAtDisplay: string;
  weightDisplay: string;
  createdAtDisplay: string;
};

Page({
  data: {
    package: null as PackageDetail | null,
    isLoading: false,
    errorMessage: "",
    packageId: ""
  },

  onLoad(options: { id?: string }) {
    if (!options.id) {
      this.setData({ errorMessage: "未找到该包裹。" });
      return;
    }

    this.setData({ packageId: options.id });
    this.loadPackage();
  },

  onPullDownRefresh() {
    this.loadPackage(true);
  },

  onRetryTap() {
    this.loadPackage();
  },

  async loadPackage(stopPullDownRefresh = false) {
    if (!this.data.packageId) {
      return;
    }

    this.setData({
      isLoading: true,
      errorMessage: ""
    });

    try {
      const item = await getPackage(this.data.packageId);
      this.setData({ package: toPackageDetail(item) });
    } catch (error) {
      this.setData({
        package: null,
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

function toPackageDetail(item: PackageDto): PackageDetail {
  return {
    ...item,
    arrivedAtDisplay: formatPackageDate(item.arrivedAt),
    weightDisplay: item.weightG === null ? "" : item.weightG + " 克",
    createdAtDisplay: formatPackageDate(item.createdAt)
  };
}
