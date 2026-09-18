/**
 * CAP-C-07 问答质量基线——八类实体夹具（确定性层，纯数据）。
 *
 * 每个夹具 = 一份 prisma stub 声明（由 spec 组装成 vi.fn mock 后注入
 * AssistantSilentService）+ 预期事实对象（loadCardEntityFacts 对该 stub 的
 * 预期产出）。事实由服务端按 id 查库组装（「先侦查再开口」），因此确定性层
 * 可以构造夹具走 card-explain 真链路、断言 grounding 注入与三要素规则项，
 * 全程零真实 LLM 调用。
 *
 * 本文件保持纯数据、零 vitest 依赖：它不是 spec 文件，会进 tsc build 编译
 * 范围（tsconfig.build.json 只排除 *.spec.ts），而 vitest 全局 `vi` 只在
 * spec 编译语境可用。mock 的 vi.fn() 组装在 qa-bench.spec.ts 的 buildPrisma。
 */

import type { QaEntityType } from './qa-bench-questions';

/** 一条 prisma stub：model.method() 将解析返回 resolves */
export interface QaPrismaStub {
  model: string;
  method: string;
  resolves: unknown;
}

interface QaEntityFixture {
  /** 传给 card-explain 的 context.entity（kind+id 指针） */
  entity: { kind: QaEntityType; id: string };
  /** prisma stub 声明（与 loadCardEntityFacts 的调用模型对齐） */
  prismaStubs: readonly QaPrismaStub[];
  /** loadCardEntityFacts 预期产出的事实（grounding 注入与评分 factsText 的依据） */
  expectedFacts: Record<string, unknown>;
  /** 链路断言用：instructions 必含的 grounding 关键值（均取自 expectedFacts） */
  groundingProbe: string[];
  /** 边界缺口字段（点路径），完备性 spec 断言其在 expectedFacts 中为 null/缺失 */
  boundaryGapPointer: string;
}

const QA_MEMBER_XIAOMA = { id: 'qa-member-1', displayName: '小码', type: 'ai_agent' };

const TASK_ROW = {
  id: 'qa-task-1',
  shortId: 'T-202',
  title: '登录页迁移新网关',
  description: '把登录页从旧网关迁到新网关，旧网关本月底下线',
  status: 'in_progress',
  priority: 'high',
  type: 'task',
  customFields: null,
  dueDate: null,
  project: { id: 'qa-project-1', name: 'Apollo 网关迁移' },
  assignee: null,
};

const TASK_ACTIVITY = [
  {
    type: 'status_changed',
    detail: 'todo → in_progress',
    timestamp: new Date('2026-09-15T09:00:00Z'),
  },
];

const taskFixture: QaEntityFixture = {
  entity: { kind: 'task', id: 'qa-task-1' },
  prismaStubs: [
    { model: 'issue', method: 'findUnique', resolves: TASK_ROW },
    {
      model: 'issueAssignee',
      method: 'findMany',
      resolves: [{ issueId: 'qa-task-1', memberId: QA_MEMBER_XIAOMA.id }],
    },
    { model: 'member', method: 'findMany', resolves: [QA_MEMBER_XIAOMA] },
    { model: 'member', method: 'findUnique', resolves: QA_MEMBER_XIAOMA },
    { model: 'acceptance', method: 'findFirst', resolves: null },
    { model: 'issueDependency', method: 'count', resolves: 0 },
    { model: 'issueActivity', method: 'findMany', resolves: TASK_ACTIVITY },
  ],
  expectedFacts: {
    id: 'qa-task-1',
    shortId: 'T-202',
    title: '登录页迁移新网关',
    description: '把登录页从旧网关迁到新网关，旧网关本月底下线',
    status: 'in_progress',
    priority: 'high',
    type: 'task',
    severity: null,
    dueDate: null,
    project: { id: 'qa-project-1', name: 'Apollo 网关迁移' },
    assignees: [{ name: '小码', type: 'ai_agent' }],
    legacyAssignee: null,
    acceptance: null,
    dependencyCount: 0,
    recentActivities: TASK_ACTIVITY,
  },
  groundingProbe: ['登录页迁移新网关', 'in_progress'],
  boundaryGapPointer: 'dueDate',
};

