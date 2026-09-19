import type { WorkflowDefinitionDoc } from './workflow.definition';

/** 内置演示工作流 key（onModuleInit 时 upsert 进 AIWorkflowDefinition 并编译注册） */
export const DEMO_WORKFLOW_KEY = 'project-brief-demo';

/**
 * 内置演示：项目简介三步流——AI 起草 → 人工确认（suspend）→ 闸门 → AI 产出验收要点。
 * 完整对应「生成→确认→把关→产出」主线语法，作为基座实机验收的固定流程。
 */
export const DEMO_WORKFLOW_DEFINITION: WorkflowDefinitionDoc = {
  version: 1,
  inputHint: {
    topic: '项目主题（一句话，如「团队任务看板」）',
  },
  steps: [
    {
      id: 'draft',
      type: 'llm',
      title: '起草项目简介',
      system: '你是项目管理助手，用简体中文输出，克制、具体、不堆形容词。',
      prompt:
        '为「{input.topic}」起草一段 80 字以内的项目简介：说清它解决什么问题、给谁用、边界在哪。',
    },
    {
      id: 'review',
      type: 'human-confirm',
      title: '人工确认简介',
      message: '项目简介草稿如下，请审核：\n{steps.draft.value}',
    },
    {
      id: 'gate',
      type: 'condition',
      title: '确认通过闸门',
      left: '{steps.review.approved}',
      op: 'eq',
      right: true,
    },
    {
      id: 'acceptance',
      type: 'llm',
      title: '生成验收要点',
      system: '你是项目管理助手，用简体中文输出。',
      prompt:
        '基于以下项目简介，给出 3 条可验证的验收要点，每条一行、以 - 开头：\n{steps.draft.value}\n审核备注：{steps.review.note}',
    },
  ],
};

/** 内置模板：需求转任务（CAP-A-12）——演示产品动作节点：两次 AI 起草 + 人工确认 + 闸门 + 落库建卡 */
export const ISSUE_DRAFT_KEY = 'issue-draft-demo';

export const ISSUE_DRAFT_DEFINITION: WorkflowDefinitionDoc = {
  version: 1,
  inputHint: {
    projectId: '目标项目 ID',
    requirement: '需求一句话描述',
  },
  steps: [
    {
      id: 'title',
      type: 'llm',
      title: '起任务标题',
      system:
        '你是项目管理助手，用简体中文输出。只输出标题本身，不要任何其他文字。',
      prompt: '为这条需求起一个 15 字以内的任务标题：{input.requirement}',
    },
    {
      id: 'desc',
      type: 'llm',
      title: '写任务描述',
      system: '你是项目管理助手，用简体中文输出，只输出描述正文。',
      prompt:
        '把需求写成 80 字以内的任务描述（做什么、验收口径）：\n{input.requirement}\n任务标题：{steps.title.value}',
    },
    {
      id: 'review',
      type: 'human-confirm',
      title: '人工确认任务',
      message:
        '即将登记任务：\n标题：{steps.title.value}\n描述：{steps.desc.value}\n\n请审核。',
    },
    {
      id: 'gate',
      type: 'condition',
      title: '确认通过闸门',
      left: '{steps.review.approved}',
      op: 'eq',
      right: true,
    },
    {
      id: 'create',
      type: 'action',
      title: '登记任务',
      action: 'issue.create',
      params: {
        projectId: '{input.projectId}',
        title: '{steps.title.value}',
        description: '{steps.desc.value}',
      },
    },
  ],
};

// ── APM 研发流程内置模板（2026-09-18 内化）──
// 把仓库自身已验证的四条研发工作流（需求承接 / 开发主线 / 发版管道 / 夜航巡检）
// 经同一文法入账 AIWorkflowDefinition——画布即流程图，APM 用自己管自己。
// 走查型模板步骤全部 human-confirm：每站人工打卡，message 承载该站 SOP 与已知坑；
// 承接型模板按「代写→确认→把关→产出」主线语法，可直接运行。

