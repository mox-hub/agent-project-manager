/**
 * TasksPage - 全局任务管理页面
 * 使用真实 API 获取任务数据
 */

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Plus, AlertCircle, ListTodo, Bot as BotIcon, List, Kanban, CalendarRange, TableProperties, Trash2, CircleDashed, SearchX, Flag, Users, Target, Upload, SlidersHorizontal, Tag as TagIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AsyncState } from '@/components/ui/async-state';
import { EmptyState } from '@/components/ui/empty-state';
import { IconStack } from '@/components/ui/icon-stack';
import { PageHeader } from '@/components/ui/page-header';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { QuickCardsToggle } from '@/components/ui/quick-cards-toggle';
import { usePersistentToggle } from '@/shared/hooks/use-persistent-toggle';
import { PageShell } from '@/components/ui/page-shell';
import { StatsCard, STATS_THEMES } from '@/components/ui/stats-card';
import { ToolbarRow, useToolbarViews, normalizeFilterSelection } from '@/components/ui/toolbar-row';
import {
  FilterChipsRow,
  FilterCascadeMenu,
  filterConditionSets,
  matchesConditionSets,
  countBy,
  type FilterCondition,
  type FilterFieldDef,
} from '@/components/ui/filter-chips';
import { TASK_STATUS_VISUALS, TONE_TEXT_CLASS } from '@/shared/status/status-visuals';
import { getEntityIcon } from '@/shared/entity-icons/entity-icons';
import { useAllTasks, useDeleteTask, useUpdateTask } from '../hooks/use-project-tasks';
import { useIssueTypes, useIssueTypeOf } from '../hooks/use-issue-types';
import { useProjectList } from '@/modules/project/hooks/use-project-list';
import { usePipelineProjectFilter } from '@/shared/layout/pipeline-focus';
import type { Task } from '../api/issue-api';
import { UnifiedCreateDialog } from '@/shared/components/create-dialog';
import { useTranslation } from 'react-i18next';
import { AiAssignDialog, type AiAssignIssueRef } from '../components/ai-assign-dialog';
import { TaskSimpleList } from '../components/task-simple-list';
import {
  TaskTableView,
  TASK_TABLE_PROPERTY_KEYS,
  assigneeNameOf,
  issueTimeOf,
} from '../components/task-table-view';
import { BatchUpdateIssuesDialog, type BatchUpdateIssueRef } from '../components/batch-update-issues-dialog';
import { GlobalTaskExportDialog } from '../components/global-task-export-dialog';
import { ImportModal } from '../components/task-import-export';
import { useIterationNameMap } from '../hooks/use-iteration-name-map';
import { TaskGantt } from '../components/task-gantt';
import { useActiveExecutionsMap, type ActiveAiExecution } from '@/modules/execution/hooks/use-active-executions-map';
import { AiExecutionBadge } from '@/shared/components/ai-execution-badge';
import { ListActionButton } from '@/components/ui/data-list';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { toast } from '@/components/ui/toast';
import { BoardView, type BoardColumnDef } from '@/shared/components/board-view/board-view';
import { useIssueRowMenu } from '@/shared/context-menu/use-issue-row-menu';
import { cn } from '@/lib/utils';
import {
  getProjectColumns,
  getSeverityColumns,
  getTaskStatusColumns,
  taskCardRow3,
  taskCardRow1,
  taskCardModel,
} from '../components/board-presets';

type ViewMode = 'list' | 'board' | 'gantt' | 'table';
type GroupBy = 'none' | 'status' | 'severity' | 'project';
type Severity = 'critical' | 'high' | 'medium' | 'low';

const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; dotColor: string }> = {
  critical: { label: 'Critical', color: 'text-destructive', dotColor: 'bg-destructive' },
  high: { label: 'High', color: 'text-accent-orange', dotColor: 'bg-accent-orange' },
  medium: { label: 'Medium', color: 'text-accent-yellow', dotColor: 'bg-accent-yellow' },
  low: { label: 'Low', color: 'text-muted-foreground', dotColor: 'bg-muted-foreground/40' },
};

/** severity 缺失时从 priority 推导（任务页统一口径） */
const severityOf = (task: Task): Severity =>
  task.severity ||
  (task.priority === 'critical' ? 'critical' : task.priority === 'high' ? 'high' : task.priority === 'medium' ? 'medium' : 'low');

/* ───────── P1-16：筛选状态 ↔ URL query 同步 ─────────
 * 参数约定：q=搜索；completed=完成度（active/completed）；f_<fieldId>=v1,v2（条件条，
 * isNot/notInclude 的值加 ! 前缀）。优先级：保存视图 > URL > 默认——保存视图 onApply
 * 覆盖页面态后由同步 effect 回写 URL；直开带参时 URL 初始化页面态。 */
const CONDITION_PARAM_PREFIX = 'f_';
const SEARCH_PARAM = 'q';
const COMPLETED_PARAM = 'completed';
const PAGE_PARAM = 'page';
/** P2-17：服务端分页页大小——后端 /issues/all 信封含 meta.total/totalPages，前端按页拉取 */
const PAGE_SIZE = 50;

/** 条件条 → URL params（同字段 is/exclude 合并为一个参数，exclude 值带 ! 前缀） */
function conditionsToParams(conditions: FilterCondition[]): Array<[string, string]> {
  const byField = new Map<string, { include: string[]; exclude: string[] }>();
  for (const condition of conditions) {
    if (condition.values.length === 0) continue;
    const entry = byField.get(condition.fieldId) ?? { include: [], exclude: [] };
    if (condition.operator === 'isNot' || condition.operator === 'notInclude') {
      entry.exclude.push(...condition.values);
    } else {
      entry.include.push(...condition.values);
    }
    byField.set(condition.fieldId, entry);
  }
  return [...byField.entries()]
    .map(([fieldId, { include, exclude }]) => {
      const encoded = [...include, ...exclude.map((v) => `!${v}`)].join(',');
      return [`${CONDITION_PARAM_PREFIX}${fieldId}`, encoded] as [string, string];
    })
    .filter(([, value]) => value !== '');
}

/** URL params → 条件条（include/exclude 分列两条；非本页管理的键忽略） */
function paramsToConditions(params: URLSearchParams): FilterCondition[] {
  const conditions: FilterCondition[] = [];
  let seq = 0;
  for (const [key, raw] of params.entries()) {
    if (!key.startsWith(CONDITION_PARAM_PREFIX)) continue;
    const fieldId = key.slice(CONDITION_PARAM_PREFIX.length);
    if (!fieldId) continue;
    const include: string[] = [];
    const exclude: string[] = [];
    for (const part of raw.split(',')) {
      if (!part) continue;
      if (part.startsWith('!')) exclude.push(part.slice(1));
      else include.push(part);
    }
    if (include.length > 0) {
      seq += 1;
      conditions.push({ id: `cond-url-${seq}`, fieldId, operator: 'is', values: include });
    }
    if (exclude.length > 0) {
      seq += 1;
      conditions.push({ id: `cond-url-${seq}`, fieldId, operator: 'notInclude', values: exclude });
    }
  }
  return conditions;
}

