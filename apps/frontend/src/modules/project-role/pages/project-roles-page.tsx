import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Briefcase,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  Terminal,
} from 'lucide-react';
import {
  useProjectRoles,
  useCreateProjectRole,
  useUpdateProjectRole,
  useRemoveProjectRole,
  useSeedProjectRoles,
} from '../hooks/use-project-roles';
import { useConfirm } from '@/shared/confirm/confirm-provider';
import type {
  ProjectRole,
  ExecutionRole,
  CliProviderId,
} from '../api/project-roles-api';

const EXECUTION_ROLES: { value: ExecutionRole; label: string }[] = [
  { value: 'coder', label: 'Coder (编码)' },
  { value: 'reviewer', label: 'Reviewer (评审)' },
  { value: 'pm', label: 'PM (项目经理)' },
  { value: 'qa', label: 'QA (测试)' },
  { value: 'general', label: 'General (通用)' },
];

const CLI_PROVIDERS: { value: CliProviderId; label: string }[] = [
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'codex', label: 'Codex' },
  { value: 'zcode', label: 'ZCode' },
];

export default function ProjectRolesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { t } = useTranslation();
  const confirmDialog = useConfirm();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<ProjectRole | null>(null);

  const { data, isLoading } = useProjectRoles(projectId);
  const seed = useSeedProjectRoles(projectId ?? '');
  const create = useCreateProjectRole(projectId ?? '');
  const update = useUpdateProjectRole(projectId ?? '');
  const remove = useRemoveProjectRole(projectId ?? '');

  const projectRoles = data?.projectRoles ?? [];
  const globalRoles = data?.globalRoles ?? [];

  const handleSeed = async () => {
    if (!projectId) return;
    await seed.mutateAsync();
  };

  return (
    <PageShell>
      <PageHeader
        title={t('projectRoles.title', '项目执行角色')}
        description={t(
          'projectRoles.description',
          '为项目绑定执行角色与默认 CLI Provider，AI 员工派发任务时按此解析。',
        )}
        icon={Briefcase}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeed}
              disabled={seed.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              从全局模板同步
            </Button>
            <Button onClick={() => setShowCreate(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              新建角色
            </Button>
          </div>
        }
      />
      <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-7 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>项目级角色 ({projectRoles.length})</CardTitle>
            <CardDescription>
              只有项目级角色会覆盖全局模板，AI 员工派发时优先使用本项目的定义。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">加载中…</div>
            ) : projectRoles.length === 0 ? (
              <div className="text-sm text-muted-foreground space-y-2">
                <div>项目还没有执行角色。</div>
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleSeed}
                  disabled={seed.isPending}
                  className="p-0 h-auto"
                >
                  从全局模板同步 {globalRoles.length} 个默认角色 →
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {projectRoles.map((r) => (
                  <RoleRow
                    key={r.id}
                    role={r}
                    onEdit={() => setEditing(r)}
                    onDelete={async () => {
                      const ok = await confirmDialog({
                        title: '删除角色',
                        description: `确认删除角色 ${r.name}？`,
                        variant: 'destructive',
                      });
                      if (ok) remove.mutate(r.id);
                    }}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {globalRoles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>全局默认模板 ({globalRoles.length})</CardTitle>
              <CardDescription>
                项目级角色未定义时，会用这里的全局模板兜底。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {globalRoles.map((r) => (
                  <RoleRow key={r.id} role={r} readonly />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {showCreate && (
        <RoleEditDialog
          mode="create"
          onClose={() => setShowCreate(false)}
          onSubmit={async (input) => {
            await create.mutateAsync(input);
            setShowCreate(false);
          }}
        />
      )}

      {editing && (
        <RoleEditDialog
          mode="edit"
          role={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (input) => {
            await update.mutateAsync({ id: editing.id, data: input });
            setEditing(null);
          }}
        />
      )}
    </PageShell>
  );
}

function RoleRow({
  role,
  onEdit,
  onDelete,
  readonly,
}: {
  role: ProjectRole;
  onEdit?: () => void;
  onDelete?: () => void;
  readonly?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-accent/30 transition">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{role.name}</span>
          <Badge variant="secondary" className="font-mono text-xs">
            {role.key}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {role.executionRole}
          </Badge>
          {role.defaultCliProviderId && (
            <Badge variant="default" className="text-xs gap-1">
              <Terminal className="h-3 w-3" />
              {role.defaultCliProviderId}
            </Badge>
          )}
        </div>
        {role.description && (
          <div className="text-xs text-muted-foreground mt-1">
            {role.description}
          </div>
        )}
      </div>
      {!readonly && (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )}
    </div>
  );
}

function RoleEditDialog({
  mode,
  role,
  onClose,
  onSubmit,
}: {
  mode: 'create' | 'edit';
  role?: ProjectRole;
  onClose: () => void;
  onSubmit: (input: {
    key?: string;
    name: string;
    description?: string;
    executionRole: ExecutionRole;
    defaultCliProviderId?: CliProviderId;
    promptHint?: string;
  }) => Promise<void>;
}) {
  const [key, setKey] = useState(role?.key ?? '');
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [executionRole, setExecutionRole] = useState<ExecutionRole>(
    role?.executionRole ?? 'general',
  );
  const [cliProviderId, setCliProviderId] = useState<CliProviderId | ''>(
    role?.defaultCliProviderId ?? '',
  );
  const [promptHint, setPromptHint] = useState(role?.promptHint ?? '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        key: mode === 'create' ? key : undefined,
        name,
        description: description || undefined,
        executionRole,
        defaultCliProviderId: cliProviderId || undefined,
        promptHint: promptHint || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? '新建角色' : '编辑角色'}</DialogTitle>
          <DialogDescription>
            角色决定 AI 员工接收任务时的行为风格与默认 CLI。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'create' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Key (唯一标识) *</label>
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="如: coder"
                required
              />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">名称 *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如: Coder"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">描述</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="如: 负责按需求实现代码改动"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">执行角色</label>
              <Select
                value={executionRole}
                onValueChange={(v) => setExecutionRole(v as ExecutionRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXECUTION_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">默认 CLI Provider</label>
              <Select
                value={cliProviderId}
                onValueChange={(v) =>
                  setCliProviderId(String(v) === 'none' ? '' : (v as CliProviderId))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="未指定" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不指定</SelectItem>
                  {CLI_PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Prompt 提示（注入到 CLI）</label>
            <Textarea
              value={promptHint}
              onChange={(e) => setPromptHint(e.target.value)}
              placeholder="如: 你是负责编码的 AI 员工..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              取消
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !name || (mode === 'create' && !key)}
            >
              {submitting ? '保存中…' : mode === 'create' ? '创建' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
