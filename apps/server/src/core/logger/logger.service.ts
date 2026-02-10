import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { createLogger, format, Logger, transports } from 'winston';
import { ConfigService } from '../config/config.service';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: Logger;
  private context?: string;

  constructor(private readonly configService: ConfigService) {
    this.logger = createLogger({
      level: this.configService.get('LOG_LEVEL') || 'info',
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json(),
      ),
      transports: [
        new transports.Console({
          format: format.combine(
            format.colorize(),
            format.printf(({ timestamp, level, message, context, ...meta }) => {
              const rest =
                meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
              return `${timestamp} [${context || 'App'}] ${level}: ${message}${rest}`;
            }),
          ),
        }),
        new transports.File({ filename: 'logs/error.log', level: 'error' }),
        new transports.File({ filename: 'logs/combined.log' }),
      ],
    });
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, ...optionalParams: unknown[]) {
    this.logger.info(message, { context: this.context, meta: optionalParams });
  }

  error(message: string, trace?: string, ...optionalParams: unknown[]) {
    this.logger.error(message, {
      context: this.context,
      trace,
      meta: optionalParams,
    });
  }

  warn(message: string, ...optionalParams: unknown[]) {
    this.logger.warn(message, { context: this.context, meta: optionalParams });
  }

  debug(message: string, ...optionalParams: unknown[]) {
    this.logger.debug(message, { context: this.context, meta: optionalParams });
  }

  verbose(message: string, ...optionalParams: unknown[]) {
    this.logger.verbose(message, { context: this.context, meta: optionalParams });
  }
}

