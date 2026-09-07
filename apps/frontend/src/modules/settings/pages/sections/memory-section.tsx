/**
 * 记忆检视分区（设置 · AI 组）：「记忆是产品一等公民」的人可检视面。
 * 列出应用侧记忆原子（scope 隔离 / 类型 / 置信度 / 命中次数），
 * 人可钉住（不参与衰减）、归档（证据可查不注入）、删除（软删 pruned）。
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Archive,
  Brain,
  MapPin,
  Pin,
  PinOff,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NativeSelect } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { projectApi } from '@/modules/project/api/project-api';
import {
  useMemoryList,
  useMemoryMutations,
  type MemoryAtomRecord,
} from '../../api/memory-api';

const TYPE_TONE: Record<string, string> = {
  preference: 'bg-accent-purple/10 text-accent-purple',
  conclusion: 'bg-accent-blue/10 text-accent-blue',
  summary: 'bg-accent-green/10 text-accent-green',
  relationship: 'bg-accent-yellow/10 text-accent-yellow',
  capability: 'bg-muted text-muted-foreground',
};

function AtomRow({ atom }: { atom: MemoryAtomRecord }) {
  const { t } = useTranslation();
  const { pin, archive, remove } = useMemoryMutations();

  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5"
      data-ai-component="settings.memory.atom"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={TYPE_TONE[atom.type] ?? 'bg-muted'} variant="secondary">
            {t(`memory.type.${atom.type}`)}
          </Badge>
          {atom.pinned && (
            <span className="inline-flex items-center gap-0.5 text-xs text-accent-yellow">
              <Pin className="size-3" />
              {t('memory.pinned')}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {t('memory.confidence', { pct: Math.round(atom.confidence * 100) })}
            {` · ${t('memory.hits', { n: atom.hits })}`}
            {` · ${atom.scope === 'global' ? t('memory.scopeGlobal') : t('memory.scopeProject')}`}
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-foreground" title={atom.content}>
          {atom.content}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          aria-label={atom.pinned ? t('memory.unpin') : t('memory.pin')}
          onClick={() => pin.mutate({ id: atom.id, pinned: !atom.pinned })}
          data-ai-action="settings.memory.pin.click"
        >
          {atom.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          aria-label={t('memory.archive')}
          onClick={() => archive.mutate(atom.id)}
          data-ai-action="settings.memory.archive.click"
        >
          <Archive className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          aria-label={t('common.delete')}
          onClick={() => remove.mutate(atom.id)}
          data-ai-action="settings.memory.delete.click"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function MemorySection() {
  const { t } = useTranslation();
  const [projectId, setProjectId] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const memory = useMemoryList(projectId || undefined);
  const projects = useQueryProjects();

  const items = (memory.data?.items ?? []).filter((atom) =>
    showArchived ? true : atom.lifecycle === 'working',
  );

  return (
    <PageShell aiPage={CORE_AI_PAGE_IDS.settings} className="bg-background text-foreground">
      <PageHeader title={t('memory.title')} icon={Brain} iconColor="text-accent-yellow" />
      <div className="p-6">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <Card className="border-border shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain size={16} className="text-accent-yellow" />
                {t('memory.atomsList')}
              </CardTitle>
              <CardDescription>{t('memory.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <NativeSelect
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-56"
                  aria-label={t('memory.scopeFilter')}
                  data-ai-component="settings.memory.scope-filter"
                  data-ai-role="filter"
                >
                  <option value="">{t('memory.scopeGlobal')}</option>
                  {(projects.data?.items ?? []).map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </NativeSelect>
                <Button
                  variant={showArchived ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8"
                  onClick={() => setShowArchived((v) => !v)}
                  data-ai-action="settings.memory.show-archived.click"
                >
                  <MapPin className="size-3.5" />
                  {t('memory.showArchived')}
                </Button>
              </div>

              {memory.isLoading ? (
                <Skeleton className="h-40 rounded-lg" />
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center">
                  <Brain className="size-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{t('memory.empty')}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {items.map((atom) => (
                    <AtomRow key={atom.id} atom={atom} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

// 项目选项（复用项目列表缓存）
function useQueryProjects() {
  return useQuery({
    queryKey: ['memory', 'project-options'],
    queryFn: () => projectApi.getList({ pageSize: 100 }),
    staleTime: 5 * 60_000,
  });
}
