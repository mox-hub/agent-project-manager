import {
  approvalRiskQuestions,
  extractApprovalRisk,
  evidencePrecheckQuestions,
  extractEvidencePrecheck,
} from './judge-scenarios';

/** CAP-A-27 场景注册表：questions 构造 + answers 提取容错 */

describe('approval_risk 场景（P0-A）', () => {
  it('questions 两问：risk_level Choice 三选一 + safe_to_auto_approve Noul', () => {
    const qs = approvalRiskQuestions();
    expect(qs.map((q) => q.id)).toEqual(['risk_level', 'safe_to_auto_approve']);
    expect(qs[0].type).toBe('choice');
    expect(Object.keys(qs[0].criteria as Record<string, string>)).toEqual([
      'read',
      'write',
      'high_risk',
    ]);
    expect(qs[1].type).toBe('noul');
  });

  it('提取：choice + noul 全量解析', () => {
    const j = extractApprovalRisk({
      risk_level: {
        type: 'choice',
        choice: 'write',
        confidence: 0.63,
        probabilities: { read: 0.1, write: 0.75, high_risk: 0.15 },
      },
      safe_to_auto_approve: { type: 'noul', noul: 0.44 },
    });
    expect(j).toEqual({
      riskLevel: 'write',
      confidence: 0.63,
      probabilities: { read: 0.1, write: 0.75, high_risk: 0.15 },
      safeToAutoApprove: 0.44,
    });
  });

  it('容错：缺键/未知选项/类型不符 → 对应字段 null，不抛', () => {
    expect(extractApprovalRisk({})).toEqual({
      riskLevel: null,
      confidence: null,
      probabilities: null,
      safeToAutoApprove: null,
    });
    expect(
      extractApprovalRisk({
        risk_level: { type: 'choice', choice: 'nuclear', confidence: 0.9 },
        safe_to_auto_approve: { type: 'choice', choice: 'x', confidence: 0.5 },
      }).riskLevel,
    ).toBeNull();
    expect(
      extractApprovalRisk({
        risk_level: { type: 'noul', noul: 0.5 },
      }).confidence,
    ).toBeNull();
  });
});

describe('evidence_precheck 场景（P0-B）', () => {
  it('questions 两问：verdict Choice 三态 + evidence_sufficient Noul', () => {
    const qs = evidencePrecheckQuestions();
    expect(qs.map((q) => q.id)).toEqual(['verdict', 'evidence_sufficient']);
    expect(Object.keys(qs[0].criteria as Record<string, string>)).toEqual([
      'passed',
      'failed',
      'unclear',
    ]);
  });

  it('提取正常 + 畸形 answers 全 null 容错', () => {
    const ok = extractEvidencePrecheck({
      verdict: {
        type: 'choice',
        choice: 'passed',
        confidence: 0.99,
        probabilities: { passed: 0.9 },
      },
      evidence_sufficient: { type: 'noul', noul: 0.88 },
    });
    expect(ok.verdict).toBe('passed');
    expect(ok.evidenceSufficient).toBe(0.88);

    expect(extractEvidencePrecheck({})).toEqual({
      verdict: null,
      confidence: null,
      probabilities: null,
      evidenceSufficient: null,
    });
  });
});
