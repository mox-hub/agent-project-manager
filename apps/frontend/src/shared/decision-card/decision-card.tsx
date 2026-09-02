/**
 * 决策卡统一入口：按 kind 注册槽位构建器（主体/影响行/证据），缺省回退占位渲染。
 * 视觉与信息密度对齐设计稿 DecisionCardsPage；数据一律来自真实 payload，无 mock。
 * 后续 Clarify/Plan 等新决策类型 → 扩展 DecisionKind + 在此注册构建器。
 */
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  FastForward,
  FileText,
  GitPullRequest,
  ListChecks,
  ShieldCheck,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  Decision,
  DecisionActionDef,
  DecisionImpactItem,
  DecisionKind,
  DecisionSlots,
} from './types';
import { decisionActionPolicy } from './types';
import { DecisionCardShell } from './decision-card-shell';

/** 验收完成证据结构（与服务端 acceptance 模块 completionEvidence 对齐） */
interface CompletionEvidence {
  executionRunId?: string;
  capturedAt?: string;
  artifacts?: Array<{ id?: string; name?: string; type?: string }>;
  autoChecks?: {
    kind: string;
    valid: boolean;
    passed: number;
    failed: number;
    errored?: number;
    total: number;
    checkedAt: string;
  };
  prUrl?: string;
  state?: string;
  filePaths?: string[];
}

interface ApprovalPayload {
  actionType?: string;
  riskLevel?: string;
  approverPolicy?: string | null;
  executionRun?: { id: string; goal: string } | null;
}

interface AcceptancePayload {
  completionType?: string;
  priority?: string;
  completionEvidence?: CompletionEvidence | null;
}

/** 各 kind 的动作定义（快捷键 = 数组序号；闭环端点见 useResolveDecision） */
export const KIND_ACTIONS: Record<DecisionKind, DecisionActionDef[]> = {
  approval: [
    { action: 'accept', label: 'decision.action.approve', icon: Check },
    { action: 'reject', label: 'decision.action.reject', icon: X, needsReason: true },
  ],
  acceptance: [
    { action: 'accept', label: 'decision.action.pass', icon: Check },
    { action: 'reject', label: 'decision.action.reject', icon: X, needsReason: true },
    { action: 'waive', label: 'decision.action.waive', icon: FastForward, needsReason: true },
  ],
};

// ─── approval 槽位：危险操作面板（对齐设计稿 ApprovalCard） ───