const decisionFixture: QaEntityFixture = {
  entity: { kind: 'decision', id: 'qa-dp-1' },
  prismaStubs: [
    {
      model: 'decisionProposal',
      method: 'findUnique',
      resolves: {
        id: 'qa-dp-1',
        kind: 'plan',
        title: '登录页迁移拆解提案',
        detail: '按页面切换、网关配置、回归验证拆成 3 个子任务',
        status: 'pending',
        payload: { issues: ['T-203', 'T-204', 'T-205'] },
        resolution: null,
        proposerId: QA_MEMBER_XIAOMA.id,
        createdAt: new Date('2026-09-14T08:00:00Z'),
      },
    },
    { model: 'member', method: 'findUnique', resolves: QA_MEMBER_XIAOMA },
  ],
  expectedFacts: {
    entityType: 'decision',
    kind: 'plan',
    title: '登录页迁移拆解提案',
    detail: '按页面切换、网关配置、回归验证拆成 3 个子任务',
    status: 'pending',
    payload: { issues: ['T-203', 'T-204', 'T-205'] },
    resolution: null,
    proposer: '小码',
    createdAt: new Date('2026-09-14T08:00:00Z'),
  },
  groundingProbe: ['登录页迁移拆解提案', 'pending'],
  boundaryGapPointer: 'resolution',
};

const memberFixture: QaEntityFixture = {
  entity: { kind: 'member', id: QA_MEMBER_XIAOMA.id },
  prismaStubs: [
    {
      model: 'member',
      method: 'findUnique',
      resolves: {
        displayName: '小周',
        handle: 'xiaozhou',
        type: 'ai_agent',
        title: '系统助理',
        description: null,
        status: 'active',
        trustScore: 80,
        trustLevel: 2,
      },
    },
  ],
  expectedFacts: {
    entityType: 'member',
    displayName: '小周',
    handle: 'xiaozhou',
    type: 'ai_agent',
    title: '系统助理',
    description: null,
    status: 'active',
    trustScore: 80,
    trustLevel: 2,
  },
  groundingProbe: ['小周', '80'],
  boundaryGapPointer: 'projects',
};

const acceptanceFixture: QaEntityFixture = {
  entity: { kind: 'acceptance', id: 'qa-ac-1' },
  prismaStubs: [
    {
      model: 'acceptance',
      method: 'findUnique',
      resolves: {
        id: 'qa-ac-1',
        title: '登录页迁移验收',
        status: 'pending',
        type: 'mixed',
        completionType: 'artifact',
        issue: {
          title: '登录页迁移新网关',
          shortId: 'T-202',
          status: 'in_progress',
          type: 'task',
        },
        criteria: [
          {
            criteriaType: 'functional',
            content: '新网关登录成功并跳转首页',
            weight: 5,
            severity: 'critical',
            status: 'pending',
          },
          {
            criteriaType: 'technical',
            content: '旧网关下线后登录无 5xx',
            weight: 3,
            severity: 'high',
            status: 'pending',
          },
        ],
        auditReport: {
          riskLevel: 'red',
          blockedItems: [
            {
              type: 'functional',
              content: '新网关登录成功并跳转首页',
              severity: 'critical',
            },
          ],
          suggestedItems: [
            {
              type: 'log',
              content: '缺少登录失败日志验收标准',
              severity: 'medium',
            },
          ],
          passedItems: [],
          summary: '关键功能标准未验收，不能交付',
          auditDate: null,
        },
      },
    },
  ],
  expectedFacts: {
    entityType: 'acceptance',
    title: '登录页迁移验收',
    status: 'pending',
    type: 'mixed',
    completionType: 'artifact',
    issue: {
      title: '登录页迁移新网关',
      shortId: 'T-202',
      status: 'in_progress',
      type: 'task',
    },
    criteria: [
      {
        criteriaType: 'functional',
        content: '新网关登录成功并跳转首页',
        weight: 5,
        severity: 'critical',
        status: 'pending',
      },
      {
        criteriaType: 'technical',
        content: '旧网关下线后登录无 5xx',
        weight: 3,
        severity: 'high',
        status: 'pending',
      },
    ],
    auditReport: {
      riskLevel: 'red',
      blockedItems: [
        {
          type: 'functional',
          content: '新网关登录成功并跳转首页',
          severity: 'critical',
        },
      ],
      suggestedItems: [
        {
          type: 'log',
          content: '缺少登录失败日志验收标准',
          severity: 'medium',
        },
      ],
      passedItems: [],
      summary: '关键功能标准未验收，不能交付',
      auditDate: null,
    },
  },
  groundingProbe: ['新网关登录成功并跳转首页', 'red'],
  boundaryGapPointer: 'auditReport.auditDate',
};

