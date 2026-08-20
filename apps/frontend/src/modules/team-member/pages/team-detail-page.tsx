import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/ui/page-header';
import { SubPageToolbar } from '@/components/ui/sub-page-toolbar';
import { PageShell } from '@/components/ui/page-shell';
import {
  Users,
  Folder,
  Trash2,
  UserPlus,
  Mail,
  HardDriveDownload,
  FileEdit,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useTeamDetail, useTeamMembers, useAddTeamMember, useRemoveTeamMember,
} from '../hooks';
import {
  listTeamInvites,
  createTeamInvite,
  revokeTeamInvite,
  searchUsers,
  directAddTeamMember,
  listMailOutbox,
} from '../api/team-member-api';
import { authApi } from '@/modules/auth/api/auth-api';
import { MemberAvatar } from '../components/member-avatar';
import { MemberCardPopover } from '../components/member-card-popover';
import { MemberPicker } from '../components/member-picker';
import { TeamPromptSection } from '../components/team-prompt-section';
import { TeamStatsSection } from '../components/team-stats-section';

export default function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberRole, setMemberRole] = useState('member');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [userQuery, setUserQuery] = useState('');

  const { data: team, isLoading } = useTeamDetail(teamId);
  const { data: members } = useTeamMembers(teamId);
  const addMember = useAddTeamMember(teamId!);
  const removeMember = useRemoveTeamMember(teamId!);

  // 部署模式：standalone 时提供「数据库检索直邀」
  const { data: publicConfig } = useQuery({
    queryKey: ['auth-public-config'],
    queryFn: () => authApi.getPublicConfig(),
    staleTime: 5 * 60 * 1000,
  });
  const isLocalMode = publicConfig?.appMode === 'standalone';

  const { data: invites, refetch: refetchInvites } = useQuery({
    queryKey: ['team-invites', teamId],
    queryFn: () => listTeamInvites(teamId!),
    enabled: !!teamId,
  });

  const { data: outbox } = useQuery({
    queryKey: ['mail-outbox'],
    queryFn: () => listMailOutbox({ limit: 20 }),
    staleTime: 30 * 1000,
  });

  const { data: userHits } = useQuery({
    queryKey: ['users-direct-search', userQuery],
    queryFn: () => searchUsers(userQuery, 8),
    enabled: isLocalMode && userQuery.trim().length >= 1,
  });

  const handleAdd = async () => {
    for (const memberId of selectedMembers) {
      await addMember.mutateAsync({ memberId, role: memberRole });
    }
    setSelectedMembers([]);
    setPickerOpen(false);
  };

  const handleInvite = async () => {
    if (!teamId || !inviteEmail.trim()) return;
    setInviteBusy(true);
    try {
      await createTeamInvite(teamId, { email: inviteEmail.trim(), role: inviteRole });
      toast.success('邀请已创建，邮件进入发件箱（未配置 SMTP 时可复制链接）');
      setInviteEmail('');
      refetchInvites();
      qc.invalidateQueries({ queryKey: ['mail-outbox'] });
    } catch (err) {
      toast.error('创建邀请失败');
      console.error(err);
    } finally {
      setInviteBusy(false);
    }
  };

  const handleDirectAdd = async (userId: string) => {
    if (!teamId) return;
    try {
      await directAddTeamMember(teamId, { userId, role: inviteRole });
      toast.success('已直接加入团队');
      qc.invalidateQueries({ queryKey: ['team-members', teamId] });
      qc.invalidateQueries({ queryKey: ['team', teamId] });
    } catch (err) {
      type ApiError = { response?: { data?: { error?: { message?: string } } } };
      toast.error((err as ApiError).response?.data?.error?.message || '直邀失败');
    }
  };

  if (isLoading) {
    return (
      <PageShell>
        <div className="text-center py-12 text-muted-foreground">加载中…</div>
      </PageShell>
    );
  }

  if (!team) {
    return (
      <PageShell>
        <div className="text-center py-12 text-muted-foreground">未找到团队</div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <SubPageToolbar
        aiId="team-member.team-detail"
        onBack={() => navigate('/app/teams')}
        breadcrumbs={[{ label: '团队', to: '/app/teams' }, { label: team.name }]}
      />
      <PageHeader
        title={team.name}
        icon={Users}
      />
      <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-7 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card>
          <CardContent className="py-4">
            <div className="text-xs text-muted-foreground">Slug</div>
            <div className="text-sm font-mono">@{team.slug}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-xs text-muted-foreground">成员数</div>
            <div className="text-2xl font-semibold">{team.members?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="text-xs text-muted-foreground">绑定项目</div>
            <div className="text-2xl font-semibold">{team.projects?.length ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">
            <Users className="h-3.5 w-3.5 mr-1" /> 成员
          </TabsTrigger>
          <TabsTrigger value="projects">
            <Folder className="h-3.5 w-3.5 mr-1" /> 项目
          </TabsTrigger>
          <TabsTrigger value="prompt">
            <FileEdit className="h-3.5 w-3.5 mr-1" /> 提示词
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="h-3.5 w-3.5 mr-1" /> 统计
          </TabsTrigger>
          <TabsTrigger value="invites">
            <Mail className="h-3.5 w-3.5 mr-1" /> 邀请
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              团队成员包含人类与 AI 成员，角色: owner / maintainer / member / guest
            </div>
            <Button size="sm" onClick={() => setPickerOpen(!pickerOpen)}>
              <UserPlus className="h-4 w-4 mr-1" /> 添加成员
            </Button>
          </div>

          {pickerOpen && (
            <Card>
              <CardContent className="py-3 space-y-2">
                <MemberPicker
                  value={selectedMembers}
                  onChange={setSelectedMembers}
                  multiple
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs">角色:</label>
                  <select
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value)}
                    className="h-7 px-2 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="owner">owner</option>
                    <option value="maintainer">maintainer</option>
                    <option value="member">member</option>
                    <option value="guest">guest</option>
                  </select>
                  <div className="ml-auto flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setPickerOpen(false)}>
                      取消
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAdd}
                      disabled={selectedMembers.length === 0 || addMember.isPending}
                    >
                      添加
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <Table className="w-full text-sm">
                <TableHeader className="text-xs text-muted-foreground border-b border-border">
                  <TableRow>
                    <TableHead className="text-left p-2">成员</TableHead>
                    <TableHead className="text-left p-2 w-24">类型</TableHead>
                    <TableHead className="text-left p-2 w-28">角色</TableHead>
                    <TableHead className="text-left p-2 w-32">加入时间</TableHead>
                    <TableHead className="text-right p-2 w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(members ?? []).map((tm: any) => (
                    <TableRow key={tm.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                      <TableCell className="p-2">
                        <MemberCardPopover
                          memberId={tm.memberId}
                          trigger={
                            <div className="flex items-center gap-2 cursor-pointer">
                              <MemberAvatar
                                member={tm.member}
                                size="sm"
                                showBadge={false}
                              />
                              <div className="min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {tm.member?.displayName}
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate">
                                  @{tm.member?.handle}
                                </div>
                              </div>
                            </div>
                          }
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        {tm.member?.type === 'ai_agent' ? (
                          <Badge variant="secondary" className="text-[10px]">AI</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">人类</Badge>
                        )}
                      </TableCell>
                      <TableCell className="p-2">
                        <Badge variant="outline" className="text-[10px]">{tm.role}</Badge>
                      </TableCell>
                      <TableCell className="p-2 text-xs text-muted-foreground">
                        {new Date(tm.joinedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="p-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMember.mutate(tm.memberId)}
                          className="h-6 w-6 p-0 text-accent-red"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(members ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                        暂无成员
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-3">
          <Card>
            <CardContent className="p-0">
              <Table className="w-full text-sm">
                <TableHeader className="text-xs text-muted-foreground border-b border-border">
                  <TableRow>
                    <TableHead className="text-left p-2">项目</TableHead>
                    <TableHead className="text-left p-2 w-28">角色</TableHead>
                    <TableHead className="text-left p-2 w-32">绑定时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(team.projects ?? []).map((tp: any) => (
                    <TableRow key={tp.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                      <TableCell className="p-2">
                        <Link
                          to={`/app/projects/${tp.projectId}`}
                          className="flex items-center gap-2 text-sm hover:underline"
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: tp.project?.color || '#5E6AD2' }}
                          />
                          {tp.project?.name ?? tp.projectId}
                        </Link>
                      </TableCell>
                      <TableCell className="p-2">
                        <Badge variant="outline" className="text-[10px]">{tp.role}</Badge>
                      </TableCell>
                      <TableCell className="p-2 text-xs text-muted-foreground">
                        {new Date(tp.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(team.projects ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="p-6 text-center text-sm text-muted-foreground">
                        尚未绑定项目
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompt" className="mt-3">
          <TeamPromptSection team={team} />
        </TabsContent>

        <TabsContent value="stats" className="mt-3">
          <TeamStatsSection teamId={team.id} />
        </TabsContent>

        <TabsContent value="invites" className="mt-3 space-y-3">
          {/* 邮件邀请 */}
          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-accent-blue" />
                <span className="text-sm font-medium">邮件邀请</span>
                <span className="text-xs text-muted-foreground">
                  未配置 SMTP 时邮件落发件箱，可复制邀请链接手动发送
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="max-w-xs"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="h-9 px-2 rounded-md border border-input bg-background text-sm"
                >
                  <option value="member">member</option>
                  <option value="maintainer">maintainer</option>
                  <option value="guest">guest</option>
                </select>
                <Button size="sm" onClick={handleInvite} disabled={inviteBusy || !inviteEmail.trim()}>
                  {inviteBusy ? '创建中…' : '创建邀请'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 本地部署直邀 */}
          {isLocalMode && (
            <Card>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <HardDriveDownload className="h-4 w-4 text-accent-green" />
                  <span className="text-sm font-medium">本地部署 · 数据库直邀</span>
                  <span className="text-xs text-muted-foreground">
                    检索本实例已有用户，直接加入团队（无需邮件）
                  </span>
                </div>
                <Input
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="按邮箱 / 用户名检索用户…"
                  className="max-w-xs"
                />
                {(userHits ?? []).length > 0 && (
                  <div className="rounded-md border border-border divide-y divide-border max-w-md">
                    {(userHits ?? []).map((u) => (
                      <div key={u.id} className="flex items-center justify-between px-3 py-2">
                        <div className="min-w-0 text-sm">
                          <span className="font-medium">{u.displayName}</span>
                          <span className="ml-2 text-xs text-muted-foreground truncate">
                            @{u.username} {u.email ? `· ${u.email}` : ''}
                          </span>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleDirectAdd(u.id)}>
                          直接加入
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {userQuery.trim().length >= 1 && (userHits ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground">未检索到匹配用户</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* 邀请列表 */}
          <Card>
            <CardContent className="p-0">
              <Table className="w-full text-sm">
                <TableHeader className="text-xs text-muted-foreground border-b border-border">
                  <TableRow>
                    <TableHead className="text-left p-2">邮箱</TableHead>
                    <TableHead className="text-left p-2 w-24">角色</TableHead>
                    <TableHead className="text-left p-2 w-24">状态</TableHead>
                    <TableHead className="text-left p-2 w-32">过期时间</TableHead>
                    <TableHead className="text-left p-2">邀请链接</TableHead>
                    <TableHead className="text-right p-2 w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(invites ?? []).map((inv) => {
                    const link = `${window.location.origin}/invite/${inv.token}`;
                    const dead = inv.status !== 'pending';
                    return (
                      <TableRow key={inv.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                        <TableCell className="p-2">{inv.email || '—'}</TableCell>
                        <TableCell className="p-2">
                          <Badge variant="outline" className="text-[10px]">{inv.role}</Badge>
                        </TableCell>
                        <TableCell className="p-2">
                          <Badge
                            variant="secondary"
                            className={
                              inv.status === 'accepted'
                                ? 'text-[10px] bg-accent-green/10 text-accent-green'
                                : dead
                                  ? 'text-[10px] bg-muted text-muted-foreground'
                                  : 'text-[10px] bg-accent-yellow/10 text-accent-yellow'
                            }
                          >
                            {inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-2 text-xs text-muted-foreground">
                          {new Date(inv.expiresAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="p-2">
                          {!dead && (
                            <button
                              type="button"
                              title="复制邀请链接"
                              onClick={() => {
                                navigator.clipboard.writeText(link);
                                toast.success('邀请链接已复制');
                              }}
                              className="font-mono text-[11px] text-accent-blue hover:underline truncate max-w-[220px] block text-left"
                            >
                              /invite/{inv.token.slice(0, 10)}…
                            </button>
                          )}
                        </TableCell>
                        <TableCell className="p-2 text-right">
                          {!dead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[11px] text-accent-red"
                              onClick={async () => {
                                await revokeTeamInvite(teamId!, inv.id);
                                refetchInvites();
                              }}
                            >
                              撤销
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(invites ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                        暂无邀请记录
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 发件箱（最新 20 封） */}
          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="text-sm font-medium">邮件发件箱（Outbox）</div>
              {(outbox ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">暂无待发邮件</p>
              ) : (
                <ul className="space-y-1.5">
                  {(outbox ?? []).map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{m.subject}</div>
                        <div className="text-muted-foreground truncate">
                          收件人 {m.to} · {new Date(m.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className={
                          m.status === 'sent'
                            ? 'bg-accent-green/10 text-accent-green'
                            : m.status === 'failed'
                              ? 'bg-accent-red/10 text-accent-red'
                              : 'bg-accent-yellow/10 text-accent-yellow'
                        }
                      >
                        {m.status === 'sent' ? '已发送' : m.status === 'failed' ? '失败' : '待发'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </PageShell>
  );
}
