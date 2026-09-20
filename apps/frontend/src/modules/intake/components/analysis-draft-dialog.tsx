import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { documentApi } from '@/modules/document/api/document-api';
import {
  useAnalysisDraft,
  buildAnalysisMarkdown,
  VERDICT_LABELS,
  type AnalysisDraftResult,
} from '../hooks/use-analysis-draft';

export interface AnalysisSourceDoc {
  id: string;
  title: string;
  projectName?: string | null;
}

/**
 * 需求分析代写对话框（CAP-P-01 四期）：选调研/澄清工件 → AI 代写结构化分析
 * （可行性/影响面/依赖/风险/验收预清单）→ 人确认后落 category=analysis 文档。
 * 「代写 → 人确认」主轴语法：AI 只出草稿，落稿由人按下确认键。
 */
export function AnalysisDraftDialog({
  open,
  onOpenChange,
  projectId,
  docs,
  defaultResearchId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  docs: AnalysisSourceDoc[];
  defaultResearchId?: string;
}) {
  const { t } = useTranslation();
  const [researchId, setResearchId] = useState<string>('');
  const [clarifyId, setClarifyId] = useState<string>('');
  const [draft, setDraft] = useState<AnalysisDraftResult | null>(null);

  const generate = useAnalysisDraft(projectId);

  useEffect(() => {
    if (open) {
      setResearchId(defaultResearchId ?? '');
      setClarifyId('');
      setDraft(null);
      generate.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultResearchId]);

  const saveDoc = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error('no draft');
      const projectName =
        docs.find((d) => d.id === researchId)?.projectName ??
        docs.find((d) => d.id === clarifyId)?.projectName ??
        '';
      return documentApi.create({
        title: projectName
          ? `需求分析报告 · ${projectName}`
          : '需求分析报告',
        content: buildAnalysisMarkdown(projectName, draft),
        category: 'analysis',
        projectId,
      });
    },
    onSuccess: () => onOpenChange(false),
  });

  const researchOptions = useMemo(
    () =>
      docs.map((d) => ({
        value: d.id,
        label: d.title,
      })),
    [docs],
  );
  const clarifyOptions = useMemo(
    () => docs.filter((d) => d.id !== researchId).map((d) => ({ value: d.id, label: d.title })),
    [docs, researchId],
  );

  const canGenerate = !!researchId || !!clarifyId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* keepDefaultWidth={false}：丢掉基类 sm:max-w-md，否则 max-w-2xl 在桌面端被覆盖回 448px，报告内容被压窄 */}
      <DialogContent keepDefaultWidth={false} className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={16} />
            {t('intake.analysisTitle', 'AI 生成需求分析报告')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'intake.analysisDesc',
              'AI 同事读取调研/澄清纪要与项目契约绑定，代写可行性、影响面、依赖、风险与验收预清单；确认后归档为分析报告（草稿）。',
            )}
          </DialogDescription>
        </DialogHeader>

        {!draft ? (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {t('intake.analysisResearch', '调研纪要（必选一项来源）')}
              </label>
              <Select
                value={researchId}
                onValueChange={(v) => setResearchId(typeof v === 'string' ? v : '')}
                items={researchOptions}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t('intake.analysisSelectDoc', '选择文档')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {researchOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {t('intake.analysisClarify', '澄清纪要（可选，补充边界与约束）')}
              </label>
              <Select
                value={clarifyId}
                onValueChange={(v) => setClarifyId(typeof v === 'string' ? v : '')}
                items={clarifyOptions}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t('intake.analysisSelectOptional', '不指定')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {clarifyOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {generate.isError && (
              <p className="text-xs text-destructive">
                {(generate.error as Error | null)?.message ??
                  t('intake.analysisFailed', '生成失败，请重试')}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-2 text-sm">
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-content-text-secondary">
                  {t('intake.analysisFeasibility', '可行性')}
                </span>
                <Badge variant="secondary">
                  {VERDICT_LABELS[draft.feasibility.verdict]}
                </Badge>
              </div>
              {draft.feasibility.rationale ? (
                <p className="mt-1.5 leading-relaxed text-content-text-secondary">
                  {draft.feasibility.rationale}
                </p>
              ) : null}
              {draft.feasibility.conditions.length > 0 ? (
                <ul className="mt-1.5 list-disc pl-4 text-xs text-content-text-secondary">
                  {draft.feasibility.conditions.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              ) : null}
            </div>

            {draft.impact.summary || draft.impact.affectedAreas.length > 0 ? (
              <div className="rounded-lg border border-border bg-background p-3">
                <span className="text-xs font-medium text-content-text-secondary">
                  {t('intake.analysisImpact', '影响面')}
                </span>
                {draft.impact.summary ? (
                  <p className="mt-1.5 leading-relaxed text-content-text-secondary">
                    {draft.impact.summary}
                  </p>
                ) : null}
                {draft.impact.affectedAreas.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {draft.impact.affectedAreas.map((a) => (
                      <Badge key={a} variant="outline">
                        {a}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {draft.dependencies.length > 0 ? (
              <div className="rounded-lg border border-border bg-background p-3">
                <span className="text-xs font-medium text-content-text-secondary">
                  {t('intake.analysisDependencies', '依赖')}
                </span>
                <ul className="mt-1.5 space-y-1 text-xs text-content-text-secondary">
                  {draft.dependencies.map((d) => (
                    <li key={d.item}>
                      <span className="font-medium text-foreground">{d.item}</span>
                      {d.note ? `：${d.note}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {draft.risks.length > 0 ? (
              <div className="rounded-lg border border-border bg-background p-3">
                <span className="text-xs font-medium text-content-text-secondary">
                  {t('intake.analysisRisks', '风险')}
                </span>
                <ul className="mt-1.5 space-y-1 text-xs text-content-text-secondary">
                  {draft.risks.map((r) => (
                    <li key={r.risk} className="flex items-start gap-1.5">
                      <Badge
                        variant="secondary"
                        className="mt-0.5 shrink-0 font-mono text-10"
                      >
                        {r.severity}
                      </Badge>
                      <span>
                        {r.risk}
                        {r.mitigation ? `（应对：${r.mitigation}）` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {draft.acceptancePreview.length > 0 ? (
              <div className="rounded-lg border border-border bg-background p-3">
                <span className="text-xs font-medium text-content-text-secondary">
                  {t('intake.analysisAcceptancePreview', '验收要点（预清单）')}
                </span>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-content-text-secondary">
                  {draft.acceptancePreview.map((a) => (
                    <li key={a.content}>{a.content}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter>
          {draft ? (
            <>
              <Button variant="outline" onClick={() => setDraft(null)} disabled={saveDoc.isPending}>
                {t('intake.analysisRegenerate', '重新生成')}
              </Button>
              <Button
                onClick={() => saveDoc.mutate()}
                disabled={saveDoc.isPending}
              >
                {saveDoc.isPending ? <Spinner size="sm" /> : null}
                {t('intake.analysisConfirmSave', '确认归档为分析报告')}
              </Button>
            </>
          ) : (
            <Button
              onClick={() =>
                generate.mutate(
                  {
                    researchDocumentId: researchId || undefined,
                    clarifyDocumentId: clarifyId || undefined,
                  },
                  { onSuccess: (d) => setDraft(d) },
                )
              }
              disabled={!canGenerate || generate.isPending}
            >
              {generate.isPending ? <Spinner size="sm" /> : <Sparkles size={14} />}
              {t('intake.analysisGenerate', '生成分析报告')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
