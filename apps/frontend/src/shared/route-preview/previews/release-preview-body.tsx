import { ShieldCheck, Package } from 'lucide-react';
import { StatusPill } from '@/components/ui/status-pill';
import {
  PreviewFooterMeta,
  PreviewRow,
  PreviewSection,
} from './preview-fields';

export function ReleasePreviewBody({ id }: { id: string }) {
  const versionTag = id.startsWith('v') ? id : `v${id}`;

  return (
    <div className="space-y-3">
      {/* 顶部 Hero 带：版本 Tag + 发布状态 + 门禁审计 */}
      <div className="space-y-1.5 pb-1 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <StatusPill tone="success">Published</StatusPill>
            <span className="text-11 font-mono font-medium text-foreground">tag: {versionTag}</span>
          </div>
          <span className="text-10 font-mono text-muted-foreground">GA 稳定版</span>
        </div>
        <div className="flex items-center justify-between text-10 text-muted-foreground pt-0.5">
          <span className="flex items-center gap-1 text-accent-green font-medium">
            <ShieldCheck className="size-3" /> 门禁归档 100% 审计闭环
          </span>
          <span className="font-mono text-accent-green">全绿通过</span>
        </div>
      </div>

      <PreviewSection title="发版资产与契约">
        <PreviewRow label="变更真相源">CHANGELOG.md (单向再生)</PreviewRow>
        <PreviewRow label="发布契约">双签审计 · 门禁零漂移</PreviewRow>
        <PreviewRow label="多端产物">
          <span className="flex items-center gap-1">
            <Package className="size-3 text-muted-foreground" />
            Web · Desktop · CLI
          </span>
        </PreviewRow>
      </PreviewSection>

      <PreviewFooterMeta>
        <span className="text-muted-foreground">发版规范: SemVer 2.0</span>
        <span className="ml-auto font-mono text-10">{versionTag}</span>
      </PreviewFooterMeta>
    </div>
  );
}
