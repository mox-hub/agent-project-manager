import React, { useState } from 'react';
import { useBranches, useCreateBranch, useDeleteBranch, useCheckoutBranch } from '../hooks/use-branches';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useConfirm } from '@/shared/confirm/use-confirm';

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

  const { data: branches, isLoading, error, refetch } = useBranches(repoId, includeRemote);
  const createBranch = useCreateBranch();
  const deleteBranch = useDeleteBranch();
  const checkoutBranch = useCheckoutBranch();

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;

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
  };

  const handleCheckout = async (branchName: string) => {
    await checkoutBranch.mutateAsync({ repoId, branchName });
  };

  const handleDelete = async (branchName: string, force = false) => {
    const ok = await confirmAction({
      title: force ? '强制删除分支' : '删除分支',
      description: `确定要${force ? '强制' : ''}删除分支 "${branchName}" 吗？`,
      confirmText: '删除',
      cancelText: '取消',
      variant: 'destructive',
    });
    if (!ok) return;

    await deleteBranch.mutateAsync({ repoId, branchName, force });
  };

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Spinner />
          <span>Loading branches...</span>
        </div>
      </Card>
    );
  }

  if (error || !branches) {
    return (
      <Card className="p-4">
        <Alert variant="destructive">
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>Failed to load branches</AlertDescription>
        </Alert>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Branches</p>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={includeRemote}
                onChange={(e) => setIncludeRemote(e.target.checked)}
              />
              Include remote
            </label>
            <Button size="xs" variant="ghost" onClick={() => refetch()}>
              Refresh
            </Button>
            <Button size="xs" onClick={() => setShowCreateDialog(true)}>
              Create Branch
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Local Branches</p>
            <div className="mt-2 space-y-1">
              {branches.local.length === 0 ? (
                <p className="text-sm text-muted-foreground">No local branches</p>
              ) : (
                branches.local.map((branch) => (
                  <div
                    key={branch.name}
                    className="flex items-center justify-between rounded border p-2 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      {branch.current && <Badge variant="secondary">Current</Badge>}
                      <p className={`text-sm ${branch.current ? 'font-semibold' : ''}`}>
                        {branch.name}
                      </p>
                      {branch.tracking && (
                        <p className="text-xs text-muted-foreground">→ {branch.tracking}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {!branch.current && (
                        <>
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => handleCheckout(branch.name)}
                            disabled={checkoutBranch.isPending}
                          >
                            {checkoutBranch.isPending ? <Spinner /> : 'Checkout'}
                          </Button>
                          <Button
                            size="xs"
                            variant="destructive"
                            onClick={() => handleDelete(branch.name)}
                            disabled={deleteBranch.isPending}
                          >
                            {deleteBranch.isPending ? <Spinner /> : 'Delete'}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {includeRemote && branches.remote.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Remote Branches</p>
              <div className="mt-2 space-y-1">
                {branches.remote.map((branch) => (
                  <div
                    key={branch.fullName}
                    className="flex items-center justify-between rounded border p-2"
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-foreground">{branch.name}</p>
                      <p className="text-xs text-muted-foreground">({branch.remote})</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Branch</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">Branch Name</p>
                <Input
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="branch-name"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Create From (optional)</p>
                <Input
                  value={createFrom}
                  onChange={(e) => setCreateFrom(e.target.value)}
                  placeholder="branch, commit, or tag"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  id="createCheckout"
                  checked={createCheckout}
                  onChange={(e) => setCreateCheckout(e.target.checked)}
                />
                Checkout after creation
              </label>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateBranch}
                  disabled={createBranch.isPending || !newBranchName.trim()}
                >
                  {createBranch.isPending ? <Spinner /> : 'Create'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}
