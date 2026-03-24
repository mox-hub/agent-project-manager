import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import type { PrismaClient as PrismaClientType } from '@prisma/client';

// IMPORTANT:
// Prisma decides engine strategy when @prisma/client is loaded.
// Force local engine BEFORE loading PrismaClient to avoid Data Proxy mode
// when global env accidentally sets PRISMA_CLIENT_ENGINE_TYPE=dataproxy.
process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client') as {
  PrismaClient: new (...args: any[]) => PrismaClientType;
};

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly logger: LoggerService) {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });

    this.logger.setContext('Prisma');

    this.$on('query' as never, (e: any) => {
      this.logger.debug('Prisma Query', {
        query: e.query,
        duration: e.duration,
      });
    });

    this.$on('error' as never, (e: any) => {
      this.logger.error('Prisma Error', e?.stack ?? String(e));
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected');
    } catch (err: any) {
      throw err;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }
}
