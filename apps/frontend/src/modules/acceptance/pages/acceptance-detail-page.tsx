import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  useAcceptanceDetail,
  useAudit,
  useApplySuggestions,
  useSystemChecklists,
  useApplyChecklist,
} from '../hooks/use-acceptance';
import { AuditReportPanel } from '../components/audit-report-panel';

export function AcceptanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: acceptance, isLoading } = useAcceptanceDetail(id!);
  const { data: checklists } = useSystemChecklists();
  const auditMutation = useAudit();
  const applySuggestionsMutation = useApplySuggestions();
  const applyChecklistMutation = useApplyChecklist();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!acceptance) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">验收契约不存在</div>
      </div>
    );
  }

  const functionalCriteria = acceptance.criteria?.filter(
    (c) => c.criteriaType === 'functional'
  ) || [];
  const technicalCriteria = acceptance.criteria?.filter(
    (c) => c.criteriaType === 'technical'
  ) || [];

  const handleAudit = async () => {
    await auditMutation.mutateAsync({ acceptanceId: id! });
  };

  const handleApplySuggestions = async (itemIds: string[]) => {
    await applySuggestionsMutation.mutateAsync({
      acceptanceId: id!,
      itemIds,
    });
  };

  const handleApplyChecklist = async (checklistId: string) => {
    await applyChecklistMutation.mutateAsync({
      checklistId,
      acceptanceId: id!,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{acceptance.title || '验收契约'}</h1>
          {acceptance.task && (
            <p className="text-muted-foreground">
              任务: {acceptance.task.title}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              acceptance.status === 'passed'
                ? 'default'
                : acceptance.status === 'failed'
                  ? 'destructive'
                  : 'secondary'
            }
          >
            {acceptance.status}
          </Badge>
          {acceptance.totalCost !== null && acceptance.totalCost !== undefined && (
            <Badge variant="outline">
              成本: ${acceptance.totalCost.toFixed(4)}
            </Badge>
          )}
        </div>
      </div>

      {/* Actions */}
      <Card className="p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={handleAudit} disabled={auditMutation.isPending}>
            {auditMutation.isPending ? '审计中...' : '触发完整性审计'}
          </Button>

          {checklists && checklists.length > 0 && (
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm text-muted-foreground">应用清单:</span>
              {checklists.slice(0, 3).map((cl) => (
                <Button
                  key={cl.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyChecklist(cl.id)}
                  disabled={applyChecklistMutation.isPending}
                >
                  {cl.name}
                </Button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Audit Report */}
      {acceptance.auditReport && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">完整性审计报告</h3>
          <AuditReportPanel
            report={acceptance.auditReport}
            onApplySuggestions={handleApplySuggestions}
            loading={applySuggestionsMutation.isPending}
          />
        </Card>
      )}

      <Separator />

      {/* Criteria */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Functional Criteria */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>功能验收标准</span>
            <Badge variant="secondary">{functionalCriteria.length}</Badge>
          </h3>
          {functionalCriteria.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              暂无功能验收标准
            </p>
          ) : (
            <div className="space-y-2">
              {functionalCriteria.map((criteria) => (
                <div
                  key={criteria.id}
                  className="p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm flex-1">{criteria.content}</p>
                    <Badge
                      variant={
                        criteria.status === 'passed'
                          ? 'default'
                          : criteria.status === 'failed'
                            ? 'destructive'
                            : 'secondary'
                      }
                      className="shrink-0"
                    >
                      {criteria.status}
                    </Badge>
                  </div>
                  {criteria.category && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      {criteria.category}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Technical Criteria */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>技术验收标准</span>
            <Badge variant="secondary">{technicalCriteria.length}</Badge>
          </h3>
          {technicalCriteria.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              暂无技术验收标准（可应用技术栈清单）
            </p>
          ) : (
            <div className="space-y-2">
              {technicalCriteria.map((criteria) => (
                <div
                  key={criteria.id}
                  className="p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm flex-1">{criteria.content}</p>
                    <Badge
                      variant={
                        criteria.status === 'passed'
                          ? 'default'
                          : criteria.status === 'failed'
                            ? 'destructive'
                            : 'secondary'
                      }
                      className="shrink-0"
                    >
                      {criteria.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {criteria.category && (
                      <Badge variant="outline" className="text-xs">
                        {criteria.category}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        criteria.severity === 'critical' || criteria.severity === 'high'
                          ? 'text-red-600'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {criteria.severity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Execution History */}
      {acceptance.executions && acceptance.executions.length > 0 && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">执行历史</h3>
          <div className="space-y-2">
            {acceptance.executions.map((exec) => (
              <div
                key={exec.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      exec.status === 'completed'
                        ? 'default'
                        : exec.status === 'failed'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {exec.status}
                  </Badge>
                  <span className="text-sm">
                    {new Date(exec.createdAt).toLocaleString()}
                  </span>
                </div>
                {exec.totalCost !== null && exec.totalCost !== undefined && (
                  <Badge variant="outline">
                    ${exec.totalCost.toFixed(4)} / {exec.totalTokens?.toLocaleString()} tokens
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
