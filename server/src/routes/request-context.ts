import type { FastifyRequest } from "fastify";

import { AppError } from "../utils/app-error.js";

export function getCurrentDemoUserId(request: FastifyRequest): string {
  const value = request.headers["x-demo-user-id"];
  const userId = Array.isArray(value) ? value[0] : value;

  if (!userId || !userId.trim()) {
    throw new AppError("FORBIDDEN", 403, "当前用户信息不可用。");
  }

  return userId.trim();
}

export function verifyDemoOpsKey(
  request: FastifyRequest,
  expectedKey: string
): void {
  const value = request.headers["x-demo-ops-key"];
  const suppliedKey = Array.isArray(value) ? value[0] : value;

  if (!suppliedKey || suppliedKey !== expectedKey) {
    throw new AppError("FORBIDDEN", 403, "无权执行模拟仓库操作。");
  }
}
