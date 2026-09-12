import { Injectable, Logger } from '@nestjs/common';
import semver from 'semver';
import simpleGit from 'simple-git';
import { ContractWorkspaceResolver } from '../contract/contract-workspace-fs';
import { PrismaService } from '../../core/database/prisma.service';

export interface VersionRecommendation {
  /** 推荐的下一个版本（semver） */
  recommended: string;
  /** 推断基线版本（DB 发版记录与 git tag 中的较大者） */
  base: string;
  /** 增量类型：conventional commits 机械推断，无提交记录时回落 patch */
  releaseType: 'major' | 'minor' | 'patch';
  /** 推断依据说明（前端展示 + 决策卡快照） */
  basis: string;
}

/**
 * 版本推断（CAP-K-03 一期）：单一版本真相源 = Release 实体集合，
 * git tag（v{version}）是派生面。推荐版本 = max(库内最新版本, git 最新 tag)
 * 为基线，按 conventional commits 机械推断增量（BREAKING→major /
 * feat→minor / 其余→patch）。机械推断打底，AI 润色发布说明、人拍板版本。
 */
@Injectable()
export class ReleaseVersionService {
  private readonly logger = new Logger(ReleaseVersionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: ContractWorkspaceResolver,
  ) {}

  async recommendVersion(
    projectId: string,
    excludeReleaseId?: string,
  ): Promise<VersionRecommendation> {
    const base = await this.resolveBaseVersion(projectId, excludeReleaseId);
    const root = await this.resolver.resolveRoot(projectId);
    if (!root) {
      return {
        recommended: semver.inc(base, 'patch') ?? base,
        base,
        releaseType: 'patch',
        basis: '项目无工作区（无 git 历史可推断），按 patch 递增',
      };
    }
    const releaseType = await this.inferReleaseType(root, `v${base}`);
    const recommended = semver.inc(base, releaseType);
    if (!recommended) {
      throw new Error(`基线版本 ${base} 不是合法 semver，无法递增`);
    }
    return {
      recommended,
      base,
      releaseType,
      basis: `基线 ${base}，按 conventional commits 推断为 ${releaseType} 递增`,
    };
  }

  /** 校验版本合法性与项目内唯一性（创建/改草案共用） */
  async assertVersionUsable(
    projectId: string,
    version: string,
    excludeReleaseId?: string,
  ): Promise<void> {
    if (!semver.valid(version)) {
      throw new Error(`版本号 ${version} 不是合法 semver`);
    }
    const dup = await this.prisma.release.findFirst({
      where: {
        projectId,
        version,
        ...(excludeReleaseId ? { id: { not: excludeReleaseId } } : {}),
      },
      select: { id: true },
    });
    if (dup) {
      throw new Error(`版本 ${version} 在本项目已存在`);
    }
    const base = await this.resolveBaseVersion(projectId, excludeReleaseId);
    if (semver.lte(version, base)) {
      throw new Error(
        `版本 ${version} 不大于当前基线 ${base}——发版只前滚不回退`,
      );
    }
  }

  /**
   * 基线 = max(库内最新版本, git 最新 v* tag)。
   * tag 是派生面但可能在库外被人手打，取较大者才诚实。
   */
  private async resolveBaseVersion(
    projectId: string,
    excludeReleaseId?: string,
  ): Promise<string> {
    const releases = await this.prisma.release.findMany({
      where: {
        projectId,
        ...(excludeReleaseId ? { id: { not: excludeReleaseId } } : {}),
      },
      select: { version: true },
    });
    let base = '0.0.0';
    for (const r of releases) {
      const v = semver.valid(r.version);
      if (v && semver.gt(v, base)) base = v;
    }
    const root = await this.resolver.resolveRoot(projectId);
    if (!root) return base;
    try {
      const git = simpleGit(root);
      const tags = await git.tags();
      for (const tag of tags.all) {
        const v = semver.valid(tag.replace(/^v/, ''));
        if (v && semver.gt(v, base)) base = v;
      }
    } catch (err) {
      this.logger.warn(
        `读取 git tags 失败，基线仅按库内发版记录: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return base;
  }

  /** conventional commits 机械推断增量类型；无新提交回落 patch */
  private async inferReleaseType(
    root: string,
    fromTag: string,
  ): Promise<'major' | 'minor' | 'patch'> {
    const git = simpleGit(root);
    try {
      await git.raw(['rev-parse', '--verify', fromTag]);
    } catch {
      // 基线 tag 尚不存在（库内有版本但 git 无 tag）——从首个提交起算
      return (await this.runRecommendedBump(root, undefined)) ?? 'patch';
    }
    return (await this.runRecommendedBump(root, fromTag)) ?? 'patch';
  }

  /**
   * conventional-recommended-bump 的 promise 封装。
   * 包为回调风格且 ESM-only（项目 moduleResolution 解析不到其类型），
   * 用字符串变量的动态 import 绕过类型解析，返回结构手动声明。
   */
  private async runRecommendedBump(
    root: string,
    from: string | undefined,
  ): Promise<'major' | 'minor' | 'patch' | null> {
    try {
      const pkgName = 'conventional-recommended-bump';
      const mod = (await import(pkgName)) as {
        default?: (
          opts: Record<string, unknown>,
          cb: (
            err: Error | null,
            result: { releaseType?: 'major' | 'minor' | 'patch' },
          ) => void,
        ) => void;
      };
      const fn = mod.default;
      if (!fn) throw new Error('conventional-recommended-bump 加载失败');
      return await new Promise((resolve, reject) => {
        fn({ path: root, from }, (err, result) => {
          if (err) reject(err);
          else resolve(result.releaseType ?? null);
        });
      });
    } catch (err) {
      this.logger.warn(
        `conventional 推断失败，回落 patch: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }
}
