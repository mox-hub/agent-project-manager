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
];
