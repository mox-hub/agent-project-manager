import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import type { ProfileAtom, ProfileSlotGroup } from '../../api/profile-api';
import { ProfileAtomCard } from './profile-atom-card';

interface ProfileSlotSectionProps {
  group: ProfileSlotGroup;
  projectId: string;
  busy?: boolean;
  onEdit: (atomId: string, content: string) => void;
  onApprove: (atomId: string) => void;
  onReject: (atomId: string) => void;
  onAdd: (slot: string) => void;
}

/** 槽位分组卡（v2 纪要 §4.2 档案页主体）：生效原子 + 草稿区 + 空槽引导 */
export function ProfileSlotSection({
  group,
  projectId,
  busy,
  onEdit,
  onApprove,
  onReject,
  onAdd,
}: ProfileSlotSectionProps) {
  const { t } = useTranslation();

  const renderAtom = (atom: ProfileAtom) => (
    <ProfileAtomCard
      key={atom.id}
      atom={atom}
      projectId={projectId}
      busy={busy}
      onEdit={onEdit}
      onApprove={onApprove}
      onReject={onReject}
    />
  );

  return (
    <section
      className={cn('rounded-xl border bg-card p-3.5', !group.filled && 'border-dashed')}
      data-ai-component="profile-slot"
      data-ai-action={`slot-${group.slot}`}
      data-ai-role={group.filled ? 'filled-slot' : 'empty-slot'}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-sm font-medium">{group.label}</h3>
          {group.filled ? (
            <Badge
              variant="outline"
              className="h-4 border-accent-green/30 bg-accent-green-light/50 px-1 text-10 text-accent-green"
            >
              {t('project.profilePage.filled')}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="h-4 border-dashed px-1 text-10 text-muted-foreground"
            >
              {t('project.profilePage.notFilled')}
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 gap-1 px-1.5 text-xs text-muted-foreground"
          onClick={() => onAdd(group.slot)}
        >
          <Plus size={12} />
          {t('project.profilePage.add')}
        </Button>
      </div>
      <p className="mb-2.5 text-xs leading-relaxed text-muted-foreground">
        {group.description}
      </p>

      <div className="space-y-1.5">
        {group.drafts.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-11 font-medium text-accent-blue">
              {t('project.profilePage.draftArea', { count: group.drafts.length })}
            </p>
            {group.drafts.map(renderAtom)}
          </div>
        )}
        {group.atoms.map(renderAtom)}
        {group.atoms.length === 0 && group.drafts.length === 0 && (
          <p className="rounded-lg bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
            {t('project.profilePage.emptySlot')}
          </p>
        )}
      </div>
    </section>
  );
}
