/**
 * 决策卡壳 —— 卡片文法的五段式统一骨架（占位版）。
 * 头部（类型徽标 + 紧迫度 + 陈述 + 提案者）/ 主体槽位 / 影响行 / 证据抽屉 / 动作栏。
 * 视觉细节待设计稿落地后精修，当前先保证结构文法与交互契约成立。
 */
import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  ChevronDown,
  Gauge,
  Server,
  User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { StatusPill } from '@/components/ui/status-pill';
import { cn } from '@/lib/utils';
import type {
  Decision,
  DecisionActionDef,
  DecisionCardAction,
} from './types';

const DEFAULT_ACTIONS: DecisionActionDef[] = [
  { action: 'accept', label: 'decision.action.accept', variant: 'default' },
  { action: 'adjust', label: 'decision.action.adjust', variant: 'outline' },
  { action: 'reject', label: 'decision.action.reject', variant: 'outline' },
  { action: 'alternative', label: 'decision.action.alternative', variant: 'outline' },
];

/** 快捷键 1-4 对应动作栏顺序 */
const ACTION_SHORTCUTS: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3 };

const PROPOSER_ICONS = {
  ai_agent: Bot,
  human: User,
  system: Server,
} as const;

export interface DecisionCardShellProps {
  decision: Decision;
  /** 主体槽位：变化 diff（占位阶段由默认渲染器填充） */
  body?: ReactNode;
  /** 影响行槽位：用用户语言陈述后果（＋耗时 / 成本 / 波及面） */
  impact?: ReactNode;
  /** 证据抽屉内容；缺省回退 payload JSON 预览 */
  evidence?: ReactNode;
  /** 动作栏定义；缺省四键 */
  actions?: DecisionActionDef[];
  onAction: (action: DecisionCardAction, decision: Decision) => void;
  /** 正在提交的动作（禁用整条动作栏防重复提交） */
  busyAction?: DecisionCardAction | null;
  className?: string;
}

export function DecisionCardShell({
  decision,
  body,
  impact,
  evidence,
  actions,
  onAction,
  busyAction,
  className,
}: DecisionCardShellProps) {
  const { t } = useTranslation();
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  const actionDefs =
    actions ??
    DEFAULT_ACTIONS.map((a) => ({ ...a, label: t(a.label) }));

  const handleAction = (action: DecisionCardAction) => {
    if (busyAction) return;
    onAction(action, decision);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = ACTION_SHORTCUTS[event.key];
    if (index === undefined) return;
    const def = actionDefs[index];
    if (!def) return;
    event.preventDefault();
    handleAction(def.action);
  };

  const ProposerIcon = PROPOSER_ICONS[decision.proposer.type];
  const proposerName =
    decision.proposer.name ??
    t(`decision.proposer.${decision.proposer.type}`);

  return (
    <Card
      className={cn('py-4', className)}
      onKeyDown={handleKeyDown}
      data-decision-id={decision.id}
      data-decision-urgency={decision.urgency}
    >
      <CardContent className="space-y-3 px-4">
        {/* 头部：类型徽标 + 紧迫度 + 发起时间 */}
        <div className="flex items-center gap-2">
          <Badge variant="outline">{t(`decision.kind.${decision.kind}`)}</Badge>
          <StatusPill
            tone={decision.urgency === 'blocking' ? 'danger' : 'warning'}
          >
            {t(`decision.urgency.${decision.urgency}`)}
          </StatusPill>
          {decision.riskLevel ? (
            <span className="text-11 text-content-text-muted">{decision.riskLevel}</span>
          ) : null}
          <span className="ml-auto text-11 text-content-text-muted">
            {new Date(decision.createdAt).toLocaleString()}
          </span>
        </div>

        {/* 决策陈述 */}
        <p className="text-sm font-medium text-content-text">{decision.title}</p>

        {/* 提案者行 */}
        <div className="inline-flex items-center gap-1.5 text-xs text-content-text-secondary">
          <ProposerIcon className="size-3.5" />
          <span>{proposerName}</span>
          {decision.projectName ? (
            <>
              <span className="text-content-text-muted">·</span>
              <span>{decision.projectName}</span>
            </>
          ) : null}
        </div>

        {/* 主体：变化 diff 槽位 */}
        {body}

        {/* 影响行 */}
        {impact ?? (
          <div className="inline-flex items-center gap-1.5 text-xs text-content-text-muted">
            <Gauge className="size-3.5" />
            <span>{t('decision.impact.placeholder')}</span>
          </div>
        )}

        {/* 证据抽屉：默认折叠，一键展开（证据与接受同价，防橡皮图章） */}
        <Collapsible open={evidenceOpen} onOpenChange={setEvidenceOpen}>
          <CollapsibleTrigger
            render={
              <Button variant="ghost" size="xs" className="text-content-text-secondary" />
            }
          >
            <ChevronDown
              className={cn(
                'motion-shift size-3.5',
                evidenceOpen && 'rotate-180',
              )}
            />
            {evidenceOpen ? t('decision.action.hideEvidence') : t('decision.action.evidence')}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 max-h-64 overflow-auto rounded-md bg-content-bg-secondary p-3">
              {evidence ?? (
                <pre className="whitespace-pre-wrap break-all font-mono text-11 text-content-text-secondary">
                  {JSON.stringify(decision.payload, null, 2)}
                </pre>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* 动作栏：四键等距，快捷键 1-4 */}
        <div className="flex items-center gap-2 pt-1">
          {actionDefs.map((def, index) => (
            <Button
              key={def.action}
              variant={def.variant ?? 'outline'}
              size="sm"
              disabled={busyAction !== null && busyAction !== undefined}
              onClick={(event) => {
                event.stopPropagation();
                handleAction(def.action);
              }}
            >
              {def.label}
              <span className="text-11 text-content-text-muted">{index + 1}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
