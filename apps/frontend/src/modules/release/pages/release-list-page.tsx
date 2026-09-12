/**
 * 发版列表页（CAP-K-03 驱动型发版）。
 * 按项目圈定查看发版记录与状态机阶段；创建草案走对话框（版本可 AI/机械推荐）。
 * 发布主链路（门禁→审批→执行）在详情页完成。
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Rocket, Sparkles } from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from '@/components/ui/toast';
import { useProjectList } from '@/modules/project/hooks/use-project-list';
import {
  useCreateRelease,
  useRecommendVersion,
  useReleases,
} from '../hooks/use-releases';
import type { ReleaseStatus } from '../api/release-api';
import { cn } from '@/lib/utils';

export const RELEASE_STATUS_TONE: Record<ReleaseStatus, string> = {
  draft: 'bg-muted/50 text-muted-foreground',
  gated: 'bg-accent-yellow-light text-accent-yellow',
  approved: 'bg-accent-blue-light text-accent-blue',
  publishing: 'bg-accent-yellow-light text-accent-yellow animate-pulse',
  released: 'bg-accent-green-light text-accent-green',
  failed: 'bg-accent-red-light text-accent-red',
};

export function statusLabelKey(status: ReleaseStatus): string {
  return `release.status.${status}`;
}

export function ReleaseListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get('projectId') ?? '';
  const [createOpen, setCreateOpen] = useState(false);

  const projectsQuery = useProjectList();
  const projects = projectsQuery.data?.items ?? [];
  const releasesQuery = useReleases(projectId || undefined);
  const releases = useMemo(
    () => releasesQuery.data ?? [],
    [releasesQuery.data],
  );

  return (
    <PageShell className="overflow-auto" aiPage="releases.list">
      <div className="mx-auto w-full max-w-7xl px-6 py-6 sm:px-8 lg:px-10">
        <PageHeader
          aiId="releases.list"
          title={t('release.title')}
          icon={Rocket}
          iconColor="text-accent-green"
          actions={
            <HeaderActionButton
              icon={Rocket}
              label={t('release.create.open')}
              onClick={() => {
                if (!projectId) {
                  toast.error(t('release.create.needProject'));
                  return;
                }
                setCreateOpen(true);
              }}
            />
          }
        />

        <div className="mb-4 flex items-center gap-3">
          <NativeSelect
            value={projectId}
            onChange={(e) => {
              const next = e.target.value;
              setSearchParams(next ? { projectId: next } : {});
            }}
            className="h-8 w-64 text-xs"
            aria-label={t('release.filter.project')}
          >
            <option value="">{t('release.filter.pickProject')}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </NativeSelect>
        </div>

        {releasesQuery.isLoading ? (
          <SkeletonCard className="h-40" />
        ) : !projectId ? (
          <EmptyState
            title={t('release.empty.pickProject')}
            description={t('release.empty.pickProjectDesc')}
          />
        ) : releases.length === 0 ? (
          <EmptyState
            title={t('release.empty.none')}
            description={t('release.empty.noneDesc')}
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">{t('release.table.version')}</TableHead>
                    <TableHead>{t('release.table.name')}</TableHead>
                    <TableHead className="w-28">{t('release.table.status')}</TableHead>
                    <TableHead className="w-32">{t('release.table.tag')}</TableHead>
                    <TableHead className="w-40">{t('release.table.releasedAt')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {releases.map((r) => (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/app/releases/${r.id}`)}
                    >
                      <TableCell className="font-mono text-xs font-medium">
                        v{r.version}
                      </TableCell>
                      <TableCell className="text-xs">{r.name || '—'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn('text-10', RELEASE_STATUS_TONE[r.status])}
                        >
                          {t(statusLabelKey(r.status))}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-11 text-content-text-muted">
                        {r.gitTag || '—'}
                      </TableCell>
                      <TableCell className="text-11 text-content-text-muted">
                        {r.releasedAt
                          ? new Date(r.releasedAt).toLocaleDateString()
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <CreateReleaseDialog
        open={createOpen}
        projectId={projectId}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => navigate(`/app/releases/${id}`)}
      />
    </PageShell>
  );
}

function CreateReleaseDialog({
  open,
  projectId,
  projects,
  onClose,
  onCreated,
}: {
  open: boolean;
  projectId: string;
  projects: Array<{ id: string; name: string }>;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [pidOverride, setPidOverride] = useState<string | null>(null);
  const pid = pidOverride ?? projectId;
  const [version, setVersion] = useState('');
  const [name, setName] = useState('');
  const [basis, setBasis] = useState('');

  const recommend = useRecommendVersion(pid || undefined);
  const create = useCreateRelease();

  const handleRecommend = () => {
    recommend.mutate(undefined, {
      onSuccess: (r) => {
        setVersion(r.recommended);
        setBasis(t('release.create.basis', {
          base: r.base,
          type: t(`release.create.type.${r.releaseType}`),
        }));
      },
      onError: (err) => toast.error((err as Error).message),
    });
  };

  const handleCreate = () => {
    create.mutate(
      { projectId: pid, version: version.trim(), name: name.trim() || undefined },
      {
        onSuccess: (release) => {
          toast.success(t('release.create.created'));
          onClose();
          onCreated(release.id);
        },
        onError: (err) => toast.error((err as Error).message),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('release.create.title')}</DialogTitle>
          <DialogDescription>{t('release.create.desc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-content-text">
              {t('release.create.project')}
            </label>
            <NativeSelect
              value={pid}
              onChange={(e) => setPidOverride(e.target.value)}
              className="h-8 w-full text-xs"
            >
              <option value="">{t('release.filter.pickProject')}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-content-text">
              {t('release.create.version')}
            </label>
            <div className="flex gap-2">
              <Input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0.0"
                className="h-8 font-mono text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0 text-xs"
                disabled={!pid || recommend.isPending}
                onClick={handleRecommend}
              >
                <Sparkles className={cn('mr-1 size-3 text-accent-purple', recommend.isPending && 'animate-pulse')} />
                {t('release.create.recommend')}
              </Button>
            </div>
            {basis ? (
              <p className="text-11 text-content-text-muted">{basis}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-content-text">
              {t('release.create.nameLabel')}
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            disabled={create.isPending || !pid || !version.trim()}
            onClick={handleCreate}
          >
            {t('release.create.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
