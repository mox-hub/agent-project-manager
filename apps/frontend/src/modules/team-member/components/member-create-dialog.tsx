import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCreateMember } from '../hooks';
import type { Member } from '../types';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/infrastructure/api-client';
import { aiHubApi } from '@/modules/ai-hub/api/ai-hub-api';
import { useProjectRoles } from '@/modules/project-role';
import {
  mcpServersApi,
} from '@/modules/mcp-server/api/mcp-servers-api';

export interface MemberCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (member: Member) => void;
  defaultType?: 'human' | 'ai_agent';
  defaultProjectId?: string;
}

interface AIModelRef {
  id: string;
  name: string;
  provider: string;
}

// 注: ai-hub API 的 AIModel 类型见 ai-hub/api/ai-hub-api.ts

export function MemberCreateDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultType = 'human',
  defaultProjectId,
}: MemberCreateDialogProps) {
  const [type, setType] = useState<'human' | 'ai_agent'>(defaultType);
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [userId, setUserId] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('Asia/Shanghai');
  const [aiModelConfigId, setAiModelConfigId] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [defaultCliProviderId, setDefaultCliProviderId] =
    useState<string>('');
  const [defaultExecutionRole, setDefaultExecutionRole] =
    useState<string>('');

  const createMember = useCreateMember();

  const { data: aiModelsRes } = useQuery({
    queryKey: ['ai-models-list'],
    queryFn: () => aiHubApi.getModels(),
    enabled: open && type === 'ai_agent',
    staleTime: 60 * 1000,
  });
  const aiModels = aiModelsRes;

  const { data: users } = useQuery({
    queryKey: ['users-list-for-member'],
    queryFn: async () => {
      return api.get<Array<{ id: string; username: string; displayName: string; email: string }>>('/users');
    },
    enabled: open && type === 'human',
    staleTime: 60 * 1000,
  });

  // CLI provider 列表（仅 AI 员工显示）
  const { data: cliProvidersRes } = useQuery({
    queryKey: ['cli-providers-for-member'],
    queryFn: () => mcpServersApi.listCliProviders(),
    enabled: open && type === 'ai_agent',
    staleTime: 60 * 1000,
  });
  const cliProviders = cliProvidersRes?.providers ?? [];

  // 项目级角色 + 全局模板（仅 AI 员工显示）
  const { data: projectRolesData } = useProjectRoles(
    defaultProjectId && type === 'ai_agent' ? defaultProjectId : undefined,
  );
  const executionRoleOptions = [
    ...(projectRolesData?.globalRoles ?? []),
    ...(projectRolesData?.projectRoles ?? []),
  ];

  const reset = () => {
    setType(defaultType);
    setDisplayName('');
    setHandle('');
    setEmail('');
    setBio('');
    setUserId('');
    setPhone('');
    setTimezone('Asia/Shanghai');
    setAiModelConfigId('');
    setSystemPrompt('');
    setTagsInput('');
    setDefaultCliProviderId('');
    setDefaultExecutionRole('');
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName || !handle) return;

    const payload: any = {
      type,
      displayName,
      handle,
      email: email || undefined,
      bio: bio || undefined,
      tags: tagsInput
        ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
        : undefined,
    };
    if (type === 'human') {
      payload.userId = userId || undefined;
      payload.phone = phone || undefined;
      payload.timezone = timezone || undefined;
    } else {
      payload.aiModelConfigId = aiModelConfigId || undefined;
      payload.systemPrompt = systemPrompt || undefined;
      payload.defaultCliProviderId = defaultCliProviderId || undefined;
      payload.defaultExecutionRole = defaultExecutionRole || undefined;
    }

    try {
      const member = await createMember.mutateAsync(payload);
      onSuccess?.(member);
      handleClose(false);
    } catch (err) {
      console.error('Create member failed', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>新建成员</DialogTitle>
          <DialogDescription>
            创建团队成员，支持人类与 AI 成员。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={type} onValueChange={(v) => setType(v as 'human' | 'ai_agent')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="human">人类成员</TabsTrigger>
              <TabsTrigger value="ai_agent">AI 成员</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">显示名 *</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="如: 张开发"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">@handle *</label>
              <Input
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                placeholder="如: zhang-dev"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">邮箱</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">标签（逗号分隔）</label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="如: frontend, expert"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">简介</label>
            <Input
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="简短描述成员背景或职责"
            />
          </div>

          {type === 'human' ? (
            <div className="space-y-3 rounded-md border border-border p-3 bg-muted/30">
              <div className="text-xs font-semibold text-muted-foreground">人类成员</div>
              <div className="space-y-1.5">
                <label className="text-xs">关联 User</label>
                <select
                  className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                >
                  <option value="">不关联（独立人类）</option>
                  {users?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName} (@{u.username})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs">电话</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+86-..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs">时区</label>
                  <Input
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-md border border-border p-3 bg-violet-500/5">
              <div className="text-xs font-semibold text-violet-700">AI 成员</div>
              <div className="space-y-1.5">
                <label className="text-xs">AI 模型 *</label>
                <select
                  className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
                  value={aiModelConfigId}
                  onChange={(e) => setAiModelConfigId(e.target.value)}
                  required
                >
                  <option value="">选择 AI 模型</option>
                  {aiModels?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.provider})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs">系统提示词</label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="如: 你是一名全栈工程师..."
                  className="w-full h-20 px-2 py-1.5 rounded-md border border-input bg-background text-sm resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs">默认执行角色</label>
                  <select
                    className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
                    value={defaultExecutionRole}
                    onChange={(e) => setDefaultExecutionRole(e.target.value)}
                  >
                    <option value="">不指定（按任务解析）</option>
                    {executionRoleOptions.map((r) => (
                      <option key={r.id} value={r.executionRole}>
                        {r.name} ({r.executionRole})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs">默认 CLI Provider</label>
                  <select
                    className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
                    value={defaultCliProviderId}
                    onChange={(e) => setDefaultCliProviderId(e.target.value)}
                  >
                    <option value="">不指定（按角色解析）</option>
                    {cliProviders.map((p) => (
                      <option
                        key={p.providerId}
                        value={p.providerId}
                        disabled={!p.enabled}
                      >
                        {p.providerId}
                        {p.enabled ? ' · 可用' : ' · 已禁用'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleClose(false)}
            >
              取消
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={
                createMember.isPending ||
                !displayName ||
                !handle ||
                (type === 'ai_agent' && !aiModelConfigId)
              }
            >
              {createMember.isPending ? '创建中…' : '创建成员'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