const projectFixture: QaEntityFixture = {
  entity: { kind: 'project', id: 'qa-project-1' },
  prismaStubs: [
    {
      model: 'project',
      method: 'findUnique',
      resolves: {
        name: 'Apollo 网关迁移',
        description: '把登录与网关流量切到新网关',
        projectCode: 'APOLLO',
        type: 'team',
        status: 'active',
        workflowStatus: 'in_progress',
        healthStatus: 'at_risk',
        riskLevel: 'high',
        targetDate: new Date('2026-10-30T00:00:00Z'),
        owner: { displayName: '老王', username: 'laowang' },
      },
    },
  ],
  expectedFacts: {
    entityType: 'project',
    name: 'Apollo 网关迁移',
    description: '把登录与网关流量切到新网关',
    projectCode: 'APOLLO',
    type: 'team',
    status: 'active',
    workflowStatus: 'in_progress',
    healthStatus: 'at_risk',
    riskLevel: 'high',
    targetDate: new Date('2026-10-30T00:00:00Z'),
    ownerName: '老王',
  },
  groundingProbe: ['Apollo 网关迁移', 'at_risk'],
  boundaryGapPointer: 'totalCost',
};

const teamFixture: QaEntityFixture = {
  entity: { kind: 'team', id: 'qa-team-1' },
  prismaStubs: [
    {
      model: 'team',
      method: 'findUnique',
      resolves: {
        name: '后端突击队',
        description: null,
        status: 'active',
        teamPrompt: '提交前必须跑质量门禁',
      },
    },
  ],
  expectedFacts: {
    entityType: 'team',
    name: '后端突击队',
    description: null,
    status: 'active',
    teamPrompt: '提交前必须跑质量门禁',
  },
  groundingProbe: ['后端突击队', '门禁'],
  boundaryGapPointer: 'members',
};

const contractBindingFixture: QaEntityFixture = {
  entity: { kind: 'contract-binding', id: 'qa-cfb-1' },
  prismaStubs: [
    {
      model: 'contractFileBinding',
      method: 'findUnique',
      resolves: {
        id: 'qa-cfb-1',
        fileType: 'agents',
        filePath: 'AGENTS.md',
        syncMode: 'synced',
        conflictState: 'conflicted',
        truthOwner: 'file_git',
        updatedAt: new Date('2026-09-16T10:00:00Z'),
        project: { id: 'qa-project-1', name: 'Apollo 网关迁移' },
      },
    },
  ],
  expectedFacts: {
    entityType: 'contract-binding',
    fileType: 'agents',
    filePath: 'AGENTS.md',
    syncMode: 'synced',
    conflictState: 'conflicted',
    truthOwner: 'file_git',
    project: { id: 'qa-project-1', name: 'Apollo 网关迁移' },
    updatedAt: new Date('2026-09-16T10:00:00Z'),
  },
  groundingProbe: ['AGENTS.md', 'conflicted'],
  boundaryGapPointer: 'createdBy',
};

const documentFixture: QaEntityFixture = {
  entity: { kind: 'document', id: 'qa-doc-1' },
  prismaStubs: [
    {
      model: 'document',
      method: 'findUnique',
      resolves: {
        title: '网关迁移需求澄清纪要',
        status: 'published',
        provenance: 'authored',
        publishedVersionId: 'v3',
        publishedAt: new Date('2026-09-12T00:00:00Z'),
        updatedAt: new Date('2026-09-12T00:00:00Z'),
        project: { id: 'qa-project-1', name: 'Apollo 网关迁移' },
      },
    },
  ],
  expectedFacts: {
    entityType: 'document',
    title: '网关迁移需求澄清纪要',
    status: 'published',
    provenance: 'authored',
    publishedVersionId: 'v3',
    publishedAt: new Date('2026-09-12T00:00:00Z'),
    updatedAt: new Date('2026-09-12T00:00:00Z'),
    project: { id: 'qa-project-1', name: 'Apollo 网关迁移' },
  },
  groundingProbe: ['网关迁移需求澄清纪要', 'published'],
  boundaryGapPointer: 'author',
};

export const QA_ENTITY_FIXTURES: Record<QaEntityType, QaEntityFixture> = {
  task: taskFixture,
  decision: decisionFixture,
  member: memberFixture,
  acceptance: acceptanceFixture,
  project: projectFixture,
  team: teamFixture,
  'contract-binding': contractBindingFixture,
  document: documentFixture,
};

/** 按点路径取嵌套值（undefined = 缺失） */
export function getByPointer(
  obj: Record<string, unknown>,
  pointer: string,
): unknown {
  return pointer
    .split('.')
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === 'object'
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      obj,
    );
}
