import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/core/database/prisma.service';
import { CliAssetScannerService } from '@/modules/cli-provider/cli-asset-scanner.service';

/** cli_tool 行的授权配置：模型/思考强度覆盖，空 = 回落该 CLI 默认配置 */
export interface MemberToolGrantConfig {
  model?: string;
  thinkingLevel?: string;
}

export interface MemberToolGrantItem {
  scope: 'cli_tool' | 'mcp_server' | 'skill';
  refKey: string;
  granted: boolean;
  config?: MemberToolGrantConfig | null;
}

/** CLI 来源条目的 refKey 命名空间前缀：cli:<providerId>:<key> */
export const CLI_ASSET_REF_PREFIX = 'cli:';

export function buildCliAssetRefKey(providerId: string, key: string): string {
  return `${CLI_ASSET_REF_PREFIX}${providerId}:${key}`;
}

@Injectable()
export class MemberToolGrantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assetScanner: CliAssetScannerService,
  ) {}

  /** 列出成员的全部授权 + 可授权目录（CLI provider / 外部 MCP / 技能） */
  async listForMember(memberId: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });
    if (!member) throw new NotFoundException('Member not found');

    const [grants, cliProviders, mcpServers, skills] = await Promise.all([
      this.prisma.memberToolGrant.findMany({
        where: { memberId },
        orderBy: [{ scope: 'asc' }, { refKey: 'asc' }],
      }),
      this.prisma.cliProviderConfig.findMany({
        select: { providerId: true, enabled: true },
      }),
      this.prisma.mcpServerConfig.findMany({
        select: { id: true, name: true, transport: true },
      }),
      this.prisma.skillConfig.findMany({
        select: { key: true, name: true, category: true },
      }),
    ]);

    // CLI 本地资产发现（best-effort）：作为 skill / mcp_server 目录的「CLI 来源」条目
    const cliAssets = cliProviders.map((c) => ({
      providerId: c.providerId,
      enabled: c.enabled,
      assets: this.assetScanner.listAssets(c.providerId),
    }));

    const cliSkillCatalog = cliAssets.flatMap(
      ({ providerId, enabled, assets }) =>
        assets.skills.map((s) => ({
          refKey: buildCliAssetRefKey(providerId, s.key),
          label: `${s.name} · ${providerId}`,
          enabled,
          source: 'cli' as const,
          cliProviderId: providerId,
        })),
    );
    const cliMcpCatalog = cliAssets.flatMap(({ providerId, enabled, assets }) =>
      assets.mcpServers.map((m) => ({
        refKey: buildCliAssetRefKey(providerId, m.key),
        label: `${m.name} · ${providerId}`,
        enabled,
        source: 'cli' as const,
        cliProviderId: providerId,
      })),
    );

    return {
      grants,
      catalog: {
        cli_tool: cliProviders.map((c) => ({
          refKey: c.providerId,
          label: c.providerId,
          enabled: c.enabled,
        })),
        mcp_server: [
          ...mcpServers.map((m) => ({
            refKey: m.id,
            label: `${m.name} (${m.transport})`,
            enabled: true,
            source: 'platform' as const,
          })),
          ...cliMcpCatalog,
        ],
        skill: [
          ...skills.map((s) => ({
            refKey: s.key,
            label: `${s.name} · ${s.category}`,
            enabled: true,
            source: 'platform' as const,
          })),
          ...cliSkillCatalog,
        ],
      },
    };
  }

  /** 批量设置授权（全量覆盖语义：未出现的条目删除） */
  async setGrants(
    memberId: string,
    items: MemberToolGrantItem[],
    grantedBy?: string,
  ) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });
    if (!member) throw new NotFoundException('Member not found');

    await this.prisma.$transaction([
      this.prisma.memberToolGrant.deleteMany({ where: { memberId } }),
      ...items.map((item) => {
        // config 归一：空对象/空值落 null（=回落 CLI 默认配置）
        const cfg = item.config ?? {};
        const hasModel =
          typeof cfg.model === 'string' && cfg.model.trim() !== '';
        const hasThinking =
          typeof cfg.thinkingLevel === 'string' &&
          cfg.thinkingLevel.trim() !== '';
        const normalized =
          hasModel || hasThinking
            ? {
                ...(hasModel ? { model: cfg.model!.trim() } : {}),
                ...(hasThinking
                  ? { thinkingLevel: cfg.thinkingLevel!.trim() }
                  : {}),
              }
            : null;
        return this.prisma.memberToolGrant.create({
          data: {
            memberId,
            scope: item.scope,
            refKey: item.refKey,
            granted: item.granted,
            config: normalized ?? Prisma.JsonNull,
            grantedBy: grantedBy ?? null,
          },
        });
      }),
    ]);

    return this.prisma.memberToolGrant.findMany({ where: { memberId } });
  }

  /**
   * 取成员在某 scope 下显式授予（granted=true）的 refKey 白名单。
   * 无任何记录返回 null（未配置 = 不限制）；有记录则以白名单为准。
   */
  async getGrantedKeys(
    memberId: string,
    scope: string,
  ): Promise<string[] | null> {
    const rows = await this.prisma.memberToolGrant.findMany({
      where: { memberId, scope },
    });
    if (rows.length === 0) return null;
    return rows.filter((r) => r.granted).map((r) => r.refKey);
  }

  /**
   * 成员 cli_tool 授权配置表（refKey → { model, thinkingLevel }）。
   * 派发链据此对已授权 CLI 做成员级模型/思考强度覆盖。
   */
  async getCliGrantConfigs(
    memberId: string,
  ): Promise<Record<string, MemberToolGrantConfig>> {
    const rows = await this.prisma.memberToolGrant.findMany({
      where: { memberId, scope: 'cli_tool', granted: true },
    });
    const result: Record<string, MemberToolGrantConfig> = {};
    for (const row of rows) {
      const cfg = (row.config ?? {}) as MemberToolGrantConfig;
      const entry: MemberToolGrantConfig = {};
      if (typeof cfg.model === 'string' && cfg.model.trim() !== '') {
        entry.model = cfg.model.trim();
      }
      if (
        typeof cfg.thinkingLevel === 'string' &&
        cfg.thinkingLevel.trim() !== ''
      ) {
        entry.thinkingLevel = cfg.thinkingLevel.trim();
      }
      if (entry.model || entry.thinkingLevel) result[row.refKey] = entry;
    }
    return result;
  }
}
