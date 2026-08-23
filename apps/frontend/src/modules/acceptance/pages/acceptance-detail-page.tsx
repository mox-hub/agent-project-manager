/**
 * 验收详情页面 - 参考 Figma 设计样式
 * 
 * 新设计特点：
 * - 顶部面包屑导航和操作按钮（审批/拒绝）
 * - 标题、元信息、描述区域
 * - 审计风险横幅（阻断项/警告）
 * - Tab 切换（验收标准 / 审计报告 / 执行历史）
 * - 功能和技术验收标准分组展示
 * - 审计问题卡片（阻断项/警告项）
 * - 执行历史列表
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { PageShell } from '@/components/ui/page-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { SubPageToolbar } from '@/components/ui/sub-page-toolbar';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import {
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Clock,
  Circle,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  DollarSign,
  Target,
  Flag,
  Bot,
  Plus,
  CheckSquare,
  AlertCircle,
  X,
  Play,
} from 'lucide-react';
import { useAcceptanceDetail, useAudit, useApplySuggestions, useSystemChecklists } from '../hooks/use-acceptance';
import { AuditReportPanel } from '../components/audit-report-panel';

type CriterionStatus = 'pending' | 'passed' | 'failed';
type AuditSeverity = 'blocking' | 'warning';

const CRITERION_STATUS_CONFIG: Record<CriterionStatus, { 
  icon: typeof Circle; 
  color: string; 
  label: string 
}> = {
  pending: { icon: Circle, color: 'text-muted-foreground', label: 'Pending' },
  passed: { icon: CheckCircle2, color: 'text-emerald-500', label: 'Passed' },
  failed: { icon: XCircle, color: 'text-red-500', label: 'Failed' },
};

// 验收标准行组件
function CriterionRow({ 
  criterion, 
  onToggle 
}: { 
  criterion: {
    id: string;
    criteriaType: string;
    content: string;
    status: CriterionStatus;
    category?: string;
    severity?: string;
    evidence?: string;
  };
  onToggle: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = CRITERION_STATUS_CONFIG[criterion.status];
  const Icon = cfg.icon;

  return (
    <div className={cn(
      'rounded-lg border transition-colors',
      criterion.status === 'passed' 
        ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200/50 dark:border-emerald-900/50' 
        : criterion.status === 'failed' 
          ? 'bg-red-50/30 dark:bg-red-950/10 border-red-200/50 dark:border-red-900/50' 
          : 'bg-card'
    )}>
      <div
        className="flex items-start gap-3 p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <button
          onClick={e => { e.stopPropagation(); onToggle(criterion.id); }}
          className="mt-0.5 shrink-0"
        >
          <Icon className={cn('w-4 h-4 transition-colors hover:opacity-70', cfg.color)} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm">{criterion.content}</p>
          {criterion.evidence && (
            <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
              <CheckSquare className="w-3 h-3" />
              {criterion.evidence}
            </p>
          )}
          {criterion.severity && criterion.severity !== 'low' && (
            <p className="text-xs text-red-600 mt-0.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Severity: {criterion.severity}
            </p>
          )}
        </div>
        <span className={cn('text-10 font-medium px-1.5 py-0.5 rounded-full border uppercase tracking-wide shrink-0', cfg.color)}>
          {cfg.label}
        </span>
        {(criterion.evidence || criterion.severity) && (
          <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform', expanded && 'rotate-180')} />
        )}
      </div>
    </div>
  );
}

// 审计问题卡片
function AuditIssueCard({ 
  issue 
}: { 
  issue: {
    id: string;
    type: string;
    severity: AuditSeverity;
    title: string;
    detail: string;
    suggestion?: string;
  }
}) {
  const isBlocking = issue.severity === 'blocking';
  
  return (
    <div className={cn(
      'rounded-xl border p-4 space-y-2',
      isBlocking
        ? 'border-red-300 dark:border-red-900 bg-red-50/40 dark:bg-red-950/20'
        : 'border-amber-300 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20'
    )}>
      <div className="flex items-start gap-2">
        {isBlocking
          ? <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          : <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-xs font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border',
              isBlocking 
                ? 'text-red-700 border-red-300 bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' 
                : 'text-amber-700 border-amber-300 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
            )}>
              {issue.severity}
            </span>
            <span className="text-10 text-muted-foreground uppercase tracking-wide">{issue.type}</span>
          </div>
          <p className="text-sm font-medium">{issue.title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{issue.detail}</p>
        </div>
      </div>
      {issue.suggestion && (
        <div className="ml-6 p-2.5 rounded-lg bg-background/60 border border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Suggested fix
          </p>
          <p className="text-xs leading-relaxed">{issue.suggestion}</p>
        </div>
      )}
      <div className="ml-6 flex gap-2">
        <button className="px-2.5 py-1 rounded-md text-xs bg-background border border-border hover:bg-accent transition-colors flex items-center gap-1">
          <CheckSquare className="w-3 h-3" />
          Apply suggestion
        </button>
        <button className="px-2.5 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent transition-colors flex items-center gap-1">
          <X className="w-3 h-3" />
          Dismiss
        </button>
      </div>
    </div>
  );
}

// 执行历史行
function ExecutionRow({ 
  exec 
}: { 
  exec: {
    id: string;
    agentName?: string;
    status?: string;
    duration?: string;
    cost?: number;
    createdAt?: string;
    summary?: string;
  }
}) {
  const statusColor = exec.status === 'completed' 
    ? 'text-emerald-600' 
    : exec.status === 'failed' 
      ? 'text-red-600' 
      : 'text-blue-600';
  const StatusIcon = exec.status === 'completed' 
    ? CheckCircle2 
    : exec.status === 'failed' 
      ? XCircle 
      : Clock;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/40 transition-colors">
      <StatusIcon className={cn('w-4 h-4 shrink-0 mt-0.5', statusColor)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium flex items-center gap-1">
            <Bot className="w-3 h-3 text-violet-500" />
            {exec.agentName || 'AI Agent'}
          </span>
          <span className="text-11 text-muted-foreground">{exec.createdAt}</span>
          <span className="text-11 text-muted-foreground ml-auto">
            {exec.duration && `${exec.duration} · `}
            {exec.cost && `$${exec.cost.toFixed(2)}`}
          </span>
        </div>
        {exec.summary && (
          <p className="text-xs text-muted-foreground leading-relaxed">{exec.summary}</p>
        )}
      </div>
    </div>
  );
}

// 主页面组件
export function AcceptanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: acceptance, isLoading } = useAcceptanceDetail(id!);
  const { data: checklists } = useSystemChecklists();
  const auditMutation = useAudit(id!);
  const applySuggestionsMutation = useApplySuggestions(id!);

  // 临时状态用于交互演示
  const [criteria, setCriteria] = useState<{
    id: string;
    criteriaType: string;
    content: string;
    status: CriterionStatus;
    category?: string;
    severity?: string;
    evidence?: string;
  }[]>([]);

  // 当 acceptance 加载完成后初始化 criteria
  useState(() => {
    if (acceptance?.criteria) {
      setCriteria(acceptance.criteria.map(c => ({
        ...c,
        status: c.status as CriterionStatus
      })));
    }
  });

  const handleAudit = async () => {
    await auditMutation.mutateAsync(undefined);
  };

  const handleApplySuggestions = async (itemIds: string[]) => {
    await applySuggestionsMutation.mutateAsync(itemIds);
  };

  const toggleCriterion = (criterionId: string) => {
    setCriteria(prev => prev.map(c => {
      if (c.id !== criterionId) return c;
      const nextStatus: CriterionStatus = 
        c.status === 'pending' ? 'passed' 
        : c.status === 'passed' ? 'failed' 
        : 'pending';
      return { ...c, status: nextStatus };
    }));
  };

  if (isLoading) {
    return (
      <PageShell>
        <div className="p-6 space-y-4 max-w-screen-lg mx-auto">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48" />
          <Skeleton className="h-32" />
        </div>
      </PageShell>
    );
  }

  if (!acceptance) {
    return (
      <PageShell>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">验收契约不存在</div>
        </div>
      </PageShell>
    );
  }

  const functionalCriteria = criteria.filter(c => c.criteriaType === 'functional');
  const technicalCriteria = criteria.filter(c => c.criteriaType === 'technical');
  const passedCount = criteria.filter(c => c.status === 'passed').length;
  const progressPct = criteria.length > 0 ? Math.round((passedCount / criteria.length) * 100) : 0;

  // 审计问题统计
  const auditReport = acceptance.auditReport;
  const blockingIssues = auditReport?.blockedItems ?? [];
  const warningIssues = auditReport?.suggestedItems ?? [];

  return (
    <PageShell>
      {/* 顶部导航栏 */}
      <SubPageToolbar
        aiId="acceptance.acceptance-detail"
        onBack={() => navigate('/app/acceptance')}
        breadcrumbs={[
          { label: 'Acceptance', to: '/app/acceptance' },
          { label: acceptance.title || '验收契约' },
        ]}
        actions={
          <>
            <FavoriteToggle label={acceptance.title || '验收契约'} />
            {/* 人工审批按钮 */}
            <HeaderActionButton
              variant="primary"
              icon={ThumbsUp}
              label="Approve"
            />
            <HeaderActionButton
              variant="danger"
              icon={ThumbsDown}
              label="Reject"
            />
          </>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-screen-lg mx-auto space-y-5">
          {/* 标题和元信息 */}
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-semibold">{acceptance.title || '验收契约'}</h1>
              </div>
              {acceptance.task && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  任务: {acceptance.task.title}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Flag className="w-3.5 h-3.5" />
                  {acceptance.task?.project?.name || '项目'}
                </span>
                {acceptance.totalCost !== undefined && acceptance.totalCost > 0 && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    ${acceptance.totalCost.toFixed(2)} AI cost
                  </span>
                )}
              </div>
            </div>

            {/* 进度卡片 */}
            <Card className="shrink-0 w-48">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Criteria progress</span>
                  <span className="text-sm font-semibold">{passedCount}/{criteria.length}</span>
                </div>
                <Progress value={progressPct} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">{progressPct}% complete</p>
              </CardContent>
            </Card>
          </div>

          {/* 审计风险横幅 */}
          {auditReport && (blockingIssues.length > 0 || warningIssues.length > 0) && (
            <div className={cn(
              'rounded-xl border p-4 flex items-center gap-3',
              blockingIssues.length > 0
                ? 'border-red-300 dark:border-red-900 bg-red-50/60 dark:bg-red-950/20'
                : 'border-amber-300 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/20'
            )}>
              {blockingIssues.length > 0
                ? <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                : <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              }
              <div className="flex-1">
                <p className={cn('text-sm font-medium', 
                  blockingIssues.length > 0 
                    ? 'text-red-700 dark:text-red-400' 
                    : 'text-amber-700 dark:text-amber-400'
                )}>
                  {blockingIssues.length > 0
                    ? `${blockingIssues.length} blocking audit issue${blockingIssues.length > 1 ? 's' : ''} — cannot pass until resolved`
                    : `${warningIssues.length} audit warning${warningIssues.length > 1 ? 's' : ''} — review recommended before approval`
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Scroll down to the Audit Report tab to see details and apply suggestions.</p>
              </div>
            </div>
          )}

          {/* Tab 切换 */}
          <Tabs defaultValue="criteria">
            <TabsList className="h-8 text-xs">
              <TabsTrigger value="criteria" className="text-xs">
                Criteria
                <span className="ml-1.5 text-10 bg-muted rounded px-1">{criteria.length}</span>
              </TabsTrigger>
              <TabsTrigger value="audit" className="text-xs">
                Audit Report
                {auditReport && auditReport.blockedItems.length + auditReport.suggestedItems.length > 0 && (
                  <span className={cn(
                    'ml-1.5 text-10 rounded px-1',
                    blockingIssues.length > 0
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                  )}>
                    {blockingIssues.length + warningIssues.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="executions" className="text-xs">
                Executions
                <span className="ml-1.5 text-10 bg-muted rounded px-1">{acceptance.executions?.length ?? 0}</span>
              </TabsTrigger>
            </TabsList>

            {/* 验收标准 Tab */}
            <TabsContent value="criteria" className="mt-4 space-y-4">
              {/* 功能验收标准 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Functional Criteria</h3>
                  <span className="text-10 text-muted-foreground">
                    {functionalCriteria.filter(c => c.status === 'passed').length}/{functionalCriteria.length} passed
                  </span>
                </div>
                <div className="space-y-1.5">
                  {functionalCriteria.map(c => (
                    <CriterionRow key={c.id} criterion={c} onToggle={toggleCriterion} />
                  ))}
                  {functionalCriteria.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">No functional criteria defined</p>
                  )}
                </div>
              </div>

              {/* 技术验收标准 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Technical Criteria</h3>
                  <span className="text-10 text-muted-foreground">
                    {technicalCriteria.filter(c => c.status === 'passed').length}/{technicalCriteria.length} passed
                  </span>
                </div>
                <div className="space-y-1.5">
                  {technicalCriteria.map(c => (
                    <CriterionRow key={c.id} criterion={c} onToggle={toggleCriterion} />
                  ))}
                  {technicalCriteria.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">No technical criteria defined (apply a checklist)</p>
                  )}
                </div>
              </div>

              {/* 添加验收标准 */}
              <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                <Plus className="w-3.5 h-3.5" />
                Add criterion
              </button>
            </TabsContent>

            {/* 审计报告 Tab */}
            <TabsContent value="audit" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Integrity Audit Report</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Auto-generated by AI analysis · Last run {acceptance.executions?.[0]?.createdAt || 'Never'}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleAudit} disabled={auditMutation.isPending}>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-violet-500" />
                  {auditMutation.isPending ? 'Auditing...' : 'Run Audit'}
                </Button>
              </div>

              {auditReport ? (
                <AuditReportPanel
                  report={auditReport}
                  onApplySuggestions={handleApplySuggestions}
                  loading={applySuggestionsMutation.isPending}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ShieldCheck className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No audit report yet</p>
                  <Button variant="outline" size="sm" onClick={handleAudit} disabled={auditMutation.isPending} className="mt-3">
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Run First Audit
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* 执行历史 Tab */}
            <TabsContent value="executions" className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">AI Execution History</h3>
                <Button size="sm">
                  <Play className="w-3.5 h-3.5 mr-1.5" />
                  Run acceptance check
                </Button>
              </div>
              
              {acceptance.executions && acceptance.executions.length > 0 ? (
                <Card>
                  <CardContent className="p-2 divide-y divide-border">
                    {acceptance.executions.map(e => (
                      <ExecutionRow key={e.id} exec={e} />
                    ))}
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Play className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No executions yet</p>
                  <Button variant="outline" size="sm" className="mt-3">
                    <Play className="w-3.5 h-3.5 mr-1.5" />
                    Start First Execution
                  </Button>
                </div>
              )}

              {acceptance.executions && acceptance.executions.length > 0 && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    Total: {acceptance.executions.length} executions · ${acceptance.totalCost?.toFixed(2) ?? '0.00'} spent
                  </span>
                  <button className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                    View full execution log
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageShell>
  );
}
