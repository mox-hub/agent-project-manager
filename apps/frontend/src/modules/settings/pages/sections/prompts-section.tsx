/**
 * 提示词总控分区（设置 · AI 组，CAP-A-24 + 增强 A/B/C/D）：
 * - 注入开关：派发 prompt 逐段注入控制（7 段——增强 C 合并执行者段后收敛），
 *   缺省全开；变更即时生效于下一次派发。
 * - 注入率统计（增强 C）：最近执行载荷按段头解析各段实际注入率与字符开销。
 * - 系统提示词：内置资产只读查看（无写端点——系统规范不提供人工改写通道）。
 * - 模板库（增强 A）：内置常量 + 自定义模板的管理面（新建/编辑/删除，
 *   内置模板「复制为自定义」），任务/项目提示词编辑处可就地选用。
 * - 分层提示词编辑入口导航：项目级在项目设置、任务级在任务详情、
 *   执行者级在成员卡与角色管理。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Brain,
  FileCode2,
  FolderKanban,
  LayoutTemplate,
  ListChecks,
  Pencil,
  Plus,
  ScrollText,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { SectionCard } from '@/components/ui/section-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { SelectField, SelectFieldOption } from '@/components/ui/select-field';
import { PromptEditor } from '@/shared/components/prompt-editor';
import { cn } from '@/lib/utils';
import {
  useCreatePromptTemplate,
  useDeletePromptTemplate,
  usePromptConfig,
  usePromptTemplates,
  usePromptUsageStats,
  useSystemPromptDetail,
  useSystemPrompts,
  useUpdatePromptConfig,
  useUpdatePromptTemplate,
  type PromptInjectionToggles,
  type PromptTemplateItem,
} from '@/modules/prompt/api/prompt-api';

const TOGGLE_ORDER: Array<keyof PromptInjectionToggles> = [
  'system',
  'project',
  'executor',
  'team',
  'task',
  'skills',
  'context',
];

const TOGGLE_ICONS: Record<keyof PromptInjectionToggles, typeof ShieldCheck> = {
  system: ShieldCheck,
  project: FolderKanban,
  executor: UserRound,
  team: UserRound,
  task: ListChecks,
  skills: FileCode2,
  context: Brain,
};

function ToggleRow({
  toggleKey,
  checked,
  onChange,
}: {
  toggleKey: keyof PromptInjectionToggles;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  const { t } = useTranslation();
  const Icon = TOGGLE_ICONS[toggleKey];
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2">
      <div className="flex min-w-0 items-start gap-2.5">
        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-sm font-medium">{t(`prompts.toggle.${toggleKey}`)}</p>
          <p className="truncate text-xs text-muted-foreground">
            {t(`prompts.toggle.${toggleKey}Desc`)}
          </p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        data-ai-component={`settings.prompts.toggle.${toggleKey}`}
        data-ai-action={`settings.prompts.toggle.${toggleKey}.change`}
      />
    </div>
  );
}

function SystemPromptViewer() {
  const { t } = useTranslation();
  const list = useSystemPrompts();
  const items = list.data?.items ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  // 默认选中第一项：派生值兜底（selected 为空或已失效时回落首项），无需 effect 同步
  const activeKey = selected && items.some((i) => i.key === selected) ? selected : (items[0]?.key ?? null);
  const detail = useSystemPromptDetail(activeKey);

  if (list.isLoading) {
    return (
      <div className="flex gap-4">
        <div className="w-56 shrink-0 space-y-2">
          <Skeleton  />
          <Skeleton  />
        </div>
        <Skeleton className="flex-1" />
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState variant="card" icon={ScrollText} title={t('prompts.system.empty')} />;
  }

  return (
    <div className="flex gap-4">
      {/* 左列表 */}
      <div className="w-56 shrink-0 space-y-1" data-ai-component="settings.prompts.system.list">
        {items.map((item) => (
          <Button variant="ghost"
            key={item.key}
            type="button"
            onClick={() => setSelected(item.key)}
            className={cn(
              'w-full rounded-lg px-3 py-2 text-left transition-colors',
              item.key === activeKey
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-muted/60',
            )}
            data-ai-component={`settings.prompts.system.item.${item.key}`}
            data-ai-action={`settings.prompts.system.item.${item.key}.click`}
          >
            <p className="truncate text-sm font-medium">{item.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {t('prompts.system.charCount', { count: item.charCount })}
            </p>
          </Button>
        ))}
      </div>
      {/* 右只读查看器 */}
      <div className="min-w-0 flex-1">
        {detail.isLoading || !detail.data ? (
          <Skeleton  />
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{detail.data.title}</h3>
              <Badge color="blue" variant="secondary" >
                {t('prompts.system.builtin')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{detail.data.description}</p>
            <PromptEditor
              value={detail.data.content}
              readOnly
              maxHeight={384}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** 注入率统计（增强 C）：各段实际注入率 + 平均字符开销 */
function UsageStatsCard() {
  const { t } = useTranslation();
  const stats = usePromptUsageStats();
  const sections = stats.data?.sections ?? [];

  if (stats.isLoading) {
    return <Skeleton  />;
  }
  if (!stats.data || stats.data.promptCount === 0) {
    return (
      <EmptyState
        variant="card"
        icon={ScrollText}
        title={t('prompts.usage.empty')}
        description={t('prompts.usage.emptyDesc')}
      />
    );
  }

  return (
    <div className="space-y-3 px-3 py-1" data-ai-component="settings.prompts.usage">
      <p className="text-xs text-muted-foreground">
        {t('prompts.usage.sample', {
          count: stats.data.promptCount,
          chars: stats.data.avgPromptChars,
        })}
      </p>
      <div className="space-y-1.5">
        {sections.map((section) => (
          <div
            key={section.key}
            className="flex items-center gap-3"
            data-ai-component={`settings.prompts.usage.${section.key}`}
          >
            <span className="w-24 shrink-0 truncate text-xs font-medium">
              {t(`prompts.toggle.${section.key}`)}
            </span>
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-accent-blue"
                style={{ width: `${Math.round(section.ratio * 100)}%` }}
              />
            </div>
            <span className="w-20 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
              {t('prompts.usage.row', {
                ratio: Math.round(section.ratio * 100),
                chars: section.avgChars,
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 模板编辑表单弹层（新建 / 编辑 / 复制为自定义共用） */
function TemplateEditDialog({
  open,
  onOpenChange,
  editing,
  initialBody,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 编辑目标（null = 新建 / 复制为自定义） */
  editing: PromptTemplateItem | null;
  /** 新建时的初始正文（复制为自定义带入内置模板正文） */
  initialBody: string;
}) {
  const { t } = useTranslation();
  const create = useCreatePromptTemplate();
  const update = useUpdatePromptTemplate();
  const isEditMode = Boolean(editing && !editing.builtIn);
  // sessionKey：每次打开（或换目标）以 key 重挂载表单，初始态一次性注入——
  // 不用 effect 同步 setState（eslint 渲染期红线）
  const sessionKey = `${editing?.id ?? 'new'}-${initialBody.length}`;

  const close = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : close())}>
      <DialogContent maxWidth="2xl"
        
        data-ai-component="prompt.template-editor"
      >
        <DialogHeader>
          <DialogTitle>
            {isEditMode
              ? t('prompt.templateEditor.editTitle')
              : t('prompt.templateEditor.createTitle')}
          </DialogTitle>
          <DialogDescription>{t('prompt.templateEditor.desc')}</DialogDescription>
        </DialogHeader>
        <TemplateEditForm
          key={sessionKey}
          editing={editing}
          initialBody={initialBody}
          create={create}
          update={update}
          onCancel={close}
          onSaved={close}
        />
      </DialogContent>
    </Dialog>
  );
}

function TemplateEditForm({
  editing,
  initialBody,
  create,
  update,
  onCancel,
  onSaved,
}: {
  editing: PromptTemplateItem | null;
  initialBody: string;
  create: ReturnType<typeof useCreatePromptTemplate>;
  update: ReturnType<typeof useUpdatePromptTemplate>;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const isEditMode = Boolean(editing && !editing.builtIn);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState<'task' | 'project' | 'role' | 'member'>('task');
  const [body, setBody] = useState(editing?.body ?? initialBody);

  const handleSave = async () => {
    if (isEditMode && editing) {
      await update.mutateAsync({
        id: editing.id,
        data: {
          name: name || editing.name,
          description,
          body: body || editing.body,
        },
      });
    } else {
      await create.mutateAsync({
        name: name || t('prompt.templateEditor.untitled'),
        description,
        target,
        scope: 'workspace',
        body: body || initialBody,
      });
    }
    onSaved();
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input size="h-8"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={editing?.name ?? t('prompt.templateEditor.namePlaceholder')}
            
            data-ai-component="prompt.template-editor.name"
          />
          {isEditMode ? null : (
            <SelectField
              value={target}
              onChange={(event) =>
                setTarget(event.target.value as 'task' | 'project' | 'role' | 'member')
              }
              
              data-ai-component="prompt.template-editor.target"
            >
              <SelectFieldOption value="task">{t('prompt.target.task')}</SelectFieldOption>
              <SelectFieldOption value="project">{t('prompt.target.project')}</SelectFieldOption>
              <SelectFieldOption value="role">{t('prompt.target.role')}</SelectFieldOption>
              <SelectFieldOption value="member">{t('prompt.target.member')}</SelectFieldOption>
            </SelectField>
          )}
        </div>
        <Input size="h-8"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('prompt.templateEditor.descPlaceholder')}
          
        />
        <PromptEditor
          value={body}
          onChange={setBody}
          placeholder={t('prompt.templateEditor.bodyPlaceholder')}
          rows={6}
        />
        <p className="text-xs text-muted-foreground">
          {t('prompt.templateEditor.variableHint')}
        </p>
      </div>
      <DialogFooter >
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t('prompt.templateEditor.cancel')}
        </Button>
        <Button
          size="sm"
          disabled={create.isPending || update.isPending}
          onClick={() => void handleSave()}
          data-ai-action="prompt.template-editor.save"
        >
          {t('prompt.templateEditor.save')}
        </Button>
      </DialogFooter>
    </>
  );
}

/** 模板库管理面（增强 A）：内置 + 自定义，新建/编辑/删除/复制为自定义 */
function TemplateLibraryCard() {
  const { t } = useTranslation();
  const templates = usePromptTemplates();
  const remove = useDeletePromptTemplate();
  const items = templates.data?.items ?? [];
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<PromptTemplateItem | null>(null);
  const [initialBody, setInitialBody] = useState('');

  const openCreate = () => {
    setEditing(null);
    setInitialBody('');
    setEditorOpen(true);
  };
  const openEdit = (item: PromptTemplateItem) => {
    setEditing(item);
    setInitialBody('');
    setEditorOpen(true);
  };
  const openDuplicate = (item: PromptTemplateItem) => {
    setEditing(null);
    setInitialBody(item.body);
    setEditorOpen(true);
  };

  return (
    <div className="space-y-2 px-3 py-1" data-ai-component="settings.prompts.templates">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{t('prompts.templates.hint')}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          fontSize="xs" 
          onClick={openCreate}
          data-ai-component="settings.prompts.templates.create"
          data-ai-action="settings.prompts.templates.create.click"
        >
          <Plus className="size-3" />
          {t('prompts.templates.create')}
        </Button>
      </div>
      {templates.isLoading ? (
        <Skeleton  />
      ) : items.length === 0 ? (
        <EmptyState variant="card" icon={LayoutTemplate} title={t('prompts.templates.empty')} />
      ) : (
        <div className="divide-y divide-border/60 rounded-lg border border-border/70">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 px-3 py-2"
              data-ai-component={`settings.prompts.templates.${item.id}`}
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                  {item.name}
                  <Badge variant="secondary" fontSize="xs" className="shrink-0">
                    {t(`prompt.target.${item.target}`)}
                  </Badge>
                  {item.builtIn ? (
                    <Badge color="blue" variant="secondary" fontSize="xs" className="shrink-0">
                      {t('prompts.templates.builtin')}
                    </Badge>
                  ) : null}
                </p>
                {item.description ? (
                  <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {item.builtIn ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    fontSize="xs" 
                    onClick={() => openDuplicate(item)}
                    data-ai-action={`settings.prompts.templates.${item.id}.duplicate`}
                  >
                    {t('prompts.templates.duplicate')}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      fontSize="xs" 
                      onClick={() => openEdit(item)}
                      data-ai-action={`settings.prompts.templates.${item.id}.edit`}
                    >
                      <Pencil className="size-3" />
                      {t('prompts.templates.edit')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      fontSize="xs" 
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(item.id)}
                      data-ai-action={`settings.prompts.templates.${item.id}.delete`}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <TemplateEditDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        editing={editing}
        initialBody={initialBody}
      />
    </div>
  );
}

export function PromptsSettingsSection() {
  const { t } = useTranslation();
  const config = usePromptConfig();
  const update = useUpdatePromptConfig();
  const toggles = config.data?.toggles;

  return (
    <PageShell title={t('settings.prompts')} icon={ScrollText}>
      <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-6">
        {/* 注入开关 */}
        <SectionCard
          title={t('prompts.toggles.title')}
          description={t('prompts.toggles.desc')}
        >
          {config.isLoading || !toggles ? (
            <div className="space-y-2 px-3 py-2">
              <Skeleton  />
              <Skeleton  />
              <Skeleton  />
            </div>
          ) : (
            <div className="divide-y divide-border/60" data-ai-component="settings.prompts.toggles">
              {TOGGLE_ORDER.map((key) => (
                <ToggleRow
                  key={key}
                  toggleKey={key}
                  checked={toggles[key]}
                  onChange={(next) => update.mutate({ [key]: next })}
                />
              ))}
            </div>
          )}
        </SectionCard>

        {/* 注入率统计（增强 C） */}
        <SectionCard
          title={t('prompts.usage.title')}
          description={t('prompts.usage.desc')}
        >
          <UsageStatsCard />
        </SectionCard>

        {/* 系统提示词（只读） */}
        <SectionCard
          title={t('prompts.system.title')}
          description={t('prompts.system.desc')}
        >
          <SystemPromptViewer />
        </SectionCard>

        {/* 模板库（增强 A） */}
        <SectionCard
          title={t('prompts.templates.title')}
          description={t('prompts.templates.desc')}
        >
          <TemplateLibraryCard />
        </SectionCard>

        {/* 分层编辑入口导航 */}
        <SectionCard title={t('prompts.where.title')} description={t('prompts.where.desc')}>
          <div className="space-y-2 px-3 py-1 text-xs text-muted-foreground" data-ai-component="settings.prompts.where">
            <p>· {t('prompts.where.project')}</p>
            <p>· {t('prompts.where.task')}</p>
            <p>· {t('prompts.where.executor')}</p>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
