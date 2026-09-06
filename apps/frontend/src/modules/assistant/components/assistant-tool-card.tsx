/**
 * 工具调用卡 —— UIMessage tool-* part 的对话内渲染（对齐 zcode 工具块形态）。
 * 折叠头 = 状态图标（调用中/完成/失败）+ 动作标签（动词×实体组合）+ 摘要；
 * 展开体 = 输入参数 / 结果预览 / 错误信息。
 * 实体类输出渲染实体行卡（图标+标题+状态+详情跳转）；列表输出渲染结果数+样例；
 * propose_decision 输出内联决策卡（复用 DecisionCard 文法，决议走 useDecisionActions）。
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Flag,
  FolderKanban,
  ListTodo,
  Repeat,
  Tag,
  Target,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { Decision } from '@/shared/decision-card/types';
import { DecisionCard } from '@/shared/decision-card/decision-card';
import { Spinner } from '@/components/ui/spinner';
import { decisionKeys } from '@/modules/decision/hooks/use-decisions';
import { useDecisionActions } from '@/modules/decision/hooks/use-decision-actions';

/** UIMessage tool-* part 的防御性形状（ai 包类型在 jsdom 测试里不便直接引用） */
export interface AssistantToolPart {
  type: string;
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const VERB_KEYS: Record<string, string> = {
  create: 'assistant.tool.verb.create',
  update: 'assistant.tool.verb.update',
  delete: 'assistant.tool.verb.delete',
  list: 'assistant.tool.verb.list',
  get: 'assistant.tool.verb.get',
  resolve: 'assistant.tool.verb.resolve',
  archive: 'assistant.tool.verb.archive',
  deactivate: 'assistant.tool.verb.deactivate',
  propose: 'assistant.tool.verb.propose',
};

const ENTITY_KEYS: Record<string, string> = {
  task: 'assistant.tool.entity.task',
  project: 'assistant.tool.entity.project',
  project_overview: 'assistant.tool.entity.projectOverview',
  document: 'assistant.tool.entity.document',
  member: 'assistant.tool.entity.member',
  team: 'assistant.tool.entity.team',
  iteration: 'assistant.tool.entity.iteration',
  milestone: 'assistant.tool.entity.milestone',
  acceptance: 'assistant.tool.entity.acceptance',
  decision: 'assistant.tool.entity.decision',
  project_tasks: 'assistant.tool.entity.projectTasks',
  task_acceptances: 'assistant.tool.entity.taskAcceptances',
  pending_decisions: 'assistant.tool.entity.pendingDecisions',
  project_statuses: 'assistant.tool.entity.projectStatuses',
  project_roles: 'assistant.tool.entity.projectRoles',
  repositories: 'assistant.tool.entity.repositories',
};

/** 动词×实体组合显示名；未知工具回退原名 */
function toolActionLabel(toolName: string, t: TFunc): string {
  const sep = toolName.indexOf('_');
  if (sep > 0) {
    const verbKey = VERB_KEYS[toolName.slice(0, sep)];
    const entityKey = ENTITY_KEYS[toolName.slice(sep + 1)];
    if (verbKey && entityKey) return `${t(verbKey)}${t(entityKey)}`;
  }
  return toolName;
}

const ENTITY_ICONS: Record<string, LucideIcon> = {
  task: ListTodo,
  project: FolderKanban,
  document: FileText,
  member: Users,
  team: Users,
  iteration: Repeat,
  milestone: Flag,
  label: Tag,
  acceptance: Target,
};

/** 输出里的实体 ID 字段（与工具返回形状一一对应） */
const ENTITY_ID_FIELDS = [
  'issueId',
  'projectId',
  'documentId',
  'memberId',
  'teamId',
  'iterationId',
  'milestoneId',
  'labelId',
  'acceptanceId',
] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function outputError(output: unknown): string | null {
  const o = asRecord(output);
  const err = o?.error;
  return typeof err === 'string' && err ? err : null;
}

/** 实体工具输出 → {icon, title, status, route}；非实体输出返回 null */
function entityView(
  toolName: string,
  output: unknown,
): { icon: LucideIcon; title: string; status?: string; route?: string } | null {
  const o = asRecord(output);
  if (!o) return null;
  let idField: string | null = null;
  let id = '';
  for (const field of ENTITY_ID_FIELDS) {
    if (typeof o[field] === 'string' && o[field]) {
      idField = field;
      id = o[field] as string;
      break;
    }
  }
  if (!idField) return null;
  const title = [o.title, o.name, o.displayName].find(
    (v): v is string => typeof v === 'string' && v.length > 0,
  );
  const status = typeof o.status === 'string' ? o.status : undefined;
  const isBug = o.type === 'bug';
  const icon =
    idField === 'issueId' && isBug
      ? Bug
      : (ENTITY_ICONS[idField.replace(/Id$/, '')] ?? ListTodo);
  let route: string | undefined;
  if (idField === 'issueId') route = isBug ? `/app/bugs/${id}` : `/app/issues/${id}`;
  else if (idField === 'projectId') route = `/app/projects/${id}`;
  else if (idField === 'documentId') route = `/app/documents/${id}`;
  else if (idField === 'memberId') route = `/app/members/${id}`;
  else if (idField === 'teamId') route = `/app/teams/${id}`;
  else if (idField === 'acceptanceId') route = `/app/acceptance/${id}`;
  if (o.deleted === true) return { icon, title: title ?? id, status, route: undefined };
  return { icon, title: title ?? id, status, route };
}

/** 列表型输出 → {count, samples}；非列表返回 null */
function listView(output: unknown): { count: number; samples: string[] } | null {
  const o = asRecord(output);
  if (!o) return null;
  const arr = Object.values(o).find((v) => Array.isArray(v)) as unknown[] | undefined;
  if (!arr) return null;
  const samples = arr
    .slice(0, 3)
    .map((item) => {
      const rec = asRecord(item);
      const title = rec
        ? ([rec.title, rec.name, rec.displayName].find(
            (v): v is string => typeof v === 'string' && v.length > 0,
          ) ?? '')
        : '';
      return title;
    })
    .filter(Boolean);
  return { count: arr.length, samples };
}

/** 输入参数摘要：取第一个有业务含义的字符串字段 */
function inputSummary(input: unknown): string | null {
  const o = asRecord(input);
  if (!o) return null;
  for (const key of ['title', 'name', 'displayName', 'question', 'issueId', 'acceptanceId', 'documentId', 'projectId']) {
    const v = o[key];
    if (typeof v === 'string' && v) return v;
  }
  return null;
}

/** 展开体：输入参数键值行（截断） */
function InputDetails({ input }: { input: unknown }) {
  const o = asRecord(input);
  if (!o || Object.keys(o).length === 0) return null;
  return (
    <div className="space-y-0.5 font-mono text-11 text-content-text-secondary">
      {Object.entries(o).map(([key, value]) => (
        <p key={key} className="break-all">
          <span className="text-content-text-muted">{key}</span>
          {' = '}
          {typeof value === 'string' ? value : JSON.stringify(value)?.slice(0, 200)}
        </p>
      ))}
    </div>
  );
}

/** 结果行：可读错误（红色，常显） */
function ErrorLine({ message }: { message: string }) {
  return (
    <p className="flex items-start gap-1 break-all text-11 text-accent-red">
      <AlertCircle className="mt-0.5 size-3 shrink-0" />
      {message}
    </p>
  );
}

/** 结果行：实体卡（图标+标题+状态+详情跳转，常显） */
function EntityRow({ toolName, output }: { toolName: string; output: unknown }) {
  const { t } = useTranslation();
  const entity = entityView(toolName, output);
  if (!entity) return null;
  const Icon = entity.icon;
  return (
    <div className="flex items-center gap-1.5 rounded-md bg-content-bg-secondary/60 px-2 py-1 text-11">
      <Icon className="size-3.5 shrink-0 text-accent-purple" />
      <span className="min-w-0 flex-1 truncate font-medium text-content-text">
        {(output as { deleted?: boolean } | null)?.deleted === true
          ? t('assistant.tool.deleted')
          : entity.title}
      </span>
      {entity.status ? (
        <span className="shrink-0 rounded bg-accent-blue-light px-1.5 py-0.5 text-10 text-accent-blue">
          {entity.status}
        </span>
      ) : null}
      {entity.route ? (
        <a
          href={entity.route}
          className="shrink-0 text-accent-blue underline-offset-2 hover:underline"
        >
          {t('assistant.tool.view')}
        </a>
      ) : null}
    </div>
  );
}

/** 结果行：列表样例（结果数 + 前 3 条标题，常显） */
function ListSamples({ output }: { output: unknown }) {
  const { t } = useTranslation();
  const list = listView(output);
  if (!list) return null;
  return (
    <div className="space-y-0.5 text-11 text-content-text-secondary">
      <p>{t('assistant.tool.resultCount', { count: list.count })}</p>
      {list.samples.map((sample) => (
        <p key={sample} className="truncate pl-2 text-content-text-muted">
          · {sample}
        </p>
      ))}
    </div>
  );
}

/** 展开体：兜底 JSON 预览（无实体/列表语义时才展示） */
function RawOutputPreview({ output }: { output: unknown }) {
  const text = JSON.stringify(output);
  if (!text || text === '{}') return null;
  return (
    <p className="break-all font-mono text-11 text-content-text-muted">
      {text.slice(0, 300)}
      {text.length > 300 ? '…' : ''}
    </p>
  );
}

/** propose_decision 完整输出 → 内联决策卡（落库后失效待决缓存，顶部 strip 同步） */
function ProposedDecisionInline({ output }: { output: unknown }) {
  const o = asRecord(output) ?? {};
  const proposalId = typeof o.proposalId === 'string' ? o.proposalId : '';
  const kind = o.kind as Decision['kind'] | undefined;
  const title = typeof o.title === 'string' ? o.title : '';
  // 输出不含渲染决策卡所需字段时回退普通工具卡
  if (!proposalId || !kind || !title) return null;

  return <ProposedDecisionCard o={o} proposalId={proposalId} kind={kind} title={title} />;
}

function ProposedDecisionCard({
  o,
  proposalId,
  kind,
  title,
}: {
  o: Record<string, unknown>;
  proposalId: string;
  kind: Decision['kind'];
  title: string;
}) {
  const qc = useQueryClient();
  const { handleAction, busyId } = useDecisionActions();

  // 提案落库后失效待决缓存：顶部「待你决定」strip 与消息流内联卡同步
  useEffect(() => {
    void qc.invalidateQueries({ queryKey: decisionKeys.all });
  }, [proposalId, qc]);

  const decision: Decision = {
    id: `${kind}:${proposalId}`,
    kind,
    sourceId: proposalId,
    status: 'pending',
    title,
    detail: typeof o.detail === 'string' ? o.detail : undefined,
    urgency: 'advisory',
    projectId: typeof o.projectId === 'string' ? o.projectId : undefined,
    proposer: { type: 'ai_agent', id: 'main-assistant' },
    payload: (asRecord(o.payload) ?? {}) as Record<string, unknown>,
    createdAt:
      typeof o.createdAt === 'string' ? o.createdAt : new Date(0).toISOString(),
  };

  return (
    <div className="w-full" data-ai-component="assistant.tool-decision">
      <DecisionCard
        decision={decision}
        onAction={handleAction}
        busy={busyId === decision.id}
      />
    </div>
  );
}

/** 工具调用折叠卡（对齐 zcode：默认收起一行，点开看输入/输出） */
export function AssistantToolCard({ part }: { part: AssistantToolPart }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const toolName =
    typeof part.toolName === 'string' && part.toolName
      ? part.toolName
      : part.type.slice('tool-'.length);
  const state = part.state ?? 'input-available';
  const error = state === 'output-error' ? part.errorText : outputError(part.output);
  const done = state === 'output-available' && !error;

  // 决策建议卡：完整输出 → 内联 DecisionCard；残缺输出走普通折叠卡
  const out = asRecord(part.output) ?? {};
  const canInlineDecision =
    toolName === 'propose_decision' &&
    done &&
    typeof out.proposalId === 'string' &&
    !!out.proposalId &&
    typeof out.kind === 'string' &&
    !!out.kind &&
    typeof out.title === 'string' &&
    !!out.title;
  if (canInlineDecision) {
    return <ProposedDecisionInline output={part.output} />;
  }

  const actionLabel = toolActionLabel(toolName, t as unknown as TFunc);
  const entity = done ? entityView(toolName, part.output) : null;
  const list = done && !entity ? listView(part.output) : null;
  const summary = done
    ? (entity?.title ??
      (list ? t('assistant.tool.resultCount', { count: list.count }) : null))
    : inputSummary(part.input);
  const hasBody = part.input !== undefined || part.output !== undefined || !!error;
  const hasAlwaysVisible = !!error || !!entity || !!list;

  return (
    <div
      className="w-full overflow-hidden rounded-lg border border-border bg-background/40"
      data-ai-component="assistant.tool-card"
      data-tool-state={state}
    >
      <button
        type="button"
        onClick={() => hasBody && setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-11"
        aria-expanded={open}
      >
        {done ? (
          <CheckCircle2 className="size-3.5 shrink-0 text-accent-green" />
        ) : error ? (
          <XCircle className="size-3.5 shrink-0 text-accent-red" />
        ) : (
          <Spinner size="sm" className="size-3.5 shrink-0 text-accent-blue" />
        )}
        <span className="shrink-0 font-medium text-content-text">{actionLabel}</span>
        {summary ? (
          <span className="min-w-0 flex-1 truncate text-content-text-muted">{summary}</span>
        ) : (
          <span className="min-w-0 flex-1" />
        )}
        {hasBody ? (
          open ? (
            <ChevronDown className="size-3 shrink-0 text-content-text-muted" />
          ) : (
            <ChevronRight className="size-3 shrink-0 text-content-text-muted" />
          )
        ) : null}
      </button>
      {/* 结果常显（对齐 zcode：结果一眼可见，输入默认折叠） */}
      {error ? (
        <div className="px-2.5 pb-1.5">
          <ErrorLine message={error} />
        </div>
      ) : null}
      {entity ? (
        <div className="px-2.5 pb-1.5">
          <EntityRow toolName={toolName} output={part.output} />
        </div>
      ) : null}
      {list ? (
        <div className="px-2.5 pb-1.5">
          <ListSamples output={part.output} />
        </div>
      ) : null}
      {open && hasBody ? (
        <div className="space-y-1.5 border-t border-border/60 px-2.5 py-1.5">
          {part.input !== undefined ? <InputDetails input={part.input} /> : null}
          {!hasAlwaysVisible && part.output !== undefined ? (
            <RawOutputPreview output={part.output} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
