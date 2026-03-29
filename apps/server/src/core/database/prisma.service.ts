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
      await this.repairInvalidSqliteJsonValues();
      this.logger.log('Database connected');
    } catch (err: any) {
      throw err;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  private async repairInvalidSqliteJsonValues() {
    const databaseUrl = process.env.DATABASE_URL ?? '';
    if (!databaseUrl.startsWith('file:')) {
      return;
    }

    try {
      await this.$queryRawUnsafe(`SELECT json_valid('{}') as valid`);
    } catch {
      this.logger.warn(
        'SQLite json_valid() is unavailable; skip JSON integrity repair',
      );
      return;
    }

    const tables = await this.$queryRawUnsafe<Array<{ name: string }>>(
      `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
        AND name NOT LIKE '_prisma_%'
      `,
    );

    let repairedCells = 0;

    for (const table of tables) {
      const tableName = table.name.replace(/"/g, '""');
      const columns = await this.$queryRawUnsafe<
        Array<{ name: string; type: string | null; notnull: number }>
      >(`PRAGMA table_info("${tableName}")`);

      const jsonColumns = columns.filter((column) =>
        (column.type ?? '').toUpperCase().includes('JSON'),
      );

      for (const column of jsonColumns) {
        const columnName = column.name.replace(/"/g, '""');
        const invalidRows = await this.$queryRawUnsafe<
          Array<{ count: number }>
        >(
          `
          SELECT COUNT(1) AS count
          FROM "${tableName}"
          WHERE "${columnName}" IS NOT NULL
            AND json_valid("${columnName}") = 0
          `,
        );

        const invalidCount = Number(invalidRows[0]?.count ?? 0);
        if (invalidCount <= 0) {
          continue;
        }

        const fallbackValue = column.notnull === 1 ? `'{}'` : 'NULL';
        await this.$executeRawUnsafe(
          `
          UPDATE "${tableName}"
          SET "${columnName}" = ${fallbackValue}
          WHERE "${columnName}" IS NOT NULL
            AND json_valid("${columnName}") = 0
          `,
        );

        repairedCells += invalidCount;
        this.logger.warn(
          `Repaired invalid JSON cells in ${tableName}.${columnName}: ${invalidCount}`,
        );
      }
    }

    if (repairedCells > 0) {
      this.logger.warn(
        `SQLite JSON integrity repair completed: ${repairedCells} cells fixed`,
      );
    }
  }
}