/* ───────── P1-14：表格「展示属性」chips 与排序选项（与 TaskTableView 列映射对齐，全部真实生效） ───────── */
const DISPLAY_PROPERTY_LABELS: Record<string, string> = {
  id: 'ID',
  status: 'Status',
  assignee: 'Assignee',
  priority: 'Priority',
  project: 'Project',
  estimate: 'Estimate',
  dueDate: 'Due date',
  labels: 'Labels',
  created: 'Created',
  updated: 'Updated',
  aiExecution: 'AI State',
};

const SORTABLE_COLUMN_LABELS: Record<string, string> = {
  priority: 'Priority',
  dueDate: 'Due date',
  created: 'Created',
  updated: 'Updated',
  title: 'Title',
  shortId: 'ID',
  status: 'Status',
  assignee: 'Assignee',
  project: 'Project',
  estimate: 'Estimate',
  labels: 'Labels',
  aiExecution: 'AI State',
};

const PRIORITY_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

/** 负责人筛选口径：主负责人优先，AI 员工指派次之，均无 = unassigned */
const assigneeIdOf = (task: Task) => task.assignee?.id ?? task.aiAgentId ?? 'unassigned';

/** 页头实体图标：统一从 entity-icons 注册表取（规范 v0） */
const ISSUE_ENTITY = getEntityIcon('issue');

