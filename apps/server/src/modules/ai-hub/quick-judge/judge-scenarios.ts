/**
 * quick-judge 场景注册表（CAP-A-27）：P0 两场景的 questions 构造与 answers 提取。
 * 纯函数、无 Nest 依赖——questions 文案与提取口径集中于此，消费方不散落硬编码。
 * 提取器容错：answers 缺键/类型不符一律返回 null（调用方按「无判断结果」处理）。
 */
import { QuickJudgeAnswer, QuickJudgeQuestion } from './quick-judge.service';

// ---------- P0-A 审批风险定级（approval_risk） ----------

export function approvalRiskQuestions(): QuickJudgeQuestion[] {
  return [
    {
      id: 'risk_level',
      type: 'choice',
      instructions: '这个审批请求的操作风险等级是？',
      criteria: {
        read: '只读操作，对系统数据无任何改动',
        write: '常规数据变更（创建/更新/提交），可回滚',
        high_risk: '不可逆操作、批量影响、权限变更、对外发布或影响其他用户',
      },
    },
    {
      id: 'safe_to_auto_approve',
      type: 'noul',
      instructions:
        '假设该请求已通过身份与权限校验，仅从操作本身的风险考虑：是否可以不经人工审查直接批准？',
    },
  ];
}

export interface ApprovalRiskJudgement {
  riskLevel: 'read' | 'write' | 'high_risk' | null;
  confidence: number | null;
  probabilities: Record<string, number> | null;
  safeToAutoApprove: number | null;
}

export function extractApprovalRisk(
  answers: Record<string, QuickJudgeAnswer>,
): ApprovalRiskJudgement {
  const risk = answers.risk_level;
  const safe = answers.safe_to_auto_approve;
  return {
    riskLevel:
      risk?.type === 'choice' &&
      (risk.choice === 'read' ||
        risk.choice === 'write' ||
        risk.choice === 'high_risk')
        ? risk.choice
        : null,
    confidence:
      risk?.type === 'choice' && typeof risk.confidence === 'number'
        ? risk.confidence
        : null,
    probabilities:
      risk?.type === 'choice' && risk.probabilities
        ? (risk.probabilities as Record<string, number>)
        : null,
    safeToAutoApprove:
      safe?.type === 'noul' && typeof safe.noul === 'number' ? safe.noul : null,
  };
}

// ---------- P0-B 验收证据预审（evidence_precheck） ----------

export function evidencePrecheckQuestions(): QuickJudgeQuestion[] {
  return [
    {
      id: 'verdict',
      type: 'choice',
      instructions: '该证据对这条验收标准的判定结论是？',
      criteria: {
        passed: '证据正面且充分地证明了标准达成',
        failed: '证据正面地证明了标准未达成',
        unclear: '证据不相关、不完整、间接或不足以判定',
      },
    },
    {
      id: 'evidence_sufficient',
      type: 'noul',
      instructions: '仅就「这份证据是否足以支撑对标准的判定」回答：充分吗？',
    },
  ];
}

export interface EvidencePrecheckJudgement {
  verdict: 'passed' | 'failed' | 'unclear' | null;
  confidence: number | null;
  probabilities: Record<string, number> | null;
  evidenceSufficient: number | null;
}

export function extractEvidencePrecheck(
  answers: Record<string, QuickJudgeAnswer>,
): EvidencePrecheckJudgement {
  const v = answers.verdict;
  const s = answers.evidence_sufficient;
  return {
    verdict:
      v?.type === 'choice' &&
      (v.choice === 'passed' || v.choice === 'failed' || v.choice === 'unclear')
        ? v.choice
        : null,
    confidence:
      v?.type === 'choice' && typeof v.confidence === 'number'
        ? v.confidence
        : null,
    probabilities:
      v?.type === 'choice' && v.probabilities
        ? (v.probabilities as Record<string, number>)
        : null,
    evidenceSufficient:
      s?.type === 'noul' && typeof s.noul === 'number' ? s.noul : null,
  };
}

// ---------- P1-C intake 完备性快筛（intake_readiness） ----------
// 注意：这是原 readiness-review 大模型场景的「枚举快筛」档——只出三态判断与
// verdict（附校准置信度），evidence/缺口账/summary 等文本内容 JEV 不产出，
// 由调用方模板化合成；完整评估（含缺口账）走原大模型通道，两档并存。

export const INTAKE_READINESS_DIMENSIONS = [
  'goal',
  'scope',
  'scenario',
  'acceptance',
  'dependency',
  'fallback',
] as const;

