/**
 * TeamCreateDialog - 新建团队弹窗
 *
 * 从 teams-page 抽出：名称（自动生成 slug）+ Slug 双字段表单。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { useCreateTeam } from '../hooks';

export interface TeamCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamCreateDialog({ open, onOpenChange }: TeamCreateDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const createTeam = useCreateTeam();

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug) {
      setSlug(
        value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''),
      );
    }
  };

  const handleCreate = async () => {
    if (!name || !slug) return;
    try {
      await createTeam.mutateAsync({ name, slug });
      onOpenChange(false);
      setName('');
      setSlug('');
      toast.success(t('teams.create.success', '团队已创建'));
    } catch (err) {
      type ApiError = { response?: { data?: { error?: { message?: string } } } };
      const apiError = err as ApiError;
      toast.error(apiError.response?.data?.error?.message || t('teams.create.failed', '创建团队失败'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('teams.create.title', '新建团队')}</DialogTitle>
          <DialogDescription>
            {t('teams.create.description', '团队可跨项目共享，便于统一管理成员与项目绑定。')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">{t('teams.create.name', '团队名称')} *</label>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={t('teams.create.namePlaceholder', '如: 核心研发团队')}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Slug *</label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder={t('teams.create.slugPlaceholder', '如: core-team')}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {t('common.cancel', '取消')}
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={!name || !slug || createTeam.isPending}>
            {createTeam.isPending
              ? t('teams.create.pending', '创建中…')
              : t('teams.create.submit', '创建团队')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
