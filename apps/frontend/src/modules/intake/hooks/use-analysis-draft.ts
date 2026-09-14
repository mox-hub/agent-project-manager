import { useMutation } from '@tanstack/react-query';
import { assistantApi } from '@/modules/assistant/api/assistant-api';

/**
 * 需求分析代写（CAP-P-01 四期）：读调研/澄清工件（+服务端注入的项目契约绑定做
 * 影响面 grounding），AI 代写结构化分析报告，人确认后组装 markdown 落 analysis 文档。
 */

export interface AnalysisDraftResult {
  feasibility: {
    verdict: 'go' | 'conditional' | 'no-go';
    rationale: string;
    conditions: string[];
  };
  impact: { summary: string; affectedAreas: string[] };
  dependencies: Array<{ item: string; note?: string }>;
  risks: Array<{
    risk: string;
    severity: 'high' | 'medium' | 'low';
    mitigation?: string;
  }>;
  acceptancePreview: Array<{ content: string; criteriaType?: string }>;
}

const VERDICTS = ['go', 'conditional', 'no-go'] as const;
const SEVERITIES = ['high', 'medium', 'low'] as const;

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v)
    ? v.map(asString).filter((s) => !!s)
    : [];
}

/** 防御性收敛：verdict/severity 不合法时降级为可渲染的空形态，绝不让 AI 脏数据炸 UI */
export function parseAnalysisDraft(
  data: Record<string, unknown>,
): AnalysisDraftResult | null {
  const raw = data.feasibility;
  const feasibility =
    typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const verdict = VERDICTS.includes(feasibility.verdict as never)
    ? (feasibility.verdict as AnalysisDraftResult['feasibility']['verdict'])
    : 'conditional';

  const impactRaw =
    typeof data.impact === 'object' && data.impact !== null
      ? (data.impact as Record<string, unknown>)
      : {};
  const dependencies = Array.isArray(data.dependencies)
    ? (data.dependencies as unknown[])
        .map((d) => {
          const item =
            typeof d === 'object' && d !== null ? (d as Record<string, unknown>) : {};
          return { item: asString(item.item), note: asString(item.note) || undefined };
        })
        .filter((d) => !!d.item)
    : [];
  const risks = Array.isArray(data.risks)
    ? (data.risks as unknown[])
        .map((r) => {
          const item =
            typeof r === 'object' && r !== null ? (r as Record<string, unknown>) : {};
          const severity = SEVERITIES.includes(item.severity as never)
            ? (item.severity as AnalysisDraftResult['risks'][number]['severity'])
            : 'medium';
          return {
            risk: asString(item.risk),
            severity,
            mitigation: asString(item.mitigation) || undefined,
          };
        })
        .filter((r) => !!r.risk)
        .slice(0, 5)
    : [];
  const acceptancePreview = Array.isArray(data.acceptancePreview)
    ? (data.acceptancePreview as unknown[])
        .map((a) => {
          const item =
            typeof a === 'object' && a !== null ? (a as Record<string, unknown>) : {};
          return {
            content: asString(item.content),
            criteriaType: asString(item.criteriaType) || 'functional',
          };
        })
        .filter((a) => !!a.content)
        .slice(0, 6)
    : [];

  const result: AnalysisDraftResult = {
    feasibility: {
      verdict,
      rationale: asString(feasibility.rationale),
      conditions: asStringArray(feasibility.conditions),
    },
    impact: {
      summary: asString(impactRaw.summary),
      affectedAreas: asStringArray(impactRaw.affectedAreas),
    },
    dependencies,
    risks,
    acceptancePreview,
  };
  const hasContent =
    result.feasibility.rationale ||
    result.impact.summary ||
    result.risks.length > 0 ||
    result.acceptancePreview.length > 0;
  return hasContent ? result : null;
}

const VERDICT_LABELS: Record<AnalysisDraftResult['feasibility']['verdict'], string> = {
  go: '可行',
  conditional: '有条件可行',
  'no-go': '不建议开工',
};

/** 把确认后的 payload 组装为分析报告 markdown（落 analysis 文档的正文） */
export function buildAnalysisMarkdown(
  projectName: string,
  draft: AnalysisDraftResult,
): string {
  const lines: string[] = [];
  lines.push(`# 需求分析报告 · ${projectName}`);
  lines.push('');
  lines.push('> AI 同事代写草稿，经人确认归档；拆解与验收以本报告为依据。');
  lines.push('');
  lines.push('## 可行性');
  lines.push(`- **结论**：${VERDICT_LABELS[draft.feasibility.verdict]}`);
  if (draft.feasibility.rationale) {
    lines.push(`- **理由**：${draft.feasibility.rationale}`);
  }
  if (draft.feasibility.conditions.length > 0) {
    lines.push('- **放行条件**：');
    draft.feasibility.conditions.forEach((c) => lines.push(`  - ${c}`));
  }
  lines.push('');
  lines.push('## 影响面');
  if (draft.impact.summary) {
    lines.push(`- ${draft.impact.summary}`);
  }
  if (draft.impact.affectedAreas.length > 0) {
    lines.push('- 受影响范围：');
    draft.impact.affectedAreas.forEach((a) => lines.push(`  - ${a}`));
  }
  lines.push('');
  if (draft.dependencies.length > 0) {
    lines.push('## 依赖');
    draft.dependencies.forEach((d) =>
      lines.push(`- **${d.item}**${d.note ? `：${d.note}` : ''}`),
    );
    lines.push('');
  }
  if (draft.risks.length > 0) {
    lines.push('## 风险');
    draft.risks.forEach((r) => {
      const mitigation = r.mitigation ? `（应对：${r.mitigation}）` : '';
      lines.push(`- **${r.risk}**［${r.severity}］${mitigation}`);
    });
    lines.push('');
  }
  if (draft.acceptancePreview.length > 0) {
    lines.push('## 验收要点（预清单）');
    draft.acceptancePreview.forEach((a) => lines.push(`- [ ] ${a.content}`));
    lines.push('');
  }
  return lines.join('\n');
}

export { VERDICT_LABELS };

export function useAnalysisDraft(projectId: string | undefined) {
  return useMutation({
    mutationFn: async (input: {
      researchDocumentId?: string;
      clarifyDocumentId?: string;
    }): Promise<AnalysisDraftResult> => {
      const result = await assistantApi.silent('analysis-draft', {
        projectId,
        context: {
          researchDocumentId: input.researchDocumentId,
          clarifyDocumentId: input.clarifyDocumentId,
        },
      });
      const parsed = parseAnalysisDraft(result.data);
      if (!parsed) {
        throw new Error('AI 没有给出可用的分析内容，请重试');
      }
      return parsed;
    },
  });
}
