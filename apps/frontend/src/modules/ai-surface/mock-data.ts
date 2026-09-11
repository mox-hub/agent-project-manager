import type {
  AgentPersona,
  ArtifactItem,
  CognitiveMessage,
  TrustDimension,
  MemoryAtom,
} from './types';

export const INITIAL_AGENTS: AgentPersona[] = [
  {
    id: 'agent-pm',
    name: 'Aria',
    role: 'pm',
    roleTitle: '需求洞察与编排专家',
    avatar: '✦',
    status: 'reasoning',
    statusText: '正在推演 CAP-P-01 任务原子拆解路径',
    activeIssue: {
      id: 'issue-101',
      key: 'APM-101',
      title: '需求管道自动化拆解与验收契约生成',
    },
    trustScore: 98.2,
    tokensUsed: 42800,
    recentThought: '对比 PRD-v3 规格，当前子任务尚未覆盖离线断网恢复策略，准备补齐边界条件。',
    specialties: ['PRD解构', '工单拆解', '优先级裁决'],
  },
  {
    id: 'agent-architect',
    name: 'DaVinci',
    role: 'architect',
    roleTitle: '系统架构与契约门禁',
    avatar: '◈',
    status: 'executing',
    statusText: '正在校验 openapi.json 与 SQLite 路由隔离',
    activeIssue: {
      id: 'issue-102',
      key: 'APM-102',
      title: '多工作区 AsyncLocalStorage 路由基线加固',
    },
    trustScore: 96.5,
    tokensUsed: 78500,
    recentThought: '已完成 schema.prisma 实体隔离推演，准备向中央工件输出差异化变更。',
    specialties: ['OpenAPI 契约', 'SQLite单库', '领域模型建模'],
  },
  {
    id: 'agent-coder',
    name: 'Nexus',
    role: 'coder',
    roleTitle: '执行核心与代码生成',
    avatar: '⚡',
    status: 'executing',
    statusText: '正在生成前端悬浮胶囊与无界渲染管道',
    activeIssue: {
      id: 'issue-103',
      key: 'APM-103',
      title: 'AI 表面无边框空间悬浮流组件实现',
    },
    trustScore: 93.8,
    tokensUsed: 124300,
    recentThought: '优化 Tailwind 4 现代玻璃质感样式，确保 120fps 硬件加速无重排。',
    specialties: ['React 19', 'Tailwind 4', 'CLI Runtime 调度'],
  },
  {
    id: 'agent-qa',
    name: 'Sentinel',
    role: 'qa',
    roleTitle: '质量看门狗与验证引擎',
    avatar: '🛡',
    status: 'auditing',
    statusText: '正在监听单元测试与 API 契约审计矩阵',
    activeIssue: {
      id: 'issue-104',
      key: 'APM-104',
      title: '全链路验收准则自动化审计',
    },
    trustScore: 97.4,
    tokensUsed: 31200,
    recentThought: '目前 API 契约漂移率为 0%，未发现未经声明的原生色板违规。',
    specialties: ['Vitest', 'E2E 审计', '验收证据追溯'],
  },
];

export const INITIAL_ARTIFACTS: Record<string, ArtifactItem> = {
  'artifact-arch-1': {
    id: 'artifact-arch-1',
    type: 'architecture',
    title: '双表面空间分层与数据引力拓扑',
    subtitle: '人类控制面 ⇋ AI 认知表面无界切换通道',
    createdAt: '14:02:18',
    authorAgentId: 'agent-architect',
    payload: {
      diagramSpec: [
        '人类控制面 (Human Control Surface) [Scale 0.95 / Blur 12px]',
        '  ↓ 底部 Omni-Dock 唤醒（声光能量脉冲）',
        'AI 认知协同表面 (Cognitive Field)',
        '  ├── 左翼：数字生命胶囊星链 (Living Capsules)',
        '  ├── 中央：无界认知流与动态工件画布 (Floating Artifacts)',
        '  └── 右翼：信度同心光轨与记忆星云 (Trust Orbital Lens)',
      ],
    },
  },
  'artifact-diff-2': {
    id: 'artifact-diff-2',
    type: 'code-diff',
    title: 'schema.prisma / OpenAPI 契约原子变更',
    subtitle: '新增 AI Surface 认知状态与会话信度字段',
    createdAt: '14:05:42',
    authorAgentId: 'agent-coder',
    payload: {
      language: 'prisma',
      codeSnippet: `// 认知会话评估与信度追踪模型
model CognitiveSession {
  id              String       @id @default(cuid())
  workspaceId     String
  overallScore    Float        @default(95.0)
  contractScore   Float        @default(99.0)
  hallucinationRate Float      @default(0.02)
  tokenEfficiency Float        @default(94.5)
  status          String       @default("active")
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

+ // 关联的 Agent 角色星系
+ activePersonas  String[]     // ['agent-pm', 'agent-coder', 'agent-qa']
+ currentIssueId  String?
+ currentIssue    Issue?       @relation(fields: [currentIssueId], references: [id])
}`,
    },
  },
  'artifact-qa-3': {
    id: 'artifact-qa-3',
    type: 'acceptance-criteria',
    title: 'CAP-P-01 自动化验收准则清单',
    subtitle: 'Sentinel 质量门禁自动生成的四项硬性验证指标',
    createdAt: '14:08:10',
    authorAgentId: 'agent-qa',
    payload: {
      criteriaList: [
        { label: '界面彻底消除生硬 1px 网格分割线，采用微光景深悬浮卡片', done: true, required: true },
        { label: '左侧悬浮胶囊支持实时呼吸脉冲与思维气泡动态外溢', done: true, required: true },
        { label: '右侧信度仪表盘采用同心旋转光轨，实时计算综合评分', done: true, required: true },
        { label: '正下方 Omni-Dock 提供模型调度、指令输入与空间光丝共振', done: true, required: true },
        { label: '全链路支持键盘快捷键与一键返回人类控制面', done: false, required: false },
      ],
    },
  },
};

