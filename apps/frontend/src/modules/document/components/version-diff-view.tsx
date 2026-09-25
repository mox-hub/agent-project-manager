'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { diffLines } from 'diff';
import { ArrowLeftRight } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
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
  const norm = (v: string) => {
    const lf = v.replace(/\r\n/g, '\n');
    // 归一化结尾换行：与旧 LCS 实现的按行内容比对语义一致（jsdiff 行 token 含 \n）
    return lf.endsWith('\n') ? lf.slice(0, -1) : lf;
  };
  // jsdiff（Myers）：千行级大文档不再受手写 LCS O(m·n) 内存/耗时瓶颈限制
  return diffLines(norm(a), norm(b)).flatMap((part) => {
    const op: DiffOp = part.added ? 'insert' : part.removed ? 'delete' : 'equal';
    const value = part.value.endsWith('\n') ? part.value.slice(0, -1) : part.value;
    return value.split('\n').map((line) => ({ op, text: line }));
  });
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
        <Spinner className="h-4 w-4 text-inherit" />
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
