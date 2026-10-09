import { ApiError } from "../../services/api";
import {
  cancelShipmentDraft,
  getShipment,
  removeShipmentPackage,
  submitShipment,
  ShipmentDto,
  UKAddressInput
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
    isRemovingPackage: false,
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

  onRemovePackageTap(event: {
    currentTarget: { dataset: { id: string } };
  }) {
    if (this.data.isSubmitting || this.data.isRemovingPackage) {
      return;
    }

    const packageId = event.currentTarget.dataset.id;

    wx.showModal({
      title: "移除包裹",
      content: "移除后，该包裹将恢复为可合箱状态，不会加入本次转运。",
      confirmText: "确认移除",
      cancelText: "暂不移除",
      success: async (result) => {
        if (!result.confirm) {
          return;
        }

        this.setData({ isRemovingPackage: true });

        try {
          const shipment = await removeShipmentPackage(this.data.shipmentId, packageId);
          this.setData({ shipment });
          wx.showToast({ title: "已移除包裹", icon: "success" });
        } catch (error) {
          wx.showToast({
            title: error instanceof ApiError ? error.message : "移除失败，请重试。",
            icon: "none"
          });
        } finally {
          this.setData({ isRemovingPackage: false });
        }
      }
    });
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
            : "提交失败，请重试。",
        icon: "none"
      });
    } finally {
      this.setData({ isSubmitting: false });
    }
  },

  onCancelDraftTap() {
    if (this.data.isSubmitting || this.data.isRemovingPackage) {
      return;
    }

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
                : "取消失败，请重试。",
            icon: "none"
          });
        }
      }
    });
  },

  onRetryTap() {
    this.loadShipment();
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
          error instanceof ApiError ? error.message : "暂时无法加载本次转运，请重试。"
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
