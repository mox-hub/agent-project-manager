import { useState } from 'react';
import { Check, Link2, Pencil, ShieldCheck, Sparkles, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import type { ProfileAtom } from '../../api/profile-api';

interface ProfileAtomCardProps {
  atom: ProfileAtom;
  projectId: string;
  onEdit: (atomId: string, content: string) => void;
  onApprove?: (atomId: string) => void;
  onReject?: (atomId: string) => void;
  busy?: boolean;
}

/** 置信度 → 展示色（v2 纪要：低确信不当真话，视觉上要能看出来） */
function confidenceTone(confidence: number) {
  if (confidence >= 0.8) return 'text-accent-green';
  if (confidence >= 0.5) return 'text-accent-yellow';
  return 'text-accent-orange';
}

/**
 * 档案原子卡：正文 + 置信度 + 溯源（sourceEventId 指向产生该原子的事件/执行）。
 * 生效原子可编辑（替换留痕）；草稿态附批准/驳回动作（AI 产出唯一入口）。
 */
export function ProfileAtomCard({
  atom,
  projectId,
  onEdit,
  onApprove,
  onReject,
  busy,
}: ProfileAtomCardProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(atom.content);
  const isDraft = atom.lifecycle === 'working';
  const isAi = atom.sourceType === 'tool' || atom.sourceType === 'digest';

  return (
    <div
      className={cn(
        'group rounded-lg border px-3 py-2 text-xs transition-colors',
        isDraft
          ? 'border-dashed border-accent-blue/40 bg-accent-blue-light/40'
          : 'border-border bg-background hover:bg-muted/40',
      )}
      data-ai-component="profile-atom"
      data-ai-action={isDraft ? 'review-draft' : 'view-atom'}
      data-ai-role={isAi ? 'ai-proposal' : 'human-fact'}
    >
      {editing ? (
        <div className="flex items-center gap-1.5">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-6 flex-1 text-xs"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && draft.trim()) {
                onEdit(atom.id, draft.trim());
                setEditing(false);
              }
              if (e.key === 'Escape') {
                setDraft(atom.content);
                setEditing(false);
              }
            }}
          />
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={!draft.trim() || draft === atom.content || busy}
            onClick={() => {
              onEdit(atom.id, draft.trim());
              setEditing(false);
            }}
          >
            <Check size={12} />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => {
              setDraft(atom.content);
              setEditing(false);
            }}
          >
            <X size={12} />
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 flex-1 leading-relaxed">{atom.content}</p>
            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {!isDraft && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  title={t('project.profilePage.edit')}
                  onClick={() => setEditing(true)}
                >
                  <Pencil size={12} />
                </Button>
              )}
            </div>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                'inline-flex items-center gap-0.5 tabular-nums',
                confidenceTone(atom.confidence),
              )}
              title={t('project.profilePage.confidence')}
            >
              <ShieldCheck size={10} />
              {Math.round(atom.confidence * 100)}%
            </span>
            {isAi && (
              <Badge
                variant="outline"
                className="h-4 gap-0.5 border-accent-blue/30 bg-accent-blue-light/60 px-1 text-10 text-accent-blue"
              >
                <Sparkles size={9} />
                {t('project.profilePage.aiDraft')}
              </Badge>
            )}
            {isDraft && (
              <div className="ml-auto flex items-center gap-1">
                <Button
                  size="sm"
                  variant="default"
                  className="h-5 px-1.5 text-10"
                  disabled={busy}
                  onClick={() => onApprove?.(atom.id)}
                >
                  <Check size={10} />
                  {t('project.profilePage.approve')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-5 px-1.5 text-10"
                  disabled={busy}
                  onClick={() => onReject?.(atom.id)}
                >
                  <X size={10} />
                  {t('project.profilePage.reject')}
                </Button>
              </div>
            )}
            {atom.sourceEventId && !isDraft && (
              <span
                className="inline-flex items-center gap-0.5 text-10 text-muted-foreground"
                title={`${t('project.profilePage.source')}: ${atom.sourceEventId}`}
              >
                <Link2 size={9} />
                {atom.sourceEventId.slice(0, 8)}
              </span>
            )}
          </div>
        </>
      )}
      {/* projectId 预留：溯源跳转与作用域埋点 */}
      <span className="hidden" data-project-id={projectId} />
    </div>
  );
}
