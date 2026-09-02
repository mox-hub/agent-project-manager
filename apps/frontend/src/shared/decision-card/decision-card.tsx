/**
 * 决策卡统一入口：按 kind 注册主体渲染器，缺省回退占位渲染器。
 * 后续 Clarify/Plan/Drift 等新决策类型 → 扩展 DecisionKind 联合类型 + 在此注册富渲染器。
 * 视觉精修待设计稿落地（当前为占位框架）。
 */
import { useTranslation } from 'react-i18next';
import type {
  Decision,
  DecisionBodyRenderer,
  DecisionCardAction,
} from './types';
import { DecisionCardShell } from './decision-card-shell';

export interface DecisionCardProps {
  decision: Decision;
  onAction: (action: DecisionCardAction, decision: Decision) => void;
  busyAction?: DecisionCardAction | null;
  className?: string;
}

/** 占位主体渲染器：真实 payload 键摘要，待设计稿后由富渲染器替换 */
const PlaceholderDecisionBody: DecisionBodyRenderer = ({ decision }) => {
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
};

// kind → 主体渲染器注册表（占位阶段为空，全部回退占位渲染器）
const BODY_RENDERERS: Partial<Record<Decision['kind'], DecisionBodyRenderer>> = {};

export function DecisionCard({ decision, onAction, busyAction, className }: DecisionCardProps) {
  const Body = BODY_RENDERERS[decision.kind] ?? PlaceholderDecisionBody;
  return (
    <DecisionCardShell
      decision={decision}
      body={<Body decision={decision} />}
      onAction={onAction}
      busyAction={busyAction}
      className={className}
    />
  );
}

export { DecisionCardShell } from './decision-card-shell';
export type {
  Decision,
  DecisionCardAction,
  DecisionKind,
  DecisionProposer,
  DecisionUrgency,
} from './types';
