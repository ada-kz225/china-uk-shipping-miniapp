import { environmentConfig } from "./config/env";
import { healthApi } from "./services/api";

App<IAppOption>({
  globalData: {
    apiBaseUrl: environmentConfig.apiBaseUrl
  },
  onLaunch() {
    void healthApi().catch(() => {
      console.warn("后端健康检查暂不可用。");
    });
  }
});