export const APM_REQUIREMENT_INTAKE_KEY = 'apm-requirement-intake';

/** 需求承接六步流：AI 初筛 → 六问起草 → 人工裁决（闸门）→ 归档 → 开工登记。对齐 requirement-intake skill。 */
export const APM_REQUIREMENT_INTAKE_DEFINITION: WorkflowDefinitionDoc = {
  version: 1,
  inputHint: {
    projectId: '目标项目 ID（裁决归档与开工登记落在这里）',
    requirement: '需求一句话描述',
  },
  steps: [
    {
      id: 'conflict-draft',
      type: 'llm',
      title: '入口初筛（AI 代写）',
      system: '你是 APM 需求治理助手，用简体中文输出，克制、具体、不堆形容词。',
      prompt:
        '针对需求「{input.requirement}」做入口初筛：① 疑似重复或冲突的既有能力方向；② 可能影响的功能域；③ 判定（新能力 / 既有变更 / 废弃）。',
    },
    {
      id: 'six-questions',
      type: 'llm',
      title: '六问评审起草',
      system: '你是 APM 需求治理助手，用简体中文输出。',
      prompt:
        '基于需求与初筛，起草六问评审：① 用户价值 ② 范围边界 ③ 验收标准 ④ 成本（Token+工时） ⑤ 风险与依赖 ⑥ 优先级建议。\n需求：{input.requirement}\n初筛结论：{steps.conflict-draft.value}',
    },
    {
      id: 'adjudicate',
      type: 'human-confirm',
      title: '人工裁决（闸门）',
      message:
        '请对照 docs/01-需求/能力清单-v1.md 复核后裁决：\n初筛：{steps.conflict-draft.value}\n六问：{steps.six-questions.value}\n\n通过=采纳并登记清单；拒绝=仅归档不立项。未进清单不得开工。',
    },
    {
      id: 'gate',
      type: 'condition',
      title: '裁决通过闸门',
      left: '{steps.adjudicate.approved}',
      op: 'eq',
      right: true,
    },
    {
      id: 'archive',
      type: 'action',
      title: '裁决归档',
      action: 'document.create',
      params: {
        projectId: '{input.projectId}',
        title: '需求裁决归档：{input.requirement}',
        content:
          '初筛：{steps.conflict-draft.value}\n\n六问评审：{steps.six-questions.value}\n\n裁决通过：{steps.adjudicate.approved}\n裁决备注：{steps.adjudicate.note}',
      },
    },
    {
      id: 'register',
      type: 'action',
      title: '开工登记（建卡）',
      action: 'issue.create',
      params: {
        projectId: '{input.projectId}',
        title: '[需求登记] {input.requirement}',
        description:
          '六问评审：{steps.six-questions.value}\n裁决备注：{steps.adjudicate.note}',
      },
    },
  ],
};

export const APM_DEV_MAINLINE_KEY = 'apm-dev-mainline';

