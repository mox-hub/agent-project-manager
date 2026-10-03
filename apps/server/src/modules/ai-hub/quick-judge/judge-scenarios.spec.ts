import {
  approvalRiskQuestions,
  extractApprovalRisk,
  evidencePrecheckQuestions,
  extractEvidencePrecheck,
  failureClassifyQuestions,
  extractFailureClassify,
  completionTypeQuestions,
  extractCompletionType,
  auditCoverageQuestions,
  extractAuditCoverage,
  decisionOptionQuestions,
  extractDecisionOption,
} from './judge-scenarios';

/** CAP-A-27 场景注册表：questions 构造 + answers 提取容错 */

describe('approval_risk 场景（P0-A）', () => {
  it('questions 两问：risk_level Choice 三选一 + safe_to_auto_approve Noul', () => {
    const qs = approvalRiskQuestions();
    expect(qs.map((q) => q.id)).toEqual([
      'risk_level',
      'safe_to_auto_approve',
      'approval_choice',
    ]);
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
    expect(j).toMatchObject({
      riskLevel: 'write',
      confidence: 0.63,
      probabilities: { read: 0.1, write: 0.75, high_risk: 0.15 },
      safeToAutoApprove: 0.44,
    });
    expect(j.options).toBeNull(); // approval_choice 缺席 → options null
  });

  it('容错：缺键/未知选项/类型不符 → 对应字段 null，不抛', () => {
    expect(extractApprovalRisk({})).toEqual({
      riskLevel: null,
      confidence: null,
      probabilities: null,
      safeToAutoApprove: null,
      options: null,
      optionsChoice: null,
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

describe('approval_risk 扩展批二：approval_choice 选项分布', () => {
  it('questions 第三问 approval_choice Choice（approve/reject/needs_more_info）', () => {
    const qs = approvalRiskQuestions();
    expect(qs.map((q) => q.id)).toEqual([
      'risk_level',
      'safe_to_auto_approve',
      'approval_choice',
    ]);
    expect(Object.keys(qs[2].criteria as Record<string, string>)).toEqual([
      'approve',
      'reject',
      'needs_more_info',
    ]);
  });

  it('提取：options 概率分布与 optionsChoice', () => {
    const j = extractApprovalRisk({
      risk_level: { type: 'choice', choice: 'read', confidence: 0.8 },
      approval_choice: {
        type: 'choice',
        choice: 'approve',
        confidence: 0.9,
        probabilities: { approve: 0.7, reject: 0.2, needs_more_info: 0.1 },
      },
    });
    expect(j.options).toEqual({
      approve: 0.7,
      reject: 0.2,
      needs_more_info: 0.1,
    });
    expect(j.optionsChoice).toBe('approve');
  });
});

describe('failure_classify 场景（扩展批三）', () => {
  it('questions 单问 category Choice 四类', () => {
    const qs = failureClassifyQuestions();
    expect(qs.map((q) => q.id)).toEqual(['category']);
    expect(Object.keys(qs[0].criteria as Record<string, string>)).toEqual([
      'environment',
      'input',
      'dependency',
      'other',
    ]);
  });

  it('提取：合法类别与置信；非法 choice 归 null 不抛', () => {
    const ok = extractFailureClassify({
      category: { type: 'choice', choice: 'environment', confidence: 0.75 },
    });
    expect(ok).toEqual({ category: 'environment', confidence: 0.75 });
    const bad = extractFailureClassify({
      category: { type: 'choice', choice: 'nonsense', confidence: 0.5 },
    });
    expect(bad.category).toBeNull();
    const missing = extractFailureClassify({});
    expect(missing.category).toBeNull();
  });
});

describe('completion_type 场景（扩展批三）', () => {
  it('questions 单问四态契约形态', () => {
    const qs = completionTypeQuestions();
    expect(qs.map((q) => q.id)).toEqual(['completion_type']);
    expect(Object.keys(qs[0].criteria as Record<string, string>)).toEqual([
      'pr',
      'test_report',
      'document',
      'artifact',
    ]);
  });

  it('提取：合法形态解析 + 非法归 null', () => {
    expect(
      extractCompletionType({
        completion_type: { type: 'choice', choice: 'pr', confidence: 0.7 },
      }),
    ).toEqual({ type: 'pr', confidence: 0.7 });
    expect(
      extractCompletionType({
        completion_type: { type: 'noul', noul: 0.9 },
      }).type,
    ).toBeNull();
  });
});

describe('audit_coverage 场景（扩展批三）', () => {
  it('questions 单问 covered Noul', () => {
    const qs = auditCoverageQuestions();
    expect(qs.map((q) => q.id)).toEqual(['covered']);
    expect(qs[0].type).toBe('noul');
  });

  it('提取：noul 概率直读（无置信字段）', () => {
    expect(
      extractAuditCoverage({ covered: { type: 'noul', noul: 0.86 } }),
    ).toEqual({ covered: 0.86 });
    expect(extractAuditCoverage({}).covered).toBeNull();
  });
});

describe('decision_option 场景（扩展批三：验收卡选项倾向）', () => {
  it('questions 单问 decision_choice Choice，criteria 由调用方按卡种给定', () => {
    const qs = decisionOptionQuestions({
      accept: '证据充分，可以通过验收',
      reject: '证据不足或未达成，应当驳回退回执行方',
      waive: '可以豁免：不再要求证据直接放行',
    });
    expect(qs).toHaveLength(1);
    expect(qs[0].id).toBe('decision_choice');
    expect(qs[0].type).toBe('choice');
    expect(Object.keys(qs[0].criteria as Record<string, string>)).toEqual([
      'accept',
      'reject',
      'waive',
    ]);
  });

  it('提取：choice + confidence + probabilities 全量解析', () => {
    expect(
      extractDecisionOption({
        decision_choice: {
          type: 'choice',
          choice: 'accept',
          confidence: 0.82,
          probabilities: { accept: 0.86, reject: 0.1, waive: 0.04 },
        },
      }),
    ).toEqual({
      confidence: 0.82,
      options: { accept: 0.86, reject: 0.1, waive: 0.04 },
      optionsChoice: 'accept',
    });
  });

  it('容错：缺键/类型不符/无 probabilities → 对应字段 null，不抛', () => {
    expect(extractDecisionOption({})).toEqual({
      confidence: null,
      options: null,
      optionsChoice: null,
    });
    expect(
      extractDecisionOption({ decision_choice: { type: 'noul', noul: 0.5 } }),
    ).toEqual({
      confidence: null,
      options: null,
      optionsChoice: null,
    });
    expect(
      extractDecisionOption({
        decision_choice: { type: 'choice', choice: 'reject' },
      }).options,
    ).toBeNull();
  });
});
