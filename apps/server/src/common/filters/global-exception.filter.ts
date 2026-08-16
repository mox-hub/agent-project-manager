import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Prisma } from '@prisma/client';
import { I18nContext, I18nService } from 'nestjs-i18n';

interface ErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

interface ErrorResponseBody {
  status: number;
  success: false;
  description: string;
  data: null;
  error: ErrorPayload;
  timestamp: string;
  requestId?: string;
}

/**
 * HTTP 状态码 → 业务错误码映射
 */
const HTTP_ERROR_CODE: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'RATE_LIMIT_EXCEEDED',
  500: 'INTERNAL_ERROR',
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly i18n: I18nService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();

    const i18nLang = I18nContext.current()?.lang || 'zh-CN';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = HTTP_ERROR_CODE[status] ?? 'INTERNAL_ERROR';
    let description = this.i18n.t('common.INTERNAL_ERROR', { lang: i18nLang });
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = HTTP_ERROR_CODE[status] ?? code;
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        description = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        description =
          (responseObj.message as string) ||
          (responseObj.error as string) ||
          description;
        if (typeof responseObj.error === 'string') {
          code = responseObj.error.toUpperCase().replace(/\s+/g, '_') || code;
        }
        if (Array.isArray(responseObj.message)) {
          description = this.i18n.t('common.VALIDATION_ERROR', {
            lang: i18nLang,
          });
          code = 'VALIDATION_ERROR';
          details = responseObj.message;
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST;
      code = 'DATABASE_ERROR';

      switch (exception.code) {
        case 'P2002':
          description = this.i18n.t('common.VALIDATION_ERROR', {
            lang: i18nLang,
          });
          code = 'UNIQUE_CONSTRAINT';
          details = {
            target: exception.meta?.target,
            constraint: (exception.meta as { constraint_name?: string })
              ?.constraint_name,
          };
          break;
        case 'P2025':
          description = this.i18n.t('common.NOT_FOUND', { lang: i18nLang });
          code = 'NOT_FOUND';
          status = HttpStatus.NOT_FOUND;
          break;
        case 'P2003':
          description = this.i18n.t('common.BAD_REQUEST', { lang: i18nLang });
          code = 'FOREIGN_KEY_CONSTRAINT';
          details = exception.meta;
          break;
        default:
          description = this.i18n.t('common.ERROR', { lang: i18nLang });
          details = exception.meta;
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      description = this.i18n.t('common.VALIDATION_ERROR', {
        lang: i18nLang,
      });
      code = 'PRISMA_VALIDATION_ERROR';
      details = exception.message;
    }

    this.logger.error(
      `${request.method} ${request.url} - Status: ${status} - Code: ${code} - ${description}`,
      exception instanceof Error ? exception.stack : JSON.stringify(exception),
    );

    const body: ErrorResponseBody = {
      status,
      success: false,
      description,
      data: null,
      error: { code, message: description, details },
      timestamp: new Date().toISOString(),
      requestId: request.requestId,
    };

    response.status(status).json(body);
  }
}
