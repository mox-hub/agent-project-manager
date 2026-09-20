import { useExecutionRuns } from '@/modules/executions/api/execution-api';
import { useRepositories } from '@/modules/git/hooks/use-repositories';
import { useAllTasks } from '@/modules/issue/hooks/use-project-tasks';
import { useAcceptanceList } from '@/modules/acceptance/hooks/use-acceptance';
import { useReleases } from '@/modules/release/hooks/use-releases';
import { useDocumentStats } from '@/modules/document/hooks/use-documents';
import { PIPELINE_STAGES } from '@/shared/layout/pipeline-stages';

/**
 * 六站管道泳道（ARCH-AISURFACE-001 §3.1「中：六站管道泳道」/ §4.7 不造第二套数据口径）。
 *
 * ## 站清单不在此处定义
 *
 * 六站的顺序、路由、文案一律从 **`PIPELINE_STAGES`**（`shared/layout/pipeline-stages.ts`）
 * 派生——那是 CAP-A-15 定下的唯一定义源（其文件头明确「实验位（ai-surface）不得入列」，
 * 即 ai-surface 只能**消费**这条管道、不得往里面加站点）。本模块只负责往每个站上挂
 * 真实计数，**不重写一份六站字面量**。
 *
 * ## 诚实粒度（本模块的核心约束）
 *
 * 1. **`count: null` ≠ 0**。null 表示「没有可用的计数口径」或「尚未取到」，UI 必须
 *    显示破折号。把未知渲染成 0 会让「查不到」读成「一条都没有」。
 * 2. **`blocked: null` ≠ 0**，且必须带上 `blockedNote` 说明**为什么**没有——
 *    静默省略阻塞数会被读成「无阻塞」，恰恰是最危险的误读。
 * 3. **不推算**：站点计数只取自服务端已算好的 total / byCategory，或「无分页端点的
 *    数组长度」（等价全量）。绝不由页面长度、状态分布反推总量。
 * 4. **样本外不冒充全量**：唯一带窗口的站（执行记录）若窗口未覆盖全部，
 *    阻塞数标注 `blockedNote` 说明是窗口内计数。
 *
 * ## 逐站口径（含为什么某些站没有阻塞数）
 *
 * | 站 | 计数来源 | 阻塞 | 阻塞为何缺席 |
 * |----|---------|------|-------------|
 * | 01 需求承接 | `GET /documents/stats` 的 `byCategory.requirement + analysis` | — | Document 无阻塞字段 |
 * | 02 任务 | `GET /issues/all` 的 `meta.total` | — | `blockedBy` 只在详情 DTO，列表接口不返回 |
 * | 03 仓库 | `GET /git/repos` 数组长度（无分页） | — | Repository 无阻塞字段 |
 * | 04 执行记录 | `GET /execution/runs` 的 `total` | ✅ `status === 'blocked'` | 窗口未全覆盖时标注 |
 * | 05 质量验收 | `GET /acceptance` 的 `meta.total` | — | 列表只返回当前页，`blockedItems` 不足以算总量 |
 * | 06 发版交付 | `GET /releases` 数组长度（无分页，列表即含 gateResult） | ✅ `gateResult.passed === false` | — |
 */

export interface PipelineLane {
  stageNumber: string;
  to: string;
  label: string;
  hint: string;
  /** null = 无计数口径或未就绪（**不是 0**） */
  count: number | null;
  /** null = 无阻塞口径或未就绪（**不是 0**） */
  blocked: number | null;
  /** 当 blocked 为 null 时，说明**为什么**——静默省略会被读成"无阻塞" */
  blockedNote?: string;
  /** 阻塞数为窗口内计数时的说明 */
  blockedScopeNote?: string;
  /** 溯源：这一格数字来自哪个端点（§3.1「你这数字哪来的」） */
  source: string;
}

/** 泳道的原始输入；一律 `undefined` 表示未就绪，**绝不用 0 兜底** */
export interface LaneInputs {
  documentByCategory?: Record<string, number>;
  issueTotal?: number;
  repositories?: readonly unknown[];
  executionTotal?: number;
  executionRunStatuses?: readonly string[];
  acceptanceTotal?: number;
  releases?: readonly { gateResult?: { passed?: boolean } | null }[];
}

/** 每站无阻塞口径时的解释文案（保持与上面的口径表一致）*/
const NO_BLOCKED_STANDARD = {
  intake: 'Document 无阻塞字段',
  issues: '列表接口不返回 blockedBy（仅详情有）',
  repositories: 'Repository 无阻塞字段',
  acceptance: '验收列表只返回当前页，blockedItems 不足以算总量',
} as const;

/**
 * 每站「无阻塞口径」的解释文案，按站点路由索引。
 *
 * 导出它是因为**回放的剧本帧也长在同一个泳道上**（S5）：帧里只需给该站有没有
 * 阻塞口径，措辞一律取此处——否则同一个站会在实况里说「Repository 无阻塞字段」、
 * 在回放里说另一句意思相近的话，两块界面看起来就开始有差异了。
 */
export const LANE_NO_BLOCKED_NOTE: Record<string, string> = {
  '/app/intake': NO_BLOCKED_STANDARD.intake,
  '/app/issues': NO_BLOCKED_STANDARD.issues,
  '/app/repositories': NO_BLOCKED_STANDARD.repositories,
  '/app/acceptance': NO_BLOCKED_STANDARD.acceptance,
};

