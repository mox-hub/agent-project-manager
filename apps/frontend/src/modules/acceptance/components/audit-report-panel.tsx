import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { AuditReport, AuditItem } from '../api/acceptance-api';

interface Props {
  report: AuditReport;
  onApplySuggestions?: (itemIds: string[]) => void;
  loading?: boolean;
}

export function AuditReportPanel({ report, onApplySuggestions, loading }: Props) {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'red':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'green':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-4">
      {/* Risk Level Header */}
      <div className="flex items-center gap-3">
        <Badge
          variant="outline"
          className={`px-3 py-1 text-sm font-medium border-2 ${getRiskColor(report.riskLevel)}`}
        >
          {report.riskLevel === 'red' && '⚠️ 存在阻断项'}
          {report.riskLevel === 'yellow' && '⚡ 建议补全'}
          {report.riskLevel === 'green' && '✅ 验收完备'}
        </Badge>
        {report.checklist && (
          <span className="text-sm text-muted-foreground">
            清单: {report.checklist.name}
          </span>
        )}
      </div>

      {/* Summary */}
      {report.summary && (
        <div className="p-3 rounded-lg bg-muted/50 text-sm">
          {report.summary}
        </div>
      )}

      {/* Blocked Items */}
      {report.blockedItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-red-600 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            强阻断项（必须补全才能执行）
          </h4>
          <div className="space-y-2">
            {report.blockedItems.map((item) => (
              <AuditItemCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Suggested Items */}
      {report.suggestedItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-yellow-600 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            建议补全（可一键采纳）
          </h4>
          <div className="space-y-2">
            {report.suggestedItems.map((item) => (
              <AuditItemCard
                key={item.id}
                item={item}
                showApply
                onApply={() => onApplySuggestions?.([item.id])}
                loading={loading}
              />
            ))}
          </div>
          {onApplySuggestions && report.suggestedItems.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onApplySuggestions(report.suggestedItems.map((i) => i.id))
              }
              disabled={loading}
              className="mt-2"
            >
              一键补全全部 ({report.suggestedItems.length} 项)
            </Button>
          )}
        </div>
      )}

      {/* Passed Items */}
      {report.passedItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-green-600 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            已通过检查
          </h4>
          <div className="space-y-1">
            {report.passedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 p-2 rounded bg-green-50 text-sm"
              >
                <span className="text-green-600">✓</span>
                <span className="flex-1">{item.content}</span>
                {item.category && (
                  <Badge variant="secondary" className="text-xs">
                    {item.category}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface AuditItemCardProps {
  item: AuditItem;
  showApply?: boolean;
  onApply?: () => void;
  loading?: boolean;
}

function AuditItemCard({
  item,
  showApply,
  onApply,
  loading,
}: AuditItemCardProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">{item.content}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={`text-xs ${getSeverityColor(item.severity)}`}
            >
              {item.severity}
            </Badge>
            {item.category && (
              <Badge variant="secondary" className="text-xs">
                {item.category}
              </Badge>
            )}
            {item.source && (
              <span className="text-xs text-muted-foreground">
                来源: {item.source}
              </span>
            )}
          </div>
          {item.suggestion && (
            <p className="text-xs text-muted-foreground mt-1">
              建议: {item.suggestion}
            </p>
          )}
        </div>
        {showApply && onApply && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onApply}
            disabled={loading}
            className="text-xs"
          >
            采纳
          </Button>
        )}
      </div>
    </div>
  );
}
