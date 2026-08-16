import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import { Search, Plus, Users, Bot, User as UserIcon } from 'lucide-react';
import { useMembers, useDeactivateMember } from '../hooks';
import { MemberAvatar } from '../components/member-avatar';
import { MemberCardPopover } from '../components/member-card-popover';
import { MemberCreateDialog } from '../components/member-create-dialog';
import { useAuth } from '@/modules/auth/hooks/use-auth';
import { useConfirm } from '@/shared/confirm/confirm-provider';

export default function MembersPage() {
  const confirmDialog = useConfirm();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'all' | 'human' | 'ai_agent'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const { roles } = useAuth();

  const { data, isLoading } = useMembers({
    q: q || undefined,
    type: tab === 'all' ? undefined : tab,
    limit: 100,
  });
  const deactivate = useDeactivateMember();

  const isAdmin = roles.some((r) => r.role === 'admin' || r.role === 'maintainer');

  return (
    <PageShell>
      <PageHeader
        title="成员管理"
        description="管理人类成员与 AI 成员，统一指派与项目访问。"
        icon={Users}
        actions={
          isAdmin && (
            <Button onClick={() => setShowCreate(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              新建成员
            </Button>
          )
        }
      />
      <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-7 space-y-4">
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索 displayName / handle / email..."
            className="pl-8"
          />
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="human">
              <UserIcon className="h-3.5 w-3.5 mr-1" /> 人类
            </TabsTrigger>
            <TabsTrigger value="ai_agent">
              <Bot className="h-3.5 w-3.5 mr-1" /> AI
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">加载中…</div>
      ) : (data?.items ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>暂无成员</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {(data?.items ?? []).map((m) => (
            <Card key={m.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <MemberCardPopover
                    memberId={m.id}
                    trigger={
                      <MemberAvatar
                        member={m}
                        size="md"
                        showBadge={false}
                      />
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/app/members/${m.id}`}
                        className="font-semibold text-sm hover:underline truncate"
                      >
                        {m.displayName}
                      </Link>
                      {m.type === 'ai_agent' && (
                        <Bot className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">@{m.handle}</p>
                    <div className="mt-1.5 flex items-center gap-1">
                      {m.isOnline && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {m.status === 'active' ? (m.isOnline ? '在线' : '活跃') : m.status}
                      </span>
                    </div>
                  </div>
                </div>

                {m.bio && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-2">{m.bio}</p>
                )}

                <div className="mt-2 flex flex-wrap gap-1">
                  {(m.tags ?? []).slice(0, 3).map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">
                      {t}
                    </Badge>
                  ))}
                </div>

                <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground truncate">
                    {m.type === 'human'
                      ? m.user?.username ?? '独立用户'
                      : m.aiModelConfig?.name ?? m.aiProvider ?? 'AI'}
                  </span>
                  {isAdmin && m.status === 'active' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1.5 text-[10px] text-red-500 hover:text-red-600"
                      onClick={async () => {
                        const ok = await confirmDialog({
                          title: '停用成员',
                          description: `停用成员 ${m.displayName}?`,
                          variant: 'destructive',
                        });
                        if (ok) deactivate.mutate(m.id);
                      }}
                    >
                      停用
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isAdmin && (
        <MemberCreateDialog
          open={showCreate}
          onOpenChange={setShowCreate}
        />
      )}
      </div>
    </PageShell>
  );
}
