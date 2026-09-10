/**
 * 内置剧本注册表（v2 纪要 §3.4 / §2.4，仿 profile-slot.registry 的代码注册表先例）。
 * 剧本是可选挂载物：Project.playbookRef 挂模板 key，Project.lifecycleStage 存阶段游标。
 * 每阶段固定行为模式：一句目的 → 结构化访谈（人话提问 + 术语对照）→ 产出正式工件 → 闸门决策卡。
 * 专长度领域（expertise domain）也在此定义：档位按人存（Store B 偏好原子），
 * 决策卡知识夹层按领域读密度（v2 纪要 §2.1 专长度是向量）。
 */

export const EXPERTISE_DOMAINS = [
  'requirements',
  'technical',
  'acceptance',
  'process',
] as const;

export type ExpertiseDomain = (typeof EXPERTISE_DOMAINS)[number];

export function isExpertiseDomain(v: string): v is ExpertiseDomain {
  return (EXPERTISE_DOMAINS as readonly string[]).includes(v);
}

export const EXPERTISE_DOMAIN_LABELS: Record<ExpertiseDomain, string> = {
  requirements: '需求调研',
  technical: '技术实现',
  acceptance: '验收测试',
  process: '项目管理流程',
};

export interface PlaybookInterviewQuestion {
  /** 答案回传 key（稳定 id） */
  id: string;
  /** 人话提问（访谈原话，专业翻译发生在产出侧） */
  question: string;
  /** 输入提示（placeholder / 举例） */
  hint?: string;
  /** 是否必答（默认 true） */
  required?: boolean;
  /** 专业术语对照（人话 → 术语，写进文档与知识夹层） */
  term?: string;
  /** 术语解释（知识夹层内容，落 Store B knowledge 原子的素材） */
  termNote?: string;
}

export interface PlaybookStage {
  key: string;
  name: string;
  /** 一两句解释本阶段目的（向导开头展示） */
  purpose: string;
  /** 档位领域（闸门知识夹层按此读人的专长密度） */
  domain: ExpertiseDomain;
  interview: PlaybookInterviewQuestion[];
  document: {
    titleTemplate: string;
    /** 与 Document.category 对齐（requirement/design/api/testing/guide/custom） */
    category: 'requirement' | 'design' | 'api' | 'testing' | 'guide' | 'custom';
    intro: string;
    /** 需求类文档对功能项做 FR-N 编号 */
    numbered?: boolean;
  };
  gate: {
    title: string;
    detail: string;
    /** 后果预演：如果你选 B / 跳过，后面会发生什么（v2 纪要 §2.2 四段式） */
    consequences: string[];
  };
}

export interface PlaybookTemplate {
  key: string;
  name: string;
  description: string;
  audience: 'novice' | 'maintenance';
  stages: PlaybookStage[];
}

