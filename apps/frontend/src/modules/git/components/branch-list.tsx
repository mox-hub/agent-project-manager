import React, { useEffect, useState } from 'react';
import { gitApi } from '../api/git-api';
import {
  Button,
  Card,
  Text,
  TextField,
  Dialog,
  Callout,
  Spinner,
  Badge,
} from '@radix-ui/themes';

export interface BranchListProps {
  repoId: string;
}

export function BranchList({ repoId }: BranchListProps) {
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
    if (
      !confirm(
        `Are you sure you want to ${force ? 'force ' : ''}delete branch "${branchName}"?`,
      )
    ) {
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
        <div className="flex items-center gap-2 p-4">
          <Spinner size="2" />
          <Text>Loading branches...</Text>
        </div>
      </Card>
    );
  }

  if (!branches) {
    return (
      <Card>
        <Callout.Root color="red">
          <Callout.Text>Failed to load branches</Callout.Text>
        </Callout.Root>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Text weight="bold">Branches</Text>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeRemote}
                onChange={(e) => setIncludeRemote(e.target.checked)}
              />
              Include remote
            </label>
            <Button size="1" onClick={loadBranches}>
              Refresh
            </Button>
            <Button size="1" onClick={() => setShowCreateDialog(true)}>
              Create Branch
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Text size="2" weight="medium" color="gray">
              Local Branches
            </Text>
            <div className="mt-2 space-y-1">
              {branches.local.length === 0 ? (
                <Text size="2" color="gray">
                  No local branches
                </Text>
              ) : (
                branches.local.map((branch) => (
                  <div
                    key={branch.name}
                    className="flex items-center justify-between p-2 border rounded hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      {branch.current && (
                        <Badge color="green" size="1">
                          Current
                        </Badge>
                      )}
                      <Text weight={branch.current ? 'bold' : 'regular'}>
                        {branch.name}
                      </Text>
                      {branch.tracking && (
                        <Text size="1" color="gray">
                          → {branch.tracking}
                        </Text>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {!branch.current && (
                        <>
                          <Button
                            size="1"
                            variant="ghost"
                            onClick={() => handleCheckout(branch.name)}
                            disabled={checkingOut === branch.name}
                          >
                            {checkingOut === branch.name ? (
                              <Spinner size="1" />
                            ) : (
                              'Checkout'
                            )}
                          </Button>
                          <Button
                            size="1"
                            variant="ghost"
                            color="red"
                            onClick={() => handleDelete(branch.name)}
                            disabled={deleting === branch.name}
                          >
                            {deleting === branch.name ? (
                              <Spinner size="1" />
                            ) : (
                              'Delete'
                            )}
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
              <Text size="2" weight="medium" color="gray">
                Remote Branches
              </Text>
              <div className="mt-2 space-y-1">
                {branches.remote.map((branch) => (
                  <div
                    key={branch.fullName}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div className="flex items-center gap-2">
                      <Text>{branch.name}</Text>
                      <Text size="1" color="gray">
                        ({branch.remote})
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Dialog.Root open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <Dialog.Content>
            <Dialog.Title>Create New Branch</Dialog.Title>
            <div className="space-y-3 mt-4">
              <div>
                <Text size="2" weight="medium">
                  Branch Name
                </Text>
                <TextField.Root
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="branch-name"
                />
              </div>
              <div>
                <Text size="2" weight="medium">
                  Create From (optional)
                </Text>
                <TextField.Root
                  value={createFrom}
                  onChange={(e) => setCreateFrom(e.target.value)}
                  placeholder="branch, commit, or tag"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="createCheckout"
                  checked={createCheckout}
                  onChange={(e) => setCreateCheckout(e.target.checked)}
                />
                <label htmlFor="createCheckout" className="text-sm">
                  Checkout after creation
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="soft"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateBranch}
                  disabled={creating || !newBranchName.trim()}
                >
                  {creating ? <Spinner size="2" /> : 'Create'}
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Root>
      </div>
    </Card>
  );
}