/** 执行记录的列表窗口：窗口未覆盖全部时，阻塞数只能标注为窗口内计数 */
export const EXECUTION_LANE_WINDOW = 100;

/**
 * 由各站真实数据派生泳道（**纯函数**，可单测）。
 * 站点清单与顺序来自 `PIPELINE_STAGES`，未知路由的站显示 null 计数。
 */
export function derivePipelineLanes(inputs: LaneInputs): PipelineLane[] {
  const byStage: Record<string, Omit<PipelineLane, 'stageNumber' | 'to' | 'label' | 'hint'>> = {
    '/app/intake': {
      count: inputs.documentByCategory
        ? (inputs.documentByCategory.requirement ?? 0) + (inputs.documentByCategory.analysis ?? 0)
        : null,
      blocked: null,
      blockedNote: NO_BLOCKED_STANDARD.intake,
      source: 'GET /documents/stats',
    },
    '/app/issues': {
      count: inputs.issueTotal ?? null,
      blocked: null,
      blockedNote: NO_BLOCKED_STANDARD.issues,
      source: 'GET /issues/all · meta.total',
    },
    '/app/repositories': {
      count: inputs.repositories ? inputs.repositories.length : null,
      blocked: null,
      blockedNote: NO_BLOCKED_STANDARD.repositories,
      source: 'GET /git/repos（无分页，长度即全量）',
    },
    '/app/executions': {
      count: inputs.executionTotal ?? null,
      ...deriveExecutionBlocked(inputs),
      source: 'GET /execution/runs · total',
    },
    '/app/acceptance': {
      count: inputs.acceptanceTotal ?? null,
      blocked: null,
      blockedNote: NO_BLOCKED_STANDARD.acceptance,
      source: 'GET /acceptance · meta.total',
    },
    '/app/releases': {
      count: inputs.releases ? inputs.releases.length : null,
      // 发布列表无分页且每条都带 gateResult → 该计数是**全量**的
      blocked: inputs.releases
        ? inputs.releases.filter((r) => r.gateResult && r.gateResult.passed === false).length
        : null,
      source: 'GET /releases（无分页，列表含 gateResult）',
    },
  };

  return PIPELINE_STAGES.map((stage) => {
    const lane = byStage[stage.to];
    return {
      stageNumber: stage.stageNumber,
      to: stage.to,
      // 站清单的文案取自唯一定义源的 fallback；ai-surface 无 i18n，故不另起翻译管道
      label: stage.labelFallback,
      hint: stage.hintFallback,
      count: lane?.count ?? null,
      blocked: lane?.blocked ?? null,
      blockedNote: lane?.blockedNote,
      blockedScopeNote: lane?.blockedScopeNote,
      source: lane?.source ?? '未接入计数口径',
    };
  });
}

function deriveExecutionBlocked(
  inputs: LaneInputs,
): Pick<PipelineLane, 'blocked' | 'blockedNote' | 'blockedScopeNote'> {
  const statuses = inputs.executionRunStatuses;
  if (!statuses || inputs.executionTotal == null) {
    return { blocked: null, blockedNote: '执行记录未就绪' };
  }
  const blocked = statuses.filter((status) => status === 'blocked').length;
  // 窗口覆盖全部记录时该计数即全量；否则只能算窗口内，必须标注，不能冒充全量
  const complete = statuses.length >= inputs.executionTotal;
  return complete
    ? { blocked, blockedScopeNote: undefined }
    : { blocked, blockedScopeNote: `列表窗口内（${statuses.length}/${inputs.executionTotal}）` };
}

/**
 * 泳道数据。全部复用各站**既有** hook / 端点——不新增数据源、不改服务端。
 *
 * 计数一律用小页请求真值（`pageSize: 1` 只取 `meta.total`），而不是把 pageSize
 * 调到很大再数数组长度：前者传 1 行、后者可能传上千行，且后者还会在超过上限时
 * 静默给错数。
 */
export function usePipelineLanes(projectId?: string): {
  lanes: PipelineLane[];
  isPending: boolean;
  isError: boolean;
} {
  const docStats = useDocumentStats(projectId);
  const issues = useAllTasks({ pageSize: 1 });
  const repositories = useRepositories(projectId ? { projectId } : undefined);
  const executions = useExecutionRuns({
    projectId,
    limit: EXECUTION_LANE_WINDOW,
  });
  const acceptances = useAcceptanceList({ projectId, page: 1, pageSize: 1 });
  const releases = useReleases(projectId);

  const lanes = derivePipelineLanes({
    documentByCategory: docStats.data?.byCategory,
    issueTotal: issues.data?.meta?.total,
    repositories: repositories.data,
    executionTotal: executions.data?.total,
    executionRunStatuses: executions.data?.runs?.map((run) => run.status),
    acceptanceTotal: acceptances.data?.meta?.total,
    releases: releases.data,
  });

  const queries = [docStats, issues, repositories, executions, acceptances, releases];

  return {
    lanes,
    // 六站里有任意一站未就绪就算「尚未齐全」——泳道会据此标注，而不是假装已经全了
    isPending: queries.some((q) => q.isPending),
    isError: queries.some((q) => q.isError),
  };
}
