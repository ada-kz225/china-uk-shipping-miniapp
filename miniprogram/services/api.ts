import { environmentConfig } from "../config/env";

type HttpMethod = "GET" | "POST" | "DELETE";

export type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
  };
};

export class ApiError extends Error {
  public readonly statusCode?: number;
  public readonly code?: string;

  constructor(message: string, statusCode?: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function request<T>(
  method: HttpMethod,
  path: string,
  data?: unknown,
  extraHeaders: Record<string, string> = {}
): Promise<T> {
  return new Promise((resolve, reject) => {
    const hasBody = data !== undefined;

    wx.request({
      url: environmentConfig.apiBaseUrl + path,
      method,
      data: hasBody ? (data as WechatMiniprogram.IAnyObject) : undefined,
      header: {
        "X-Demo-User-Id": environmentConfig.demoUserId,
        // Avoid the platform default application/json header when no body exists.
        "content-type": hasBody ? "application/json" : "text/plain",
        ...extraHeaders
      },
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data as T);
          return;
        }

        const payload = response.data as ApiErrorPayload;
        logApiFailure(method, path, response.statusCode, payload.error?.code);
        reject(
          new ApiError(
            payload.error?.message ?? "服务暂时不可用，请稍后重试。",
            response.statusCode,
            payload.error?.code
          )
        );
      },
      fail(error) {
        logApiFailure(method, path, undefined, undefined, error);
        reject(new ApiError("暂时无法连接服务，请稍后重试。"));
      }
    });
  });
}

function logApiFailure(
  method: HttpMethod,
  path: string,
  statusCode?: number,
  errorCode?: string,
  error?: unknown
): void {
  if (environmentConfig.environment !== "development") {
    return;
  }

  console.error("[API 请求失败]", {
    method,
    path,
    statusCode,
    errorCode,
    error
  });
}

export const apiClient = {
  get<T>(path: string): Promise<T> {
    return request<T>("GET", path);
  },
  post<T>(
    path: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    return request<T>("POST", path, data, headers);
  },
  delete<T>(path: string): Promise<T> {
    return request<T>("DELETE", path);
  }
};

export type HealthResponse = {
  status: "ok";
  service: "china-uk-shipping-api";
  database: {
    status: "connected";
  };
  timestamp: string;
};

export function healthApi(): Promise<HealthResponse> {
  return apiClient.get<HealthResponse>("/health");
}
