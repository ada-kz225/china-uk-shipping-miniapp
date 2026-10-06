import { ApiError } from "../../services/api";
import { declarePackage } from "../../services/packages";

Page({
  data: {
    domesticTrackingNumber: "",
    description: "",
    isSubmitting: false
  },

  onTrackingNumberInput(event: { detail: { value: string } }) {
    this.setData({ domesticTrackingNumber: event.detail.value });
  },

  onDescriptionInput(event: { detail: { value: string } }) {
    this.setData({ description: event.detail.value });
  },

  async onSubmit() {
    if (this.data.isSubmitting) {
      return;
    }

    const domesticTrackingNumber = this.data.domesticTrackingNumber.trim();
    const description = this.data.description.trim();

    if (!domesticTrackingNumber) {
      wx.showToast({ title: "请填写国内运单号。", icon: "none" });
      return;
    }

    if (!description) {
      wx.showToast({ title: "请填写商品描述。", icon: "none" });
      return;
    }

    this.setData({ isSubmitting: true });

    try {
      const created = await declarePackage({
        domesticTrackingNumber,
        description
      });
      wx.showToast({ title: "预报成功", icon: "success" });
      wx.redirectTo({
        url: "/pages/package-detail/index?id=" + encodeURIComponent(created.id)
      });
    } catch (error) {
      wx.showToast({
        title:
          error instanceof ApiError
            ? error.message
            : "暂未提交成功，请重试。",
        icon: "none"
      });
    } finally {
      this.setData({ isSubmitting: false });
    }
  }
});
