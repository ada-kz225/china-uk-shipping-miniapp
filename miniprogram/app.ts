import { environmentConfig } from "./config/env";
import { healthApi } from "./services/api";

App<IAppOption>({
  globalData: {
    apiBaseUrl: environmentConfig.apiBaseUrl,
    resetPackageSelection: false,
    pendingPackageFilter: null
  },
  onLaunch() {
    void healthApi().catch(() => {
      console.warn("后端健康检查暂不可用。");
    });
  }
});
