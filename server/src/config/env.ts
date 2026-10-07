import "dotenv/config";
import { z } from "zod";

const rawEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  SQLITE_DB_PATH: z.string().min(1).default("./data/dev.sqlite"),
  DEMO_OPS_KEY: z.string().min(1).default("local-demo-ops-key")
});
// 以下用于真机调试
// const rawEnvironmentSchema = z.object({
//   NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
//   HOST: z.string().min(1).default("0.0.0.0"),
//   PORT: z.coerce.number().int().min(1).max(65535).default(3000),
//   SQLITE_DB_PATH: z.string().min(1).default("./data/dev.sqlite"),
//   DEMO_OPS_KEY: z.string().min(1).default("local-demo-ops-key")
// });

export type AppConfig = {
  environment: "development" | "test" | "production";
  host: string;
  port: number;
  sqliteDbPath: string;
  demoOpsKey: string;
};

export function loadConfig(
  environment: Record<string, string | undefined> = process.env
): AppConfig {
  const parsed = rawEnvironmentSchema.safeParse(environment);

  if (!parsed.success) {
    throw new Error(
      "服务配置无效，请检查 HOST、PORT、SQLITE_DB_PATH、DEMO_OPS_KEY 和 NODE_ENV。"
    );
  }

  return {
    environment: parsed.data.NODE_ENV,
    host: parsed.data.HOST,
    port: parsed.data.PORT,
    sqliteDbPath: parsed.data.SQLITE_DB_PATH,
    demoOpsKey: parsed.data.DEMO_OPS_KEY
  };
}
