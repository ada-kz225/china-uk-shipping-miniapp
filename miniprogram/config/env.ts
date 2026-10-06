export type AppEnvironment = "development" | "test";

const currentEnvironment: AppEnvironment = "development";

// const apiBaseUrls: Record<AppEnvironment, string> = {
//   development: "http://127.0.0.1:3000",
//   test: "http://127.0.0.1:3001"
// };
const apiBaseUrls: Record<AppEnvironment, string> = {
  development: "http://192.168.31.106:3000",
  test: "http://127.0.0.1:3001"
};

export const environmentConfig = {
  environment: currentEnvironment,
  apiBaseUrl: apiBaseUrls[currentEnvironment],
  demoUserId: "usr_demo_primary"
};
