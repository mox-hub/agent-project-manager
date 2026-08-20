import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import type { PrismaClient as PrismaClientType } from '@prisma/client';

// IMPORTANT:
// Prisma decides engine strategy when @prisma/client is loaded.
// Force local engine BEFORE loading PrismaClient to avoid Data Proxy mode
// when global env accidentally sets PRISMA_CLIENT_ENGINE_TYPE=dataproxy.
process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';
import { PrismaClient } from '@prisma/client';
import { getCurrentWorkspaceId } from './workspace-context';
import { resolveWorkspaceDbUrl } from './workspace-registry.util';

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

/**
 * 工作区路由 PrismaService 工厂：
 * 返回 Proxy，按请求级 x-workspace-id（AsyncLocalStorage）把数据访问路由到
 * 对应工作区的 SQLite 库；无上下文或未注册工作区时回落默认库（DATABASE_URL）。
 */
export function createWorkspaceAwarePrismaService(
  logger: LoggerService,
): PrismaService {
  const base = new PrismaService(logger);
  const pool = new Map<string, PrismaClient>();

  const getClient = (): PrismaClient => {
    const wsId = getCurrentWorkspaceId();
    if (!wsId) return base;
    const url = resolveWorkspaceDbUrl(wsId);
    if (!url) {
      logger.warn(`Workspace "${wsId}" 未注册或未初始化，回落默认工作区数据库`);
      return base;
    }
    if (url === process.env.DATABASE_URL) return base;
    let client = pool.get(url);
    if (!client) {
      client = new PrismaClient({
        datasources: { db: { url } },
      });
      pool.set(url, client);
      logger.log(`Workspace database client created: ${url}`);
    }
    return client;
  };

  const proxy = new Proxy<PrismaService>(base, {
    get(_target, prop, _receiver) {
      // 生命周期方法固定路由到默认实例（销毁时顺带关闭工作区连接池）
      if (prop === 'onModuleDestroy') {
        return async () => {
          for (const [url, client] of pool) {
            try {
              await client.$disconnect();
              logger.log(`Workspace database disconnected: ${url}`);
            } catch (e) {
              logger.warn(
                `workspace disconnect failed: ${(e as Error).message}`,
              );
            }
          }
          pool.clear();
          await base.onModuleDestroy();
        };
      }
      if (prop === 'onModuleInit' || prop === 'logger') {
        const value = Reflect.get(base, prop, base);
        return typeof value === 'function'
          ? (value as () => unknown).bind(base)
          : value;
      }

      const client = getClient();
      const value = Reflect.get(client, prop, client);
      return typeof value === 'function'
        ? (value as (...args: unknown[]) => unknown).bind(client)
        : value;
    },
  });

  return proxy;
}
