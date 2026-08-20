import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';

export interface MemberToolGrantItem {
  scope: 'cli_tool' | 'mcp_server' | 'skill';
  refKey: string;
  granted: boolean;
}

@Injectable()
export class MemberToolGrantService {
  constructor(private readonly prisma: PrismaService) {}

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

    return {
      grants,
      catalog: {
        cli_tool: cliProviders.map((c) => ({
          refKey: c.providerId,
          label: c.providerId,
          enabled: c.enabled,
        })),
        mcp_server: mcpServers.map((m) => ({
          refKey: m.id,
          label: `${m.name} (${m.transport})`,
          enabled: true,
        })),
        skill: skills.map((s) => ({
          refKey: s.key,
          label: `${s.name} · ${s.category}`,
          enabled: true,
        })),
      },
    };
  }

  /** 批量设置授权（全量覆盖语义：未出现的条目删除） */
  async setGrants(memberId: string, items: MemberToolGrantItem[], grantedBy?: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });
    if (!member) throw new NotFoundException('Member not found');

    await this.prisma.$transaction([
      this.prisma.memberToolGrant.deleteMany({ where: { memberId } }),
      ...items.map((item) =>
        this.prisma.memberToolGrant.create({
          data: {
            memberId,
            scope: item.scope,
            refKey: item.refKey,
            granted: item.granted,
            grantedBy: grantedBy ?? null,
          },
        }),
      ),
    ]);

    return this.prisma.memberToolGrant.findMany({ where: { memberId } });
  }

  /**
   * 取成员在某 scope 下显式授予（granted=true）的 refKey 白名单。
   * 无任何记录返回 null（未配置 = 不限制）；有记录则以白名单为准。
   */
  async getGrantedKeys(memberId: string, scope: string): Promise<string[] | null> {
    const rows = await this.prisma.memberToolGrant.findMany({
      where: { memberId, scope },
    });
    if (rows.length === 0) return null;
    return rows.filter((r) => r.granted).map((r) => r.refKey);
  }
}
