import { DomainEventTypes } from '@apm/shared/events/domain-events';
import type { OfficeColleague } from '@/modules/office/api/office-api';
import type { Decision } from '@/shared/decision-card/types';
import type { Screenplay, ScreenplayFrame, ScreenplayLaneFacts } from '../screenplay-format';
import { SCREENPLAY_FORMAT_VERSION } from '../screenplay-format';

/**
 * 剧本「从一句话到交付」（ARCH-AISURFACE-001 §3.4 路径 A）。
 *
 * ## 这个剧本要讲的一件事
 *
 * 让**没写过代码的人**在 90 秒里看懂这条管道在干什么，以及**他本人在哪一步才需要出现**。
 * 全片人类只做一个动作：「点头」。这不是把人的作用说小了——正是要让人看见
 * 「你只在必须由人负责的那一刻出现，其余由 AI 同事代劳、由门禁把关」。
 *
 * ## 为什么这条演示不需要 runtime、不需要 API key
 *
 * 剧本是**已经发生过的事的复述**（预置快照），不是现场跑出来的。故本文件里
 * 一个"将来会发生"的字段都没有：帧内全是已发生事实，`atMs` 只是它们在时间轴上的位置。
 *
 * ## 事件名一律取 `DomainEventTypes`
 *
 * 不写字符串字面量。剧本里写错一个事件名的表现是**那一帧的进展行凭空少一条**，
 * 与"这一步本来就没进展"完全一样——用常量至少能在改事件名时被编译器抓到一处。
 */

/** 剧本起点：故事发生的那一天 09:00（UTC）。帧内 `atMs` 相对它偏移 */
const STORY_AT = '2026-09-10T09:00:00.000Z';
const STORY_AT_MS = Date.parse(STORY_AT);

const iso = (offsetMs: number) => new Date(STORY_AT_MS + offsetMs).toISOString();

/** 本次演示里唯一那次执行——工位卡的进展靠它对齐（`subjectId === currentRun.id`） */
const RUN_ID = 'run-export-1';
const PROJECT_ID = 'sample-project-1';
const PROJECT_NAME = '示例项目：Agent Project Manager';

/** 同事档案：同一份底稿在多帧之间复用，只覆盖当帧变化的部分 */
function colleague(
  over: Partial<OfficeColleague> & Pick<OfficeColleague, 'memberId' | 'displayName'>,
): OfficeColleague {
  return {
    title: 'AI 同事',
    trustScore: 80,
    status: 'idle',
    blocking: 0,
    advisory: 0,
    capacity: {
      activeRuns: 0,
      capacityLimit: 5,
      loadPct: 0,
      weeklyTokens: 0,
      weeklyCostUsd: 0,
      acceptability: 'available',
    },
    currentRun: null,
    ...over,
  };
}

/** 拆解者的档案（小规）：变化少，抽一个底稿 */
const xiaogui = (over: Partial<OfficeColleague> = {}) =>
  colleague({
    memberId: 'ai-2',
    displayName: '小规',
    title: '需求分析师',
    trustScore: 92,
    ...over,
  });

/** 执行者的档案（小码）：全片主角，逐帧给它不同状态 */
const xiaoma = (over: Partial<OfficeColleague> = {}) =>
  colleague({
    memberId: 'ai-1',
    displayName: '小码',
    title: '全栈工程师',
    trustScore: 88,
    ...over,
  });

/** 六站里"这一帧没提到"的站一律显式给 0/口径说明——快照语义下不许缺键 */
function lanes(byStage: Partial<Record<string, ScreenplayLaneFacts>>): Record<string, ScreenplayLaneFacts> {
  const base: Record<string, ScreenplayLaneFacts> = {
    '/app/intake': { count: 0, blocked: null },
    '/app/issues': { count: 0, blocked: null },
    '/app/repositories': { count: 0, blocked: null },
    '/app/executions': { count: 0, blocked: 0 },
    '/app/acceptance': { count: 0, blocked: null },
    '/app/releases': { count: 0, blocked: 0 },
  };
  return { ...base, ...byStage };
}

