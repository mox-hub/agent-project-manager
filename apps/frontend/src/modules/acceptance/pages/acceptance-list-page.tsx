/**
 * AcceptanceListPage - 验收契约列表页面
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle, AlertTriangle, Loader2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { useAcceptanceList, type Acceptance } from '../api/acceptance-api';

type AcceptanceStatus = 'draft' | 'pending' | 'passed' | 'failed' | 'waived';

const STATUS_CONFIG: Record<AcceptanceStatus, { label: string; icon: typeof CheckCircle2; color: string; bgColor: string }> = {
  draft: { label: 'Draft', icon: Loader2, color: 'text-slate-500', bgColor: 'bg-slate-100 dark:bg-slate-800' },
  pending: { label: 'Pending', icon: Clock, color: 'text-amber-500', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  passed: { label: 'Passed', icon: CheckCircle2, color: 'text-emerald-500', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  failed: { label: 'Failed', icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  waived: { label: 'Waived', icon: AlertTriangle, color: 'text-slate-400', bgColor: 'bg-slate-100 dark:bg-slate-800' },
};

function StatusBadge({ status }: { status: AcceptanceStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function AcceptanceCard({ acceptance }: { acceptance: Acceptance }) {
  const navigate = useNavigate();
  
  const functionalCriteria = acceptance.criteria?.filter(c => c.criteriaType === 'functional') ?? [];
  const technicalCriteria = acceptance.criteria?.filter(c => c.criteriaType === 'technical') ?? [];
  const passedCriteria = acceptance.criteria?.filter(c => c.status === 'passed') ?? [];
  const totalCriteria = acceptance.criteria?.length ?? 0;
  
  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/app/acceptance/${acceptance.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={acceptance.status as AcceptanceStatus} />
              {acceptance.type && (
                <Badge variant="outline" className="text-xs">
                  {acceptance.type}
                </Badge>
              )}
            </div>
            
            <h3 className="font-medium text-foreground mb-1 truncate">
              {acceptance.title || '验收契约'}
            </h3>
            
            {acceptance.task && (
              <p className="text-sm text-muted-foreground truncate">
                任务: {acceptance.task.title}
              </p>
            )}
            
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span>{functionalCriteria.length} 功能标准</span>
              <span>{technicalCriteria.length} 技术标准</span>
              {totalCriteria > 0 && (
                <span>{passedCriteria.length}/{totalCriteria} 已通过</span>
              )}
            </div>
            
            {acceptance.totalCost !== null && acceptance.totalCost !== undefined && (
              <p className="text-xs text-muted-foreground mt-1">
                成本: ${acceptance.totalCost.toFixed(4)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AcceptanceListPage() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<AcceptanceStatus | 'all'>('all');

  // 使用 TanStack Query 的方式
  const { data: acceptances, isLoading, error } = useAcceptanceList({
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const filteredAcceptances = Array.isArray(acceptances) ? acceptances : [];

  const statusCounts = {
    all: Array.isArray(acceptances) ? acceptances.length : 0,
    draft: Array.isArray(acceptances) ? acceptances.filter(a => a.status === 'draft').length : 0,
    pending: Array.isArray(acceptances) ? acceptances.filter(a => a.status === 'pending').length : 0,
    passed: Array.isArray(acceptances) ? acceptances.filter(a => a.status === 'passed').length : 0,
    failed: Array.isArray(acceptances) ? acceptances.filter(a => a.status === 'failed').length : 0,
    waived: Array.isArray(acceptances) ? acceptances.filter(a => a.status === 'waived').length : 0,
  };

  return (
    <PageShell>
      <PageHeader
        title={t('nav.acceptance')}
        description="管理验收契约和验收标准"
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" />
            新建验收
          </Button>
        }
      />
      
      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 mb-4">
        {(['all', 'draft', 'pending', 'passed', 'failed', 'waived'] as const).map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {STATUS_CONFIG[status]?.label ?? 'All'}
            {statusCounts[status] > 0 && (
              <span className="ml-1.5 text-xs opacity-70">({statusCounts[status]})</span>
            )}
          </Button>
        ))}
      </div>
      
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
      
      {/* Error State */}
      {error && (
        <div className="text-center py-12 text-destructive">
          <p>加载失败: {String(error)}</p>
        </div>
      )}
      
      {/* Empty State */}
      {!isLoading && !error && filteredAcceptances.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>暂无验收契约</p>
          <p className="text-sm mt-1">在任务详情页创建验收契约</p>
        </div>
      )}
      
      {/* Acceptance Grid */}
      {!isLoading && !error && filteredAcceptances.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAcceptances.map((acceptance) => (
            <AcceptanceCard key={acceptance.id} acceptance={acceptance} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