/** 功能开发主线六站走查：清单闸门 → 契约先行 → 分支实现 → 质量门禁 → 文档变更账 → PR 合入。 */
export const APM_DEV_MAINLINE_DEFINITION: WorkflowDefinitionDoc = {
  version: 1,
  inputHint: {
    capId: '能力卡编号（如 CAP-A-19）',
    branch: '开发分支名（如 feat/issue-xxx-short-desc）',
  },
  steps: [
    {
      id: 'gate-list',
      type: 'human-confirm',
      title: '① 清单闸门',
      message:
        '确认 {input.capId} 已登记进 docs/01-需求/能力清单-v1.md 并附六问评审。未进清单不得开工——需求入口硬闸门。',
    },
    {
      id: 'contract-first',
      type: 'human-confirm',
      title: '② 契约先行',
      message:
        '确认 API 变更先动根 openapi.json / 后端 DTO，再 contract:export 生成双端类型（禁手工改 api-types.gen.ts）；CLI 协议变更同步 packages/apm-shared runtime/protocol.ts 并跑 check:cli-contract。',
    },
    {
      id: 'implement',
      type: 'human-confirm',
      title: '③ 分支实现',
      message:
        '确认在 {input.branch} 分支（或独立 worktree）完成实现与单测，遵守模块放置规范、复用既有组件形态。',
    },
    {
      id: 'quality-gate',
      type: 'human-confirm',
      title: '④ 质量门禁',
      message:
        '确认 pnpm quality:gate 全绿：type-check → lint → test → contract:check → e2e → api:audit --min=95 → check:docs-sync。文档不同步 / 证据缺失不得合并。',
    },
    {
      id: 'docs-sync',
      type: 'human-confirm',
      title: '⑤ 文档与变更账',
      message:
        '确认 docs/ 设计文档与 CHANGELOG.md 同 PR 更新：[MUST] 变更显式落文档，[SHOULD] 偏离记录决策日志。',
    },
    {
      id: 'pr-review',
      type: 'human-confirm',
      title: '⑥ PR 评审合入',
      message:
        '确认提交按 conventional commits（中文长正文），PR 评审通过后合入 develop。',
    },
  ],
};

export const APM_RELEASE_PIPELINE_KEY = 'apm-release-pipeline';

/** 发版管道七站走查：CHANGELOG 归版 → 全量门禁 → release PR → tag → 发版草案 → 核对 → 人工 Publish。 */
export const APM_RELEASE_PIPELINE_DEFINITION: WorkflowDefinitionDoc = {
  version: 1,
  inputHint: {
    projectId: '发版登记落库的项目 ID',
    version: '本次版本号（semver，如 0.7.1）',
  },
  steps: [
    {
      id: 'changelog-freeze',
      type: 'human-confirm',
      title: '① CHANGELOG 归版',
      message:
        '确认 Unreleased 条目归版 {input.version}，各包版本号对齐（含 desktop）。跨分支拷贝 CHANGELOG 防整段误删（踩过 110 行丢失）。',
    },
    {
      id: 'gate-full',
      type: 'human-confirm',
      title: '② 全量质量门禁',
      message:
        '确认 pnpm quality:gate 七连全绿（含 e2e 与 api:audit --min=95）。',
    },
    {
      id: 'release-pr',
      type: 'human-confirm',
      title: '③ release PR：develop → pre-prod → main',
      message:
        '确认 release/<version> 分支 PR 沿 develop → pre-prod → main 合入链走完。',
    },
    {
      id: 'tag',
      type: 'human-confirm',
      title: '④ 打 tag 并推送',
      message:
        '确认先 git fetch 再打 tag 于 develop 侧合并提交（踩过打错提交强迁），随后 push tag。',
    },
    {
      id: 'create-draft',
      type: 'action',
      title: '⑤ 登记发版草案',
      action: 'release.create',
      params: {
        projectId: '{input.projectId}',
        version: '{input.version}',
        notes: '发版说明见 CHANGELOG {input.version}。',
      },
    },
    {
      id: 'check-latest',
      type: 'action',
      title: '⑥ 核对发版记录',
      action: 'release.latest',
      params: { projectId: '{input.projectId}' },
    },
    {
      id: 'publish',
      type: 'human-confirm',
      title: '⑦ GitHub Release 人工 Publish',
      message:
        '确认 draft Release 已人工 Publish；electron-builder 曾现重复 draft / 资产拆两份，发布前核对资产完整。',
    },
  ],
};

export const APM_NIGHT_PATROL_KEY = 'apm-night-patrol';

