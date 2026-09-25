import type { INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import {
  resolveRequestId,
  type ErrorResponseBody,
} from './global-exception.filter';

/**
 * 未知路由统一信封兜底（Express 层）。
 *
 * Nest 的路由级 404（NotFoundException）只注册在全局前缀（/_api）之下，
 * 前缀之外未匹配任何路由的请求会穿透整个路由栈，掉进 Express 内置
 * 404（HTML 页），破坏统一响应信封。本过滤器追加在路由栈末尾，
 * 只接住前面全部放行的请求，回落 NOT_FOUND 信封。
 *
 * 调用时机：必须先完成 Nest 路由注册（app.init / app.listen 之后），
 * 否则会抢先于业务路由响应。
 */
export function registerUnknownRouteFilter(app: INestApplication): void {
  const instance = app.getHttpAdapter().getInstance() as {
    use: (
      callback: (req: Request, res: Response, next: NextFunction) => void,
    ) => unknown;
  };
  instance.use((req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      next();
      return;
    }
    res.status(404).json(buildUnknownRouteEnvelope(req));
  });
}

/** 与 GlobalExceptionFilter 的 404 信封同构（Nest 未匹配路由同文案） */
export function buildUnknownRouteEnvelope(req: Request): ErrorResponseBody {
  const message = `Cannot ${req.method} ${req.originalUrl}`;
  return {
    status: 404,
    success: false,
    description: message,
    data: null,
    error: { code: 'NOT_FOUND', message },
    timestamp: new Date().toISOString(),
    requestId: resolveRequestId(req),
  };
}
