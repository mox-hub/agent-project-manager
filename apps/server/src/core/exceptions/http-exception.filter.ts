import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { LoggerService } from '../logger/logger.service';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('HttpExceptionFilter');
  }

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // Check if it's a BusinessException with custom error code
    const responseBody = exception.getResponse();
    let errorCode = exception.name;
    let message = exception.message;

    if (typeof responseBody === 'object' && responseBody !== null) {
      const body = responseBody as any;
      if (body.code && typeof body.code === 'string') {
        errorCode = body.code;
      }
      if (body.message && typeof body.message === 'string') {
        message = body.message;
      }
    }

    const errorResponse = {
      error: {
        code: errorCode,
        message,
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    };

    this.logger.error(
      `${status} ${request.method} ${request.url}`,
      exception.stack,
    );

    response.status(status).json(errorResponse);
  }
}
