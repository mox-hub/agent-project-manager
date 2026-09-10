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
