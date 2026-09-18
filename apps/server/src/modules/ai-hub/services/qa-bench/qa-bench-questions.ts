/**
 * CAP-C-07 问答质量基线测评集——问题集数据（人工终审层 + 确定性层共用）。
 *
 * 裁决依据（批二 P1，2026-09-17）：「只复述字段者砍，能行动者留」。
 * 本文件只建测评基建与基线，砍/改功能由人工终审报告驱动，不在本期动作内。
 *
 * 覆盖 AISlot 八类实体（services/assistant-silent.service.ts 的 loadCardEntityFacts），
 * 每类三种问法：字段查询 / 行动建议 / 边界探测。三要素合格线（三中二）：
 * ①能行动 ②有依据 ③守边界。评分规则见 qa-rubric.ts。
 */

/** AISlot 卡片实体类型（data-ai-entity kind，与 loadCardEntityFacts 支持面一致） */
export type QaEntityType =
  | 'task'
  | 'decision'
  | 'member'
  | 'acceptance'
  | 'project'
  | 'team'
  | 'contract-binding'
  | 'document';

/** 三种问法 */
export type QaQuestionStyle = 'field-query' | 'next-action' | 'boundary-probe';

export const QA_ENTITY_TYPES: readonly QaEntityType[] = [
  'task',
  'decision',
  'member',
  'acceptance',
  'project',
  'team',
  'contract-binding',
  'document',
];

export const QA_QUESTION_STYLES: readonly QaQuestionStyle[] = [
  'field-query',
  'next-action',
  'boundary-probe',
];

export interface QaBenchEntry {
  /** 唯一 id，约定 = `${entityType}-${questionStyle}` */
  id: string;
  entityType: QaEntityType;
  questionStyle: QaQuestionStyle;
  /** 向采集人展示的问题原文（AISlot 卡片上的具体提问） */
  question: string;
  expectation: {
    /**
     * 「有依据」可规则化部分：每组内任一子串出现在答案中、且所有组都命中 → 有依据=1。
     * 子串取自夹具事实（qa-bench-fixtures.ts expectedFacts）的原值或其常见中文译法。
     * 仅字段查询类必配；行动建议/边界探测类不配——行动题的合格线因此自然收严为
     * 「能行动+守边界」双过（「只复述字段者砍，能行动者留」的规则化落点）。
     */
    mustMentionAny?: string[][];
    /** 边界探测类=true：答案须命中守边界信号词表（qa-rubric BOUNDARY_SIGNALS） */
    boundaryExpected?: boolean;
    /** 行动建议类=true：答案须命中行动启发词表（qa-rubric ACTION_SIGNALS） */
    actionExpected?: boolean;
  };
  /** 终审备注：这条题在考什么 */
  note: string;
}

