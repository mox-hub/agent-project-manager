/**
 * MCP Servers Service
 *
 * 外部 MCP server 配置管理：
 * - listServers()          配置 + 最近一次探活缓存状态
 * - createServer(dto)      新增配置并立即探活
 * - updateServer(id, dto)  更新配置并重新探活
 * - deleteServer(id)       删除配置
 * - refreshServer(id)      单个探活（连接 + listTools 写回状态）
 * - refreshAllServers()    并发探活全部启用项
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import { McpClientRegistry, type McpProbeTarget } from './mcp-client.registry';
import { SaveMcpServerDto } from './dto/save-mcp-server.dto';

export interface McpServerStatus {
  id: string;
  name: string;
  description?: string;
  transport: 'stdio' | 'http' | 'sse';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  enabled: boolean;
  status: 'online' | 'offline' | 'unknown';
  lastError?: string;
  toolCount?: number;
  lastLatencyMs?: number;
  lastPingAt?: string;
  serverName?: string;
  serverVersion?: string;
  createdAt: string;
  updatedAt: string;
}

type McpServerConfigRow = {
  id: string;
  name: string;
  description: string | null;
  transport: string;
  command: string | null;
  args: unknown;
  env: unknown;
  url: string | null;
  headers: unknown;
  enabled: boolean;
  lastStatus: string | null;
  lastError: string | null;
  toolCount: number | null;
  lastLatencyMs: number | null;
  lastPingAt: Date | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class McpServersService {
  private readonly logger = new Logger(McpServersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
    private readonly registry: McpClientRegistry,
  ) {}

  async listServers(): Promise<McpServerStatus[]> {
    const rows = await this.prisma.mcpServerConfig.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => this.toStatus(row));
  }

  async createServer(dto: SaveMcpServerDto): Promise<McpServerStatus> {
    this.validateDto(dto);

    const existing = await this.prisma.mcpServerConfig.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        `MCP server name already exists: ${dto.name}`,
      );
    }

    const created = await this.prisma.mcpServerConfig.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        transport: dto.transport,
        command: dto.command ?? null,
        args: (dto.args ?? null) as never,
        env: (dto.env ?? null) as never,
        url: dto.url ?? null,
        headers: (dto.headers ?? null) as never,
        enabled: dto.enabled ?? true,
      },
    });

    this.messageBus.publish('mcp.server.updated', {
      id: created.id,
      action: 'created',
    });

    return this.probeAndStore(created);
  }

  async updateServer(
    id: string,
    dto: SaveMcpServerDto,
  ): Promise<McpServerStatus> {
    this.validateDto(dto);

    const existing = await this.prisma.mcpServerConfig.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`MCP server not found: ${id}`);
    }

    if (dto.name !== existing.name) {
      const nameTaken = await this.prisma.mcpServerConfig.findUnique({
        where: { name: dto.name },
      });
      if (nameTaken) {
        throw new ConflictException(
          `MCP server name already exists: ${dto.name}`,
        );
      }
    }

    const updated = await this.prisma.mcpServerConfig.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description ?? null,
        transport: dto.transport,
        command: dto.command ?? null,
        args: (dto.args ?? null) as never,
        env: (dto.env ?? null) as never,
        url: dto.url ?? null,
        headers: (dto.headers ?? null) as never,
        enabled: dto.enabled ?? existing.enabled,
      },
    });

    this.messageBus.publish('mcp.server.updated', { id, action: 'updated' });

    return this.probeAndStore(updated);
  }

  async deleteServer(id: string): Promise<void> {
    const existing = await this.prisma.mcpServerConfig.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`MCP server not found: ${id}`);
    }
    await this.prisma.mcpServerConfig.delete({ where: { id } });
    this.messageBus.publish('mcp.server.updated', { id, action: 'deleted' });
  }

  async refreshServer(id: string): Promise<McpServerStatus> {
    const row = await this.prisma.mcpServerConfig.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(`MCP server not found: ${id}`);
    }
    return this.probeAndStore(row);
  }

  async refreshAllServers(): Promise<McpServerStatus[]> {
    const rows = await this.prisma.mcpServerConfig.findMany({
      where: { enabled: true },
    });
    const results = await Promise.all(
      rows.map((row) =>
        this.probeAndStore(row).catch(() => this.toStatus(row)),
      ),
    );
    return this.listServers().then((all) => (all.length ? all : results));
  }

  /**
   * 探活并写回缓存状态，返回合并后的状态
   */
  private async probeAndStore(
    row: McpServerConfigRow,
  ): Promise<McpServerStatus> {
    const target = this.toProbeTarget(row);
    const result = await this.registry.probe(target);

    const metadata = (row.metadata as Record<string, unknown> | null) ?? {};
    const nextMetadata = {
      ...metadata,
      serverName: result.serverName ?? null,
      serverVersion: result.serverVersion ?? null,
    };

    const updated = await this.prisma.mcpServerConfig.update({
      where: { id: row.id },
      data: {
        lastStatus: result.online ? 'online' : 'offline',
        lastError: result.error ?? null,
        toolCount: result.toolCount,
        lastLatencyMs: result.latencyMs,
        lastPingAt: new Date(),
        metadata: nextMetadata as never,
      },
    });

    return this.toStatus(updated);
  }

  private validateDto(dto: SaveMcpServerDto): void {
    if (dto.transport === 'stdio' && !dto.command) {
      throw new BadRequestException('stdio transport requires "command"');
    }
    if (dto.transport !== 'stdio' && !dto.url) {
      throw new BadRequestException(
        `${dto.transport} transport requires "url"`,
      );
    }
  }

  private toProbeTarget(row: McpServerConfigRow): McpProbeTarget {
    return {
      transport: row.transport as McpProbeTarget['transport'],
      command: row.command,
      args: (row.args as string[] | null) ?? undefined,
      env: (row.env as Record<string, string> | null) ?? undefined,
      url: row.url,
      headers: (row.headers as Record<string, string> | null) ?? undefined,
    };
  }

  private toStatus(row: McpServerConfigRow): McpServerStatus {
    const metadata = (row.metadata as Record<string, unknown> | null) ?? {};
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      transport: row.transport as McpServerStatus['transport'],
      command: row.command ?? undefined,
      args: (row.args as string[] | null) ?? undefined,
      env: (row.env as Record<string, string> | null) ?? undefined,
      url: row.url ?? undefined,
      headers: (row.headers as Record<string, string> | null) ?? undefined,
      enabled: row.enabled,
      status:
        row.lastStatus === 'online' || row.lastStatus === 'offline'
          ? (row.lastStatus as 'online' | 'offline')
          : 'unknown',
      lastError: row.lastError ?? undefined,
      toolCount: row.toolCount ?? undefined,
      lastLatencyMs: row.lastLatencyMs ?? undefined,
      lastPingAt: row.lastPingAt?.toISOString(),
      serverName: (metadata.serverName as string | undefined) ?? undefined,
      serverVersion:
        (metadata.serverVersion as string | undefined) ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
