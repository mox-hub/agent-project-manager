/**
 * 调整信任对话框 —— 人工选三级等级，保存写 Member.trustLevel（CAP-B-07）。
 * 由设置页「AI 执行中心」迁移（2026-10-02）：原挂载于恒空态的信任档案卡下
 * 不可触达；改挂办公室页 AI 同事卡后首次真正可用。
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { api } from '@/infrastructure/api-client';
import { MEMBER_TRUST_TIERS } from '@/shared/member/types';
import { TRUST_TIER_ICON, TRUST_TIER_TEXT_COLOR } from './trust-tiers-panel';

interface AdjustTrustDialogProps {
  memberId: string;
  memberName: string;
  /** 三级口径：1=观察者 2=协助者 3=受托者；未评估传 null */
  currentLevel: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdjustTrustDialog({
  memberId,
  memberName,
  currentLevel,
  open,
  onOpenChange,
}: AdjustTrustDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number>(currentLevel ?? 0);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.patch(`/members/${memberId}`, { trustLevel: selected });
      toast.success(t('trust.adjustSaved'));
      queryClient.invalidateQueries({ queryKey: ['office'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      onOpenChange(false);
    } catch {
      toast.error(t('trust.adjustFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('trust.adjustTitle', { name: memberName })}</DialogTitle>
          <DialogDescription>{t('trust.adjustDesc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {MEMBER_TRUST_TIERS.map((tier) => {
            const Icon = TRUST_TIER_ICON[tier.level];
            return (
              <button
                key={tier.level}
                type="button"
                onClick={() => setSelected(tier.level)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                  selected === tier.level
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-accent/40',
                )}
              >
                <Icon className={cn('mt-0.5 size-4 shrink-0', TRUST_TIER_TEXT_COLOR[tier.level])} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    {t(tier.labelKey)}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {t(tier.descKey)}
                  </span>
                </span>
                <span
                  className={cn(
                    'mt-0.5 size-3.5 shrink-0 rounded-full border',
                    selected === tier.level
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/40',
                  )}
                />
              </button>
            );
          })}
        </div>
        <p className="text-3xs text-muted-foreground">{t('trust.redlineNote')}</p>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={save} disabled={saving || !selected}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
