import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { useProjectAIContext, useRefreshAIContext } from '../hooks/use-project-health';
import {
  useSilentProjectScore,
  parseProjectScore,
} from '@/modules/assistant/hooks/use-silent-ai';

interface AIInsightsWidgetProps {
  projectId: string;
}

function getComplexityClass(level?: string | null) {
  if (level === 'low') return 'bg-accent-green-light text-accent-green';
  if (level === 'medium') return 'bg-accent-yellow-light text-accent-yellow';
  if (level === 'high') return 'bg-accent-orange/20 text-accent-orange';
  if (level === 'critical') return 'bg-accent-red-light text-accent-red';
  return 'bg-muted/50 text-muted-foreground';
}

function getTeamSizeLabel(size?: string | null) {
  if (size === 'solo') return 'Solo (1 developer)';
  if (size === 'small') return 'Small (2-5)';
  if (size === 'medium') return 'Medium (6-20)';
  if (size === 'large') return 'Large (20+)';
  return 'N/A';
}

export function AIInsightsWidget({ projectId }: AIInsightsWidgetProps) {
  const { data: aiContext, isLoading } = useProjectAIContext(projectId);
  const refreshContext = useRefreshAIContext(projectId);
  // 静默 AI 场景 project-score：规则分之上的一次性文字分析（点击触发，不自动跑）
  const silentScore = useSilentProjectScore();
  const [insight, setInsight] = useState<ReturnType<typeof parseProjectScore> | null>(null);

  const runAiAnalysis = () => {
    silentScore.mutate(
      {
        projectId,
        context: aiContext
          ? {
              techStack: aiContext.techStack,
              teamSizeCategory: aiContext.teamSizeCategory,
              lifecyclePhase: aiContext.lifecyclePhase,
              complexityLevel: aiContext.complexityLevel,
              autoSummary: aiContext.autoSummary,
            }
          : undefined,
      },
      {
        onSuccess: (res) => setInsight(parseProjectScore(res.data)),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : 'AI 分析失败，请稍后重试',
          ),
      },
    );
  };

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading AI context...</div>;
  }

  if (!aiContext) {
    return (
      <section className="rounded-lg border border-border bg-muted/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="m-0 text-base font-semibold text-foreground">AI Insights</h3>
            <p className="mt-1 text-sm text-muted-foreground">Project context for AI assistant</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => refreshContext.mutate()}>
            Generate
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          No AI context available yet. Click &quot;Generate&quot; to create project context.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-muted/50 p-4">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="m-0 text-base font-semibold text-foreground">AI Insights</h3>
          <p className="mt-1 text-sm text-muted-foreground">Project context for AI assistant</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => refreshContext.mutate()}
          disabled={refreshContext.isPending}
        >
          {refreshContext.isPending ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {aiContext.techStack?.length ? (
        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-foreground">Tech Stack</p>
          <div className="flex flex-wrap gap-1.5">
            {aiContext.techStack.map((tech) => (
              <span key={tech} className="rounded bg-accent-blue/15 px-2 py-0.5 text-xs text-accent-blue">
                {tech}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-sm font-medium text-foreground">Team Size</p>
          <p className="text-sm text-muted-foreground">{getTeamSizeLabel(aiContext.teamSizeCategory)}</p>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-foreground">Lifecycle Phase</p>
          <p className="text-sm capitalize text-muted-foreground">{aiContext.lifecyclePhase || 'N/A'}</p>
        </div>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-sm font-medium text-foreground">Complexity</p>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${getComplexityClass(aiContext.complexityLevel)}`}>
          {aiContext.complexityLevel?.toUpperCase() || 'N/A'}
        </span>
      </div>

      {aiContext.autoSummary ? (
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">AI Summary</p>
          <div className="rounded-md bg-background px-3 py-2 text-sm leading-6 text-muted-foreground">
            {aiContext.autoSummary}
          </div>
        </div>
      ) : null}

      {/* 静默 AI 分析：评分 + 总结 + 风险/建议（按需触发） */}
      <div className="mt-4 border-t border-border/60 pt-3">
        <div className="flex items-center justify-between">
          <p className="mb-0 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Sparkles className="size-3.5 text-accent-purple" />
            AI Analysis
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={runAiAnalysis}
            disabled={silentScore.isPending}
          >
            {silentScore.isPending ? 'Analyzing...' : insight ? 'Re-run' : 'Analyze'}
          </Button>
        </div>
        {insight ? (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              {insight.score !== undefined ? (
                <span className="rounded-md bg-accent-purple-light px-2 py-0.5 text-sm font-semibold text-accent-purple">
                  {insight.score}
                </span>
              ) : null}
              {insight.summary ? (
                <p className="flex-1 text-sm leading-6 text-muted-foreground">{insight.summary}</p>
              ) : null}
            </div>
            {insight.risks && insight.risks.length > 0 ? (
              <div>
                <p className="mb-1 text-xs font-medium text-foreground">Risks</p>
                <ul className="space-y-0.5">
                  {insight.risks.map((risk) => (
                    <li key={risk} className="text-xs leading-5 text-accent-red">· {risk}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {insight.suggestions && insight.suggestions.length > 0 ? (
              <div>
                <p className="mb-1 text-xs font-medium text-foreground">Suggestions</p>
                <ul className="space-y-0.5">
                  {insight.suggestions.map((sug) => (
                    <li key={sug} className="text-xs leading-5 text-muted-foreground">· {sug}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Run a one-off AI analysis on top of the rule-based health score.
          </p>
        )}
      </div>

      {aiContext.lastComputedAt ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Last updated: {new Date(aiContext.lastComputedAt).toLocaleString()}
        </p>
      ) : null}
    </section>
  );
}