const SOFTWARE_FULL_CYCLE: PlaybookTemplate = {
  key: 'software-full-cycle',
  name: '软件项目全流程',
  description:
    '从调研到验收的托管剧本：每阶段访谈收集信息、产出正式工件、闸门由你拍板。',
  audience: 'novice',
  stages: [
    {
      key: 'research',
      name: '调研',
      purpose:
        '搞清楚「为谁做、解决什么问题」。这个阶段我们把背景和目标聊清楚，不需要任何专业名词。',
      domain: 'requirements',
      interview: [
        {
          id: 'who',
          question: '这个东西是做给谁用的？用一两句话描述一下典型用户。',
          hint: '例如：我们公司内部的行政同事，每天要处理报销单',
          term: '目标用户画像',
          termNote:
            '把"谁会用"写成一句可验证的描述，后续所有功能取舍都以它为准。',
        },
        {
          id: 'pain',
          question: '他们现在最头疼的一件事是什么？',
          hint: '例如：报销单要贴发票、找领导签字，经常弄丢',
          term: '核心痛点',
          termNote: '痛点是用户愿意换工具的原因；一个项目只解决一个核心痛点。',
        },
        {
          id: 'success',
          question: '做成之后，怎么判断它成功了？',
          hint: '例如：报销从 3 天缩短到半天，不用再追着签字',
          term: '成功指标',
          termNote: '可度量的成功标准，验收阶段会逐条对照。',
        },
        {
          id: 'scope',
          question: '有哪些明确"不做"的事情？',
          hint: '例如：不做手机端，不做财务对账',
          term: '范围边界（out of scope）',
          termNote: '写清不做什么，防止项目范围在半路悄悄膨胀（scope creep）。',
        },
      ],
      document: {
        titleTemplate: '调研纪要 · {project}',
        category: 'custom',
        intro:
          '本纪要由访谈回答结构化整理而成；「人话对照」标注了你的原话与专业概念的对应关系。',
      },
      gate: {
        title: '调研纪要已产出，确认进入需求分析？',
        detail:
          '调研纪要把"为谁做、解决什么问题"写成了可对照的文档。确认后进入需求分析阶段；也可以先驳回修改。',
        consequences: [
          '若跳过调研：需求分析将缺乏依据，后续返工概率显著上升。',
          '若现在驳回：回到访谈修改纪要，不影响已填内容。',
        ],
      },
    },
    {
      key: 'requirements',
      name: '需求分析',
      purpose:
        '把调研结论翻译成正式的需求文档。你说人话，文档讲专业——每一处翻译都标了对照。',
      domain: 'requirements',
      interview: [
        {
          id: 'features',
          question:
            '按重要程度，列出要做的功能（一行一个，最重要的在最前面）。',
          hint: '例如：\n拍照上传发票\n自动识别金额\n一键提交审批',
          term: '功能需求清单（FR）',
          termNote: '功能需求按编号管理（FR-1、FR-2…），优先级即排列顺序。',
        },
        {
          id: 'constraints',
          question:
            '有什么硬性限制？比如必须在什么系统上用、数据能不能出内网。',
          hint: '例如：只能在内网用；数据不能离开公司服务器',
          term: '非功能需求与约束',
          termNote: '性能、安全、合规这类"怎么做的限制"，和专业功能同等重要。',
        },
        {
          id: 'priority-users',
          question: '第一批先给多少人用？全公司还是先一个小团队试用？',
          hint: '例如：先给行政部 5 个人用一个月',
          term: '灰度发布范围',
          termNote: '小范围先行是控制风险的标准做法，出问题影响面小。',
        },
      ],
      document: {
        titleTemplate: '需求文档草案 · {project}',
        category: 'requirement',
        intro:
          '本草案由你的访谈回答逐条转写而成；每条都保留原话与专业对照，确认后作为需求真相源。',
        numbered: true,
      },
      gate: {
        title: '需求文档草案已产出，确认作为需求真相源？',
        detail:
          '确认后这份需求文档成为后续设计与验收的对照基准；驳回可回到访谈修改。',
        consequences: [
          '若确认：后续设计与验收都以本稿为准，改动需走变更。',
          '若跳过：没有需求基准，验收将无据可依。',
        ],
      },
    },
    {
      key: 'design',
      name: '设计',
      purpose:
        '确定怎么实现：模块怎么分、数据怎么存。老手可以直接跳过本阶段用自己的流程。',
      domain: 'technical',
      interview: [
        {
          id: 'approach',
          question: '打算用什么技术栈和现有系统？（没有想法可选"让 AI 建议"）',
          hint: '例如：Web 网页，公司已有 PostgreSQL 数据库',
          term: '技术选型',
          termNote: '技术选型决定后续所有开发约束，选型理由会存入项目档案。',
        },
        {
          id: 'integration',
          question: '需要和哪些现有系统打通？',
          hint: '例如：要读企业微信通讯录',
          term: '集成点',
          termNote: '集成点是最容易拖延的部分，要在设计期确认接口与权限。',
        },
      ],
      document: {
        titleTemplate: '设计说明 · {project}',
        category: 'design',
        intro:
          '设计说明把需求落到技术方案；「人话对照」解释每个技术决定对应的需求。',
      },
      gate: {
        title: '设计说明已产出，确认进入任务拆解？',
        detail: '设计确认后，需求就有了明确的技术实现路径。',
        consequences: [
          '若跳过设计：执行阶段将边写边定方案，返工风险自担（会记入事件，验收时可查）。',
        ],
      },
    },
    {
      key: 'breakdown',
      name: '拆解',
      purpose: '把设计切成一张张可执行、可验收的任务卡。',
      domain: 'process',
      interview: [
        {
          id: 'milestone',
          question: '第一个里程碑定在什么时候？先交付什么？',
          hint: '例如：两周内，行政部能提交报销单',
          term: '里程碑与交付物',
          termNote: '里程碑是可验收的最小交付切片，不是日期口号。',
        },
        {
          id: 'who-does',
          question: '任务主要由谁做？你自己、AI 托管，还是混合？',
          hint: '例如：AI 托管为主，我每天看一次进展',
          term: '执行分工',
          termNote: 'AI 托管的任务仍由你在闸门拍板，人只做决策。',
        },
      ],
      document: {
        titleTemplate: '任务拆解方案 · {project}',
        category: 'custom',
        intro: '拆解方案列出任务切片与首个里程碑；确认后任务将建入项目看板。',
      },
      gate: {
        title: '拆解方案已产出，确认建卡进入执行？',
        detail: '确认后按拆解方案在项目内创建任务卡并进入执行阶段。',
        consequences: [
          '若确认：项目看板出现首批任务卡，可随时在决策收件箱调整分派。',
        ],
      },
    },
    {
      key: 'execution',
      name: '执行',
      purpose:
        '按任务卡推进开发；进展与异常由管家主动汇报，你只处理需要拍板的事。',
      domain: 'process',
      interview: [
        {
          id: 'cadence',
          question: '你希望多久收到一次进展汇报？',
          hint: '例如：每天早上一条摘要，有异常随时报',
          term: '汇报节奏',
          termNote:
            '主动汇报只报异常与待决（terse 模式），可在偏好里随时调整。',
        },
      ],
      document: {
        titleTemplate: '执行计划 · {project}',
        category: 'custom',
        intro: '执行计划约定汇报节奏与异常上报口径；确认后开始按任务卡执行。',
      },
      gate: {
        title: '执行计划已确认，开始执行阶段？',
        detail: '执行阶段以任务卡为单位推进，闸门只在里程碑与异常时出现。',
        consequences: ['若确认：进入执行态，管家按约定节奏汇报。'],
      },
    },
    {
      key: 'acceptance',
      name: '验收',
      purpose: '对照调研阶段定下的成功指标逐条验收；通过即交付。',
      domain: 'acceptance',
      interview: [
        {
          id: 'acceptance-criteria',
          question:
            '对照成功指标，逐条确认是否达成（达成写"是"，未达成写现状）。',
          hint: '例如：报销半天内完成——是；不用追签字——部分达成，还差会签',
          term: '验收标准核对',
          termNote:
            '验收以调研阶段写的成功指标为基准逐条核对，避免"感觉做完了"。',
        },
      ],
      document: {
        titleTemplate: '验收报告 · {project}',
        category: 'testing',
        intro: '验收报告逐条对照成功指标；未达成项将转为遗留任务。',
      },
      gate: {
        title: '验收报告已产出，确认项目交付？',
        detail: '确认后项目进入交付态；未达成的验收项会自动转为遗留任务。',
        consequences: [
          '若确认：项目标记交付，剩余未达成项转遗留任务跟踪。',
          '若驳回：未达成项回到执行阶段继续处理。',
        ],
      },
    },
  ],
};

