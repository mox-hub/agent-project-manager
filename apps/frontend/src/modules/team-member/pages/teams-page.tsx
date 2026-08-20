import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { ToolbarRow, useToolbarViews } from '@/components/ui/toolbar-row';
import { PageShell } from '@/components/ui/page-shell';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Users, Plus, Archive, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useTeams, useCreateTeam, useArchiveTeam } from '../hooks';
import { MemberAvatar } from '../components/member-avatar';

export default function TeamsPage() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  // 已保存视图：快照记忆搜索
  const toolbar = useToolbarViews({
    key: 'teams-page',
    defaults: [{ id: 'all', name: t('teams.title', '团队'), icon: 'folder', builtIn: true, snapshot: { q: '' } }],
    onApply: (snapshot) => {
      const snap = (snapshot ?? {}) as Partial<{ q: string }>;
      setQ(snap.q ?? '');
    },
  });
  const { updateActiveSnapshot } = toolbar;

  useEffect(() => {
    updateActiveSnapshot({ q });
  }, [updateActiveSnapshot, q]);

  const { data, isLoading } = useTeams({ q, limit: 50 });
  const createTeam = useCreateTeam();
  const archiveTeam = useArchiveTeam();

  const handleCreate = async () => {
    if (!name || !slug) return;
    try {
      await createTeam.mutateAsync({ name, slug });
      setShowCreate(false);
      setName('');
      setSlug('');
      toast.success('团队已创建');
    } catch (err) {
      type ApiError = { response?: { data?: { error?: { message?: string } } } };
      const apiError = err as ApiError;
      toast.error(apiError.response?.data?.error?.message || '创建团队失败');
    }
  };

  return (
    <PageShell>
      <PageHeader
        title={t('teams.title', '团队')}
        icon={Users}
        actions={
          <HeaderActionButton
            icon={Plus}
            label="新建团队"
            onClick={() => setShowCreate(true)}
          />
        }
      />
      <ToolbarRow
        aiId="team-member.teams"
        views={toolbar.views}
        activeViewId={toolbar.activeViewId}
        onSelectView={toolbar.selectView}
        onCreateView={toolbar.createView}
        onUpdateView={toolbar.updateView}
        onDeleteView={toolbar.deleteView}
        filterMenu={{
          badge: q ? 1 : 0,
          search: { value: q, onChange: setQ, placeholder: '搜索团队...' },
          items: [],
        }}
        displayMenu={false}
        downloadMenu={false}
      />

      <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-7 space-y-4">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">加载中…</div>
        ) : (data?.teams ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>暂无团队，点击右上角创建第一个团队。</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(data?.teams ?? []).map((team) => (
              <Card key={team.id} className="hover:shadow-md transition-shadow group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {team.avatarUrl ? (
                        <img
                          src={team.avatarUrl}
                          alt={team.name}
                          className="h-10 w-10 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div
                          className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-semibold shrink-0"
                          style={{ backgroundColor: team.color || '#5E6AD2' }}
                        >
                          {team.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{team.name}</CardTitle>
                        <CardDescription className="text-xs truncate">
                          @{team.slug}
                          {team.ownerName ? ` · 创始人 ${team.ownerName}` : ''}
                        </CardDescription>
                      </div>
                    </div>
                    {team.status === 'archived' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        已归档
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {team.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {team.description}
                    </p>
                  )}
                  {(team.tags ?? []).length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {(team.tags ?? []).slice(0, 4).map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {team.memberCount ?? team._count?.members ?? 0} 成员 ·{' '}
                      {team._count?.projects ?? 0} 项目
                    </span>
                    <div className="flex items-center gap-1">
                      {team.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => archiveTeam.mutate(team.id)}
                          className="h-6 px-2 text-[10px]"
                        >
                          <Archive className="h-3 w-3" />
                        </Button>
                      )}
                      <Button asChild variant="ghost" size="sm" className="h-6 px-2">
                        <Link to={`/app/teams/${team.id}`}>
                          详情 <ChevronRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新建团队</DialogTitle>
            <DialogDescription>团队可跨项目共享，便于统一管理成员与项目绑定。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">团队名称 *</label>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slug) {
                    setSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-+|-+$/g, ''),
                    );
                  }
                }}
                placeholder="如: 核心研发团队"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Slug *</label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="如: core-team"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!name || !slug || createTeam.isPending}
            >
              {createTeam.isPending ? '创建中…' : '创建团队'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}