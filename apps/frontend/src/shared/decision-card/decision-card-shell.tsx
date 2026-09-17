/**
 * 决策卡壳 —— 卡片文法的五段式统一骨架（现实实体手卡质感、3D 翻面、印章与滑出动效）。
 * ① 头部（实体夹槽 + 提案者头像/名 pill + 紧迫度 chip + 编号刻印 + 3D 翻面角标）
 * ② 主体槽位（卡内平滑滚动）③ 影响行 ④ 3D 背面证据档案（支持一键翻转 + 冷却联动）⑤ 动作栏（快捷键 + 驳回原因 chips）。
 * 高代价动作路由策略见 decisionActionPolicy：证据强制 + 冷却后「接受」才可用。
 */
import './decision-card.css';
import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  Check,
  Edit2,
  Eye,
  FileText,
  Inbox,
  RefreshCw,
  RotateCw,
  Server,
  User,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatI18nRelativeTime } from '@/shared/lib/date-format';
import type {
  Decision,
  DecisionActionDef,
  DecisionActionOptions,
  DecisionImpactItem,
} from './types';

/** 默认四键：接受 / 微调 / 驳回 / 要替代方案（顺序与快捷键 1-4 全系统一致） */
export const DEFAULT_ACTIONS: DecisionActionDef[] = [
  { action: 'accept', label: 'decision.action.accept', icon: Check },
  { action: 'adjust', label: 'decision.action.adjust', icon: Edit2 },
  { action: 'reject', label: 'decision.action.reject', icon: X, needsReason: true },
  { action: 'alternative', label: 'decision.action.alternative', icon: RefreshCw },
];

/** 快捷键 1-4 对应动作栏顺序 */
const ACTION_SHORTCUTS: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3 };

const PROPOSER_META = {
  ai_agent: { icon: Bot, avatarCls: 'bg-accent-purple-light text-accent-purple' },
  human: { icon: User, avatarCls: 'bg-accent-blue-light text-accent-blue' },
  system: { icon: Server, avatarCls: 'bg-content-bg-secondary text-content-text-secondary' },
} as const;

const IMPACT_TONE_CLS = {
  red: 'text-accent-red',
  yellow: 'text-accent-yellow',
  green: 'text-accent-green',
  blue: 'text-accent-blue',
  purple: 'text-accent-purple',
  orange: 'text-accent-orange',
} as const;

const REASON_CHIPS = [
  'decision.reason.tooBroad',
  'decision.reason.badTiming',
  'decision.reason.betterOption',
  'decision.reason.missingContext',
  'decision.reason.lowConfidence',
];

/** 相对时间 i18n 键：刚刚 / N 分钟前 / N 小时前，>24h 回落本地时间（逻辑见 formatI18nRelativeTime） */
const DECISION_TIME_KEYS = {
  justNow: 'decision.time.justNow',
  minutesAgo: 'decision.time.minutesAgo',
  hoursAgo: 'decision.time.hoursAgo',
} as const;

