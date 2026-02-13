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

    const errorResponse = {
      error: {
        code: exception.name,
        message: exception.message,
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
