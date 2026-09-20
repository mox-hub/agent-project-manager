/**
 * 项目档案内置槽位注册表（v2 纪要 §3.2：schema 管结构、MemoryAtom 原子管内容）。
 * 系统内置版本化数据——本切片走代码注册表（仿 BUILTIN_LOCKED_TYPE_KEY 先例），
 * 自定义槽位 schema 后置（届时仿 IssueType 引擎迁移落库）。
 *
 * 完备度 = 槽位内生效（consolidated）原子数 ≥ 1；活跃热点等快变量是纯派生量，永不入槽。
 */

export const PROFILE_SLOTS = [
  'tech-stack',
  'module-map',
  'conventions',
  'risks',
  'tech-debts',
] as const;

export type ProfileSlot = (typeof PROFILE_SLOTS)[number];

export interface ProfileSlotDefinition {
  key: ProfileSlot;
  /** 对应记忆原子 type（复用 MEMORY_TYPES 词汇，避免第二套类型体系） */
  atomType: 'capability' | 'conclusion';
  /** 中文槽位名（前端 i18n 兜底，契约面给英文 key） */
  label: string;
  /** 槽位说明（给人与前端渲染） */
  description: string;
  /** 考古收集指南（注入考古 Agent 任务包：这槽位要收集什么） */
  archaeologyGuide: string;
}

export const PROFILE_SLOT_DEFINITIONS: Record<
  ProfileSlot,
  ProfileSlotDefinition
> = {
  'tech-stack': {
    key: 'tech-stack',
    atomType: 'capability',
    label: '技术栈',
    description: '项目使用的主要语言、框架、关键依赖与基础设施',
    archaeologyGuide:
      '识别主要编程语言、框架及版本、构建工具、数据库/存储、部署方式。每条一个事实（如「前端 React 19 + Vite 7」「数据层 SQLite + Prisma 6」）。',
  },
  'module-map': {
    key: 'module-map',
    atomType: 'capability',
    label: '模块地图',
    description: '代码库的功能分区：每个模块管什么、入口在哪、模块间如何衔接',
    archaeologyGuide:
      '按目录/包结构归纳功能模块，每条一个模块（如「apps/server/src/modules/issue：工单域统一模型」）。标注职责与关键入口，不罗列文件清单。',
  },
  conventions: {
    key: 'conventions',
    atomType: 'conclusion',
    label: '项目约定',
    description: '团队遵循的工程约定：命名、分支策略、测试要求、提交规范',
    archaeologyGuide:
      '从 README/CLAUDE.md/CI 配置/lint 规则提炼成文约定。每条一条约定（如「提交走 conventional commits，中文正文」「契约变更先改 openapi.json」）。',
  },
  risks: {
    key: 'risks',
    atomType: 'conclusion',
    label: '风险区',
    description:
      '当前已知的脆弱点：高耦合区、缺测试覆盖的关键路径、外部依赖风险',
    archaeologyGuide:
      '只报告有证据的风险（如某模块无测试、某依赖已停止维护、某处 TODO/FIXME 密集）。每条附出处，置信度保守。',
  },
  'tech-debts': {
    key: 'tech-debts',
    atomType: 'conclusion',
    label: '技术债',
    description: '已知的技术债清单：过时实现、待迁移代码、临时方案及其影响',
    archaeologyGuide:
      '识别标记了 TODO/FIXME/HACK 的集中区、被注释声明为临时的方案、明显落后于依赖新版本的自研实现。每条说明现状与影响，不臆测动机。',
  },
};

export function isProfileSlot(value: string): value is ProfileSlot {
  return (PROFILE_SLOTS as readonly string[]).includes(value);
}