export function intakeReadinessQuestions(): QuickJudgeQuestion[] {
  return [
    ...INTAKE_READINESS_DIMENSIONS.map(
      (key) =>
        ({
          id: `dim_${key}`,
          type: 'choice' as const,
          instructions: `维度「${key}」的信息完备度（goal=目标与价值/scope=范围边界/scenario=用户场景/acceptance=验收可判定/dependency=依赖约束/fallback=失败降级）`,
          criteria: {
            ready: '工件有明确答案',
            unclear: '有线索但含糊',
            missing: '工件只字未提',
          },
        }) satisfies QuickJudgeQuestion,
    ),
    {
      id: 'verdict',
      type: 'choice',
      instructions: '综合判定这条需求是否可以进入拆解开工',
      criteria: {
        ready: '可开工',
        'needs-clarification': '有非阻塞缺口，可边做边补',
        blocked: '有阻塞缺口，先补再拆解',
      },
    },
  ];
}

export interface IntakeReadinessJudgement {
  dimensions: Array<{
    key: string;
    status: 'ready' | 'unclear' | 'missing' | null;
    confidence: number | null;
  }>;
  verdict: 'ready' | 'needs-clarification' | 'blocked' | null;
  confidence: number | null;
}

export function extractIntakeReadiness(
  answers: Record<string, QuickJudgeAnswer>,
): IntakeReadinessJudgement {
  const statuses = ['ready', 'unclear', 'missing'] as const;
  const dimensions = INTAKE_READINESS_DIMENSIONS.map((key) => {
    const a = answers[`dim_${key}`];
    return {
      key,
      status:
        a?.type === 'choice' &&
        (statuses as readonly string[]).includes(a.choice ?? '')
          ? (a.choice as (typeof statuses)[number])
          : null,
      confidence:
        a?.type === 'choice' && typeof a.confidence === 'number'
          ? a.confidence
          : null,
    };
  });
  const v = answers.verdict;
  return {
    dimensions,
    verdict:
      v?.type === 'choice' &&
      ['ready', 'needs-clarification', 'blocked'].includes(v.choice ?? '')
        ? (v.choice as IntakeReadinessJudgement['verdict'])
        : null,
    confidence:
      v?.type === 'choice' && typeof v.confidence === 'number'
        ? v.confidence
        : null,
  };
}

// ---------- P1-C intake 拆解质量快筛（intake_decomposition） ----------

export function intakeDecompositionQuestions(
  taskCount: number,
): QuickJudgeQuestion[] {
  const tasks = Array.from({ length: taskCount }, (_, i) => i);
  const perTask: QuickJudgeQuestion[][] = tasks.map((i) => [
    {
      id: `gran_${i}`,
      type: 'choice',
      instructions: `任务 #${i} 的颗粒度`,
      criteria: {
        ok: '颗粒度合适',
        'too-big': '估时超 3 天或含多个可独立验收的交付物',
        'too-small': '不足 2 小时且与相邻任务强耦合应合并',
      } as Record<string, string>,
    },
    {
      id: `test_${i}`,
      type: 'choice',
      instructions: `任务 #${i} 的可测性`,
      criteria: {
        ok: '验收标准可检查',
        weak: '没有可判定的完成迹象（含无验收标准）',
      } as Record<string, string>,
    },
  ]);
  return [
    ...perTask.flat(),
    {
      id: 'verdict',
      type: 'choice',
      instructions: '综合判定这份拆解的质量',
      criteria: {
        healthy: '结构健康可批卡',
        'needs-review': '有任务需要调整后复评',
        rework: '需要重新拆解',
      } as Record<string, string>,
    },
  ];
}

export interface IntakeDecompositionJudgement {
  tasks: Array<{
    index: number;
    granularity: 'ok' | 'too-big' | 'too-small' | null;
    testability: 'ok' | 'weak' | null;
    confidence: number | null;
  }>;
  verdict: 'healthy' | 'needs-review' | 'rework' | null;
  confidence: number | null;
}

export function extractIntakeDecomposition(
  answers: Record<string, QuickJudgeAnswer>,
): IntakeDecompositionJudgement {
  const gran = ['ok', 'too-big', 'too-small'] as const;
  const test = ['ok', 'weak'] as const;
  const indices = Object.keys(answers)
    .filter((k) => k.startsWith('gran_'))
    .map((k) => Number(k.slice(5)))
    .filter((n) => Number.isInteger(n) && n >= 0)
    .sort((a, b) => a - b);
  const tasks = indices.map((index) => {
    const g = answers[`gran_${index}`];
    const t = answers[`test_${index}`];
    return {
      index,
      granularity:
        g?.type === 'choice' &&
        (gran as readonly string[]).includes(g.choice ?? '')
          ? (g.choice as (typeof gran)[number])
          : null,
      testability:
        t?.type === 'choice' &&
        (test as readonly string[]).includes(t.choice ?? '')
          ? (t.choice as (typeof test)[number])
          : null,
      confidence:
        g?.type === 'choice' && typeof g.confidence === 'number'
          ? g.confidence
          : null,
    };
  });
  const v = answers.verdict;
  return {
    tasks,
    verdict:
      v?.type === 'choice' &&
      ['healthy', 'needs-review', 'rework'].includes(v.choice ?? '')
        ? (v.choice as IntakeDecompositionJudgement['verdict'])
        : null,
    confidence:
      v?.type === 'choice' && typeof v.confidence === 'number'
        ? v.confidence
        : null,
  };
}

