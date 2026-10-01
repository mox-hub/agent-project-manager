/**
 * 执行隔离徽标（G5-b）：worktree=中性「隔离执行·分支 xxx」；
 * shared-root=琥珀「未隔离·共享目录」+ reason tooltip（降级显眼原则，设计稿 §5.3/§5.7）。
 * 数据来自 Execution.metadata.isolation（服务端 dispatch 注入）。
 */
import { useTranslation } from 'react-i18next';
import { GitBranch, ShieldAlert } from 'lucide-react';

/** 与服务端 ExecutionIsolationMetadata 对齐（metadata.isolation 投影） */
export interface ExecutionIsolationMeta {
  mode: 'worktree' | 'shared-root';
  worktreePath?: string;
  branch?: string;
  baseRef?: string;
  projectRoot?: string;
  preparedAt?: string;
  cleanedAt?: string;
  reason?: string;
  detail?: string;
}

/** 从未知结构的 metadata 中解析 isolation 元数据（容错：形状不符返回 null） */
export function parseIsolationMeta(
  metadata: Record<string, unknown> | null | undefined,
): ExecutionIsolationMeta | null {
  const isolation = metadata?.isolation as ExecutionIsolationMeta | undefined;
  if (
    !isolation ||
    (isolation.mode !== 'worktree' && isolation.mode !== 'shared-root')
  ) {
    return null;
  }
  return isolation;
}

export function RunIsolationBadge({
  isolation,
}: {
  isolation: ExecutionIsolationMeta;
}) {
  const { t } = useTranslation();

  if (isolation.mode === 'worktree') {
    // 分支展示取 apm/exec/ 后的 shortId（全分支名进 tooltip）
    const shortBranch = (isolation.branch ?? '').replace('apm/exec/', '');
    return (
      <span
        className="inline-flex max-w-48 items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-2xs"
        title={t('runDetails.isolation.worktreeTooltip', {
          branch: isolation.branch ?? '—',
          path: isolation.worktreePath ?? '—',
        })}
      >
        <GitBranch className="size-3 shrink-0 text-accent-green" />
        <span className="truncate">
          {t('runDetails.isolation.worktreeBadge', { branch: shortBranch })}
        </span>
      </span>
    );
  }

  const reasonKey = `runDetails.isolation.reason.${isolation.reason ?? 'unknown'}`;
  return (
    <span
      className="inline-flex max-w-56 items-center gap-1 rounded-full bg-accent-yellow-light px-2 py-0.5 text-2xs text-accent-yellow"
      title={
        isolation.detail
          ? `${t(reasonKey)}：${isolation.detail}`
          : t(reasonKey)
      }
    >
      <ShieldAlert className="size-3 shrink-0" />
      <span className="truncate">
        {t('runDetails.isolation.sharedRootBadge')}
      </span>
    </span>
  );
}

/** run-details-dialog 头部用的组合：解析 + 两态徽标（无 isolation 不渲染） */
export function RunIsolationBadgeFromMetadata({
  metadata,
}: {
  metadata?: Record<string, unknown> | null;
}) {
  const isolation = parseIsolationMeta(metadata);
  if (!isolation) return null;
  return <RunIsolationBadge isolation={isolation} />;
}

/** worktree 信息行的失败态 TTL 提示判定：失败/阻断且未清理 */
export function isWorktreeRetained(isolation: ExecutionIsolationMeta): boolean {
  return isolation.mode === 'worktree' && !isolation.cleanedAt;
}