/** ③ 影响行：用用户语言陈述后果（＋耗时 / 成本 / 波及面） */
function ImpactRow({ items }: { items?: DecisionImpactItem[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex shrink-0 flex-wrap gap-3 border-t border-border/40 bg-content-bg-secondary/40 px-4 py-2 text-xs">
      {items.map((it, i) => {
        const Icon = it.icon;
        return (
          <span
            key={i}
            className={cn(
              'inline-flex items-center gap-1',
              it.tone ? IMPACT_TONE_CLS[it.tone] : 'text-content-text-muted',
            )}
          >
            <Icon className="size-3 shrink-0" />
            <span className="font-medium">{it.value}</span>
            <span className="text-content-text-muted">{it.label}</span>
          </span>
        );
      })}
    </div>
  );
}

/** ⑤ 动作栏：等分四键 + 驳回原因 chips（点选即提交）+ 冷却门禁 */
function ActionBar({
  decision,
  actions,
  busy,
  requireEvidence,
  cooldownLeft,
  evidenceOpen,
  reasonFor,
  onOpenReason,
  onAction,
}: {
  decision: Decision;
  actions: DecisionActionDef[];
  busy: boolean;
  requireEvidence: boolean;
  /** 剩余冷却秒数（0 = 无冷却），由卡壳按截止时间戳推导 */
  cooldownLeft: number;
  evidenceOpen: boolean;
  /** 当前弹出原因 chips 的动作（null = 无） */
  reasonFor: string | null;
  onOpenReason: (action: string | null) => void;
  onAction: (
    action: string,
    decision: Decision,
    opts?: DecisionActionOptions,
  ) => void;
}) {
  const { t } = useTranslation();

  const handleSelect = (def: DecisionActionDef) => {
    if (busy) return;
    if (def.needsReason) {
      onOpenReason(def.action);
      return;
    }
    onAction(def.action, decision);
  };

  const reasonDef =
    reasonFor !== null ? actions.find((a) => a.action === reasonFor) : undefined;

  if (reasonDef) {
    return (
      // `data-decision-actions` 是写路径区域的**稳定标记**：只读预览（回放）时整条动作栏
      // 不渲染，而"不渲染"与"渲染了但按钮是灰的"在视觉上不容易分辨、在测试里更不好断言。
      // 标出来之后，「只读态绝不出现写路径」就是一条能钉死的断言，而不是一句注释。
      <div className="space-y-2 border-t border-border/40 px-4 py-3" data-decision-actions="">
        <p className="text-xs text-content-text-muted">
          {t('decision.action.reasonPrompt', { action: t(reasonDef.label) })}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {REASON_CHIPS.map((chipKey) => (
            <button
              key={chipKey}
              disabled={busy}
              onClick={() => {
                onOpenReason(null);
                onAction(reasonDef.action, decision, { reason: t(chipKey) });
              }}
              className="shrink-0 rounded-full border border-border px-2.5 py-1 text-xs text-content-text-secondary whitespace-nowrap transition-colors hover:border-accent-red/40 hover:bg-accent-red-light hover:text-accent-red disabled:opacity-40"
            >
              <span className="whitespace-nowrap">{t(chipKey)}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 border-t border-border/40" data-decision-actions="">
      {actions.map((def, index) => {
        const Icon = def.icon;
        // 主动作（首键）受证据强制 + 冷却门禁；其余键不设防
        const gated =
          index === 0 &&
          ((requireEvidence && !evidenceOpen) || cooldownLeft > 0);
        return (
          <button
            key={def.action}
            disabled={busy || gated}
            onClick={() => handleSelect(def)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1 border-r border-border/30 py-2.5 text-xs font-medium text-content-text-secondary whitespace-nowrap transition-colors last:border-r-0 hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            <Icon className="size-3.5 shrink-0" />
            <span className="whitespace-nowrap">
              {index === 0 && cooldownLeft > 0
                ? t('decision.action.cooldown', { n: cooldownLeft })
                : t(def.label)}
            </span>
            <span className="shrink-0 rounded border border-current/20 px-1 font-mono text-10 opacity-50 whitespace-nowrap">
              {index + 1}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export interface DecisionCardShellProps {
  decision: Decision;
  /** 主体槽位：变化 diff（占位阶段由默认渲染器填充） */
  body?: ReactNode;
  /** 影响行数据；缺省不渲染影响行 */
  impact?: DecisionImpactItem[];
  /** 证据抽屉内容；缺省回退 payload JSON 预览 */
  evidence?: ReactNode;
  /** 动作栏定义；缺省通用四键（各 kind 通常覆盖） */
  actions?: DecisionActionDef[];
  /** 动作路由策略（证据强制 + 冷却）；缺省按决策数据推导 */
  requireEvidence?: boolean;
  cooldownSecs?: number;
  onAction: (
    action: string,
    decision: Decision,
    opts?: DecisionActionOptions,
  ) => void;
  busy?: boolean;
  className?: string;
  /**
   * 只读预览：**整条动作栏不渲染**，并以 `readOnlyNote` 就地说明为什么。
   *
   * 用途是回放/演示（数据来自剧本快照，其中的决策 `id` 在服务端并不存在）。
   * **不做成"按钮点了没反应"**——那正是本项目反复在治的那类错误：一个按下去
   * 看起来生效、实际什么都没落的键（S2-e 删除的假「准入」按钮同此）。
   * 缺省 false，对既有调用方零影响。
   */
  readOnly?: boolean;
  /** 只读时在原动作栏位置显示的说明（文案由调用方给，避免此共享件耦合一门语言） */
  readOnlyNote?: ReactNode;

  /** 是否处于 3D 翻转到背面（可控模式） */
  isFlipped?: boolean;
  /** 翻面状态变化回调 */
  onFlipChange?: (flipped: boolean) => void;
  /** 印章状态：通过 / 驳回 / 无 */
  stamp?: 'passed' | 'rejected' | null;
  /** 飞出滑走方向：向左 / 向右 / 向上 */
  dismissDirection?: 'left' | 'right' | 'up' | null;
  /** 布局形态变体：'auto'（自适应）| 'vertical'（卡片堆竖立黄金手卡比例） */
  variant?: 'auto' | 'vertical';
}

export function DecisionCardShell({
  decision,
  body,
  impact,
  evidence,
  actions,
  requireEvidence,
  cooldownSecs,
  onAction,
  busy = false,
  className,
  readOnly = false,
  readOnlyNote,
  isFlipped: controlledFlipped,
  onFlipChange,
  stamp = null,
  dismissDirection = null,
  variant = 'auto',
}: DecisionCardShellProps) {
  const { t } = useTranslation();
  const [internalFlipped, setInternalFlipped] = useState(false);
  const isFlipped = controlledFlipped !== undefined ? controlledFlipped : internalFlipped;

  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [reasonFor, setReasonFor] = useState<string | null>(null);
  const [cooldownDeadline, setCooldownDeadline] = useState<number | null>(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  useEffect(() => {
    if (cooldownDeadline === null) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((cooldownDeadline - Date.now()) / 1000));
      setCooldownLeft(left);
      if (left <= 0) clearInterval(id);
    }, 500);
    return () => clearInterval(id);
  }, [cooldownDeadline]);

  const setFlippedState = (next: boolean) => {
    if (controlledFlipped === undefined) {
      setInternalFlipped(next);
    }
    onFlipChange?.(next);
    if (next && cooldownSecs && cooldownSecs > 0 && cooldownDeadline === null) {
      setCooldownDeadline(Date.now() + cooldownSecs * 1000);
      setCooldownLeft(cooldownSecs);
    }
    setEvidenceOpen(next);
  };

  const toggleFlip = () => {
    setFlippedState(!isFlipped);
  };

  const toggleEvidence = () => {
    const next = !evidenceOpen;
    if (next && cooldownSecs && cooldownSecs > 0 && cooldownDeadline === null) {
      setCooldownDeadline(Date.now() + cooldownSecs * 1000);
      setCooldownLeft(cooldownSecs);
    }
    setEvidenceOpen(next);
    // 联动翻面
    setFlippedState(next);
  };

  const actionDefs =
    actions ?? DEFAULT_ACTIONS.map((a) => ({ ...a, label: t(a.label) }));
  const isBlocking = decision.urgency === 'blocking';
  const meta = PROPOSER_META[decision.proposer.type];
  const ProposerIcon = meta.icon;
  const proposerName =
    decision.proposer.name ?? t(`decision.proposer.${decision.proposer.type}`);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // 只读预览同样拦快捷键：拦了动作栏却留下数字键/翻面键，等于留了一条隐形的拍板路径
    if (readOnly) return;
    // 快捷键 'f' / 'F' 触发 3D 翻面
    if (event.key === 'f' || event.key === 'F') {
      event.preventDefault();
      toggleFlip();
      return;
    }

    if (actionDefs.length === 0) return;
    const index = ACTION_SHORTCUTS[event.key];
    const def = index === undefined ? undefined : actionDefs[index];
    if (!def || busy) return;
    event.preventDefault();
    if (def.needsReason) {
      setEvidenceOpen(true);
      setReasonFor(def.action);
      return;
    }
    onAction(def.action, decision);
  };

  const shortId = decision.id.includes(':')
    ? decision.id.split(':').slice(-1)[0]
    : decision.id.slice(-6);

  const dismissClass =
    dismissDirection === 'right'
      ? 'decision-card-dismiss-right'
      : dismissDirection === 'left'
        ? 'decision-card-dismiss-left'
        : dismissDirection === 'up'
          ? 'decision-card-dismiss-up'
          : '';

  const isVertical = variant === 'vertical';

  return (
    <div
      className={cn(
        'decision-card-scene relative select-none',
        isVertical ? 'decision-card-vertical' : 'w-full max-w-xl',
        className,
      )}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      data-decision-id={decision.id}
      data-decision-urgency={decision.urgency}
      data-ai-entity={`decision:${decision.id}`}
    >
      {/* ── 印章动效（已通过 / 已驳回） ── */}
      {stamp && (
        <div
          className={cn(
            'decision-stamp',
            stamp === 'passed' ? 'decision-stamp-passed' : 'decision-stamp-rejected',
            'decision-stamp-active',
          )}
        >
          {stamp === 'passed' ? t('decision.review.passStamp') : t('decision.review.rejectStamp')}
        </div>
      )}

      {/* ── 3D 翻转本体 ── */}
      <div
        className={cn(
          'decision-card-flipper',
          isFlipped && 'is-flipped',
          dismissClass,
        )}
      >
        {/* ═════════════════════ 【正面 FRONT】 ═════════════════════ */}
        <div
          className={cn(
            'decision-card-face decision-card-face-front decision-physical-card flex flex-col overflow-hidden text-card-foreground',
            isBlocking ? 'border-accent-red/60' : 'border-border',
            isVertical ? 'h-full' : 'decision-card-auto',
            isFlipped && 'pointer-events-none',
          )}
        >
          {/* 实体夹槽饰边 */}
          <div className="decision-card-clamp" aria-hidden="true" />

          {/* blocking 顶部警示条 */}
          {isBlocking && (
            <div className="h-1 bg-gradient-to-r from-accent-red via-accent-orange to-accent-red" />
          )}

          {/* ① 头部 */}
          <div className="flex shrink-0 flex-col gap-2 px-5 pb-2 pt-4">
            {/* 第 1 行：提案人身份、紧迫度与高危标签，右侧 3D 翻面按钮（所有按钮与标签严禁折行） */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                {/* 提案人头像 */}
                <div
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full shadow-2xs',
                    meta.avatarCls,
                  )}
                >
                  <ProposerIcon className="size-3.5" />
                </div>

                {/* 提案人 Pill（禁止换行） */}
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
                    meta.avatarCls,
                  )}
                >
                  <ProposerIcon className="size-3 shrink-0" />
                  <span className="whitespace-nowrap">{proposerName}</span>
                </span>

                {/* 紧迫度 Chip（禁止换行） */}
                {isBlocking ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-accent-red/30 bg-accent-red-light px-2 py-0.5 text-xs font-medium text-accent-red whitespace-nowrap">
                    <Zap className="size-3 shrink-0" />
                    <span className="whitespace-nowrap">{t('decision.urgency.blockingChip')}</span>
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-accent-yellow/30 bg-accent-yellow-light px-2 py-0.5 text-xs font-medium text-accent-yellow whitespace-nowrap">
                    <Inbox className="size-3 shrink-0" />
                    <span className="whitespace-nowrap">{t('decision.urgency.advisoryChip')}</span>
                  </span>
                )}

                {/* 高危 Chip（禁止换行） */}
                {decision.riskLevel === 'high_risk' && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-accent-purple/30 bg-accent-purple-light px-2 py-0.5 text-xs font-medium text-accent-purple whitespace-nowrap">
                    ★ <span className="whitespace-nowrap">{t('decision.riskHigh')}</span>
                  </span>
                )}
              </div>

              {/* 3D 翻面按钮（禁止换行） */}
              <button
                type="button"
                onClick={toggleFlip}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border/80 bg-muted/40 px-2 py-1 text-xs font-medium text-muted-foreground whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground"
                title={t('decision.review.flipHint')}
              >
                <RotateCw className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="whitespace-nowrap">{t('decision.review.flipBack')}</span>
              </button>
            </div>

            {/* 第 2 行：决策编号（按要求移至第二行） + 提交时间 / 过期时间（禁止换行） */}
            <div className="flex items-center justify-between gap-2 text-11 text-muted-foreground">
              <span className="font-mono font-medium uppercase tracking-wider text-muted-foreground/80 whitespace-nowrap shrink-0 select-all">
                #{shortId}
              </span>
              <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
                <span className="whitespace-nowrap">
                  {formatI18nRelativeTime(decision.createdAt, t, DECISION_TIME_KEYS)}
                </span>
                {decision.expiresAt && (
                  <span className="text-accent-yellow whitespace-nowrap">
                    {t('decision.expiryIn', { time: new Date(decision.expiresAt).toLocaleString() })}
                  </span>
                )}
              </div>
            </div>

            {/* 第 3 行：标题文本自动宽度，充分占据完整卡片行宽，超过整整一行后才允许折行 */}
            <div className="w-full pt-0.5">
              <h3 className="w-full text-base font-semibold leading-snug tracking-tight text-foreground break-words">
                {decision.title}
              </h3>
            </div>
          </div>

          {/* ② 主体：在卡片内部平滑滚动，绝不突破卡片高度 */}
          {body ? (
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-2.5">
              {body}
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {/* ③ 影响行 */}
          <ImpactRow items={impact} />

          {/* ④ 正面翻面与证据导引条（所有按钮禁止换行） */}
          <div className="flex shrink-0 items-center justify-between border-t border-border/40 bg-muted/20 px-4 py-2 text-xs">
            <button
              type="button"
              onClick={toggleEvidence}
              className="inline-flex shrink-0 items-center gap-1.5 text-muted-foreground whitespace-nowrap transition-colors hover:text-foreground"
            >
              <Eye className="size-3.5 shrink-0" />
              <span className="whitespace-nowrap">{t('decision.action.evidence')}</span>
              {cooldownSecs && cooldownSecs > 0 ? (
                <span className="shrink-0 rounded bg-accent-yellow-light px-1 text-10 text-accent-yellow whitespace-nowrap">
                  {cooldownSecs}s 冷却
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={toggleFlip}
              className="inline-flex shrink-0 items-center gap-1 font-medium text-primary whitespace-nowrap transition-opacity hover:opacity-80"
            >
              <span className="whitespace-nowrap">{t('decision.review.flipHint')}</span>
              <RotateCw className="size-3 shrink-0" />
            </button>
          </div>

          {/* ⑤ 动作栏（clarify 等交互体自管确认键时可为空）。
              只读预览优先：**不放动作键，也不做"按了没反应"的灰键**——说清楚为什么不能按 */}
          {readOnly ? (
            <div className="border-t border-border px-4 py-2.5 text-11 text-muted-foreground">
              {readOnlyNote}
            </div>
          ) : actionDefs.length > 0 ? (
            <ActionBar
              decision={decision}
              actions={actionDefs}
              busy={busy}
              requireEvidence={requireEvidence ?? false}
              cooldownLeft={cooldownLeft}
              evidenceOpen={evidenceOpen || isFlipped}
              reasonFor={reasonFor}
              onOpenReason={setReasonFor}
              onAction={onAction}
            />
          ) : null}
        </div>

        {/* ═════════════════════ 【背面 BACK】 ═════════════════════ */}
        {/* 背面必须绝对定位覆盖整个卡片区域，旋转180度，绝对不排在正面下方 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
          className={cn(
            'decision-card-face decision-card-face-back decision-physical-card flex flex-col overflow-hidden text-card-foreground',
            isBlocking ? 'border-accent-red/60' : 'border-border',
            !isFlipped && 'pointer-events-none',
          )}
        >
          {/* 背面顶部档案标头 */}
          <div className="flex shrink-0 flex-col gap-1.5 border-b border-border/60 bg-muted/40 px-5 py-3">
            {/* 背面第 1 行：档案标题（自动宽度） + 翻回正面按钮（禁止换行，shrink-0） */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="size-4 shrink-0 text-accent-blue" />
                <span className="text-xs font-semibold tracking-wide text-foreground whitespace-nowrap">
                  {t('decision.action.evidence')} · 溯源与推导档案
                </span>
              </div>
              <button
                type="button"
                onClick={toggleFlip}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground whitespace-nowrap shadow-2xs transition-colors hover:bg-accent"
              >
                <RotateCw className="size-3 shrink-0" />
                <span className="whitespace-nowrap">{t('decision.review.flipFront')}</span>
              </button>
            </div>

            {/* 背面第 2 行：决策编号（按要求移至第二行） */}
            <div className="flex items-center justify-between text-11 text-muted-foreground">
              <span className="rounded border border-border px-1.5 py-0.5 font-mono text-10 uppercase tracking-wider text-muted-foreground/80 whitespace-nowrap shrink-0 select-all">
                #{shortId}
              </span>
              <span className="text-10 text-muted-foreground/60 whitespace-nowrap shrink-0">
                按 F 或点击翻回
              </span>
            </div>
          </div>

          {/* 背面主体：完整证据抽屉内容 */}
          <div className="flex-1 min-h-0 overflow-y-auto p-5 text-xs text-secondary-foreground">
            {evidence ?? (
              <pre className="whitespace-pre-wrap break-all rounded-lg border border-border/60 bg-muted/30 p-3 font-mono text-11 text-foreground">
                {JSON.stringify(decision.payload, null, 2)}
              </pre>
            )}
            {cooldownSecs && cooldownSecs > 0 ? (
              <p className="mt-3 text-accent-yellow">
                {t('decision.evidence.cooldownHint', { n: cooldownSecs })}
              </p>
            ) : null}
          </div>

          {/* 背面底部操作条：一键翻回正面继续批阅（禁止换行） */}
          <div className="flex shrink-0 justify-end border-t border-border/40 bg-muted/20 px-4 py-2.5">
            <button
              type="button"
              onClick={toggleFlip}
              className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-primary whitespace-nowrap hover:underline"
            >
              <RotateCw className="size-3 shrink-0" />
              <span className="whitespace-nowrap">{t('decision.review.flipFront')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