export const INITIAL_MESSAGES: CognitiveMessage[] = [
  {
    id: 'msg-1',
    senderId: 'agent-pm',
    senderName: 'Aria (需求洞察)',
    senderRole: 'pm',
    avatar: '✦',
    timestamp: '14:01',
    content: '通过对当前工单 APM-101 的深度剖析，我们不需要简单的“聊天抽屉”，而是需要一个让用户俯瞰所有 Agent 思考与产出的空间视界。我已将整体架构拓扑下发至工件区。',
    thoughts: [
      { id: 't-1', title: '需求范式校验', description: '排除传统问答气泡模式，对标 Spatial Computing 全息感', durationMs: 420, status: 'done' },
      { id: 't-2', title: '工单主线对齐', description: '关联 APM-101，确保契约真实绑定', durationMs: 310, status: 'done' },
    ],
    artifactId: 'artifact-arch-1',
  },
  {
    id: 'msg-2',
    senderId: 'agent-architect',
    senderName: 'DaVinci (架构师)',
    senderRole: 'architect',
    avatar: '◈',
    timestamp: '14:04',
    content: '赞同 Aria 的推演。我已核准双表面拓扑的契约边界。数据模型层已准备好对应的 Prisma 结构变更，所有信度评分与执行链均入库留痕，绝无游离数据。',
    thoughts: [
      { id: 't-3', title: '数据库迁移评估', description: '检查 SQLite 单库隔离性，验证零漂移指标', durationMs: 650, status: 'done' },
    ],
    artifactId: 'artifact-diff-2',
  },
  {
    id: 'msg-3',
    senderId: 'agent-coder',
    senderName: 'Nexus (代码核心)',
    senderRole: 'coder',
    avatar: '⚡',
    timestamp: '14:06',
    content: '前端悬浮无界视效已进入渲染管道！已完全剔除边框线，左侧搭载数字生命胶囊，正下方挂载悬浮 Omni-Dock，所有的工件均为轻质琉璃浮岛。',
  },
  {
    id: 'msg-4',
    senderId: 'agent-qa',
    senderName: 'Sentinel (质量门禁)',
    senderRole: 'qa',
    avatar: '🛡',
    timestamp: '14:08',
    content: '已完成初始轮次的合规性扫描：契约合规率达 99.2%，所有组件符合 CSS 治理铁律。已生成自动化验收准则工件，请检视。',
    thoughts: [
      { id: 't-4', title: '自动化测试套件执行', description: '运行 Vitest 单元验证与 Palette 治理脚本', durationMs: 890, status: 'done' },
      { id: 't-5', title: '信度雷达生成', description: '多维加权计算当前会话质量总分', durationMs: 240, status: 'done' },
    ],
    artifactId: 'artifact-qa-3',
  },
];

export const TRUST_DIMENSIONS: TrustDimension[] = [
  { id: 'dim-contract', label: '契约合规率', score: 99.2, maxScore: 100, description: '严格遵从 OpenAPI 规范与 SQLite 单库路由', status: 'optimal' },
  { id: 'dim-logic', label: '逻辑完备度', score: 94.5, maxScore: 100, description: 'PRD 边界条件覆盖与异常处理分支推演', status: 'good' },
  { id: 'dim-grounded', label: '幻觉抑制率', score: 97.0, maxScore: 100, description: '代码与实体引用真实度检查，无虚构接口', status: 'optimal' },
  { id: 'dim-roi', label: 'Token 投入产出比', score: 92.8, maxScore: 100, description: '有效代码行数 / 上下文开销，极佳经济性', status: 'good' },
];

export const MEMORY_ATOMS: MemoryAtom[] = [
  { id: 'mem-1', key: 'SQLite-Per-Workspace', category: 'architecture', weight: 0.98, summary: '每个工作区独立 SQLite 数据库文件路由' },
  { id: 'mem-2', key: 'OpenAPI-Zero-Drift', category: 'governance', weight: 0.95, summary: '全仓契约以 openapi.json 为唯一真相源' },
  { id: 'mem-3', key: 'Dual-Surface-V4', category: 'architecture', weight: 0.96, summary: '人类控制面与 AI 协同执行面双轨融合' },
  { id: 'mem-4', key: 'Zero-Raw-Palette', category: 'governance', weight: 0.92, summary: '全端禁止原生未定义色板类，使用语义 Token' },
  { id: 'mem-5', key: 'Acceptance-Gate', category: 'preference', weight: 0.94, summary: '工单流转必须挂载自动化验收准则与证据' },
];
