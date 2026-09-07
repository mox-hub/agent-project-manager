/**
 * 后端统一响应信封与解包（单源实现）。
 *
 * 后端所有响应（含 Public 端点）统一为 TransformInterceptor 包裹的 envelope：
 *   成功: { status, success: true, description, data, timestamp, requestId }
 *   失败: { status, success: false, description, data: null,
 *           error: { code, message, details? }, timestamp, requestId }
 *
 * 前端 api-client 与 CLI ApmClient 共用 unwrapEnvelope，取代此前各自维护
 * 的两份解包实现。
 */

export interface BackendSuccessEnvelope<T> {
  status: number;
  success: true;
  description: string;
  data: T;
  timestamp: string;
  requestId?: string;
}

export interface BackendErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface BackendErrorEnvelope {
  status: number;
  success: false;
  description: string;
  data: null;
  error: BackendErrorPayload;
  timestamp: string;
  requestId?: string;
}

export type BackendEnvelope<T> =
  | BackendSuccessEnvelope<T>
  | BackendErrorEnvelope;

/**
 * 列表端点的标准分页负载（后端 PaginatedDataDto<T>）。
 */
export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface EnvelopeUnwrap<T> {
  data: T | null;
  /** 仅当 body 是失败信封（success === false 且带 error）时非空 */
  error: BackendErrorEnvelope | null;
}

/**
 * 纯函数解包：识别 envelope 则取 data / error，否则原样透传
 * （兼容未包裹端点）。null/undefined 一律透传。
 */
export function unwrapEnvelope<T>(body: unknown): EnvelopeUnwrap<T> {
  if (
    body !== null &&
    body !== undefined &&
    typeof body === 'object' &&
    'success' in body &&
    'data' in body
  ) {
    const env = body as BackendEnvelope<T>;
    if (env.success === true) {
      return { data: (env.data ?? null) as T | null, error: null };
    }
    if (env.success === false && env.error) {
      return { data: null, error: env };
    }
  }
  return { data: body as T, error: null };
}