/** 本次演示的那条待验收（唯一一次要人拍板的事） */
const acceptanceDecision: Decision = {
  id: 'acceptance:acc-export-1',
  kind: 'acceptance',
  sourceId: 'acc-export-1',
  status: 'pending',
  title: '待验收：报销单支持一键导出 Excel',
  detail: '小码已完成受理，自动检查通过，等待人工确认交付',
  urgency: 'blocking',
  projectId: PROJECT_ID,
  projectName: PROJECT_NAME,
  issueId: 'issue-export-1',
  taskTitle: '报销单支持一键导出 Excel',
  proposer: { type: 'ai_agent', id: 'ai-1', name: '小码' },
  payload: {
    completionType: 'auto_check_passed',
    priority: 'high',
    completionEvidence: {
      executionRunId: RUN_ID,
      state: 'completed',
      capturedAt: iso(58_000),
      artifacts: [
        { name: 'src/modules/expense/export-reimbursement.ts', type: 'file' },
        { name: '报销单导出逻辑 + 12 条单测', type: 'summary' },
      ],
      autoChecks: {
        kind: 'test',
        valid: true,
        passed: 12,
        failed: 0,
        total: 12,
        checkedAt: iso(57_000),
      },
    },
  },
  createdAt: iso(56_000),
};

