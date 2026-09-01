/**
 * 统一错误模型：后端错误码 → CLI 退出码
 */

export const ExitCode = {
  OK: 0,
  GENERAL: 1,
  AUTH: 2,
  WORKSPACE: 3,
  BACKEND_UNREACHABLE: 4,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

export class ApmError extends Error {
  readonly exitCode: number;
  readonly backendErrorCode?: string;
  readonly requestId?: string;

  constructor(
    message: string,
    exitCode: number = ExitCode.GENERAL,
    backendErrorCode?: string,
    requestId?: string,
  ) {
    super(message);
    this.name = 'ApmError';
    this.exitCode = exitCode;
    this.backendErrorCode = backendErrorCode;
    this.requestId = requestId;
  }
}

/** 后端 GlobalExceptionFilter / TransformInterceptor 的标准错误负载 */
export interface BackendErrorBody {
  status?: number;
  success?: boolean;
  description?: string;
  error?: { code?: string; message?: string; details?: unknown };
  requestId?: string;
}

interface AxiosLikeError {
  isAxiosError?: boolean;
  code?: string;
  response?: { status?: number; data?: BackendErrorBody };
}

/** 把 axios / 任意错误解析为 ApmError，统一退出码语义 */
export function parseBackendError(err: unknown): ApmError {
  if (err && typeof err === 'object' && 'isAxiosError' in err) {
    const axiosErr = err as AxiosLikeError;

    // 网络层错误
    if (axiosErr.code === 'ECONNREFUSED' || axiosErr.code === 'ENOTFOUND') {
      return new ApmError(
        `无法连接后端（${axiosErr.code}）。请确认 server 已启动，或执行 apm config set backend <url>`,
        ExitCode.BACKEND_UNREACHABLE,
      );
    }
    if (axiosErr.code === 'ETIMEDOUT' || axiosErr.code === 'ECONNABORTED') {
      return new ApmError(
        `请求后端超时（${axiosErr.code}）`,
        ExitCode.BACKEND_UNREACHABLE,
      );
    }

    const status = axiosErr.response?.status;
    const data = axiosErr.response?.data;
    const errorCode = data?.error?.code;
    const message = data?.description ?? data?.error?.message;

    if (status === 401) {
      return new ApmError(
        message || '认证失败或登录已过期，请执行 apm login',
        ExitCode.AUTH,
        errorCode,
        data?.requestId,
      );
    }
    if (status === 403) {
      return new ApmError(
        message || '无权限访问该资源',
        ExitCode.WORKSPACE,
        errorCode,
        data?.requestId,
      );
    }

    return new ApmError(
      message || `请求失败：HTTP ${status ?? 'unknown'}`,
      ExitCode.GENERAL,
      errorCode,
      data?.requestId,
    );
  }

  if (err instanceof Error) {
    return new ApmError(err.message);
  }
  return new ApmError(String(err));
}