const MAINTENANCE_LIGHT: PlaybookTemplate = {
  key: 'maintenance-light',
  name: '维护型轻剧本',
  description:
    '半途接入项目的日常维护循环：变更受理 → 影响分析 → 审批 → 执行 → 验收。',
  audience: 'maintenance',
  stages: [
    {
      key: 'impact',
      name: '变更受理与影响分析',
      purpose: '改 A 之前先看 B、C 会不会被波及——档案里的模块地图在这里生效。',
      domain: 'technical',
      interview: [
        {
          id: 'change',
          question: '这次要改什么？为什么现在改？',
          hint: '例如：导出功能在大表上超时，客户催了',
          term: '变更请求',
          termNote: '变更请求 = 变更内容 + 触发原因，是影响分析的输入。',
        },
        {
          id: 'affected',
          question: '你觉得哪些模块可能被牵连？（AI 会结合模块地图补充）',
          hint: '例如：导出、报表可能共用同一个查询层',
          term: '影响面分析',
          termNote:
            '影响面 = 直接改动 + 共享依赖的间接波及，漏判间接波及是回归事故主因。',
        },
      ],
      document: {
        titleTemplate: '变更影响分析 · {project}',
        category: 'design',
        intro: '影响分析对照模块地图列出改动与波及面；确认后进入审批。',
      },
      gate: {
        title: '影响分析已产出，确认进入审批？',
        detail: '影响分析是变更审批的主要依据。',
        consequences: [
          '若跳过：变更直接执行，回归风险自担（会记入事件，出问题时可查）。',
        ],
      },
    },
    {
      key: 'approval',
      name: '审批',
      purpose: '变更是否执行的拍板点；批准后进入执行。',
      domain: 'process',
      interview: [
        {
          id: 'window',
          question: '什么时间窗口执行比较安全？',
          hint: '例如：周五晚上线后低峰期',
          term: '变更窗口',
          termNote: '变更窗口是控制事故爆炸半径的常规手段。',
        },
      ],
      document: {
        titleTemplate: '变更审批单 · {project}',
        category: 'custom',
        intro: '审批单汇总变更内容、影响面与执行窗口。',
      },
      gate: {
        title: '审批单已产出，批准执行这次变更？',
        detail: '批准后按审批单的窗口与范围执行。',
        consequences: ['若驳回：变更退回受理，补充信息后重新发起。'],
      },
    },
    {
      key: 'verify',
      name: '验收',
      purpose: '确认变更达成目的且没有引入回归。',
      domain: 'acceptance',
      interview: [
        {
          id: 'result',
          question: '变更后验证结果如何？原有功能正常吗？',
          hint: '例如：导出恢复正常，报表回归通过',
          term: '验证结论',
          termNote: '变更验收 = 目的达成 + 无回归，两者缺一不可。',
        },
      ],
      document: {
        titleTemplate: '变更验收结论 · {project}',
        category: 'testing',
        intro: '验收结论关闭本次变更循环。',
      },
      gate: {
        title: '验收结论已产出，关闭本次变更？',
        detail: '关闭后本次变更归档；经验会沉淀进项目档案。',
        consequences: ['若驳回：变更重新打开，回到影响分析。'],
      },
    },
  ],
};

