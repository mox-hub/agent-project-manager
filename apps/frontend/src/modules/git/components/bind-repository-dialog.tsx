import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/infrastructure/api-client';
import { gitApi } from '../api/git-api';
import { GitBranch, Link2, Loader2 } from 'lucide-react';

interface BindRepositoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess?: () => void;
}

interface BindRepositoryForm {
  name: string;
  remoteUrl: string;
  localPath?: string;
  provider: 'github' | 'gitlab' | 'bitbucket' | 'local';
  role: 'primary' | 'secondary' | 'mirror';
}

export function BindRepositoryDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: BindRepositoryDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<BindRepositoryForm>({
    defaultValues: {
      name: '',
      remoteUrl: '',
      localPath: '',
      provider: 'github',
      role: 'primary',
    },
  });

  const bindMutation = useMutation({
    mutationFn: async (data: BindRepositoryForm) => {
      const response = await gitApi.createRepository({
        projectId,
        ...data,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories', projectId] });
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to bind repository');
    },
  });

  const handleSubmit = (data: BindRepositoryForm) => {
    setError(null);
    bindMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Bind Repository
          </DialogTitle>
          <DialogDescription>
            Connect a code repository to this project for Git operations and AI context.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <FormField
              control={form.control}
              name="name"
              rules={{ required: 'Repository name is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Repository Name</FormLabel>
                  <FormControl>
                    <Input placeholder="my-project" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="remoteUrl"
              rules={{ required: 'Remote URL is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remote URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://github.com/user/repo.git"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="github">GitHub</SelectItem>
                      <SelectItem value="gitlab">GitLab</SelectItem>
                      <SelectItem value="bitbucket">Bitbucket</SelectItem>
                      <SelectItem value="local">Local Repository</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="localPath"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local Path (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="C:\Projects\my-project"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="primary">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4" />
                          Primary - Main development repository
                        </div>
                      </SelectItem>
                      <SelectItem value="secondary">
                        Secondary - Feature/backup repository
                      </SelectItem>
                      <SelectItem value="mirror">
                        Mirror - Read-only sync
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={bindMutation.isPending}
              >
                {bindMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Bind Repository
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
