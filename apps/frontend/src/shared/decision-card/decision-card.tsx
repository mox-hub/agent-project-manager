/**
 * 决策卡统一入口：按 kind 注册槽位构建器（主体/影响行/证据），缺省回退占位渲染。
 * 视觉与信息密度对齐设计稿 DecisionCardsPage；数据一律来自真实 payload，无 mock。
 * 后续 Clarify/Plan 等新决策类型 → 扩展 DecisionKind + 在此注册构建器。
 */
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  FastForward,
  FileText,
  GitPullRequest,
  ListChecks,
  Minus,
  Plus,
  ShieldCheck,
  TrendingUp,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type {
  Decision,
  DecisionActionDef,
  DecisionActionOptions,
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

/** 建议类提案 payload 结构（与服务端 DecisionProposal.payload 对齐） */
interface PlanProposalPayload {
  taskId?: string;
  added?: Array<{ title: string; description?: string; estimate?: number; assigneeMemberId?: string }>;
  removed?: Array<{ id?: string; title?: string }>;
}

interface AssignmentProposalPayload {
  assignments?: Array<{
    taskId: string;
    memberId: string;
    taskTitle?: string;
    memberName?: string;
    trustScore?: number | null;
  }>;
}

interface SpendProposalPayload {
  periodKey?: string;
  spentTokens?: number;
  budgetTokens?: number | null;
  spentCostUsd?: number;
  budgetCostUsd?: number | null;
  topConsumer?: string | null;
}

interface ClarifyProposalPayload {
  question?: string;
  choices?: Array<{ key?: string; label?: string; sub?: string; guess?: boolean }>;
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
  // clarify 的确认键由交互体自管（需先选择选项）
  clarify: [],
  plan: [
    { action: 'accept', label: 'decision.action.applyPlan', icon: Check },
    { action: 'reject', label: 'decision.action.reject', icon: X, needsReason: true },
  ],
  assignment: [
    { action: 'accept', label: 'decision.action.applyAssign', icon: Check },
    { action: 'reject', label: 'decision.action.reject', icon: X, needsReason: true },
  ],
  resolution: [
    { action: 'accept', label: 'decision.action.complete', icon: Check },
    { action: 'cancel', label: 'decision.action.markCancelled', icon: Minus },
    { action: 'reject', label: 'decision.action.reject', icon: X, needsReason: true },
  ],
  spend: [
    { action: 'accept', label: 'decision.action.approveBudget', icon: Check },
    { action: 'reject', label: 'decision.action.reject', icon: X, needsReason: true },
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

// ─── plan 槽位：任务拆解 diff（对齐设计稿 PlanCard 增删行） ───

function buildPlanSlots(decision: Decision, t: TFunc): DecisionSlots {
  const p = (decision.payload ?? {}) as unknown as PlanProposalPayload;
  const added = p.added ?? [];
  const removed = p.removed ?? [];

  const impact: DecisionImpactItem[] = [
    {
      label: t('decision.impactLabels.subtasks'),
      value: `+${added.length}`,
      icon: Plus,
      tone: 'blue',
    },
  ];
  const totalEstimate = added.reduce((sum, s) => sum + (s.estimate ?? 0), 0);
  if (totalEstimate > 0) {
    impact.push({
      label: t('decision.impactLabels.estimate'),
      value: `${totalEstimate}h`,
      icon: TrendingUp,
    });
  }

  const evidence = (
    <>
      {decision.detail ? <p>{decision.detail}</p> : null}
      {removed.length > 0 ? (
        <p>
          <span className="font-medium text-content-text">{t('decision.evidenceLabels.replaced')}：</span>
          {removed.map((r) => r.title ?? r.id).filter(Boolean).join('、')}
        </p>
      ) : null}
    </>
  );

  const body = (
    <div className="space-y-1">
      {removed.map((r, i) => (
        <div
          key={`rm-${i}`}
          className="flex items-center gap-2 rounded-lg border border-border/50 bg-content-bg-secondary/60 px-2.5 py-1.5 text-xs text-content-text-muted line-through opacity-60"
        >
          <Minus className="size-3 shrink-0 no-underline" />
          <span>{r.title ?? r.id}</span>
        </div>
      ))}
      {added.map((s, i) => (
        <div
          key={`add-${i}`}
          className="flex items-center gap-2 rounded-lg border border-accent-green/30 bg-accent-green-light/50 px-2.5 py-1.5 text-xs"
        >
          <Plus className="size-3 shrink-0 text-accent-green" />
          <span className="flex-1 font-medium text-content-text">{s.title}</span>
          {s.estimate ? <span className="font-mono text-11 text-content-text-muted">{s.estimate}h</span> : null}
        </div>
      ))}
    </div>
  );

  return { body, impact, evidence };
}

// ─── assignment 槽位：分派建议行（对齐设计稿 AssignCard） ───

function buildAssignmentSlots(decision: Decision, t: TFunc): DecisionSlots {
  const p = (decision.payload ?? {}) as unknown as AssignmentProposalPayload;
  const assignments = p.assignments ?? [];

  const impact: DecisionImpactItem[] = [
    {
      label: t('decision.impactLabels.toAgent'),
      value: `${assignments.length}${t('decision.impactLabels.taskUnit')}`,
      icon: User,
      tone: 'purple',
    },
  ];

  const body = (
    <div className="space-y-1">
      {assignments.map((a) => (
        <div
          key={a.taskId}
          className="flex items-center gap-2.5 rounded-lg bg-content-bg-secondary/60 px-2.5 py-1.5 text-xs"
        >
          <ArrowRight className="size-3 shrink-0 text-accent-purple" />
          <span className="flex-1 truncate font-medium text-content-text">
            {a.taskTitle ?? a.taskId}
          </span>
          <span className="shrink-0 text-content-text-secondary">{a.memberName ?? a.memberId}</span>
          {a.trustScore != null ? (
            <span
              className={cn(
                'shrink-0 rounded px-1.5 py-0.5 text-10',
                a.trustScore >= 85
                  ? 'bg-accent-green-light text-accent-green'
                  : 'bg-accent-yellow-light text-accent-yellow',
              )}
            >
              {t('decision.impactLabels.trust')} {a.trustScore}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );

  return { body, impact };
}

// ─── resolution 槽位：完成 vs 取消 语义确认（对齐设计稿 ResolutionCard） ───

function buildResolutionSlots(decision: Decision, t: TFunc): DecisionSlots {
  const options = [
    {
      key: 'completed',
      label: t('decision.resolution.completed'),
      desc: t('decision.resolution.completedDesc'),
      cls: 'border-accent-green/40 bg-accent-green-light/40',
    },
    {
      key: 'cancelled',
      label: t('decision.resolution.cancelled'),
      desc: t('decision.resolution.cancelledDesc'),
      cls: 'border-border bg-content-bg-secondary/50',
    },
  ];
  const body = (
    <div className="grid grid-cols-2 gap-3">
      {options.map((opt) => (
        <div key={opt.key} className={cn('space-y-1 rounded-lg border p-3 text-xs', opt.cls)}>
          <p className="font-semibold text-content-text">{opt.label}</p>
          <p className="leading-relaxed text-content-text-secondary">{opt.desc}</p>
        </div>
      ))}
    </div>
  );
  return { body, impact: [], evidence: decision.detail ? <p>{decision.detail}</p> : undefined };
}

// ─── spend 槽位：预算对比（对齐设计稿 SpendCard 的信息密度，图表留待图表基建） ───

function buildSpendSlots(decision: Decision, t: TFunc): DecisionSlots {
  const p = (decision.payload ?? {}) as unknown as SpendProposalPayload;

  const impact: DecisionImpactItem[] = [];
  if (p.budgetTokens) {
    impact.push({
      label: t('decision.impactLabels.overBudget'),
      value: `${Math.round((p.spentTokens ?? 0) / p.budgetTokens * 100)}%`,
      icon: AlertTriangle,
      tone: 'red',
    });
  }
  if (p.topConsumer) {
    impact.push({ label: t('decision.impactLabels.topConsumer'), value: p.topConsumer, icon: User });
  }

  const evidence = (
    <>
      {p.periodKey ? (
        <p>
          <span className="font-medium text-content-text">{t('decision.evidenceLabels.period')}：</span>
          {p.periodKey}
        </p>
      ) : null}
      {decision.detail ? <p>{decision.detail}</p> : null}
    </>
  );

  const body = (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-lg bg-content-bg-secondary/60 p-2.5 text-center">
        <p className="text-sm font-semibold text-accent-red">
          {p.spentTokens != null ? p.spentTokens.toLocaleString() : '—'}
        </p>
        <p className="text-xs text-content-text-muted">
          / {p.budgetTokens != null ? p.budgetTokens.toLocaleString() : '—'} tokens
        </p>
      </div>
      <div className="rounded-lg bg-content-bg-secondary/60 p-2.5 text-center">
        <p className="text-sm font-semibold text-content-text">
          ${p.spentCostUsd != null ? p.spentCostUsd.toFixed(2) : '—'}
        </p>
        <p className="text-xs text-content-text-muted">
          / {p.budgetCostUsd != null ? `$${p.budgetCostUsd}` : '—'}
        </p>
      </div>
    </div>
  );

  return { body, impact, evidence };
}

// ─── clarify：交互式选择体（对齐设计稿 ClarifyCard：单选 + 确认恢复执行） ───

function ClarifyBody({
  decision,
  busy,
  onAction,
}: {
  decision: Decision;
  busy?: boolean;
  onAction: (action: string, decision: Decision, opts?: DecisionActionOptions) => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);
  const p = (decision.payload ?? {}) as unknown as ClarifyProposalPayload;
  const choices = p.choices ?? [];

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        {choices.map((c) => {
          const key = c.key ?? String(c.label);
          const selectedCls =
            selected === key
              ? 'border-accent-purple bg-accent-purple-light/50 ring-1 ring-accent-purple/50'
              : 'border-border hover:border-accent-purple/40 hover:bg-content-bg-secondary/60';
          return (
            <button
              key={key}
              disabled={busy}
              onClick={() => setSelected(key)}
              className={cn(
                'w-full rounded-lg border px-3 py-2.5 text-left text-xs transition-colors',
                selectedCls,
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-full border-2',
                    selected === key ? 'border-accent-purple bg-accent-purple' : 'border-border',
                  )}
                >
                  {selected === key ? <span className="size-1.5 rounded-full bg-white" /> : null}
                </span>
                <span className="font-semibold text-content-text">{c.label}</span>
                {c.guess ? (
                  <span className="rounded bg-accent-purple-light px-1.5 py-0.5 text-10 text-accent-purple">
                    {t('decision.clarify.aiGuess')}
                  </span>
                ) : null}
              </div>
              {c.sub ? <p className="mt-0.5 text-content-text-secondary">{c.sub}</p> : null}
            </button>
          );
        })}
      </div>
      <Button
        className="w-full"
        size="sm"
        disabled={selected === null || busy}
        onClick={() => onAction('accept', decision, { answer: selected ?? undefined })}
      >
        <Check className="size-3.5" />
        {selected !== null
          ? t('decision.clarify.confirm', { choice: selected })
          : t('decision.clarify.pickOne')}
      </Button>
    </div>
  );
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

type TFunc = (k: string, o?: Record<string, unknown>) => string;

const SLOT_BUILDERS: Partial<Record<DecisionKind, (d: Decision, t: TFunc) => DecisionSlots>> = {
  approval: buildApprovalSlots,
  acceptance: buildAcceptanceSlots,
  plan: buildPlanSlots,
  assignment: buildAssignmentSlots,
  resolution: buildResolutionSlots,
  spend: buildSpendSlots,
};

export interface DecisionCardProps {
  decision: Decision;
  onAction: (action: string, decision: Decision, opts?: DecisionActionOptions) => void;
  busy?: boolean;
  className?: string;
}

export function DecisionCard({ decision, onAction, busy, className }: DecisionCardProps) {
  const { t } = useTranslation();
  const builder = SLOT_BUILDERS[decision.kind];
  const slots: DecisionSlots = builder
    ? builder(decision, t as TFunc)
    : { body: <PlaceholderBody decision={decision} />, impact: [] };
  // clarify 的主体是交互式选择体（自管选中态并直接发起决议）
  const body =
    decision.kind === 'clarify' ? (
      <ClarifyBody decision={decision} busy={busy} onAction={onAction} />
    ) : (
      slots.body
    );
  const actions = KIND_ACTIONS[decision.kind];
  const policy = decisionActionPolicy(decision);

  return (
    <DecisionCardShell
      decision={decision}
      body={body}
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