function buildApprovalSlots(decision: Decision, t: (k: string, o?: Record<string, unknown>) => string): DecisionSlots {
  const p = (decision.payload ?? {}) as ApprovalPayload;
  const highRisk = decision.riskLevel === 'high_risk';

  const impact: DecisionImpactItem[] = [];
  if (decision.riskLevel) {
    impact.push({
      label: t('decision.impactLabels.risk'),
      value: t(`decision.riskLevels.${decision.riskLevel}`),
      icon: highRisk ? AlertTriangle : ShieldCheck,
      tone: highRisk ? 'red' : undefined,
    });
  }
  if (p.actionType) {
    impact.push({
      label: t('decision.impactLabels.type'),
      value: t(`decision.actionTypes.${p.actionType}`),
      icon: ListChecks,
    });
  }
  if (decision.projectName) {
    impact.push({ label: t('decision.impactLabels.project'), value: decision.projectName, icon: FileText });
  }

  const evidence = (
    <>
      {decision.detail ? <p><span className="font-medium text-content-text">{t('decision.evidenceLabels.reason')}：</span>{decision.detail}</p> : null}
      {p.executionRun?.goal ? (
        <p>
          <span className="font-medium text-content-text">{t('decision.evidenceLabels.goal')}：</span>
          {p.executionRun.goal}
        </p>
      ) : null}
      {p.approverPolicy ? (
        <p>
          <span className="font-medium text-content-text">{t('decision.evidenceLabels.policy')}：</span>
          <span className="font-mono text-11">{p.approverPolicy}</span>
        </p>
      ) : null}
      {decision.taskTitle ? (
        <p>
          <span className="font-medium text-content-text">{t('decision.evidenceLabels.task')}：</span>
          {decision.taskTitle}
        </p>
      ) : null}
    </>
  );

  const body = (
    <div
      className={cn(
        'rounded-lg border p-3',
        highRisk
          ? 'border-accent-red/40 bg-accent-red-light/60'
          : 'border-border bg-content-bg-secondary/50',
      )}
    >
      <div className="mb-2 flex items-center gap-2 font-mono text-xs text-accent-red">
        {highRisk ? <AlertTriangle className="size-4 shrink-0" /> : null}
        <span className="font-semibold">{p.actionType ? t(`decision.actionTypes.${p.actionType}`) : decision.kind}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <p className={cn('font-semibold', highRisk ? 'text-accent-red' : 'text-content-text')}>
            {decision.riskLevel ? t(`decision.riskLevels.${decision.riskLevel}`) : '—'}
          </p>
          <p className="text-content-text-muted">{t('decision.impactLabels.risk')}</p>
        </div>
        <div>
          <p className="font-semibold text-content-text">{decision.projectName ?? '—'}</p>
          <p className="text-content-text-muted">{t('decision.impactLabels.project')}</p>
        </div>
        <div>
          <p className="font-semibold text-content-text">{decision.taskTitle ?? '—'}</p>
          <p className="text-content-text-muted">{t('decision.impactLabels.task')}</p>
        </div>
      </div>
    </div>
  );

  return { body, impact, evidence };
}

// ─── acceptance 槽位：完成证据摘要（对齐设计稿 AcceptanceCard 阶段行） ───

