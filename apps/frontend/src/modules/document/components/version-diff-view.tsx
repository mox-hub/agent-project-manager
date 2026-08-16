'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVersionDetail } from '@/modules/document/hooks/use-document-versions';
import { cn } from '@/lib/utils';

interface VersionDiffViewProps {
  documentId: string;
  baseVersionId: string;
  targetVersionId: string;
}

type DiffOp = 'equal' | 'insert' | 'delete';

interface DiffSegment {
  op: DiffOp;
  text: string;
}

function buildLineDiff(a: string, b: string): DiffSegment[] {
  const aLines = a.replace(/\r\n/g, '\n').split('\n');
  const bLines = b.replace(/\r\n/g, '\n').split('\n');
  const m = aLines.length;
  const n = bLines.length;

  // LCS dynamic programming
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = aLines[i - 1] === bLines[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const result: DiffSegment[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (aLines[i - 1] === bLines[j - 1]) {
      result.unshift({ op: 'equal', text: aLines[i - 1] });
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      result.unshift({ op: 'delete', text: aLines[i - 1] });
      i--;
    } else {
      result.unshift({ op: 'insert', text: bLines[j - 1] });
      j--;
    }
  }
  while (i > 0) {
    result.unshift({ op: 'delete', text: aLines[i - 1] });
    i--;
  }
  while (j > 0) {
    result.unshift({ op: 'insert', text: bLines[j - 1] });
    j--;
  }
  return result;
}

export function VersionDiffView({ documentId, baseVersionId, targetVersionId }: VersionDiffViewProps) {
  const base = useVersionDetail(documentId, baseVersionId);
  const target = useVersionDetail(documentId, targetVersionId);
  const [view, setView] = useState<'split' | 'unified'>('split');

  const loading = base.isLoading || target.isLoading;

  const diff = useMemo(() => {
    if (!base.data || !target.data) return [];
    return buildLineDiff(base.data.content, target.data.content);
  }, [base.data, target.data]);

  const summary = useMemo(() => {
    const added = diff.filter((d) => d.op === 'insert').length;
    const removed = diff.filter((d) => d.op === 'delete').length;
    return { added, removed };
  }, [diff]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        加载版本内容…
      </div>
    );
  }

  if (!base.data || !target.data) {
    return <div className="p-4 text-sm text-muted-foreground">无法加载版本内容</div>;
  }

  if (view === 'split') {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2 text-xs">
          <div className="flex items-center gap-3">
            <span>
              <span className="font-mono text-accent-red">v{base.data.version}</span>
              <span className="mx-1.5 text-muted-foreground">→</span>
              <span className="font-mono text-accent-green">v{target.data.version}</span>
            </span>
            <span className="text-muted-foreground">
              <span className="text-accent-green">+{summary.added}</span>
              <span className="mx-1 text-muted-foreground">/</span>
              <span className="text-accent-red">-{summary.removed}</span>
            </span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setView('unified')} className="h-6 gap-1 px-2 text-xs">
            <ArrowLeftRight size={12} /> 切换
          </Button>
        </div>
        <div className="grid flex-1 grid-cols-2 divide-x divide-border overflow-hidden">
          <DiffColumn diff={diff} side="left" />
          <DiffColumn diff={diff} side="right" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2 text-xs">
        <div className="flex items-center gap-3">
          <span>
            <span className="font-mono text-accent-red">v{base.data.version}</span>
            <span className="mx-1.5 text-muted-foreground">→</span>
            <span className="font-mono text-accent-green">v{target.data.version}</span>
          </span>
          <span className="text-muted-foreground">
            <span className="text-accent-green">+{summary.added}</span>
            <span className="mx-1 text-muted-foreground">/</span>
            <span className="text-accent-red">-{summary.removed}</span>
          </span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setView('split')} className="h-6 gap-1 px-2 text-xs">
          <ArrowLeftRight size={12} /> 切换
        </Button>
      </div>
      <div className="flex-1 overflow-auto bg-background p-3 font-mono text-xs">
        {diff.map((d, i) => (
          <div
            key={i}
            className={cn(
              'px-2 py-0.5',
              d.op === 'insert' && 'bg-accent-green/10 text-accent-green',
              d.op === 'delete' && 'bg-accent-red/10 text-accent-red',
              d.op === 'equal' && 'text-foreground/80',
            )}
          >
            <span className="mr-2 inline-block w-4 select-none text-right text-muted-foreground">
              {d.op === 'insert' ? '+' : d.op === 'delete' ? '-' : ' '}
            </span>
            {d.text || '\u00A0'}
          </div>
        ))}
      </div>
    </div>
  );
}

function DiffColumn({ diff, side }: { diff: DiffSegment[]; side: 'left' | 'right' }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = 0;
    }
  }, [diff]);

  return (
    <div ref={ref} className="overflow-auto bg-background p-3 font-mono text-xs">
      {diff.map((d, i) => {
        if (side === 'left' && d.op === 'insert') return null;
        if (side === 'right' && d.op === 'delete') return null;
        return (
          <div
            key={i}
            className={cn(
              'px-2 py-0.5',
              d.op === 'insert' && 'bg-accent-green/10 text-accent-green',
              d.op === 'delete' && 'bg-accent-red/10 text-accent-red',
              d.op === 'equal' && 'text-foreground/80',
            )}
          >
            <span className="mr-2 inline-block w-4 select-none text-right text-muted-foreground">
              {d.op === 'insert' ? '+' : d.op === 'delete' ? '-' : ' '}
            </span>
            {d.text || '\u00A0'}
          </div>
        );
      })}
    </div>
  );
}