// ---------- P1-D 契约漂移语义判定（contract_drift） ----------
// managed 绑定字节级漂移检出后、升级决策卡前跑：benign 且高置信 → 仅记通知
// 不建卡；semantic-break / formatting-only / 低置信 → 照旧升级人审。

export function contractDriftQuestions(): QuickJudgeQuestion[] {
  return [
    {
      id: 'impact',
      type: 'choice',
      instructions: '文件实际内容相对契约托管区间的这次偏差，语义影响是？',
      criteria: {
        benign: '不影响契约语义（纯注释、措辞微调、内容一致仅空白差异）',
        'semantic-break':
          '实质改变或破坏了契约约定的语义（规则/边界/行为被改动）',
        'formatting-only': '仅格式差异（空白/换行/引号风格），语义完全一致',
      },
    },
  ];
}

export interface ContractDriftJudgement {
  impact: 'benign' | 'semantic-break' | 'formatting-only' | null;
  confidence: number | null;
  probabilities: Record<string, number> | null;
}

export function extractContractDrift(
  answers: Record<string, QuickJudgeAnswer>,
): ContractDriftJudgement {
  const a = answers.impact;
  return {
    impact:
      a?.type === 'choice' &&
      ['benign', 'semantic-break', 'formatting-only'].includes(a.choice ?? '')
        ? (a.choice as ContractDriftJudgement['impact'])
        : null,
    confidence:
      a?.type === 'choice' && typeof a.confidence === 'number'
        ? a.confidence
        : null,
    probabilities:
      a?.type === 'choice' && a.probabilities
        ? (a.probabilities as Record<string, number>)
        : null,
  };
}

// ---------- P1-E trust 执行评估四维打分（trust_evaluation，双轨只记账） ----------
// 与 TRUST_CRITERIA_SUCCESS/FAILURE 查表常量并行：judge 四维 Score 结果只落
// SystemEvent 双轨留痕，**不改动信任档案**；对比期后另行裁决是否切换。

export const TRUST_DIMENSIONS = [
  'correctness',
  'efficiency',
  'safety',
  'collaboration',
] as const;

export function trustEvaluationQuestions(): QuickJudgeQuestion[] {
  const tierCriteria = [
    '0-9 完全失败无产出',
    '10-19 仅尝试无有效产出',
    '20-29 产出极薄远未达目标',
    '30-39 失败且问题未解决',
    '40-49 目标大幅未完成',
    '50-59 部分完成有明显缺口',
    '60-69 基本完成但有明显缺陷',
    '70-79 完成但有保留',
    '80-89 高质量完成',
    '90-100 完整高质量交付',
  ];
  return TRUST_DIMENSIONS.map(
    (dim) =>
      ({
        id: `score_${dim}`,
        type: 'score',
        instructions: `按执行输出对目标完成质量，从「${dim}」维度打分（correctness=正确性/efficiency=效率/safety=安全边界/collaboration=协作规范）`,
        criteria: tierCriteria,
      }) satisfies QuickJudgeQuestion,
  );
}

export interface TrustEvaluationJudgement {
  scores: Partial<Record<(typeof TRUST_DIMENSIONS)[number], number | null>>;
  confidences: Partial<
    Record<(typeof TRUST_DIMENSIONS)[number], number | null>
  >;
}

export function extractTrustEvaluation(
  answers: Record<string, QuickJudgeAnswer>,
): TrustEvaluationJudgement {
  const scores: TrustEvaluationJudgement['scores'] = {};
  const confidences: TrustEvaluationJudgement['confidences'] = {};
  for (const dim of TRUST_DIMENSIONS) {
    const a = answers[`score_${dim}`];
    // score 返回档位空间 0-9（十档），×100/9 折算 0-100 口径与查表常量对齐
    scores[dim] =
      typeof a?.score === 'number' ? Math.round(a.score * (100 / 9)) : null;
    confidences[dim] =
      a?.type === 'score' && typeof a.confidence === 'number'
        ? a.confidence
        : null;
  }
  return { scores, confidences };
}