const frames: ScreenplayFrame[] = [
  // ── 01 需求承接 ────────────────────────────────────────────────
  {
    atMs: 0,
    stageNumber: '01',
    title: '销售同事丢来一句话：「报销单要能一键导出 Excel」',
    narration: {
      headline: '刚收到一条新需求。它现在还是一句话，没有人知道"做成什么样才算做完"。',
      highlights: [],
      blockers: [],
      needsYou: [],
      honestGaps: [
        '这还是一句话需求，没有验收标准——不写清楚"什么样算做对"，做完也没人能确认',
      ],
      source: 'ai',
    },
    lanes: lanes({ '/app/intake': { count: 1, blocked: null } }),
    colleagues: [xiaogui(), xiaoma()],
    events: [],
    decisions: [],
  },
  {
    atMs: 8_000,
    stageNumber: '01',
    title: '小规把它拆成 3 张工单，并逐张写好验收条件',
    narration: {
      headline: '小规把这句话拆成了 3 张工单，每张都写清了"什么样算做完"。',
      highlights: ['需求承接里多了 1 份分析文档', '任务里多了 3 张带验收条件的工单'],
      blockers: [],
      needsYou: [],
      honestGaps: ['验收条件是小规写的，你还没看过——不想看也行，后面验收时它会逐条摆给你'],
      source: 'ai',
    },
    lanes: lanes({
      '/app/intake': { count: 1, blocked: null },
      '/app/issues': { count: 3, blocked: null },
    }),
    colleagues: [
      xiaogui({
        status: 'suggestions',
        // 拆解是"建议"而非"执行"：办公室口径里没有产出物就不算 working，
        // 这里如实放 suggestions，不为了好看抬成 working
        advisory: 1,
        capacity: {
          activeRuns: 0,
          capacityLimit: 5,
          loadPct: 0,
          weeklyTokens: 12_400,
          weeklyCostUsd: 0.9,
          acceptability: 'available',
        },
        lastRunAt: iso(-3_600_000),
      }),
      xiaoma(),
    ],
    events: [],
    decisions: [],
  },

  // ── 02 任务 → 03 仓库 ──────────────────────────────────────────
  {
    atMs: 18_000,
    stageNumber: '02',
    title: '3 张工单派给了小码，它开跑了',
    narration: {
      headline: '工单派给了小码，它已经开始干活。这一步之后不用你做什么，看就行。',
      highlights: ['小码手上有 1 件事在跑'],
      blockers: [],
      needsYou: [],
      honestGaps: ['"派给谁"是小规定的，不是你定的——不满意可以随时改'],
      source: 'ai',
    },
    lanes: lanes({
      '/app/intake': { count: 1, blocked: null },
      '/app/issues': { count: 3, blocked: null },
      '/app/executions': { count: 1, blocked: 0 },
    }),
    colleagues: [
      xiaogui({ status: 'idle', lastRunAt: iso(-3_600_000) }),
      xiaoma({
        status: 'working',
        capacity: {
          activeRuns: 1,
          capacityLimit: 5,
          loadPct: 20,
          weeklyTokens: 30_600,
          weeklyCostUsd: 2.4,
          acceptability: 'available',
        },
        currentRun: {
          id: RUN_ID,
          goal: '报销单支持一键导出 Excel',
          status: 'in_progress',
          taskTitle: '报销单支持一键导出 Excel',
          startedAt: iso(16_000),
        },
      }),
    ],
    events: [
      {
        eventName: DomainEventTypes.ExecutionRunCreated,
        payload: { executionRunId: RUN_ID, projectId: PROJECT_ID },
        atMs: 16_000,
      },
    ],
    decisions: [],
  },
  {
    atMs: 30_000,
    stageNumber: '03',
    title: '它在仓库里改代码：新增导出模块',
    narration: {
      headline: '小码正在改代码。进展是它自己报的，原文照登，我没有加工。',
      highlights: ['仓库里有 1 个代码库在配合这次执行'],
      blockers: [],
      needsYou: [],
      honestGaps: [
        '盯盘能看到的最细粒度是"它报了一条进展"，不是逐行日志——再细的通道目前没有',
      ],
      source: 'ai',
    },
    lanes: lanes({
      '/app/intake': { count: 1, blocked: null },
      '/app/issues': { count: 3, blocked: null },
      '/app/repositories': { count: 1, blocked: null },
      '/app/executions': { count: 1, blocked: 0 },
    }),
    colleagues: [
      xiaogui({ status: 'idle', lastRunAt: iso(-3_600_000) }),
      xiaoma({
        status: 'working',
        capacity: {
          activeRuns: 1,
          capacityLimit: 5,
          loadPct: 20,
          weeklyTokens: 34_100,
          weeklyCostUsd: 2.7,
          acceptability: 'available',
        },
        currentRun: {
          id: RUN_ID,
          goal: '报销单支持一键导出 Excel',
          status: 'in_progress',
          taskTitle: '报销单支持一键导出 Excel',
          startedAt: iso(16_000),
        },
      }),
    ],
    events: [
      {
        eventName: DomainEventTypes.ExecutionRunCreated,
        payload: { executionRunId: RUN_ID, projectId: PROJECT_ID },
        atMs: 16_000,
      },
      {
        eventName: DomainEventTypes.RuntimeExecutionEvent,
        payload: {
          executionRunId: RUN_ID,
          eventType: 'file_write',
          runtimeId: 'runtime-local-1',
          status: 'in_progress',
          summary: '正在新增 src/modules/expense/export-reimbursement.ts',
          timestamp: iso(29_500),
        },
        atMs: 29_500,
      },
    ],
    decisions: [],
  },

  // ── 04 执行记录 ────────────────────────────────────────────────
  {
    atMs: 44_000,
    stageNumber: '04',
    title: '它开始跑测试',
    narration: {
      headline: '代码写完了，小码在自己跑测试。跑完之前这件事还谈不上"完成"。',
      highlights: ['执行记录里那条跑动还在进行中'],
      blockers: [],
      needsYou: [],
      honestGaps: [],
      source: 'ai',
    },
    lanes: lanes({
      '/app/intake': { count: 1, blocked: null },
      '/app/issues': { count: 3, blocked: null },
      '/app/repositories': { count: 1, blocked: null },
      '/app/executions': { count: 1, blocked: 0 },
    }),
    colleagues: [
      xiaogui({ status: 'idle', lastRunAt: iso(-3_600_000) }),
      xiaoma({
        status: 'working',
        capacity: {
          activeRuns: 1,
          capacityLimit: 5,
          loadPct: 20,
          weeklyTokens: 36_800,
          weeklyCostUsd: 3.0,
          acceptability: 'available',
        },
        currentRun: {
          id: RUN_ID,
          goal: '报销单支持一键导出 Excel',
          status: 'in_progress',
          taskTitle: '报销单支持一键导出 Excel',
          startedAt: iso(16_000),
        },
      }),
    ],
    events: [
      {
        eventName: DomainEventTypes.ExecutionRunCreated,
        payload: { executionRunId: RUN_ID, projectId: PROJECT_ID },
        atMs: 16_000,
      },
      {
        eventName: DomainEventTypes.ExecutionStepUpdated,
        payload: {
          executionRunId: RUN_ID,
          stepId: 'step-test',
          stepName: '跑测试',
          status: 'in_progress',
        },
        atMs: 43_500,
      },
    ],
    decisions: [],
  },

  // ── 04 → 05：执行终态 + 待验收 ────────────────────────────────
  {
    atMs: 58_000,
    stageNumber: '04',
    title: '跑完了：12 条测试全过，花了 1.2k tokens',
    narration: {
      headline: '小码干完了。它自己报的结果是"测试全过"——我没有直接信它，把它原样摆在这里。',
      highlights: [
        '本次执行用了 1.2k tokens · $0.08',
        '自动检查 12 项全过',
        '质量验收里多了 1 件等你点头的事',
      ],
      blockers: [],
      needsYou: [
        { decisionId: 'acceptance:acc-export-1', oneLineWhy: '它说做完了，需要你确认这算不算做完', urgency: 'blocking' },
      ],
      honestGaps: [
        '"12 条测试全过"是小码自己报的，不是第三方核验的——门禁只能证明它跑过，不能证明它真的对',
      ],
      source: 'ai',
    },
    lanes: lanes({
      '/app/intake': { count: 1, blocked: null },
      '/app/issues': { count: 3, blocked: null },
      '/app/repositories': { count: 1, blocked: null },
      '/app/executions': { count: 1, blocked: 0 },
      '/app/acceptance': { count: 1, blocked: null },
    }),
    colleagues: [
      xiaogui({ status: 'idle', lastRunAt: iso(-3_600_000) }),
      xiaoma({
        // 手上有事等你拍板 → needYou（办公室口径里这是"停在这儿了"，与原意一致）
        status: 'needYou',
        blocking: 1,
        capacity: {
          activeRuns: 0,
          capacityLimit: 5,
          loadPct: 0,
          weeklyTokens: 37_900,
          weeklyCostUsd: 3.1,
          acceptability: 'available',
        },
        currentRun: {
          id: RUN_ID,
          goal: '报销单支持一键导出 Excel',
          status: 'completed',
          taskTitle: '报销单支持一键导出 Excel',
          startedAt: iso(16_000),
        },
        lastRunAt: iso(58_000),
      }),
    ],
    events: [
      {
        eventName: DomainEventTypes.ExecutionRunCreated,
        payload: { executionRunId: RUN_ID, projectId: PROJECT_ID },
        atMs: 16_000,
      },
      {
        eventName: DomainEventTypes.RuntimeExecutionResult,
        payload: {
          executionRunId: RUN_ID,
          status: 'completed',
          summary: '12 条单测全部通过，新增导出模块与对应测试',
          artifacts: [
            { type: 'file', ref: 'src/modules/expense/export-reimbursement.ts' },
            { type: 'test', ref: 'src/modules/expense/export-reimbursement.test.ts' },
          ],
          evidence: [{ type: 'test_report', ref: 'junit/export-reimbursement.xml' }],
          usage: {
            promptTokens: 8_400,
            completionTokens: 3_600,
            totalTokens: 12_000,
            costUsd: 0.08,
            model: 'claude-sonnet-5',
          },
          timestamp: iso(58_000),
        },
        atMs: 58_000,
      },
    ],
    decisions: [acceptanceDecision],
  },

  // ── 05 质量验收 ────────────────────────────────────────────────
  {
    atMs: 70_000,
    stageNumber: '05',
    title: '轮到你：看一眼证据，决定算不算做完',
    narration: {
      headline: '现在只差你一句话。证据已经摆好了：谁做的、跑了什么检查、产物在哪。',
      highlights: ['验收证据：执行记录 1 条 · 自动检查 12 项 · 产物 2 件'],
      blockers: [],
      needsYou: [
        { decisionId: 'acceptance:acc-export-1', oneLineWhy: '这是全片唯一需要你的地方：确认它真的做完了', urgency: 'blocking' },
      ],
      honestGaps: ['你若点"驳回"，这件事会退回给小码重做，而不是被悄悄标记成完成'],
      source: 'ai',
    },
    lanes: lanes({
      '/app/intake': { count: 1, blocked: null },
      '/app/issues': { count: 3, blocked: null },
      '/app/repositories': { count: 1, blocked: null },
      '/app/executions': { count: 1, blocked: 0 },
      '/app/acceptance': { count: 1, blocked: null },
    }),
    colleagues: [
      xiaogui({ status: 'idle', lastRunAt: iso(-3_600_000) }),
      xiaoma({
        status: 'needYou',
        blocking: 1,
        capacity: {
          activeRuns: 0,
          capacityLimit: 5,
          loadPct: 0,
          weeklyTokens: 37_900,
          weeklyCostUsd: 3.1,
          acceptability: 'available',
        },
        currentRun: {
          id: RUN_ID,
          goal: '报销单支持一键导出 Excel',
          status: 'completed',
          taskTitle: '报销单支持一键导出 Excel',
          startedAt: iso(16_000),
        },
        lastRunAt: iso(58_000),
      }),
    ],
    events: [
      {
        eventName: DomainEventTypes.ExecutionRunCreated,
        payload: { executionRunId: RUN_ID, projectId: PROJECT_ID },
        atMs: 16_000,
      },
      {
        eventName: DomainEventTypes.RuntimeExecutionResult,
        payload: {
          executionRunId: RUN_ID,
          status: 'completed',
          summary: '12 条单测全部通过，新增导出模块与对应测试',
          artifacts: [
            { type: 'file', ref: 'src/modules/expense/export-reimbursement.ts' },
          ],
          usage: {
            promptTokens: 8_400,
            completionTokens: 3_600,
            totalTokens: 12_000,
            costUsd: 0.08,
            model: 'claude-sonnet-5',
          },
          timestamp: iso(58_000),
        },
        atMs: 58_000,
      },
    ],
    decisions: [acceptanceDecision],
  },
  {
    atMs: 80_000,
    stageNumber: '05',
    title: 'AI 读盘临时失败——盯盘不会白屏，改用规则摘要',
    narration: {
      headline: 'AI 读盘暂时不可用。这句话是规则拼出来的，不是模型的判断——别把它当成 AI 的意见。',
      highlights: ['1 件待你拍板的事仍在队列里，没有因为读盘失败而消失'],
      blockers: [],
      needsYou: [
        { decisionId: 'acceptance:acc-export-1', oneLineWhy: '队列本身没坏，你的待办还是那一条', urgency: 'blocking' },
      ],
      honestGaps: ['这一屏的摘要由规则生成，信息量低于 AI 版本，但不含任何猜测'],
      // 全片唯一一帧降级：演示"AI 挂了盯盘也不白屏"这条承诺真的成立
      source: 'template',
    },
    lanes: lanes({
      '/app/intake': { count: 1, blocked: null },
      '/app/issues': { count: 3, blocked: null },
      '/app/repositories': { count: 1, blocked: null },
      '/app/executions': { count: 1, blocked: 0 },
      '/app/acceptance': { count: 1, blocked: null },
    }),
    colleagues: [
      xiaogui({ status: 'idle', lastRunAt: iso(-3_600_000) }),
      xiaoma({
        status: 'needYou',
        blocking: 1,
        capacity: {
          activeRuns: 0,
          capacityLimit: 5,
          loadPct: 0,
          weeklyTokens: 37_900,
          weeklyCostUsd: 3.1,
          acceptability: 'available',
        },
        currentRun: {
          id: RUN_ID,
          goal: '报销单支持一键导出 Excel',
          status: 'completed',
          taskTitle: '报销单支持一键导出 Excel',
          startedAt: iso(16_000),
        },
        lastRunAt: iso(58_000),
      }),
    ],
    events: [],
    decisions: [acceptanceDecision],
  },

  // ── 05 → 06 交付 ──────────────────────────────────────────────
  {
    atMs: 90_000,
    stageNumber: '06',
    title: '你点了通过，它进发版队列',
    narration: {
      headline: '你点头了。验收记录留下了：谁做的、跑过什么检查、产物在哪——将来出问题，翻得到账。',
      highlights: ['质量验收通过 1 件', '发版交付里多了 1 个版本'],
      blockers: [],
      needsYou: [],
      honestGaps: ['发版门禁是通过了，但它只检查本项目自己定的那几条规则，不等于对所有场景都安全'],
      source: 'ai',
    },
    lanes: lanes({
      '/app/intake': { count: 1, blocked: null },
      '/app/issues': { count: 3, blocked: null },
      '/app/repositories': { count: 1, blocked: null },
      '/app/executions': { count: 1, blocked: 0 },
      '/app/acceptance': { count: 1, blocked: null },
      '/app/releases': { count: 1, blocked: 0 },
    }),
    colleagues: [
      xiaogui({ status: 'idle', lastRunAt: iso(-3_600_000) }),
      xiaoma({
        status: 'idle',
        capacity: {
          activeRuns: 0,
          capacityLimit: 5,
          loadPct: 0,
          weeklyTokens: 37_900,
          weeklyCostUsd: 3.1,
          acceptability: 'available',
        },
        currentRun: null,
        lastRunAt: iso(58_000),
      }),
    ],
    events: [
      {
        eventName: DomainEventTypes.ExecutionRunCreated,
        payload: { executionRunId: RUN_ID, projectId: PROJECT_ID },
        atMs: 16_000,
      },
      {
        eventName: DomainEventTypes.RuntimeExecutionResult,
        payload: {
          executionRunId: RUN_ID,
          status: 'completed',
          summary: '12 条单测全部通过，新增导出模块与对应测试',
          usage: {
            promptTokens: 8_400,
            completionTokens: 3_600,
            totalTokens: 12_000,
            costUsd: 0.08,
            model: 'claude-sonnet-5',
          },
          timestamp: iso(58_000),
        },
        atMs: 58_000,
      },
      {
        eventName: DomainEventTypes.AcceptanceResolved,
        payload: { acceptanceId: 'acc-export-1', status: 'passed' },
        atMs: 88_000,
      },
      {
        eventName: DomainEventTypes.ReleaseCreated,
        payload: { releaseId: 'rel-1', version: '0.4.0', projectId: PROJECT_ID },
        atMs: 89_500,
      },
    ],
    decisions: [],
  },
  {
    atMs: 100_000,
    stageNumber: '06',
    title: '一条链路走完：一句话 → 3 张工单 → 代码 → 验收 → 发版',
    narration: {
      headline:
        '整条链路走完了，全程你只做了一件事：点头。你的作用不是被替代，是被挪到了只有你能负责的那一步。',
      highlights: [
        '需求承接 1 份 · 任务 3 张 · 仓库 1 个 · 执行 1 次 · 验收 1 件 · 发版 1 个',
        '本次总花费：约 1.2k tokens · $0.08（不含拆解与读盘）',
      ],
      blockers: [],
      needsYou: [],
      honestGaps: [
        '这是**回放**：数据来自预置演示，不是现场跑出来的。真实项目里 AI 会犯错、会卡住、会要你做更多决定',
      ],
      source: 'ai',
    },
    lanes: lanes({
      '/app/intake': { count: 1, blocked: null },
      '/app/issues': { count: 3, blocked: null },
      '/app/repositories': { count: 1, blocked: null },
      '/app/executions': { count: 1, blocked: 0 },
      '/app/acceptance': { count: 1, blocked: null },
      '/app/releases': { count: 1, blocked: 0 },
    }),
    colleagues: [
      xiaogui({ status: 'idle', lastRunAt: iso(-3_600_000) }),
      xiaoma({
        status: 'idle',
        capacity: {
          activeRuns: 0,
          capacityLimit: 5,
          loadPct: 0,
          weeklyTokens: 37_900,
          weeklyCostUsd: 3.1,
          acceptability: 'available',
        },
        currentRun: null,
        lastRunAt: iso(58_000),
      }),
    ],
    events: [
      {
        eventName: DomainEventTypes.RuntimeExecutionResult,
        payload: {
          executionRunId: RUN_ID,
          status: 'completed',
          summary: '12 条单测全部通过，新增导出模块与对应测试',
          usage: {
            promptTokens: 8_400,
            completionTokens: 3_600,
            totalTokens: 12_000,
            costUsd: 0.08,
            model: 'claude-sonnet-5',
          },
          timestamp: iso(58_000),
        },
        atMs: 58_000,
      },
      {
        eventName: DomainEventTypes.ReleaseApproved,
        payload: { releaseId: 'rel-1', version: '0.4.0', projectId: PROJECT_ID },
        atMs: 99_000,
      },
    ],
    decisions: [],
  },
];

export const FIRST_DELIVERY_SCREENPLAY: Screenplay = {
  formatVersion: SCREENPLAY_FORMAT_VERSION,
  id: 'first-delivery',
  title: '从一句话需求到交付',
  about:
    '这是一段**回放**：一支预置的交付演示，用来看清这条管道每一步在干什么、你本人会在哪一步被叫到。它不需要连执行节点，也不需要模型。',
  project: { id: PROJECT_ID, name: PROJECT_NAME },
  storyAt: STORY_AT,
  frames,
};