// CAP-P-01 需求承接管道（主线）：小白给一句需求 → 访谈澄清 → 拆解 + 验收草案。
// 一期通常由统一创建面板「AI 代理模式」的 grill 环节前置澄清（grill 摘要可作为本剧本访谈的预填素材）。
const REQUIREMENT_PIPELINE: PlaybookTemplate = {
  key: 'requirement-pipeline',
  name: '需求承接',
  description:
    '从一句原始需求到可开工的工程任务与验收清单：调研 → 澄清 → 拆解 → 验收草案。',
  audience: 'novice',
  stages: [
    {
      key: 'research',
      name: '调研',
      purpose:
        '把「想做个什么东西」落到具体的人和痛点上——先搞清楚问题，再谈方案。',
      domain: 'requirements',
      interview: [
        {
          id: 'problem',
          question:
            '这个东西要解决什么问题？没有它的时候，你们现在是怎么凑合的？',
          hint: '例如：每次开完会都记不清谁答应了什么，全靠翻群聊',
          term: '问题陈述',
          termNote:
            '问题陈述 = 现象 + 影响 + 现状凑合方式，是需求的第一块积木。',
        },
        {
          id: 'users',
          question: '谁会天天用它？他们最头疼的一件事是什么？',
          hint: '例如：我们小组 5 个人，最头疼的是会后对不上结论',
        },
        {
          id: 'alternatives',
          question:
            '有没有现成的工具（哪怕是 Excel 或群接龙）在干类似的事？它哪里不够用？',
          hint: '例如：现在用共享文档记，但经常忘了更新',
        },
      ],
      document: {
        titleTemplate: '需求调研纪要 · {project}',
        category: 'requirement',
        intro: '调研纪要记录问题、用户与现状，是后续澄清与拆解的依据。',
      },
      gate: {
        title: '调研纪要已产出，确认进入需求澄清？',
        detail: '调研是需求的源头：问题找错了，后面做得再好也没用。',
        consequences: [
          '调研纪要归档为项目文档，可随时回看',
          '游标推进到「澄清」阶段',
          '若驳回：补充调研后重新提交',
        ],
      },
    },
    {
      key: 'clarify',
      name: '澄清',
      purpose: '划定这一期的边界——做到哪、不做什么、有什么约束，防止范围失控。',
      domain: 'requirements',
      interview: [
        {
          id: 'milestone-goal',
          question: '这一期做完的标志是什么——最先让谁用上什么功能？',
          hint: '例如：小组里所有人都能在手机上登记会议决定',
          term: '本期范围',
          termNote: '本期范围 = 第一个真实可用的场景，比功能清单更能对齐预期。',
        },
        {
          id: 'non-goals',
          question: '明确不做的有哪些？（想到「以后再说」的就写进来）',
          hint: '例如：不做语音转写、不做多团队',
          term: '非目标',
          termNote: '非目标 = 写下来的「不做」，是防范围蔓延最有效的手段。',
        },
        {
          id: 'constraints',
          question: '有什么硬约束吗？比如必须用某个系统、必须在某天前上线。',
          hint: '例如：只能用公司已有的账号体系，两周后要先用上',
        },
      ],
      document: {
        titleTemplate: '需求澄清纪要 · {project}',
        category: 'requirement',
        intro: '澄清纪要划定本期范围、非目标与约束，是拆解的输入。',
      },
      gate: {
        title: '需求已澄清，确认进入任务拆解？',
        detail: '确认后本期范围与边界就定下来了，改动需要走变更。',
        consequences: [
          '澄清纪要归档为项目文档',
          '游标推进到「拆解」阶段',
          '若驳回：范围或约束有变，修订后重新提交',
        ],
      },
    },
    {
      key: 'breakdown',
      name: '拆解',
      purpose: '把需求掰成一块块能动手的工程任务，标出最不确定的部分。',
      domain: 'technical',
      interview: [
        {
          id: 'pieces',
          question: '整件事可以拆成哪几块？每块一句话说清。',
          hint: '例如：① 决定登记表 ② 会后提醒 ③ 历史检索',
          term: '工作分解',
          termNote:
            '工作分解 = 把需求切成可独立交付的块，每块能在一两周内做完为宜。',
        },
        {
          id: 'riskiest',
          question: '哪一块最没把握、最容易出问题？',
          hint: '例如：会后提醒的推送到达率',
        },
        {
          id: 'order',
          question: '这几块的先后顺序是什么？什么必须先做？',
          hint: '例如：先有登记表才有数据可提醒',
        },
      ],
      document: {
        titleTemplate: '工程任务拆解 · {project}',
        category: 'design',
        numbered: true,
        intro: '拆解清单按块编号；确认后可据此建立工程任务。',
      },
      gate: {
        title: '任务拆解已产出，确认建立工程任务？',
        detail: '拆解确认后，各块将作为工程任务跟踪执行。',
        consequences: [
          '拆解清单归档为项目文档',
          '游标推进到「验收草案」阶段',
          '若驳回：拆解粒度或顺序不合适，修订后重新提交',
        ],
      },
    },
    {
      key: 'acceptance-draft',
      name: '验收草案',
      purpose:
        '开工前先约定「怎么算做完」——可检查的验收标准是治理的最后一道门。',
      domain: 'acceptance',
      interview: [
        {
          id: 'criteria',
          question: '怎么算「做完了」？试着写出 3 条能检查的标准。',
          hint: '例如：会后 10 分钟内能在手机上查到本次决定',
          term: '验收标准',
          termNote:
            '验收标准 = 可检查、可复现的完成条件，避免「我觉得做完了」。',
        },
        {
          id: 'acceptor',
          question: '谁来验收？按什么流程试一遍就算通过？',
          hint: '例如：小组长按「登记→提醒→检索」走一遍',
        },
        {
          id: 'risks',
          question: '有哪些容易翻车的点需要重点检查？',
          hint: '例如：手机上网络差时能不能正常提交',
        },
      ],
      document: {
        titleTemplate: '验收草案 · {project}',
        category: 'testing',
        intro: '验收草案约定完成标准与验收流程，执行完成后按此收口。',
      },
      gate: {
        title: '验收草案已产出，确认完成需求承接？',
        detail: '确认后本剧本走完：需求已带着验收标准进入执行管道。',
        consequences: [
          '验收草案归档为项目文档，供验收阶段比对',
          '剧本游标走完，工程任务按拆解清单跟踪',
          '若驳回：验收标准不可检查，修订后重新提交',
        ],
      },
    },
  ],
};

