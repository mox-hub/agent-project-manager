import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { I18nContext, I18nService } from 'nestjs-i18n';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly i18n: I18nService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // Get current language from i18n context
    const i18nLang = I18nContext.current()?.lang || 'zh-CN';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = this.i18n.t('common.INTERNAL_ERROR', { lang: i18nLang });
    let error = 'Internal Server Error';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string) || message;
        error = (responseObj.error as string) || error;

        // Handle validation errors
        if (Array.isArray(responseObj.message)) {
          message = this.i18n.t('common.VALIDATION_ERROR', { lang: i18nLang });
          details = responseObj.message;
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle Prisma errors
      status = HttpStatus.BAD_REQUEST;
      error = 'Database Error';

      switch (exception.code) {
        case 'P2002':
          message = this.i18n.t('common.VALIDATION_ERROR', { lang: i18nLang });
          details = {
            target: exception.meta?.target,
            constraint: exception.meta?.constraint_name,
          };
          break;
        case 'P2025':
          message = this.i18n.t('common.NOT_FOUND', { lang: i18nLang });
          status = HttpStatus.NOT_FOUND;
          break;
        case 'P2003':
          message = this.i18n.t('common.BAD_REQUEST', { lang: i18nLang });
          details = exception.meta;
          break;
        default:
          message = this.i18n.t('common.ERROR', { lang: i18nLang });
          details = exception.meta;
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = this.i18n.t('common.VALIDATION_ERROR', { lang: i18nLang });
      error = 'Validation Error';
      details = exception.message;
    }

    // Log error details
    this.logger.error(
      `${request.method} ${request.url} - Status: ${status} - Message: ${message}`,
      exception instanceof Error ? exception.stack : JSON.stringify(exception),
    );

    // Send error response
    response.status(status).json({
      statusCode: status,
      message,
      error,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