function buildAcceptanceSlots(decision: Decision, t: (k: string, o?: Record<string, unknown>) => string): DecisionSlots {
  const p = (decision.payload ?? {}) as AcceptancePayload;
  const ev = p.completionEvidence ?? null;
  const checks = ev?.autoChecks ?? null;

  const impact: DecisionImpactItem[] = [];
  if (p.completionType) {
    impact.push({
      label: t('decision.impactLabels.completionType'),
      value: t(`decision.completionType.${p.completionType}`),
      icon: CheckCircle2,
      tone: 'green',
    });
  }
  if (p.priority) {
    impact.push({
      label: t('decision.impactLabels.priority'),
      value: t(`decision.priority.${p.priority}`),
      icon: ListChecks,
    });
  }
  if (checks) {
    impact.push({
      label: t('decision.impactLabels.autoChecks'),
      value: `${checks.passed}/${checks.total}`,
      icon: ShieldCheck,
      tone: checks.valid ? 'green' : 'red',
    });
  }

  const evidence = (
    <>
      {ev?.capturedAt ? (
        <p>
          <span className="font-medium text-content-text">{t('decision.evidenceLabels.capturedAt')}：</span>
          {new Date(ev.capturedAt).toLocaleString()}
        </p>
      ) : null}
      {ev?.artifacts && ev.artifacts.length > 0 ? (
        <p>
          <span className="font-medium text-content-text">{t('decision.evidenceLabels.artifacts')}：</span>
          {ev.artifacts.map((a) => a.name ?? a.id).filter(Boolean).join('、')}
        </p>
      ) : null}
      {ev?.filePaths && ev.filePaths.length > 0 ? (
        <p className="font-mono text-11">{ev.filePaths.join(' · ')}</p>
      ) : null}
      {decision.detail ? <p>{decision.detail}</p> : null}
    </>
  );

  const body = (
    <div className="space-y-1">
      {checks ? (
        <div className="flex items-center gap-2.5 rounded-lg bg-content-bg-secondary/50 px-2.5 py-1.5 text-xs">
          {checks.valid ? (
            <CheckCircle2 className="size-4 shrink-0 text-accent-green" />
          ) : (
            <XCircle className="size-4 shrink-0 text-accent-red" />
          )}
          <span className="flex-1 font-medium text-content-text">
            {t('decision.evidenceLabels.autoChecks')} · {checks.kind}
          </span>
          <span className={cn('font-mono text-11', checks.valid ? 'text-accent-green' : 'text-accent-red')}>
            {checks.passed}/{checks.total}
          </span>
          {checks.failed > 0 ? (
            <span className="rounded bg-accent-red-light px-1.5 py-0.5 text-10 text-accent-red">
              {t('decision.evidenceLabels.failedCount', { n: checks.failed })}
            </span>
          ) : null}
        </div>
      ) : null}
      {ev?.prUrl ? (
        <div className="flex items-center gap-2.5 rounded-lg bg-content-bg-secondary/50 px-2.5 py-1.5 text-xs">
          <GitPullRequest className="size-4 shrink-0 text-accent-blue" />
          <a
            href={ev.prUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 truncate text-accent-blue underline underline-offset-2"
          >
            {ev.prUrl}
          </a>
          {ev.state ? (
            <span className="rounded bg-accent-blue-light px-1.5 py-0.5 text-10 text-accent-blue">{ev.state}</span>
          ) : null}
        </div>
      ) : null}
      {!checks && !ev?.prUrl ? (
        <div className="flex items-center gap-2.5 rounded-lg bg-content-bg-secondary/50 px-2.5 py-1.5 text-xs text-content-text-muted">
          <FileText className="size-4 shrink-0" />
          <span>{t('decision.evidenceLabels.noEvidenceYet')}</span>
        </div>
      ) : null}
    </div>
  );

  return { body, impact, evidence };
}

/** 占位主体渲染器：真实 payload 键摘要，待对应决策类型落地后由富构建器替换 */
function PlaceholderBody({ decision }: { decision: Decision }) {
  const { t } = useTranslation();
  const keys = Object.keys(decision.payload ?? {});
  return (
    <div className="rounded-md bg-content-bg-secondary px-3 py-2 text-xs text-content-text-secondary">
      <p>{t('decision.body.placeholder')}</p>
      {keys.length > 0 ? (
        <p className="mt-1 font-mono text-11 text-content-text-muted">{keys.join(' · ')}</p>
      ) : null}
    </div>
  );
}

const SLOT_BUILDERS: Partial<
  Record<DecisionKind, (d: Decision, t: (k: string, o?: Record<string, unknown>) => string) => DecisionSlots>
> = {
  approval: buildApprovalSlots,
  acceptance: buildAcceptanceSlots,
};

export interface DecisionCardProps {
  decision: Decision;
  onAction: (action: string, decision: Decision, opts?: { reason?: string }) => void;
  busy?: boolean;
  className?: string;
}

export function DecisionCard({ decision, onAction, busy, className }: DecisionCardProps) {
  const { t } = useTranslation();
  const builder = SLOT_BUILDERS[decision.kind];
  const slots: DecisionSlots = builder
    ? builder(decision, t as (k: string, o?: Record<string, unknown>) => string)
    : { body: <PlaceholderBody decision={decision} />, impact: [] };
  const actions = KIND_ACTIONS[decision.kind];
  const policy = decisionActionPolicy(decision);

  return (
    <DecisionCardShell
      decision={decision}
      body={slots.body}
      impact={slots.impact}
      evidence={slots.evidence}
      actions={actions}
      requireEvidence={policy.requireEvidence}
      cooldownSecs={policy.cooldownSecs}
      onAction={onAction}
      busy={busy}
      className={className}
    />
  );
}

export { DecisionCardShell } from './decision-card-shell';
export type {
  Decision,
  DecisionActionDef,
  DecisionCardAction,
  DecisionKind,
  DecisionProposer,
  DecisionUrgency,
} from './types';
export type { LucideIcon };