export const BUILTIN_PLAYBOOKS: PlaybookTemplate[] = [
  SOFTWARE_FULL_CYCLE,
  MAINTENANCE_LIGHT,
  REQUIREMENT_PIPELINE,
];

export const PLAYBOOK_REGISTRY_VERSION = '1';

export function getPlaybookTemplate(key: string): PlaybookTemplate | null {
  return BUILTIN_PLAYBOOKS.find((p) => p.key === key) ?? null;
}

export function getStage(
  templateKey: string,
  stageKey: string,
): PlaybookStage | null {
  return (
    getPlaybookTemplate(templateKey)?.stages.find((s) => s.key === stageKey) ??
    null
  );
}

export function nextStageKey(
  templateKey: string,
  stageKey: string,
): string | null {
  const stages = getPlaybookTemplate(templateKey)?.stages ?? [];
  const idx = stages.findIndex((s) => s.key === stageKey);
  if (idx < 0 || idx === stages.length - 1) return null;
  return stages[idx + 1].key;
}

export function firstStageKey(templateKey: string): string | null {
  return getPlaybookTemplate(templateKey)?.stages[0]?.key ?? null;
}

/** 闸门知识夹层素材：本阶段全部术语对照（决策卡知识层 / knowledge 原子的来源） */
export function stageKnowledge(stage: PlaybookStage): Array<{
  term: string;
  note: string;
  questionId: string;
}> {
  return stage.interview
    .filter((q) => q.term && q.termNote)
    .map((q) => ({
      term: q.term as string,
      note: q.termNote as string,
      questionId: q.id,
    }));
}
