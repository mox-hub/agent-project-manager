import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBranches, useCreateBranch, useDeleteBranch, useCheckoutBranch } from '../hooks/use-branches';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { toast } from '@/components/ui/toast';
import {
  ArrowRightLeft,
  Check,
  GitBranch,
  GitBranch as GitBranchIcon,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BranchListProps {
  repoId: string;
}

export function BranchList({ repoId }: BranchListProps) {
  const { t } = useTranslation();
  const confirmAction = useConfirm();
  const [includeRemote, setIncludeRemote] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [createFrom, setCreateFrom] = useState('');
  const [createCheckout, setCreateCheckout] = useState(true);
  const [filter, setFilter] = useState('');

  const { data: branches, isLoading, refetch } = useBranches(repoId, includeRemote);
  const createBranch = useCreateBranch();
  const deleteBranch = useDeleteBranch();
  const checkoutBranch = useCheckoutBranch();

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    try {
      await createBranch.mutateAsync({
        repoId,
        dto: {
          name: newBranchName.trim(),
          from: createFrom || undefined,
          checkout: createCheckout,
        },
      });
      setShowCreateDialog(false);
      setNewBranchName('');
      setCreateFrom('');
    } catch {
      toast.error(t('git.branches.createFailed'));
    }
  };

  const handleCheckout = async (branchName: string) => {
    try {
      await checkoutBranch.mutateAsync({ repoId, branchName });
    } catch {
      toast.error(t('git.branches.checkoutFailed'));
    }
  };

  const handleDelete = async (branchName: string) => {
    const ok = await confirmAction({
      title: t('git.branches.delete'),
      description: t('git.branches.confirmDelete', { name: branchName }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await deleteBranch.mutateAsync({ repoId, branchName });
    } catch {
      toast.error(t('git.branches.deleteFailed'));
    }
  };

  // 过滤分支
  const normalizedFilter = filter.toLowerCase();
  const filteredLocalBranches =
    branches?.local.filter((branch) => branch.name.toLowerCase().includes(normalizedFilter)) ?? [];
  const filteredRemoteBranches =
    branches?.remote.filter((branch) => branch.name.toLowerCase().includes(normalizedFilter)) ?? [];

  return (
    <div className="space-y-3">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <GitBranch size={14} className="text-accent-blue" />
          <h3 className="text-sm font-semibold text-foreground">{t('git.branches.title')}</h3>
          <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">
            {branches?.local.length ?? 0}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button size="icon-sm" variant="ghost" onClick={() => refetch()} title={t('git.branches.refresh')}>
            <RefreshCw size={14} />
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={() => setShowCreateDialog(true)} title={t('git.branches.createBranch')}>
            <Plus size={14} />
          </Button>
        </div>
      </div>

      {/* 搜索框 */}
      <Input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder={t('git.branches.filter')}
        className="h-8 text-xs"
      />

      {/* 远程分支开关 */}
      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
        <Checkbox
          checked={includeRemote}
          onCheckedChange={(v) => setIncludeRemote(v === true)}
        />
        {t('git.branches.includeRemote')}
      </label>

      {/* 分支列表 */}
      <div className="space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Spinner />
          </div>
        ) : (
          <>
            {/* 本地分支 */}
            {filteredLocalBranches.length > 0 ? (
              <div className="space-y-0.5">
                {filteredLocalBranches.map((branch) => (
                  <BranchItem
                    key={branch.name}
                    name={branch.name}
                    isCurrent={branch.current}
                    isRemote={false}
                    onCheckout={() => handleCheckout(branch.name)}
                    onDelete={() => handleDelete(branch.name)}
                    checkoutLabel={t('git.branches.checkout')}
                    deleteLabel={t('git.branches.delete')}
                    currentLabel={t('git.branches.current')}
                    isPending={checkoutBranch.isPending || deleteBranch.isPending}
                  />
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">
                {filter ? t('git.branches.noMatching') : t('git.branches.noLocalBranches')}
              </p>
            )}

            {/* 远程分支 */}
            {includeRemote && filteredRemoteBranches.length > 0 && (
              <div className="mt-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  {t('git.branches.remoteBranches')} ({filteredRemoteBranches.length})
                </p>
                <div className="space-y-0.5">
                  {filteredRemoteBranches.slice(0, 10).map((branch) => (
                    <BranchItem
                      key={branch.fullName}
                      name={branch.name}
                      remote={branch.remote}
                      isRemote={true}
                      onDelete={() => {}}
                      checkoutLabel={t('git.branches.checkout')}
                      deleteLabel={t('git.branches.delete')}
                      currentLabel={t('git.branches.current')}
                      isPending={false}
                    />
                  ))}
                  {filteredRemoteBranches.length > 10 && (
                    <p className="py-2 text-center text-xs text-muted-foreground">
                      +{filteredRemoteBranches.length - 10}
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 创建分支对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('git.branches.createNewBranch')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-branch-name">{t('git.branches.branchName')}</Label>
              <Input
                id="new-branch-name"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="feature-branch-name"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-branch-from">{t('git.branches.createFrom')}</Label>
              <Input
                id="new-branch-from"
                value={createFrom}
                onChange={(e) => setCreateFrom(e.target.value)}
                placeholder="main, develop, or commit hash"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={createCheckout}
                onCheckedChange={(v) => setCreateCheckout(v === true)}
              />
              {t('git.branches.checkoutAfterCreate')}
            </label>
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setShowCreateDialog(false)}>
              {t('git.branches.cancel')}
            </Button>
            <Button size="sm" onClick={handleCreateBranch} disabled={!newBranchName.trim() || createBranch.isPending}>
              {createBranch.isPending ? <Spinner size="sm" /> : t('git.branches.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 分支项组件
interface BranchItemProps {
  name: string;
  isCurrent?: boolean;
  tracking?: string | null;
  remote?: string;
  isRemote: boolean;
  onCheckout?: () => void;
  onDelete: () => void;
  checkoutLabel: string;
  deleteLabel: string;
  currentLabel: string;
  isPending: boolean;
}

function BranchItem({
  name,
  isCurrent,
  remote,
  isRemote,
  onCheckout,
  onDelete,
  checkoutLabel,
  deleteLabel,
  currentLabel,
  isPending,
}: BranchItemProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={cn(
        'group relative flex items-center justify-between rounded-md px-2.5 py-1.5 transition-colors',
        isCurrent ? 'bg-accent-blue/10' : 'hover:bg-accent',
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* 左侧 */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <GitBranchIcon
          size={14}
          className={cn(
            'shrink-0',
            isCurrent ? 'text-accent-blue' : 'text-muted-foreground',
          )}
        />
        <span className={cn('truncate text-xs', isCurrent ? 'font-medium text-foreground' : 'text-foreground')}>
          {name}
        </span>
        {isCurrent && (
          <span className="shrink-0 rounded-full bg-accent-blue/20 px-1.5 text-xs font-medium text-accent-blue">
            {currentLabel}
          </span>
        )}
        {remote && (
          <span className="shrink-0 text-10 text-muted-foreground">
            ({remote})
          </span>
        )}
      </div>

      {/* 右侧操作 */}
      {showActions && !isCurrent && !isRemote && (
        <div className="flex items-center gap-0.5">
          {onCheckout && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onCheckout}
              disabled={isPending}
              className="size-6"
              title={checkoutLabel}
            >
              <ArrowRightLeft size={12} />
            </Button>
          )}
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onDelete}
            disabled={isPending}
            className="size-6 text-accent-red hover:bg-accent-red/10"
            title={deleteLabel}
          >
            <Trash2 size={12} />
          </Button>
        </div>
      )}

      {isCurrent && (
        <Check size={14} className="shrink-0 text-accent-blue" />
      )}
    </div>
  );
}
