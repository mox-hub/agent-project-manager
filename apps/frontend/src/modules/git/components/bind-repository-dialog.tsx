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
import { gitApi } from '../api/git-api';
import { GitBranch, Link2 } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

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

/**
 * Select 的 label 映射（`SelectItem` 展示内容与 Root 的 `items` 共用同一份）：
 * base-ui 必须经 Root 的 `items` 才能把 value 显示成名称，否则 trigger 显示原始 value。
 */
const PROVIDER_ITEMS = [
  { value: 'github', label: 'GitHub' },
  { value: 'gitlab', label: 'GitLab' },
  { value: 'bitbucket', label: 'Bitbucket' },
  { value: 'local', label: 'Local Repository' },
];

const REPOSITORY_ROLE_ITEMS = [
  {
    value: 'primary',
    label: (
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4" />
        Primary - Main development repository
      </div>
    ),
  },
  { value: 'secondary', label: 'Secondary - Feature/backup repository' },
  { value: 'mirror', label: 'Mirror - Read-only sync' },
];

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
    mutationFn: (data: BindRepositoryForm) =>
      gitApi.createRepository({
        projectId,
        ...data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories', projectId] });
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to bind repository');
    },
  });

  const handleSubmit = (data: BindRepositoryForm) => {
    setError(null);
    bindMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-120">
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    items={PROVIDER_ITEMS}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PROVIDER_ITEMS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    items={REPOSITORY_ROLE_ITEMS}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REPOSITORY_ROLE_ITEMS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
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
                  <Spinner className="mr-2 h-4 w-4 text-inherit" />
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
