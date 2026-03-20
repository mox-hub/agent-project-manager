import React, { useEffect, useState } from 'react';
import { gitApi } from '../api/git-api';
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
  const [branches, setBranches] = useState<{
    local: Array<{ name: string; current: boolean; tracking: string | null }>;
    remote: Array<{ name: string; remote: string; fullName: string }>;
    current: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [includeRemote, setIncludeRemote] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [createFrom, setCreateFrom] = useState('');
  const [createCheckout, setCreateCheckout] = useState(true);
  const [creating, setCreating] = useState(false);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadBranches();
  }, [repoId, includeRemote]);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const response = await gitApi.getBranches(repoId, includeRemote);
      setBranches(response.data);
    } catch (error) {
      console.error('Failed to load branches', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;

    setCreating(true);
    try {
      await gitApi.createBranch(repoId, {
        name: newBranchName.trim(),
        from: createFrom || undefined,
        checkout: createCheckout,
      });
      setShowCreateDialog(false);
      setNewBranchName('');
      setCreateFrom('');
      await loadBranches();
    } catch (error: any) {
      alert(`Failed to create branch: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleCheckout = async (branchName: string) => {
    setCheckingOut(branchName);
    try {
      await gitApi.checkoutBranch(repoId, branchName);
      await loadBranches();
    } catch (error: any) {
      alert(`Failed to checkout branch: ${error.message}`);
    } finally {
      setCheckingOut(null);
    }
  };

  const handleDelete = async (branchName: string, force: boolean = false) => {
    const ok = await confirmAction({
      title: force ? '强制删除分支' : '删除分支',
      description: `确定要${force ? '强制' : ''}删除分支 "${branchName}" 吗？`,
      confirmText: '删除',
      cancelText: '取消',
      variant: 'destructive',
    });
    if (!ok) {
      return;
    }

    setDeleting(branchName);
    try {
      await gitApi.deleteBranch(repoId, branchName, force);
      await loadBranches();
    } catch (error: any) {
      alert(`Failed to delete branch: ${error.message}`);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-2 p-4 text-sm text-content-text-secondary">
          <Spinner />
          <span>Loading branches...</span>
        </div>
      </Card>
    );
  }

  if (!branches) {
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
          <p className="text-sm font-semibold text-content-text">Branches</p>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-content-text-secondary">
              <Checkbox
                checked={includeRemote}
                onChange={(e) => setIncludeRemote(e.target.checked)}
              />
              Include remote
            </label>
            <Button size="xs" onClick={loadBranches}>
              Refresh
            </Button>
            <Button size="xs" onClick={() => setShowCreateDialog(true)}>
              Create Branch
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-content-text-secondary">Local Branches</p>
            <div className="mt-2 space-y-1">
              {branches.local.length === 0 ? (
                <p className="text-sm text-content-text-secondary">No local branches</p>
              ) : (
                branches.local.map((branch) => (
                  <div
                    key={branch.name}
                    className="flex items-center justify-between rounded border p-2 hover:bg-content-bg-secondary"
                  >
                    <div className="flex items-center gap-2">
                      {branch.current && <Badge variant="secondary">Current</Badge>}
                      <p className={`text-sm ${branch.current ? 'font-semibold' : ''}`}>
                        {branch.name}
                      </p>
                      {branch.tracking && (
                        <p className="text-xs text-content-text-secondary">→ {branch.tracking}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {!branch.current && (
                        <>
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => handleCheckout(branch.name)}
                            disabled={checkingOut === branch.name}
                          >
                            {checkingOut === branch.name ? <Spinner /> : 'Checkout'}
                          </Button>
                          <Button
                            size="xs"
                            variant="destructive"
                            onClick={() => handleDelete(branch.name)}
                            disabled={deleting === branch.name}
                          >
                            {deleting === branch.name ? <Spinner /> : 'Delete'}
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
              <p className="text-sm font-medium text-content-text-secondary">Remote Branches</p>
              <div className="mt-2 space-y-1">
                {branches.remote.map((branch) => (
                  <div
                    key={branch.fullName}
                    className="flex items-center justify-between rounded border p-2"
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-content-text">{branch.name}</p>
                      <p className="text-xs text-content-text-secondary">({branch.remote})</p>
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
                <p className="text-sm font-medium text-content-text">Branch Name</p>
                <Input
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="branch-name"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-content-text">Create From (optional)</p>
                <Input
                  value={createFrom}
                  onChange={(e) => setCreateFrom(e.target.value)}
                  placeholder="branch, commit, or tag"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-content-text-secondary">
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
                  disabled={creating || !newBranchName.trim()}
                >
                  {creating ? <Spinner /> : 'Create'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}