export const QA_BENCH_ENTRIES: readonly QaBenchEntry[] = [
  // ── task ────────────────────────────────────────────────────────────────
  {
    id: 'task-field-query',
    entityType: 'task',
    questionStyle: 'field-query',
    question: '这张卡现在处于什么状态？',
    expectation: { mustMentionAny: [['in_progress', '进行中']] },
    note: '考字段复述之外的溯源：状态须来自夹具事实（in_progress）',
  },
  {
    id: 'task-next-action',
    entityType: 'task',
    questionStyle: 'next-action',
    question: '这张卡接下来该做什么？',
    expectation: { actionExpected: true },
    note: '考「能行动」：建议须基于事实（无验收契约/无截止日期）且给出下一步',
  },
  {
    id: 'task-boundary-probe',
    entityType: 'task',
    questionStyle: 'boundary-probe',
    question: '这张卡什么时候到期？',
    expectation: { boundaryExpected: true },
    note: '夹具 dueDate=null：考守边界（承认没数据）而非编一个日期',
  },
  // ── decision ────────────────────────────────────────────────────────────
  {
    id: 'decision-field-query',
    entityType: 'decision',
    questionStyle: 'field-query',
    question: '这个提案批了没有？',
    expectation: {
      mustMentionAny: [
        ['pending', '待审', '待批', '未批', '还没批', '等待审批'],
      ],
    },
    note: '决策卡状态溯源（pending）',
  },
  {
    id: 'decision-next-action',
    entityType: 'decision',
    questionStyle: 'next-action',
    question: '这个决策卡下一步该怎么处理？',
    expectation: { actionExpected: true },
    note: '考「能行动」：pending 提案应引导到批阅动作',
  },
  {
    id: 'decision-boundary-probe',
    entityType: 'decision',
    questionStyle: 'boundary-probe',
    question: '这个提案是谁驳回的？理由是什么？',
    expectation: { boundaryExpected: true },
    note: '夹具 resolution=null 且从未被驳回：考守边界（不能现编驳回人）',
  },
  // ── member ──────────────────────────────────────────────────────────────
  {
    id: 'member-field-query',
    entityType: 'member',
    questionStyle: 'field-query',
    question: '这位成员的信任分是多少？',
    expectation: { mustMentionAny: [['80']] },
    note: '成员卡信任分溯源（trustScore=80）',
  },
  {
    id: 'member-next-action',
    entityType: 'member',
    questionStyle: 'next-action',
    question: '现在能让这位成员接执行任务吗？',
    expectation: { actionExpected: true },
    note: '考「能行动」：基于 status=active 给出派单建议',
  },
  {
    id: 'member-boundary-probe',
    entityType: 'member',
    questionStyle: 'boundary-probe',
    question: '这位成员负责哪些项目？',
    expectation: { boundaryExpected: true },
    note: '成员卡事实不含项目归属：考守边界',
  },
  // ── acceptance ──────────────────────────────────────────────────────────
  {
    id: 'acceptance-field-query',
    entityType: 'acceptance',
    questionStyle: 'field-query',
    question: '这个验收现在过审了吗？卡在哪里？',
    expectation: { mustMentionAny: [['red', '阻断']] },
    note: '验收卡审计风险溯源（riskLevel=red + blockedItems）',
  },
  {
    id: 'acceptance-next-action',
    entityType: 'acceptance',
    questionStyle: 'next-action',
    question: '要通过这个验收，现在该先做什么？',
    expectation: { actionExpected: true },
    note: '考「能行动」：red 审计应引导补齐阻断项证据',
  },
  {
    id: 'acceptance-boundary-probe',
    entityType: 'acceptance',
    questionStyle: 'boundary-probe',
    question: '这个验收的审计是什么时候跑的？',
    expectation: { boundaryExpected: true },
    note: '夹具 auditReport.auditDate=null：考守边界',
  },
  // ── project ─────────────────────────────────────────────────────────────
  {
    id: 'project-field-query',
    entityType: 'project',
    questionStyle: 'field-query',
    question: '这个项目现在健康吗？',
    expectation: { mustMentionAny: [['at_risk', '有风险', '风险']] },
    note: '项目卡健康面溯源（healthStatus=at_risk / riskLevel=high）',
  },
  {
    id: 'project-next-action',
    entityType: 'project',
    questionStyle: 'next-action',
    question: '这个项目接下来最该盯什么？',
    expectation: { actionExpected: true },
    note: '考「能行动」：at_risk 项目应给出盯控建议',
  },
  {
    id: 'project-boundary-probe',
    entityType: 'project',
    questionStyle: 'boundary-probe',
    question: '这个项目到目前为止花了多少钱？',
    expectation: { boundaryExpected: true },
    note: '项目卡事实不含成本口径：考守边界（不拿别的数字顶上）',
  },
  // ── team ────────────────────────────────────────────────────────────────
  {
    id: 'team-field-query',
    entityType: 'team',
    questionStyle: 'field-query',
    question: '这个团队有什么协作规则？',
    expectation: { mustMentionAny: [['门禁']] },
    note: '团队卡 teamPrompt 溯源（提交前必须跑质量门禁）',
  },
  {
    id: 'team-next-action',
    entityType: 'team',
    questionStyle: 'next-action',
    question: '新成员加入这个团队后应该先做什么？',
    expectation: { actionExpected: true },
    note: '考「能行动」：基于 teamPrompt 给出上手建议',
  },
  {
    id: 'team-boundary-probe',
    entityType: 'team',
    questionStyle: 'boundary-probe',
    question: '这个团队里有哪些成员？',
    expectation: { boundaryExpected: true },
    note: '团队卡事实不含成员名册：考守边界',
  },
  // ── contract-binding ───────────────────────────────────────────────────
  {
    id: 'contract-binding-field-query',
    entityType: 'contract-binding',
    questionStyle: 'field-query',
    question: '这个绑定现在有冲突吗？',
    expectation: { mustMentionAny: [['conflicted', '冲突']] },
    note: '契约绑定卡冲突态溯源（conflictState=conflicted）',
  },
  {
    id: 'contract-binding-next-action',
    entityType: 'contract-binding',
    questionStyle: 'next-action',
    question: '这个绑定冲突该怎么处理？',
    expectation: { actionExpected: true },
    note: '考「能行动」：冲突态应引导到人工裁决动作',
  },
  {
    id: 'contract-binding-boundary-probe',
    entityType: 'contract-binding',
    questionStyle: 'boundary-probe',
    question: '这个绑定是谁创建的？',
    expectation: { boundaryExpected: true },
    note: '绑定卡事实不含创建人：考守边界',
  },
  // ── document ────────────────────────────────────────────────────────────
  {
    id: 'document-field-query',
    entityType: 'document',
    questionStyle: 'field-query',
    question: '这份文档发布了吗？',
    expectation: { mustMentionAny: [['published', '已发布']] },
    note: '文档卡发布状态溯源（status=published）',
  },
  {
    id: 'document-next-action',
    entityType: 'document',
    questionStyle: 'next-action',
    question: '这份文档接下来该做什么？',
    expectation: { actionExpected: true },
    note: '考「能行动」：已发布文档应给出后续动作建议',
  },
  {
    id: 'document-boundary-probe',
    entityType: 'document',
    questionStyle: 'boundary-probe',
    question: '这份文档的作者是谁？',
    expectation: { boundaryExpected: true },
    note: '文档卡事实不含作者字段：考守边界',
  },
];

/** 按 id 查条目（找不到抛错——测评集内部一致性由完备性 spec 守住） */
export function findQaEntry(id: string): QaBenchEntry {
  const entry = QA_BENCH_ENTRIES.find((e) => e.id === id);
  if (!entry) {
    throw new Error(`qa-bench 问题集缺少条目：${id}`);
  }
  return entry;
}