/** 夜航巡检五站走查：跑满门禁 → 机械自修 → 失败定位 → 报告起草 → 报告落库。 */
export const APM_NIGHT_PATROL_DEFINITION: WorkflowDefinitionDoc = {
  version: 1,
  inputHint: {
    projectId: '巡检报告落库的项目 ID',
    date: '巡检日期（如 2026-09-18）',
  },
  steps: [
    {
      id: 'gate-run',
      type: 'human-confirm',
      title: '① 跑满质量门禁',
      message:
        '全量跑 type-check / lint / 单测 / e2e / contract:check / api:audit / check:docs-sync，把各项结果记入备注。',
    },
    {
      id: 'autofix',
      type: 'human-confirm',
      title: '② 机械自修安全项',
      message:
        '仅自修安全项：lint --fix、契约三份重导出、i18n 补漏键；其余不动，留人工裁决。自修清单记入备注。',
    },
    {
      id: 'locate',
      type: 'human-confirm',
      title: '③ 失败定位',
      message:
        '把剩余失败定位到 文件:行号，写明根因假设与最小修复建议，记入备注。',
    },
    {
      id: 'report',
      type: 'llm',
      title: '④ 巡检报告起草',
      system: '你是 APM 质量巡检助手，用简体中文输出，克制、具体、结论先行。',
      prompt:
        '汇总夜航巡检为一份报告：① 门禁结果一览 ② 自修清单 ③ 待人工处置项（文件:行号 + 根因）。\n门禁记录：{steps.gate-run.note}\n自修记录：{steps.autofix.note}\n定位记录：{steps.locate.note}',
    },
    {
      id: 'archive',
      type: 'action',
      title: '⑤ 报告落库',
      action: 'document.create',
      params: {
        projectId: '{input.projectId}',
        title: '夜航巡检报告 {input.date}',
        content: '{steps.report.value}',
      },
    },
  ],
};

/** 内置模板清单（onModuleInit 遍历 upsert；产品侧可直接运行或「另存为副本」改造） */
export const BUILTIN_WORKFLOW_TEMPLATES: Array<{
  key: string;
  name: string;
  description: string;
  definition: WorkflowDefinitionDoc;
}> = [
  {
    key: DEMO_WORKFLOW_KEY,
    name: '项目简介三步流（内置演示）',
    description:
      'AI 起草项目简介 → 人工确认（暂停等待拍板）→ 确认闸门 → AI 生成验收要点',
    definition: DEMO_WORKFLOW_DEFINITION,
  },
  {
    key: ISSUE_DRAFT_KEY,
    name: '需求转任务（内置模板）',
    description:
      'AI 起草任务标题与描述 → 人工确认 → 确认闸门 → 自动在项目下创建工单（产品动作节点演示）',
    definition: ISSUE_DRAFT_DEFINITION,
  },
  {
    key: APM_REQUIREMENT_INTAKE_KEY,
    name: '需求承接六步流（内置：APM 研发流程）',
    description:
      'AI 初筛 + 六问评审起草 → 人工裁决闸门 → 裁决归档 → 开工登记建卡；对齐 requirement-intake skill，未进清单不得开工',
    definition: APM_REQUIREMENT_INTAKE_DEFINITION,
  },
  {
    key: APM_DEV_MAINLINE_KEY,
    name: '功能开发主线走查（内置：APM 研发流程）',
    description:
      '清单闸门 → 契约先行 → 分支实现 → quality:gate 七连 → 文档与变更账 → PR 评审合入 develop；六站逐站人工打卡',
    definition: APM_DEV_MAINLINE_DEFINITION,
  },
  {
    key: APM_RELEASE_PIPELINE_KEY,
    name: '发版管道走查（内置：APM 研发流程）',
    description:
      'CHANGELOG 归版 → 全量门禁 → release PR（develop→pre-prod→main）→ 打 tag → 发版草案落库 → 核对 → GitHub Release 人工 Publish',
    definition: APM_RELEASE_PIPELINE_DEFINITION,
  },
  {
    key: APM_NIGHT_PATROL_KEY,
    name: '夜航巡检走查（内置：APM 研发流程）',
    description:
      '跑满质量门禁 → 机械自修安全项 → 失败定位到 文件:行号 → AI 起草巡检报告 → 报告落库；对齐夜航质检流程',
    definition: APM_NIGHT_PATROL_DEFINITION,
  },
];
