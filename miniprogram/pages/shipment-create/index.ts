import { ApiError } from "../../services/api";
import {
  cancelShipmentDraft,
  getShipment,
  removeShipmentPackage,
  submitShipment,
  type ShipmentDto,
  type UKAddressInput
} from "../../services/shipments";

Page({
  data: {
    shipmentId: "",
    shipment: null as ShipmentDto | null,
    address: {
      recipientName: "",
      phone: "",
      postcode: "",
      addressLine: ""
    } as UKAddressInput,
    isLoading: false,
    isSubmitting: false,
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

  onAddressInput(event: {
    currentTarget: { dataset: { field: keyof UKAddressInput } };
    detail: { value: string };
  }) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      ["address." + field]: event.detail.value
    });
  },

  async onRemovePackageTap(event: {
    currentTarget: { dataset: { id: string } };
  }) {
    if (this.data.isSubmitting) {
      return;
    }

    try {
      const shipment = await removeShipmentPackage(
        this.data.shipmentId,
        event.currentTarget.dataset.id
      );
      this.setData({ shipment });
    } catch (error) {
      wx.showToast({
        title:
          error instanceof ApiError
            ? error.message
            : "暂未移除成功，请重试。",
        icon: "none"
      });
    }
  },

  async onSubmitTap() {
    if (this.data.isSubmitting) {
      return;
    }

    const shipment = this.data.shipment;

    if (!shipment || shipment.packageCount === 0) {
      wx.showToast({ title: "请至少选择 1 件可合箱包裹。", icon: "none" });
      return;
    }

    const address = normalizeAddress(this.data.address);
    const validationMessage = validateAddress(address);

    if (validationMessage) {
      wx.showToast({ title: validationMessage, icon: "none" });
      return;
    }

    this.setData({ isSubmitting: true });

    try {
      const submitted = await submitShipment(this.data.shipmentId, address);
      wx.showToast({ title: "转运单已提交", icon: "success" });
      getApp<IAppOption>().globalData.resetPackageSelection = true;
      wx.redirectTo({
        url: "/pages/shipment-detail/index?id=" + encodeURIComponent(submitted.id)
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
  },

  onCancelDraftTap() {
    wx.showModal({
      title: "取消本次转运",
      content: "取消后，本次已选包裹将恢复为可合箱状态。",
      confirmText: "确认取消",
      cancelText: "暂不取消",
      success: async (result) => {
        if (!result.confirm) {
          return;
        }

        try {
          await cancelShipmentDraft(this.data.shipmentId);
          wx.showToast({ title: "已取消本次转运", icon: "success" });
          getApp<IAppOption>().globalData.resetPackageSelection = true;
          wx.navigateBack();
        } catch (error) {
          wx.showToast({
            title:
              error instanceof ApiError
                ? error.message
                : "暂未取消成功，请重试。",
            icon: "none"
          });
        }
      }
    });
  },

  async loadShipment() {
    if (!this.data.shipmentId) {
      return;
    }

    this.setData({ isLoading: true, errorMessage: "" });

    try {
      const shipment = await getShipment(this.data.shipmentId);
      this.setData({ shipment });
    } catch (error) {
      this.setData({
        shipment: null,
        errorMessage:
          error instanceof ApiError ? error.message : "加载失败，请重试。"
      });
    } finally {
      this.setData({ isLoading: false });
    }
  }
});

function normalizeAddress(address: UKAddressInput): UKAddressInput {
  return {
    recipientName: address.recipientName.trim(),
    phone: address.phone.trim(),
    postcode: address.postcode.trim(),
    addressLine: address.addressLine.trim()
  };
}

function validateAddress(address: UKAddressInput): string {
  if (!address.recipientName) {
    return "请填写收件人。";
  }
  if (!address.phone) {
    return "请填写联系电话。";
  }
  if (!address.postcode) {
    return "请填写邮编。";
  }
  if (!address.addressLine) {
    return "请填写详细地址。";
  }

  return "";
}
