interface IAppOption {
  globalData: {
    apiBaseUrl: string;
    resetPackageSelection: boolean;
    pendingPackageFilter: import("../services/packages").PackageFilter | null;
  };
}
