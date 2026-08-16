import { useState } from 'react';
import { useBranches, useCreateBranch, useDeleteBranch, useCheckoutBranch } from '../hooks/use-branches';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useConfirm } from '@/shared/confirm/use-confirm';
import {
  GitBranch,
  Plus,
  Trash2,
  RefreshCw,
  GitBranchIcon,
  Check,
  MoreHorizontal,
  ArrowRightLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BranchListProps {
  repoId: string;
}

export function BranchList({ repoId }: BranchListProps) {
  const confirmAction = useConfirm();
  const [includeRemote, setIncludeRemote] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [createFrom, setCreateFrom] = useState('');
  const [createCheckout, setCreateCheckout] = useState(true);
  const [filter, setFilter] = useState('');

  const { data: branches, isLoading, error, refetch } = useBranches(repoId, includeRemote);
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
    } catch (err) {
      console.error('Failed to create branch:', err);
    }
  };

  const handleCheckout = async (branchName: string) => {
    try {
      await checkoutBranch.mutateAsync({ repoId, branchName });
    } catch (err) {
      console.error('Failed to checkout:', err);
    }
  };

  const handleDelete = async (branchName: string) => {
    const ok = await confirmAction({
      title: 'Delete Branch',
      description: `确定要删除分支 "${branchName}" 吗？`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
    });
    if (!ok) return;

    try {
      await deleteBranch.mutateAsync({ repoId, branchName });
    } catch (err) {
      console.error('Failed to delete branch:', err);
    }
  };

  // 过滤分支
  const filteredLocalBranches = branches?.local.filter(branch =>
    branch.name.toLowerCase().includes(filter.toLowerCase())
  ) ?? [];

  const filteredRemoteBranches = branches?.remote.filter(branch =>
    branch.name.toLowerCase().includes(filter.toLowerCase())
  ) ?? [];

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch size={16} className="text-accent-blue" />
          <h3 className="text-sm font-semibold text-foreground">Branches</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {branches?.local.length ?? 0}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => refetch()}
            className="h-7 w-7"
          >
            <RefreshCw size={14} />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setShowCreateDialog(true)}
            className="h-7 w-7"
          >
            <Plus size={14} />
          </Button>
        </div>
      </div>

      {/* 搜索框 */}
      <Input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter branches..."
        className="h-8 text-xs"
      />

      {/* 远程分支开关 */}
      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
        <input
          type="checkbox"
          checked={includeRemote}
          onChange={(e) => setIncludeRemote(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-border bg-background accent-accent-blue"
        />
        Include remote branches
      </label>

      {/* 分支列表 */}
      <div className="space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Spinner />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-center text-xs text-destructive">
            Failed to load branches
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
                    tracking={branch.tracking}
                    isRemote={false}
                    onCheckout={() => handleCheckout(branch.name)}
                    onDelete={() => handleDelete(branch.name)}
                    isPending={checkoutBranch.isPending || deleteBranch.isPending}
                  />
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">
                {filter ? 'No matching branches' : 'No local branches'}
              </p>
            )}

            {/* 远程分支 */}
            {includeRemote && filteredRemoteBranches.length > 0 && (
              <div className="mt-4">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Remote ({filteredRemoteBranches.length})
                </p>
                <div className="space-y-0.5">
                  {filteredRemoteBranches.slice(0, 10).map((branch) => (
                    <BranchItem
                      key={branch.fullName}
                      name={branch.name}
                      remote={branch.remote}
                      isRemote={true}
                      onDelete={() => {}}
                      isPending={false}
                    />
                  ))}
                  {filteredRemoteBranches.length > 10 && (
                    <p className="py-2 text-center text-xs text-muted-foreground">
                      +{filteredRemoteBranches.length - 10} more
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 创建分支对话框 */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowCreateDialog(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-background p-4 shadow-xl">
            <h3 className="mb-4 text-base font-semibold text-foreground">Create New Branch</h3>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Branch Name
                </label>
                <Input
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="feature-branch-name"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Create From (optional)
                </label>
                <Input
                  value={createFrom}
                  onChange={(e) => setCreateFrom(e.target.value)}
                  placeholder="main, develop, or commit hash"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={createCheckout}
                  onChange={(e) => setCreateCheckout(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-accent-blue"
                />
                <span className="text-foreground">Checkout after creation</span>
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateBranch}
                disabled={!newBranchName.trim() || createBranch.isPending}
              >
                {createBranch.isPending ? <Spinner size="sm" /> : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}
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
  isPending: boolean;
}

function BranchItem({
  name,
  isCurrent,
  tracking,
  remote,
  isRemote,
  onCheckout,
  onDelete,
  isPending,
}: BranchItemProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className={cn(
        'group relative flex items-center justify-between rounded-md px-2.5 py-2 transition-colors',
        isCurrent
          ? 'bg-accent-blue/10 border border-accent-blue/30'
          : 'hover:bg-muted/50 border border-transparent'
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
            isCurrent ? 'text-accent-blue' : 'text-muted-foreground'
          )}
        />
        <span className={cn(
          'truncate text-xs',
          isCurrent ? 'font-medium text-foreground' : 'text-foreground'
        )}>
          {name}
        </span>
        {isCurrent && (
          <span className="shrink-0 rounded-full bg-accent-blue/20 px-1.5 py-0.5 text-[10px] font-medium text-accent-blue">
            current
          </span>
        )}
        {remote && (
          <span className="shrink-0 text-[10px] text-muted-foreground">
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
              className="h-6 w-6"
              title="Checkout"
            >
              <ArrowRightLeft size={12} />
            </Button>
          )}
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onDelete}
            disabled={isPending}
            className="h-6 w-6 text-accent-red hover:bg-accent-red/10"
            title="Delete"
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
