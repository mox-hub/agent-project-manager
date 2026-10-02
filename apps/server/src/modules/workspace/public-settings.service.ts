import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';

/**
 * 工作区名单公开开关（CAP-A-26）。
 *
 * 背景：`GET /workspaces` 列表含库路径，历来**不向未认证方暴露**。CAP-A-26 让「登录卡片
 * 列出工作区供选择」成为可能，代价是把**名称**部分对未认证方放开——经 2026-10-02 用户裁决
 * 做成**可配置（默认关）**：只有管理员显式开启后，公开端点才返回名单；**库路径始终不暴露**。
 *
 * 存储：AppConfig 全局键（默认库；与 `dispatch.trustGateEnabled` 同存储机制）。读取在
 * 公开端点（无 `x-workspace-id` → 默认库）与写入端点（同）中一致，均落在默认库。
 */
@Injectable()
export class WorkspacePublicSettingsService {
  static readonly CONFIG_KEY = 'workspace.publicListEnabled';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 是否向未认证方公开工作区名单。
   * 缺省 false（安全默认）；读取异常亦回落 false——**绝不**因读失败而意外暴露名单。
   */
  async isPublicListEnabled(): Promise<boolean> {
    try {
      const row = await this.prisma.appConfig.findFirst({
        where: {
          key: WorkspacePublicSettingsService.CONFIG_KEY,
          scope: 'global',
        },
      });
      return row?.value === true;
    } catch {
      return false;
    }
  }

  /** 写入开关（管理员写路径）。返回写入后的值。 */
  async setPublicListEnabled(
    enabled: boolean,
    actorId?: string,
  ): Promise<boolean> {
    const key = WorkspacePublicSettingsService.CONFIG_KEY;
    const existing = await this.prisma.appConfig.findFirst({
      where: { key, scope: 'global' },
    });

    if (existing) {
      await this.prisma.appConfig.update({
        where: { id: existing.id },
        data: {
          value: enabled,
          updatedBy: actorId ?? null,
          updatedAt: new Date(),
        },
      });
    } else {
      await this.prisma.appConfig.create({
        data: {
          key,
          value: enabled,
          scope: 'global',
          description:
            '是否向未认证方公开工作区名单（登录页工作区选择；默认关闭，库路径永不暴露）',
          createdBy: actorId ?? null,
          updatedBy: actorId ?? null,
        },
      });
    }

    return enabled;
  }
}
