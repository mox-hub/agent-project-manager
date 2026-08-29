import { useEffect, useState } from 'react';
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
import { AvatarPickerField } from '@/components/ui/avatar-picker-field';
import { toast } from '@/components/ui/toast';
import { useCreateMember, useUpdateMember } from '../hooks';
import { MEMBER_THINKING_LEVELS, MEMBER_TRUST_LEVEL_LABELS, type Member } from '../types';
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
  /** 传入即为编辑模式（预填并 PATCH 更新），类型与账号关联不可改 */
  member?: Member | null;
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
  member = null,
}: MemberCreateDialogProps) {
  const isEdit = Boolean(member);
  const [type, setType] = useState<'human' | 'ai_agent'>(defaultType);
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [trustLevel, setTrustLevel] = useState('');
  const [userId, setUserId] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('Asia/Shanghai');
  const [costRatePerDay, setCostRatePerDay] = useState('');
  const [aiModelConfigId, setAiModelConfigId] = useState('');
  const [personalPrompt, setPersonalPrompt] = useState('');
  const [thinkingLevel, setThinkingLevel] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [defaultCliProviderId, setDefaultCliProviderId] =
    useState<string>('');
  const [defaultExecutionRole, setDefaultExecutionRole] =
    useState<string>('');

  const createMember = useCreateMember();
  const updateMember = useUpdateMember();

  // 编辑模式：打开时预填既有字段（costRatePerDay 存储单位为分）
  useEffect(() => {
    if (!open || !member) return;
    setType(member.type === 'ai_agent' ? 'ai_agent' : 'human');
    setDisplayName(member.displayName ?? '');
    setHandle(member.handle ?? '');
    setEmail(member.email ?? '');
    setAvatarUrl(member.avatarUrl ?? null);
    setTitle(member.title ?? '');
    setDescription(member.description ?? '');
    setTrustLevel(member.trustLevel === null || member.trustLevel === undefined ? '' : String(member.trustLevel));
    setUserId(member.userId ?? '');
    setPhone(member.phone ?? '');
    setTimezone(member.timezone ?? 'Asia/Shanghai');
    setCostRatePerDay(
      member.costRatePerDay ? String(member.costRatePerDay / 100) : '',
    );
    setAiModelConfigId(member.aiModelConfigId ?? '');
    setPersonalPrompt(member.personalPrompt ?? '');
    setThinkingLevel(member.thinkingLevel ?? '');
    setTagsInput(Array.isArray(member.tags) ? member.tags.join(', ') : '');
    setDefaultCliProviderId(member.defaultCliProviderId ?? '');
    setDefaultExecutionRole(member.defaultExecutionRole ?? '');
  }, [open, member]);

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
    setAvatarUrl(null);
    setTitle('');
    setDescription('');
    setTrustLevel('');
    setUserId('');
    setPhone('');
    setTimezone('Asia/Shanghai');
    setCostRatePerDay('');
    setAiModelConfigId('');
    setPersonalPrompt('');
    setThinkingLevel('');
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
      avatarUrl: avatarUrl || undefined,
      title: title || undefined,
      description: description || undefined,
      trustLevel: trustLevel === '' ? undefined : Number(trustLevel),
      tags: tagsInput
        ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
        : undefined,
    };
    if (type === 'human') {
      payload.userId = userId || undefined;
      payload.costRatePerDay = costRatePerDay === '' ? undefined : Math.round(Number(costRatePerDay) * 100);
      // Member 模型没有 phone/timezone 列；member-card.service 从 metadata 读取这两个字段
      const meta: Record<string, string> = {};
      if (phone) meta.phone = phone;
      if (timezone) meta.timezone = timezone;
      payload.metadata = Object.keys(meta).length ? meta : undefined;
    } else {
      payload.aiModelConfigId = aiModelConfigId || undefined;
      payload.personalPrompt = personalPrompt || undefined;
      payload.thinkingLevel = thinkingLevel || undefined;
      payload.defaultCliProviderId = defaultCliProviderId || undefined;
      payload.defaultExecutionRole = defaultExecutionRole || undefined;
    }

    try {
      const saved = isEdit && member
        ? await updateMember.mutateAsync({ id: member.id, data: payload })
        : await createMember.mutateAsync(payload);
      onSuccess?.(saved);
      handleClose(false);
    } catch (err) {
      console.error('Save member failed', err);
      toast.error(isEdit ? '更新成员失败' : '创建成员失败');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑成员' : '新建成员'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? '更新成员资料，类型与账号关联不可修改。'
              : '创建团队成员，支持人类与 AI 成员。'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={type} onValueChange={(v) => setType(v as 'human' | 'ai_agent')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="human" disabled={isEdit}>人类成员</TabsTrigger>
              <TabsTrigger value="ai_agent" disabled={isEdit}>AI 成员</TabsTrigger>
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
            <label className="text-xs font-medium">头像</label>
            <AvatarPickerField
              value={avatarUrl}
              onValueChange={setAvatarUrl}
              memberType={type === 'ai_agent' ? 'ai' : 'human'}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">职务</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="如: 前端工程师"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">信任等级</label>
              <select
                className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
                value={trustLevel}
                onChange={(e) => setTrustLevel(e.target.value)}
              >
                <option value="">未评估</option>
                {MEMBER_TRUST_LEVEL_LABELS.map((label, level) => (
                  <option key={level} value={level}>
                    {label}
                  </option>
                ))}
              </select>
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
            <label className="text-xs font-medium">描述</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简短描述成员背景或职责"
            />
          </div>

          {type === 'human' ? (
            <div className="space-y-3 rounded-md border border-border p-3 bg-muted/30">
              <div className="text-xs font-semibold text-muted-foreground">人类成员</div>
              <div className="space-y-1.5">
                <label className="text-xs">关联 User</label>
                <select
                  className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm disabled:opacity-50"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  disabled={isEdit}
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
              <div className="space-y-1.5">
                <label className="text-xs">日费率（元/天，用于团队人天成本统计）</label>
                <Input
                  type="number"
                  min="0"
                  step="50"
                  value={costRatePerDay}
                  onChange={(e) => setCostRatePerDay(e.target.value)}
                  placeholder="如: 1500"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-md border border-border p-3 bg-accent-purple/5">
              <div className="text-xs font-semibold text-accent-purple">AI 成员</div>
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
                <label className="text-xs">个人提示词（注入任务派发与聊天上下文）</label>
                <textarea
                  value={personalPrompt}
                  onChange={(e) => setPersonalPrompt(e.target.value)}
                  placeholder="如: 你是一名全栈工程师，偏好简洁实现与充分测试..."
                  className="w-full h-20 px-2 py-1.5 rounded-md border border-input bg-background text-sm resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs">思考强度</label>
                  <select
                    className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
                    value={thinkingLevel}
                    onChange={(e) => setThinkingLevel(e.target.value)}
                  >
                    <option value="">默认</option>
                    {MEMBER_THINKING_LEVELS.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
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
                updateMember.isPending ||
                !displayName ||
                !handle ||
                (type === 'ai_agent' && !aiModelConfigId)
              }
            >
              {createMember.isPending || updateMember.isPending
                ? isEdit
                  ? '保存中…'
                  : '创建中…'
                : isEdit
                  ? '保存修改'
                  : '创建成员'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