export function TasksPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // 管道项目聚焦（CAP-A-15）：URL ?project 优先——作为项目筛选 chips 的受控初值
  const { focusProjectId } = usePipelineProjectFilter();
  // P1-16：筛选状态同步 URL query（useSearchParams）
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  // 筛选初值优先级（P1-16）：URL 参数 > 管道聚焦项目 > 默认空
  const [search, setSearch] = useState(() => searchParams.get(SEARCH_PARAM) ?? '');
  const [conditions, setConditions] = useState<FilterCondition[]>(() => {
    const fromUrl = paramsToConditions(searchParams);
    if (fromUrl.length > 0) return fromUrl;
    // 聚焦项目时初值预置 project is <focusProjectId>（仅初值，用户可在页内再改）
    return focusProjectId
      ? [{ id: 'cond-pipeline-focus-project', fieldId: 'project', operator: 'is', values: [focusProjectId] }]
      : [];
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [presetAssigneeId, setPresetAssigneeId] = useState<string | undefined>(undefined);
  // 派发上下文（P0-5）：issues 多于一条时 AiAssignDialog 进入批量模式
  const [dispatch, setDispatch] = useState<{ projectId: string; issues: AiAssignIssueRef[] } | null>(null);
  // 批量修改上下文（P1-12）：选中的工单进入批量改状态/优先级/负责人对话框
  const [batchUpdateIssues, setBatchUpdateIssues] = useState<BatchUpdateIssueRef[] | null>(null);
  // 导入导出（P1-15）：导出范围 = 当前筛选结果（对话框内明示）
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const statsCards = usePersistentToggle('tasks-page.stats');

  // Linear 风格 Display 选项
  const [orderBy, setOrderBy] = useState<string>('priority');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc');
  const [completedFilter, setCompletedFilter] = useState<'all' | 'active' | 'completed'>(() => {
    const value = searchParams.get(COMPLETED_PARAM);
    return value === 'active' || value === 'completed' ? value : 'all';
  });
  // P2-17：服务端分页页码，?page 进 URL（仅 >1 时写入），刷新/分享后保持页码
  const [page, setPage] = useState(() => {
    const parsed = Number(searchParams.get(PAGE_PARAM));
    return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
  });
  const [showSubIssues, setShowSubIssues] = useState(true);
  const [showEmptyGroups, setShowEmptyGroups] = useState(false);
  // P1-14：展示属性 chips 键集与 TaskTableView 列映射对齐（全键初始化，首次开关即生效）
  const [displayProperties, setDisplayProperties] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(TASK_TABLE_PROPERTY_KEYS.map((key) => [key, true])),
  );

  const isAiFiltering = useMemo(() => {
    return conditions.some((c) => c.fieldId === 'aiExecution' && c.values.includes('active'));
  }, [conditions]);

  const toggleAiFilter = () => {
    if (isAiFiltering) {
      setConditions((prev) => prev.filter((c) => c.fieldId !== 'aiExecution'));
    } else {
      setConditions((prev) => [
        ...prev.filter((c) => c.fieldId !== 'aiExecution'),
        { id: 'cond-ai', fieldId: 'aiExecution', operator: 'is', values: ['active'] },
      ]);
    }
  };

  // 成员卡「派发任务」入口：/app/issues?state 携带 openCreate + presetAssignee。
  // 渲染期间检测 state 变化调整弹窗状态，replaceState 副作用留在独立 effect。
  const location = useLocation();
  const [prevLocationState, setPrevLocationState] = useState(location.state);
  if (prevLocationState !== location.state) {
    setPrevLocationState(location.state);
    const st = (location.state ?? {}) as { openCreate?: boolean; presetAssigneeId?: string };
    if (st.openCreate) {
      setPresetAssigneeId(st.presetAssigneeId);
      setShowCreateDialog(true);
    }
  }
  useEffect(() => {
    const st = (location.state ?? {}) as { openCreate?: boolean };
    if (st.openCreate) {
      // 清掉 state 防止刷新重复打开
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // 已保存视图：快照记忆当前页全部筛选 + 显示样式 + 分组
  const toolbar = useToolbarViews({
    key: 'tasks-page',
    defaults: [{
      id: 'all',
      name: t('common.all', '全部'),
      icon: 'list',
      builtIn: true,
      snapshot: { search: '', conditions: [], viewMode: 'list', groupBy: 'none' },
    }],
    onApply: (snapshot) => {
      const snap = (snapshot ?? {}) as Partial<{
        search: string; conditions: FilterCondition[];
        status: string | string[]; severity: string | string[]; project: string | string[];
        viewMode: ViewMode; groupBy: GroupBy;
      }>;
      setSearch(snap.search ?? '');
      // 新快照直接恢复条件条；旧版快照（status/severity/project 数组）合成 is 条件兜底
      setConditions(Array.isArray(snap.conditions)
        ? snap.conditions
        : ([
            ['status', normalizeFilterSelection(snap.status)],
            ['severity', normalizeFilterSelection(snap.severity)],
            ['project', normalizeFilterSelection(snap.project)],
          ] as const).flatMap(([fieldId, values]) =>
            values.length > 0 ? [{ id: `legacy-${fieldId}`, fieldId, operator: 'is' as const, values }] : []),
      );
      const nextView = snap.viewMode ?? 'list';
      setViewMode(nextView);
      setGroupBy(nextView === 'board' && (snap.groupBy ?? 'none') === 'none' ? 'status' : (snap.groupBy ?? 'none'));
    },
  });
  const { updateActiveSnapshot } = toolbar;

  useEffect(() => {
    updateActiveSnapshot({ search, conditions, viewMode, groupBy });
  }, [updateActiveSnapshot, search, conditions, viewMode, groupBy]);

  // P1-16：筛选状态 → URL query 回写（replace，不产生历史记录；前进后退/刷新后可还原）。
  // 仅增删本页管理的参数键，不触碰 ?project（管道聚焦）等外部参数；等值时跳过避免循环。
  // P2-17：?page 一并纳入管理（仅 >1 时写入，第 1 页省略保持 URL 干净）
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    for (const key of [...next.keys()]) {
      if (
        key === SEARCH_PARAM ||
        key === COMPLETED_PARAM ||
        key === PAGE_PARAM ||
        key.startsWith(CONDITION_PARAM_PREFIX)
      ) {
        next.delete(key);
      }
    }
    if (search.trim()) next.set(SEARCH_PARAM, search.trim());
    if (completedFilter !== 'all') next.set(COMPLETED_PARAM, completedFilter);
    if (page > 1) next.set(PAGE_PARAM, String(page));
    for (const [key, value] of conditionsToParams(conditions)) {
      next.set(key, value);
    }
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [search, conditions, completedFilter, page, searchParams, setSearchParams]);

  // P2-17：筛选条件（搜索 / 条件条 / 完成度，含保存视图应用与清除筛选）变化时回到第 1 页；
  // 页码初值来自 URL，不算变化。签名用字段/算子/值拼接，与条件 id（含 URL 合成 id）解耦。
  const filterSignature = `${search}\u0000${completedFilter}\u0000${conditions
    .map((c) => `${c.fieldId}:${c.operator}:${c.values.join(',')}`)
    .join(';')}`;
  const prevFilterSignature = useRef(filterSignature);
  useEffect(() => {
    if (prevFilterSignature.current === filterSignature) return;
    prevFilterSignature.current = filterSignature;
    setPage(1);
  }, [filterSignature]);

  // AI 活跃执行接管状态
  const { getIssueExecution, totalActiveAiCount } = useActiveExecutionsMap();

  // 跨项目查询所有 task + bug, 同时包含 inbox 项目下的未绑定任务
  // isError 必须先于空态判定：请求失败 ≠ 真空态，错误时渲染错误态 + 重试（P1 体验修复）
  // P2-17：按页拉取（page/pageSize），翻页瞬间 placeholderData 保留上一页数据避免整屏闪烁
  const { data: tasksData, isLoading, isError, error, refetch } = useAllTasks(
    { page, pageSize: PAGE_SIZE },
    { placeholderData: (prev) => prev },
  );
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();
  const confirmAction = useConfirm();

  // 获取项目列表用于过滤
  const { data: projectsResponse } = useProjectList();
  const projects = useMemo(() => projectsResponse?.items ?? [], [projectsResponse]);

  // Task + Bug 一起展示 (任务页 = 统一任务视图)；此处为服务端返回的当前页数据
  const allTasks = useMemo(() => tasksData?.data ?? [], [tasksData]);

  // P2-17：分页 meta——total/totalPages 是服务端全量真相；前端筛选/排序只作用于当前页
  const totalCount = tasksData?.meta?.total ?? allTasks.length;
  const totalPages = tasksData?.meta?.totalPages ?? 1;
  const pageFrom = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageTo = Math.min(page * PAGE_SIZE, totalCount);

  // URL 直开超界页码 / 数据收缩（末页删空）时回退到最后一页
  useEffect(() => {
    const metaTotalPages = tasksData?.meta?.totalPages ?? 0;
    if (!isLoading && metaTotalPages > 0 && page > metaTotalPages) {
      setPage(metaTotalPages);
    }
  }, [tasksData, isLoading, page]);

  // 项目名解析（排序 comparator 与列表渲染共用；上移到派生逻辑之前）
  const getProjectName = useCallback(
    (projectId: string | null | undefined) => {
      if (!projectId) return t('common.noProject');
      return projects.find((p) => p.id === projectId)?.name || projectId;
    },
    [t, projects],
  );

  // 迭代维度（P1-16）：迭代名按项目查询聚合；任一项目失败仅影响该项显示名（id 兜底）
  const iterationIds = useMemo(
    () => [...new Set(allTasks.map((task) => task.iterationId).filter((v): v is string => !!v))],
    [allTasks],
  );
  const iterationNameById = useIterationNameMap(iterationIds);

  // 负责人维度（P1-16）：从当前列表聚合（主负责人 + AI 员工指派两种主体）
  const assigneeOptions = useMemo(() => {
    const byId = new Map<string, { value: string; label: string; isAi: boolean }>();
    for (const task of allTasks) {
      if (task.assignee?.id) {
        if (!byId.has(task.assignee.id)) {
          byId.set(task.assignee.id, {
            value: task.assignee.id,
            label: task.assignee.displayName || task.assignee.username || task.assignee.id,
            isAi: false,
          });
        }
      } else if (task.aiAgent && !byId.has(task.aiAgent.id)) {
        byId.set(task.aiAgent.id, { value: task.aiAgent.id, label: task.aiAgent.name, isAi: true });
      }
    }
    return [...byId.values()];
  }, [allTasks]);

  // 标签维度（P1-16）：标签数据随列表响应返回（issueTags.tag），直接聚合即可
  const tagOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const task of allTasks) {
      for (const { tag } of task.issueTags ?? []) {
        if (!byId.has(tag.id)) byId.set(tag.id, tag.name);
      }
    }
    return [...byId.entries()].map(([value, label]) => ({ value, label }));
  }, [allTasks]);

  // 筛选字段定义（级联菜单与条件条共用；hint 为各值计数）
  const { types: issueTypeOptions, byKey: issueTypesByKey } = useIssueTypes();

  // 类型筛选的口径：typeId 为事实源；遗留行 typeId 为空时按旧 type 字符串解析
  const effectiveTypeId = useCallback(
    (task: Task): string | undefined =>
      task.typeId ?? issueTypesByKey.get(task.type ?? 'task')?.id,
    [issueTypesByKey],
  );

  const filterFields = useMemo<FilterFieldDef[]>(() => {
    const statusCounts = countBy(allTasks, (task) => task.status);
    const severityCounts = countBy(allTasks, severityOf);
    const projectCounts = countBy(allTasks, (task) => task.projectId);
    const typeCounts = countBy(allTasks, (task) => effectiveTypeId(task) ?? 'unknown');
    const priorityCounts = countBy(allTasks, (task) => task.priority ?? 'medium');
    // assigneeIdOf 无主体时归 'unassigned'，天然计入未分配计数
    const assigneeCounts = countBy(allTasks, assigneeIdOf);
    const iterationCounts = countBy(allTasks, (task) => task.iterationId);
    const tagCounts = new Map<string, number>();
    for (const task of allTasks) {
      for (const { tag } of task.issueTags ?? []) {
        tagCounts.set(tag.id, (tagCounts.get(tag.id) ?? 0) + 1);
      }
    }
    const aiActiveCounts = allTasks.filter((t) => !!getIssueExecution(t)?.isExecuting).length;

    return [
      {
        id: 'type',
        label: t('task.filter.typeGroup', '类型'),
        icon: getEntityIcon('issue').icon,
        operators: ['is', 'isNot'],
        options: issueTypeOptions.map((ty) => ({
          value: ty.id,
          label: ty.name,
          hint: typeCounts.get(ty.id)?.toString(),
        })),
      },
      {
        id: 'status',
        label: t('task.status.group', 'Status'),
        icon: CircleDashed,
        operators: ['is', 'isNot'],
        options: (['todo', 'in_progress', 'in_review', 'done', 'canceled'] as const).map((value) => {
          const visual = TASK_STATUS_VISUALS[value];
          const Icon = visual?.icon;
          return {
            value,
            label: t(`task.status.${value}`),
            icon: Icon ? <Icon className={`size-3.5 ${TONE_TEXT_CLASS[visual.tone]}`} /> : undefined,
            hint: statusCounts.get(value)?.toString(),
          };
        }),
      },
      {
        id: 'aiExecution',
        label: t('task.filter.aiExecutionGroup', 'AI 执行态'),
        icon: BotIcon,
        operators: ['is'],
        options: [
          {
            value: 'active',
            label: t('task.filter.aiActive', 'AI 接管执行中'),
            hint: aiActiveCounts.toString(),
          },
        ],
      },
      {
        id: 'severity',
        label: t('task.severity.group', 'Severity'),
        icon: AlertCircle,
        operators: ['is', 'isNot'],
        options: (['critical', 'high', 'medium', 'low'] as const).map((value) => ({
          value,
          label: SEVERITY_CONFIG[value].label,
          icon: <span className={`size-2.5 shrink-0 rounded-full ${SEVERITY_CONFIG[value].dotColor}`} />,
          hint: severityCounts.get(value)?.toString(),
        })),
      },
      {
        id: 'priority',
        label: t('viewDisplay.properties.priority', 'Priority'),
        icon: Flag,
        operators: ['is', 'isNot'],
        options: (['critical', 'high', 'medium', 'low'] as const).map((value) => ({
          value,
          label: t(`task.priority.${value}`, value),
          hint: priorityCounts.get(value)?.toString(),
        })),
      },
      {
        id: 'assignee',
        label: t('viewDisplay.properties.assignee', 'Assignee'),
        icon: Users,
        operators: ['is', 'isNot'],
        searchable: true,
        options: [
          {
            value: 'unassigned',
            label: t('task.filter.unassigned', '未分配'),
            hint: assigneeCounts.get('unassigned')?.toString(),
          },
          ...assigneeOptions.map((option) => ({
            value: option.value,
            label: option.isAi ? `[AI] ${option.label}` : option.label,
            hint: assigneeCounts.get(option.value)?.toString(),
          })),
        ],
      },
      {
        id: 'iteration',
        label: t('task.filter.iterationGroup', 'Iteration'),
        icon: Target,
        operators: ['is', 'isNot'],
        options: iterationIds.map((id) => ({
          value: id,
          label: iterationNameById.get(id)?.name ?? `${id.slice(0, 8)}…`,
          hint: iterationCounts.get(id)?.toString(),
        })),
      },
      {
        id: 'tag',
        label: t('task.filter.tagGroup', '标签'),
        icon: TagIcon,
        operators: ['is', 'isNot'],
        options: tagOptions.map((tag) => ({
          value: tag.value,
          label: tag.label,
          hint: tagCounts.get(tag.value)?.toString(),
        })),
      },
      {
        id: 'project',
        label: t('task.filter.projectGroup', 'Project'),
        icon: getEntityIcon('project').icon,
        operators: ['is', 'isNot'],
        searchable: true,
        options: projects.map((p) => ({
          value: p.id,
          label: p.name,
          hint: projectCounts.get(p.id)?.toString(),
        })),
      },
    ];
  }, [t, projects, allTasks, getIssueExecution, issueTypeOptions, effectiveTypeId, assigneeOptions, iterationIds, iterationNameById, tagOptions]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    const statusSets = filterConditionSets(conditions, 'status');
    const severitySets = filterConditionSets(conditions, 'severity');
    const projectSets = filterConditionSets(conditions, 'project');
    const aiSets = filterConditionSets(conditions, 'aiExecution');
    const typeSets = filterConditionSets(conditions, 'type');
    // P1-16 新增维度：优先级 / 负责人 / 迭代 / 标签
    const prioritySets = filterConditionSets(conditions, 'priority');
    const assigneeSets = filterConditionSets(conditions, 'assignee');
    const iterationSets = filterConditionSets(conditions, 'iteration');
    const tagSets = filterConditionSets(conditions, 'tag');

    const list = allTasks.filter((task) => {
      if (search && !task.title.toLowerCase().includes(search.toLowerCase()) &&
          !task.id.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (!matchesConditionSets(task.status, statusSets)) {
        return false;
      }
      // 类型筛选（typeId 事实源；命中 'unknown' 表示遗留行且类型键无法解析）
      if (typeSets.include.length > 0 || typeSets.exclude.length > 0) {
        if (!matchesConditionSets(effectiveTypeId(task) ?? 'unknown', typeSets)) {
          return false;
        }
      }
      // AI 执行状态筛选
      if (aiSets.include.includes('active') && !getIssueExecution(task)?.isExecuting) {
        return false;
      }
      // 完成项显示控制
      if (completedFilter === 'active' && (task.status === 'done' || task.status === 'canceled')) {
        return false;
      }
      if (completedFilter === 'completed' && task.status !== 'done' && task.status !== 'canceled') {
        return false;
      }
      // severity 缺失时从 priority 推导（severityOf 统一口径）
      if (!matchesConditionSets(severityOf(task), severitySets)) {
        return false;
      }
      if (!matchesConditionSets(task.projectId, projectSets)) {
        return false;
      }
      // P1-16：优先级 / 负责人（主负责人 → AI 员工 → unassigned）/ 迭代
      if (!matchesConditionSets(task.priority ?? 'medium', prioritySets)) {
        return false;
      }
      if (!matchesConditionSets(assigneeIdOf(task), assigneeSets)) {
        return false;
      }
      if (!matchesConditionSets(task.iterationId, iterationSets)) {
        return false;
      }
      // 标签为多值字段：include 命中任一即通过；exclude 命中任一即否决
      if (tagSets.include.length > 0 &&
          !task.issueTags?.some(({ tag }) => tagSets.include.includes(tag.id))) {
        return false;
      }
      if (tagSets.exclude.length > 0 &&
          task.issueTags?.some(({ tag }) => tagSets.exclude.includes(tag.id))) {
        return false;
      }
      return true;
    });

    // P1-14/16：排序键与表格表头/显示菜单同源——全键可排（数值/字符串自适应比较）
    const sortValueOf = (task: Task): string | number => {
      switch (orderBy) {
        case 'priority':
          return PRIORITY_RANK[task.priority ?? 'low'] ?? 0;
        case 'dueDate':
          return issueTimeOf(task.dueDate);
        case 'created':
          return issueTimeOf(task.createdAt);
        case 'updated':
          return issueTimeOf(task.updatedAt);
        case 'estimate':
          return task.estimate ?? 0;
        case 'shortId':
          return (task.shortId || task.externalIdentifier || task.id.slice(0, 8)).toLowerCase();
        case 'status':
          return task.status ?? '';
        case 'assignee':
          return assigneeNameOf(task);
        case 'project':
          return task.projectId ? getProjectName(task.projectId) : '';
        case 'labels':
          return task.issueTags?.[0]?.tag?.name ?? '';
        case 'aiExecution':
          return getIssueExecution(task)?.isExecuting ? 1 : 0;
        case 'title':
        default:
          return task.title;
      }
    };

    const sorted = [...list];
    sorted.sort((a, b) => {
      const valueA = sortValueOf(a);
      const valueB = sortValueOf(b);
      const res =
        typeof valueA === 'number' && typeof valueB === 'number'
          ? valueA - valueB
          : String(valueA).localeCompare(String(valueB));
      return orderDirection === 'desc' ? -res : res;
    });
    return sorted;
  }, [allTasks, search, conditions, getIssueExecution, completedFilter, orderBy, orderDirection, effectiveTypeId, getProjectName]);

  // 空态接管判定：搜索 / 条件条 / 完成度开关任一生效时，筛选空态提供「清除筛选」入口
  const hasActiveFilters =
    search.trim() !== '' || conditions.length > 0 || completedFilter !== 'all';

  const handleTaskClick = (task: Task) => {
    navigate(`/app/issues/${task.id}`);
  };

  // P0-5：多选「指派 AI」真批量——同项目多选全部进入批量派发；
  // 跨项目混选（含未归属项目的收件箱任务）显式报错，不再静默只取第一条
  const handleDispatchSelected = useCallback(
    (selected: Task[], close?: () => void) => {
      const assignable = selected.filter((t) => t.projectId);
      if (assignable.length === 0) return;
      const projectIds = new Set(assignable.map((t) => t.projectId as string));
      if (projectIds.size > 1 || assignable.length !== selected.length) {
        toast.error(
          t(
            'task.batchDispatch.crossProjectError',
            '选中项来自多个项目（或含未归属项目的收件箱任务），批量派发仅支持同一项目的任务，请调整选择后重试',
          ),
        );
        return;
      }
      setDispatch({
        projectId: assignable[0].projectId as string,
        issues: assignable.map((t) => ({ id: t.id, title: t.title })),
      });
      close?.();
    },
    [t],
  );

  // 多选悬浮操作（列表 / 表格视图共用；P1-12 增加批量修改状态/优先级/负责人）
  const buildSelectionActions = useCallback(
    (selected: Task[], close: () => void) => (
      <>
        <ListActionButton
          onClick={() => {
            setBatchUpdateIssues(
              selected.map((task) => ({ id: task.id, title: task.title, shortId: task.shortId })),
            );
            close();
          }}
          title={t('task.batchUpdate.actionTitle', '批量修改状态 / 优先级 / 负责人')}
          className="text-accent-blue"
        >
          <SlidersHorizontal className="size-3.5" /> {t('task.batchUpdate.action', '批量修改')}
        </ListActionButton>
        <ListActionButton
          onClick={() => handleDispatchSelected(selected, close)}
          disabled={!selected.some((task) => task.projectId)}
          title={t('taskDetail.dispatchAi')}
          className="text-accent-purple"
        >
          <BotIcon className="size-3.5" /> {t('taskDetail.dispatchAi')}
        </ListActionButton>
        <ListActionButton
          onClick={async () => {
            const ok = await confirmAction({
              title: t('task.selection.confirmTitle', { count: selected.length }),
              description: t('task.selection.confirmDescription'),
              confirmText: t('task.selection.confirmText'),
              cancelText: t('task.selection.cancelText'),
              variant: 'destructive',
            });
            if (!ok) return;
            await Promise.allSettled(selected.map((task) => deleteTask.mutateAsync(task.id)));
            close();
            refetch();
          }}
          title={t('common.delete')}
          className="text-destructive"
        >
          <Trash2 className="size-3.5" /> {t('common.delete')}
        </ListActionButton>
      </>
    ),
    [t, handleDispatchSelected, confirmAction, deleteTask, refetch],
  );

  // P2-17：翻页（页码窗口 >7 页折叠省略号，与项目列表页同形态）
  const handlePageChange = useCallback(
    (nextPage: number) => {
      if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
      setPage(nextPage);
    },
    [page, totalPages],
  );

  const pageNumbers = useMemo<(number | 'ellipsis')[]>(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | 'ellipsis')[] = [1];
    if (page > 3) pages.push('ellipsis');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      if (!pages.includes(i)) pages.push(i);
    }
    if (page < totalPages - 2) pages.push('ellipsis');
    if (totalPages > 1) pages.push(totalPages);
    return pages.filter((p, i, arr) => p !== 'ellipsis' || arr[i - 1] !== 'ellipsis');
  }, [page, totalPages]);

  return (
    <PageShell aiPage="task.tasks-list" className="overflow-hidden">
      {/* Header */}
      <PageHeader
        aiId="task.tasks-list"
        title={t("task.title")}
        icon={ISSUE_ENTITY.icon}
        iconColor={TONE_TEXT_CLASS[ISSUE_ENTITY.tone]}
        // P1-16/P2-17：计数如实标注——筛选生效时为「当前显示」（本页命中数）；
        // 无筛选时为「第 x–y 条 / 共 total」（total 为服务端全量真相，随翻页更新）
        metrics={[{
          id: 'total',
          label: hasActiveFilters ? t('task.stats.showingFiltered', '当前显示') : t('task.title'),
          value: hasActiveFilters
            ? filteredTasks.length
            : totalCount > 0
              ? t('task.pagination.range', '第 {{from}}–{{to}} 条 · 共 {{total}} 条', {
                  from: pageFrom,
                  to: pageTo,
                  total: totalCount,
                })
              : 0,
        }]}
        actions={
          <>
            <QuickCardsToggle
              visible={statsCards.visible}
              onToggle={statsCards.toggle}
              label={t('task.showStats', 'Stats')}
              activeLabel={t('task.hideStats', 'Hide stats')}
              aiId="task.tasks-list.stats-toggle"
            />
            <HeaderActionButton
              variant="outline"
              icon={Upload}
              label={t('task.import.action', '导入')}
              title={t('task.import.actionTitle', '从 CSV 导入工单（未限定项目时导入收件箱）')}
              onClick={() => setImportOpen(true)}
            />
            <HeaderActionButton
              icon={Plus}
              label={t("task.create")}
              onClick={() => setShowCreateDialog(true)}
              data-ai-component="task.tasks-list.new-button"
              data-ai-action="task.tasks-list.new-button.click"
              data-ai-role="submit"
            />
          </>
        }
      />

      {/* Unified Create Dialog */}
      <UnifiedCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        defaultType="task"
        defaultAssigneeId={presetAssigneeId}
        onSuccess={(type, id) => {
          console.log(`Created ${type} with id: ${id}`);
          refetch();
        }}
      />

      {/* AI Dispatch Dialog（单条或批量，P0-5） */}
      {dispatch && (
        <AiAssignDialog
          open
          onOpenChange={(open) => { if (!open) setDispatch(null); }}
          issueId={dispatch.issues[0].id}
          projectId={dispatch.projectId}
          taskTitle={dispatch.issues[0].title}
          issues={dispatch.issues.length > 1 ? dispatch.issues : undefined}
          onSuccess={() => { setDispatch(null); refetch(); }}
        />
      )}

      {/* Batch Update Dialog（P1-12：批量改状态/优先级/负责人，逐条 PATCH + 汇总 toast） */}
      {batchUpdateIssues && (
        <BatchUpdateIssuesDialog
          open
          onOpenChange={(open) => { if (!open) setBatchUpdateIssues(null); }}
          issues={batchUpdateIssues}
          onCompleted={() => refetch()}
        />
      )}

      {/* Export Dialog（P1-15/P2-17：后端 /issues/export 为项目级端点，全局视图前端导出
          当前页的筛选结果——范围文案随分页如实标注，翻页后可再次导出其余数据） */}
      <GlobalTaskExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        tasks={filteredTasks}
        getProjectName={getProjectName}
        scopeNote={t(
          'task.pagination.exportScope',
          '导出范围：当前页中的筛选结果（{{count}} 条）——与列表当前的搜索、筛选和排序一致，不含其他页数据。',
          { count: filteredTasks.length },
        )}
        pageNote={
          totalPages > 1
            ? t(
                'task.pagination.exportPageNote',
                '当前为第 {{page}} / {{totalPages}} 页，导出仅含本页数据；如需其余数据请翻页后再次导出。',
                { page, totalPages },
              )
            : undefined
        }
      />

      {/* Import Dialog（P1-15：复用项目任务页导入对话框，projectId 不限定 → 收件箱） */}
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />

      {/* Stats Cards（默认隐藏，header 幽灵按钮切换） */}
      {statsCards.visible ? (
        <div className="border-b border-border bg-background px-6 py-4">
          <StatsCard
          items={[
            { key: 'total', value: (tasksData?.meta?.total ?? filteredTasks.length), label: t("task.stats.total"), icon: ListTodo, ...STATS_THEMES.blue },
            // 状态图标统一取 status-visuals.TASK_STATUS_VISUALS（唯一映射源，规范 v0 对齐）
            { key: 'todo', value: allTasks.filter(task => task.status === 'todo').length, label: t("task.stats.todo"), icon: TASK_STATUS_VISUALS.todo.icon, ...STATS_THEMES.default },
            { key: 'inProgress', value: allTasks.filter(task => task.status === 'in_progress').length, label: t("task.stats.inProgress"), icon: TASK_STATUS_VISUALS.in_progress.icon, ...STATS_THEMES.yellow },
            { key: 'inReview', value: allTasks.filter(task => task.status === 'in_review').length, label: t("task.stats.inReview") , icon: TASK_STATUS_VISUALS.in_review.icon, ...STATS_THEMES.purple },
            { key: 'done', value: allTasks.filter(task => task.status === 'done').length, label: t("task.stats.done"), icon: TASK_STATUS_VISUALS.done.icon, ...STATS_THEMES.green },
            { key: 'canceled', value: allTasks.filter(task => task.status === 'canceled').length, label: t("task.stats.canceled") , icon: TASK_STATUS_VISUALS.canceled.icon, ...STATS_THEMES.gray },
          ]}
          columns={6}
          className="grid grid-cols-6 gap-3"
        />
        </div>
      ) : null}

      {/* Toolbar: 已保存视图 + 视图样式 + 筛选/显示/下载 */}
      <ToolbarRow
        aiId="task.tasks-list"
        views={toolbar.views}
        activeViewId={toolbar.activeViewId}
        onSelectView={toolbar.selectView}
        onCreateView={toolbar.createView}
        onUpdateView={toolbar.updateView}
        onDeleteView={toolbar.deleteView}
        isDirty={toolbar.isDirty}
        onSaveCurrentView={toolbar.saveCurrentToActive}
        viewStyle={{
          value: viewMode,
          layout: 'centered',
          onChange: (v) => {
            setViewMode(v as ViewMode);
            // board 视图不支持 no grouping，切入时兜底为按状态分组
            if (v === 'board' && groupBy === 'none') setGroupBy('status');
          },
          options: [
            { value: 'list', label: t('viewDisplay.views.list', 'List'), icon: List },
            { value: 'board', label: t('viewDisplay.views.board', 'Board'), icon: Kanban },
            { value: 'gantt', label: t('viewDisplay.views.gantt', 'Gantt'), icon: CalendarRange },
            { value: 'table', label: t('viewDisplay.views.table', 'Table'), icon: TableProperties },
          ],
        }}
        filterMenu={{
          render: () => (
            <FilterCascadeMenu
              aiId="task.tasks-list.filter-menu"
              fields={filterFields}
              conditions={conditions}
              onChange={setConditions}
              badge={conditions.filter((c) => c.values.length > 0).length}
              search={{ value: search, onChange: setSearch, placeholder: t('task.filter.searchPlaceholder') }}
            />
          ),
        }}
        actions={
          <button
            type="button"
            onClick={toggleAiFilter}
            aria-pressed={isAiFiltering}
            className={cn(
              "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-all select-none shadow-2xs",
              isAiFiltering
                ? "border border-accent-purple bg-accent-purple text-white shadow-xs font-semibold"
                : totalActiveAiCount > 0
                  ? "border border-accent-purple/40 bg-accent-purple/10 text-accent-purple hover:bg-accent-purple/20"
                  : "border border-border/60 bg-card text-muted-foreground hover:border-accent-purple/30 hover:text-foreground",
            )}
            title={
              isAiFiltering
                ? t("viewDisplay.aiFilter.cancelFilterTooltip", "点击取消筛选 AI 执行任务")
                : t("viewDisplay.aiFilter.filterTooltip", "点击一键筛选正在 AI 执行的任务")
            }
          >
            <BotIcon className={cn("size-3.5", totalActiveAiCount > 0 && !isAiFiltering && "animate-pulse")} />
            <span>
              {totalActiveAiCount > 0
                ? t("viewDisplay.aiFilter.executingCount", { count: totalActiveAiCount })
                : t("viewDisplay.aiFilter.executing", "AI 执行中")}
              {isAiFiltering ? ` (${t("viewDisplay.aiFilter.filtered", "已筛选")})` : ""}
            </span>
          </button>
        }
        displayMenu={{
          displayConfig: {
            viewMode,
            onViewModeChange: (v) => {
              setViewMode(v as ViewMode);
              if (v === 'board' && groupBy === 'none') setGroupBy('status');
            },
            viewOptions: [
              { value: 'list', label: t('viewDisplay.views.list', 'List'), icon: List },
              { value: 'board', label: t('viewDisplay.views.board', 'Board'), icon: Kanban },
              { value: 'gantt', label: t('viewDisplay.views.gantt', 'Gantt'), icon: CalendarRange },
              { value: 'table', label: t('viewDisplay.views.table', 'Table'), icon: TableProperties },
            ],
            groupBy,
            onGroupByChange: (g) => setGroupBy(g as GroupBy),
            groupByOptions: [
              ...(viewMode !== 'board' ? [{ value: 'none', label: t('viewDisplay.groupOptions.none', 'No grouping') }] : []),
              { value: 'status', label: t('viewDisplay.groupOptions.status', 'Status') },
              { value: 'severity', label: t('viewDisplay.groupOptions.severity', 'Severity') },
              { value: 'project', label: t('viewDisplay.groupOptions.project', 'Project') },
            ],
            orderBy,
            onOrderByChange: setOrderBy,
            // P1-14：Ordering 选项与表格可排序列同源（表头点击会写入同一状态）
            orderByOptions: Object.entries(SORTABLE_COLUMN_LABELS).map(([value, fallback]) => ({
              value,
              label: t(`viewDisplay.orderOptions.${value}`, fallback),
            })),
            orderDirection,
            onOrderDirectionToggle: () => setOrderDirection((prev) => (prev === 'asc' ? 'desc' : 'asc')),
            completedFilter,
            onCompletedFilterChange: setCompletedFilter,
            showSubIssues,
            onShowSubIssuesChange: setShowSubIssues,
            showEmptyGroups,
            onShowEmptyGroupsChange: setShowEmptyGroups,
            displayProperties,
            onToggleDisplayProperty: (key) =>
              setDisplayProperties((prev) => ({ ...prev, [key]: !prev[key] })),
            // P1-14：chips 键集与表格列映射对齐（milestone/links/timeInStatus 无对应列，不再展示假开关）
            availableProperties: TASK_TABLE_PROPERTY_KEYS.map((key) => ({
              key,
              label: DISPLAY_PROPERTY_LABELS[key] ?? key,
            })),
          },
        }}
        downloadMenu={{
          items: [
            { type: 'label', label: t('task.export.label', 'Export') },
            // P1-15：导出真正可用——范围 = 当前筛选结果（对话框内明示条数与口径）
            { id: 'csv', type: 'item', label: 'CSV', onSelect: () => setExportOpen(true) },
            { id: 'json', type: 'item', label: 'JSON', onSelect: () => setExportOpen(true) },
          ],
        }}
      />

      {/* 筛选条件条（Linear 形态，单开一行；有条件才占行） */}
      {conditions.length > 0 ? (
        <FilterChipsRow
          aiId="task.tasks-list.filter-chips"
          className="mx-6 mb-2 md:mx-7"
          fields={filterFields}
          conditions={conditions}
          onChange={setConditions}
          onSaveToView={() => updateActiveSnapshot({ search, conditions, viewMode, groupBy })}
          onSaveAsNewView={(name) => toolbar.createView(name)}
        />
      ) : null}

      {/* Content：空态由页面统一接管（页面层级标准）——工单池为空走 A 类整页空态，
          筛选后为空走 C 类紧凑空态；四视图不再各自维护空态形态。
          错误态优先于一切空态：请求失败时不得渲染「暂无任务」误导用户（与 bugs-page 同形态） */}
      <div className="flex-1 overflow-auto px-6 py-4 sm:px-8 sm:py-5 lg:px-10">
        {isError ? (
          <AsyncState
            error={error instanceof Error ? error.message : String(error)}
            onRetry={() => refetch()}
          >
            {null}
          </AsyncState>
        ) : !isLoading && allTasks.length === 0 ? (
          <EmptyState
            variant="page"
            visual={
              <IconStack aria-hidden="true" className={TONE_TEXT_CLASS[ISSUE_ENTITY.tone]}>
                <ISSUE_ENTITY.icon className={cn('size-4', TONE_TEXT_CLASS[ISSUE_ENTITY.tone])} />
              </IconStack>
            }
            title={t('task.empty.none', '暂无任务')}
            description={t('task.empty.noneDesc', '创建第一个任务，或从需求承接管道拆解生成')}
            action={
              <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                <Plus className="size-4" />
                {t('task.create')}
              </Button>
            }
          />
        ) : !isLoading && filteredTasks.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={t('task.empty.filtered', '未找到匹配的任务')}
            description={t('task.empty.filteredDesc', '换个关键词，或清除筛选条件再试')}
            action={
              hasActiveFilters ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setConditions([]);
                    setCompletedFilter('all');
                  }}
                >
                  {t('common.clearFilters', '清除筛选')}
                </Button>
              ) : undefined
            }
          />
        ) : (
        // key={page}：翻页重挂载视图，多选选中集随翻页明确清空（不做跨页选择）
        <div key={page} className="w-full">
          {viewMode === 'list' ? (
            <TaskSimpleList
              tasks={filteredTasks}
              loading={isLoading}
              onTaskClick={handleTaskClick}
              groupBy={groupBy}
              getProjectName={getProjectName}
              getAiExecution={getIssueExecution}
              onGroupCreate={() => setShowCreateDialog(true)}
              selectionActions={buildSelectionActions}
            />
          ) : viewMode === 'board' ? (
            <TasksBoardView
              tasks={filteredTasks}
              loading={isLoading}
              groupBy={groupBy === 'none' ? 'status' : groupBy}
              projects={projects}
              onTaskClick={handleTaskClick}
              getAiExecution={getIssueExecution}
              onDispatchTask={(task, projectId) =>
                setDispatch({ projectId, issues: [{ id: task.id, title: task.title }] })
              }
              onMoveTask={(task, data) => updateTask.mutate({ issueId: task.id, data })}
            />
          ) : viewMode === 'gantt' ? (
            <TaskGantt
              tasks={filteredTasks}
              onTaskClick={handleTaskClick}
              getAiExecution={getIssueExecution}
              onDateRangeChange={(issueId, range) =>
                updateTask
                  .mutateAsync({
                    issueId,
                    data: {
                      startDate: range.startDate,
                      dueDate: range.dueDate,
                    },
                  })
                  .then(() => undefined)
              }
            />
          ) : (
            <TaskTableView
              tasks={filteredTasks}
              loading={isLoading}
              onTaskClick={handleTaskClick}
              getAiExecution={getIssueExecution}
              getProjectName={getProjectName}
              // P1-14：列显隐与排序收口在页面级，表头点击经 onSortChange 回写同一状态
              displayProperties={displayProperties}
              sorting={{ orderBy, orderDirection }}
              onSortChange={(nextOrderBy, nextDirection) => {
                setOrderBy(nextOrderBy);
                setOrderDirection(nextDirection);
              }}
              selectionActions={buildSelectionActions}
            />
          )}
        </div>
        )}
      </div>

      {/* P2-17：分页栏——左侧如实条数区间（筛选生效时附作用域说明），右侧页码窗口 + 上/下页 */}
      {!isLoading && totalCount > 0 ? (
        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-border px-6 py-2 md:px-7">
          <p className="text-xs text-muted-foreground">
            {t('task.pagination.range', '第 {{from}}–{{to}} 条 · 共 {{total}} 条', {
              from: pageFrom,
              to: pageTo,
              total: totalCount,
            })}
            {hasActiveFilters ? ` · ${t('task.pagination.filterScopeNote', '筛选仅作用于当前页')}` : ''}
          </p>
          {totalPages > 1 ? (
            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    text={t('task.pagination.prev', '上一页')}
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(page - 1);
                    }}
                    className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                {pageNumbers.map((p, i) =>
                  p === 'ellipsis' ? (
                    <PaginationItem key={`ellipsis-${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={p}>
                      <PaginationLink
                        href="#"
                        isActive={p === page}
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(p);
                        }}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    text={t('task.pagination.next', '下一页')}
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(page + 1);
                    }}
                    className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          ) : null}
        </div>
      ) : null}

      </PageShell>
  );
}

// Board View Component（基于通用 BoardView，支持状态/严重度/项目动态分组与拖拽）
function TasksBoardView({
  tasks,
  groupBy,
  projects,
  onTaskClick,
  getAiExecution,
  onDispatchTask,
  onMoveTask,
  loading,
}: {
  tasks: Task[];
  groupBy: GroupBy;
  projects: { id: string; name: string }[];
  loading?: boolean;
  onTaskClick: (task: Task) => void;
  getAiExecution?: (task: Task) => ActiveAiExecution | null;
  onDispatchTask?: (task: Task, projectId: string) => void;
  onMoveTask?: (task: Task, data: { status?: string; severity?: Task['severity'] }) => void;
}) {
  const { t } = useTranslation();
  // list 与 kanban 共享右键菜单：与 TaskSimpleList 同源构建（useIssueRowMenu 默认 task 域）
  const onItemContextMenu = useIssueRowMenu();
  // 类型图标解析（看板卡行1：统一工单视图下区分 task/bug/自定义类型）
  const issueTypeOf = useIssueTypeOf();

  const columns = useMemo<BoardColumnDef[]>(() => {
    switch (groupBy) {
      case 'status':
        return getTaskStatusColumns(t);
      case 'severity':
        return getSeverityColumns(t);
      case 'project':
        return getProjectColumns(
          t,
          projects,
          tasks.map((task) => task.projectId || 'none'),
        );
      default:
        return [{ id: 'all', title: t('task.filter.all', 'All'), icon: ListTodo, color: 'muted' }];
    }
  }, [groupBy, projects, t, tasks]);

  const groupByFn = (task: Task): string => {
    switch (groupBy) {
      case 'status':
        return task.status || 'todo';
      case 'severity':
        return task.severity || 'low';
      case 'project':
        return task.projectId || 'none';
      default:
        return 'all';
    }
  };

  // 拖拽落库：status/severity 分组直接更新对应字段；project 分组无对应更新接口，仅本地排序
  const handleItemMove =
    groupBy === 'status' || groupBy === 'severity'
      ? (task: Task, toColumnId: string) => {
          if (groupBy === 'status') {
            if (task.status !== toColumnId) onMoveTask?.(task, { status: toColumnId });
          } else if (task.severity !== toColumnId) {
            onMoveTask?.(task, { severity: toColumnId as Task['severity'] });
          }
        }
      : undefined;

  const card = {
    ...taskCardModel,
    row1: (task: Task) => taskCardRow1(task, t, issueTypeOf(task)),
    isAiExecuting: (task: Task) => !!getAiExecution?.(task)?.isExecuting,
    aiExecutionNode: (task: Task) => {
      const ai = getAiExecution?.(task);
      if (!ai) return null;
      return <AiExecutionBadge execution={ai} size="xs" variant="line" />;
    },
    row3: (task: Task) => (
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">{taskCardRow3(task)}</div>
        {task.projectId && onDispatchTask ? (
          <button
            type="button"
            className="shrink-0 rounded p-1 text-accent-purple transition-colors hover:bg-accent-purple/20"
            onClick={(event) => {
              event.stopPropagation();
              onDispatchTask(task, task.projectId!);
            }}
            title={t('task.dispatchToAi')}
          >
            <BotIcon size={12} />
          </button>
        ) : null}
      </div>
    ),
  };

  return (
    <BoardView<Task>
      className="h-full"
      columns={columns}
      items={tasks}
      loading={loading}
      groupBy={groupByFn}
      card={card}
      onItemMove={handleItemMove}
      onItemClick={(task) => onTaskClick(task)}
      onItemContextMenu={onItemContextMenu}
    />
  );
}
