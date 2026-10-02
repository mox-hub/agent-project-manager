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
