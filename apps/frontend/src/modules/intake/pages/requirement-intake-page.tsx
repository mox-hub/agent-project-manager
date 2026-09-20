import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Inbox,
  Plus,
  MessagesSquare,
  ClipboardList,
  SearchCheck,
  ListChecks,
  ShieldCheck,
  ArrowRight,
  FileText,
  Sparkles,
} from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/ui/section-card';
import { AsyncState } from '@/components/ui/async-state';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/infrastructure/store/app-store';
import { useDocuments } from '@/modules/document/hooks/use-documents';
import type { DocumentListItem } from '@/modules/document/api/document-api';
import { usePipelineProjectFilter } from '@/shared/layout/pipeline-focus';
import { AnalysisDraftDialog } from '../components/analysis-draft-dialog';

/**
 * 需求承接页（研发生命周期 01 位，CAP-A-15 / CAP-P-01 管道入口）：
 * 「提出需求」CTA 唤起统一创建面板（project AI 代理模式 → grill 澄清），
 * 下方展示承接管道五步说明、category=requirement 的需求纪要列表与
 * category=analysis 的分析报告列表（AI 代写 → 人确认，CAP-P-01 四期）。
 * 管道项目聚焦（CAP-A-15）：?project 联动过滤两份列表（服务端 projectId 过滤）。
 */
function DocListRow({ doc, onOpen }: { doc: DocumentListItem; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 px-2 py-2 text-left motion-shift hover:bg-accent"
    >
      <FileText size={16} className="shrink-0 text-content-text-secondary" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-foreground">{doc.title}</div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-content-text-muted">
          {doc.project?.name ? <span>{doc.project.name}</span> : null}
          <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
      <Badge variant="secondary">{doc.status}</Badge>
      <ArrowRight size={14} className="shrink-0 text-content-text-muted" />
    </button>
  );
}

export function RequirementIntakePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const openCreateDialog = useAppStore((s) => s.openCreateDialog);
  const { focusProjectId } = usePipelineProjectFilter();
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const docsQuery = useDocuments({
    category: 'requirement',
    pageSize: 20,
    projectId: focusProjectId ?? undefined,
  });
  const analysisQuery = useDocuments({
    category: 'analysis',
    pageSize: 20,
    projectId: focusProjectId ?? undefined,
  });

  const steps = [
    {
      icon: MessagesSquare,
      title: t('intake.step1Title', '需求澄清'),
      desc: t('intake.step1Desc', 'AI 同事连续追问，澄清原始需求与目标'),
    },
    {
      icon: ClipboardList,
      title: t('intake.step2Title', '访谈补全'),
      desc: t('intake.step2Desc', '结构化访谈补全背景、边界与验收期望'),
    },
    {
      icon: SearchCheck,
      title: t('intake.step25Title', '分析评估'),
      desc: t('intake.step25Desc', 'AI 代写可行性、影响面、依赖与风险，人确认归档'),
    },
    {
      icon: ListChecks,
      title: t('intake.step3Title', '生成与确认'),
      desc: t('intake.step3Desc', 'AI 生成任务族与验收清单，批卡确认后落库'),
    },
    {
      icon: ShieldCheck,
      title: t('intake.step4Title', '审计把关'),
      desc: t('intake.step4Desc', '完整性审计校验验收标准，缺口黄牌提示'),
    },
  ];

  const docs = docsQuery.data ?? [];
  const analysisDocs = analysisQuery.data ?? [];

  return (
    <PageShell
      variant="standard"
      aiPage="intake.intake.main"
      icon={Inbox}
      iconColor="text-accent-blue"
      title={t('intake.title', '需求承接')}
      actions={
        <HeaderActionButton
          icon={Plus}
          label={t('intake.cta', '提出需求')}
          onClick={() => openCreateDialog({ type: 'project' })}
        />
      }
      contentClassName="space-y-6"
    >
      {/* 承接入口：极简引导区（宪法 §1.2 引导画布） */}
      <div className="rounded-lg border border-border bg-card px-6 py-8 text-center">
        <h2 className="text-xl font-semibold text-foreground">
          {t('intake.heroTitle', '提出一句需求，AI 同事接手')}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-content-text-secondary">
          {t('intake.heroDesc', '从一句原始需求开始：AI 同事连续追问澄清目标，访谈补全细节，分析评估可行性与影响面，生成任务族与验收清单，确认后落库进工单。')}
        </p>
        <div className="mt-5 flex justify-center">
          <Button size="lg" className="gap-1.5" onClick={() => openCreateDialog({ type: 'project' })}>
            <Plus size={16} />
            {t('intake.cta', '提出需求')}
          </Button>
        </div>
      </div>

      {/* 承接管道五步说明 */}
      <SectionCard title={t('intake.pipelineTitle', '承接管道')}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step, index) => (
            <div key={step.title} className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-center gap-2">
                <step.icon size={16} className="text-content-text-secondary" />
                <span className="text-sm font-medium text-foreground">{step.title}</span>
                <span className="ml-auto font-mono text-10 text-content-text-muted">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-content-text-secondary">{step.desc}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* 需求纪要列表（category=requirement）+ AI 分析入口（CAP-P-01 四期） */}
      <SectionCard
        title={t('intake.docsTitle', '需求纪要')}
        description={t('intake.docsDesc', '澄清纪要与访谈产物（category=requirement）')}
      >
        <div className="mb-2 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setAnalysisOpen(true)}
            disabled={docs.length === 0}
          >
            <Sparkles size={14} />
            {t('intake.analysisCta', 'AI 生成分析报告')}
          </Button>
        </div>
        <AsyncState
          isLoading={docsQuery.isLoading}
          isEmpty={!docsQuery.isLoading && docs.length === 0}
          emptyTitle={t('intake.docsEmpty', '尚无需求纪要')}
          emptyDescription={t('intake.docsEmptyDesc', '提出第一条需求后，澄清纪要与访谈产物会出现在这里')}
        >
          <div className="divide-y divide-border">
            {docs.map((doc) => (
              <DocListRow
                key={doc.id}
                doc={doc}
                onOpen={() => navigate(`/app/documents/${doc.id}`)}
              />
            ))}
          </div>
        </AsyncState>
      </SectionCard>

      {/* 分析报告列表（category=analysis，CAP-P-01 四期） */}
      <SectionCard
        title={t('intake.analysisDocsTitle', '分析报告')}
        description={t('intake.analysisDocsDesc', 'AI 代写、人确认归档的可行性/影响面/风险分析（category=analysis）')}
      >
        <AsyncState
          isLoading={analysisQuery.isLoading}
          isEmpty={!analysisQuery.isLoading && analysisDocs.length === 0}
          emptyTitle={t('intake.analysisDocsEmpty', '尚无分析报告')}
          emptyDescription={t('intake.analysisDocsEmptyDesc', '从上方需求纪要生成分析报告后，会归档在这里供拆解与验收引用')}
        >
          <div className="divide-y divide-border">
            {analysisDocs.map((doc) => (
              <DocListRow
                key={doc.id}
                doc={doc}
                onOpen={() => navigate(`/app/documents/${doc.id}`)}
              />
            ))}
          </div>
        </AsyncState>
      </SectionCard>

      <AnalysisDraftDialog
        open={analysisOpen}
        onOpenChange={setAnalysisOpen}
        projectId={focusProjectId ?? undefined}
        docs={docs.map((d) => ({
          id: d.id,
          title: d.title,
          projectName: d.project?.name ?? null,
        }))}
        defaultResearchId={docs[0]?.id}
      />
    </PageShell>
  );
}
