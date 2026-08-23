/**
 * 团队详情页 — 按 detail-page 模板重写
 *
 * 骨架：PageShell > SubPageToolbar(返回/面包屑/居中页签/翻页/侧栏开关)
 *      > Body(主区纵向滚动 + RightSidebar)
 * 主区：标题热编辑 > 描述热编辑 > 页签内容（成员/项目/层级/提示词/统计/邀请）
 * 右栏：SidebarButtonGroup(添加成员/归档) + PropsCard(属性胶囊)
 */
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Archive,
  BarChart3,
  FileEdit,
  Folder,
  HardDriveDownload,
  Mail,
  Network,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { SubPageToolbar } from '@/components/ui/sub-page-toolbar';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import { RightSidebar, SidebarButton, SidebarButtonGroup } from '@/components/ui/right-sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AutoSizeTextarea,
  CapsuleSelect,
  PropertyRow,
  PropsCard,
} from '@/components/ui/property-panel';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { useDebouncedCallback } from '@/shared/hooks/use-debounced-callback';
import { toast } from '@/components/ui/toast';
import {
  useTeamDetail,
  useTeamMembers,
  useAddTeamMember,
  useRemoveTeamMember,
  useUpdateTeam,
  useArchiveTeam,
  useTeams,
} from '../hooks';
import type { TeamMember } from '../types';
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
import { TeamHierarchySection } from '../components/team-hierarchy-section';

type DetailTab = 'members' | 'projects' | 'hierarchy' | 'prompt' | 'stats' | 'invites';

const MEMBER_ROLE_OPTIONS = ['owner', 'maintainer', 'member', 'guest'] as const;

export default function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const confirmDialog = useConfirm();

  const { data: team, isLoading } = useTeamDetail(teamId);
  const { data: members } = useTeamMembers(teamId);
  const addMember = useAddTeamMember(teamId!);
  const removeMember = useRemoveTeamMember(teamId!);
  const updateTeam = useUpdateTeam();
  const archiveTeam = useArchiveTeam();

  // 翻页器：同集合（全量团队）内上一个/下一个
  const { data: teamsData } = useTeams({ limit: 200 });
  const pager = useMemo(() => {
    const list = (teamsData?.teams ?? []) as Array<{ id: string }>;
    const idx = list.findIndex((tm) => tm.id === teamId);
    return {
      hasPrev: idx > 0,
      hasNext: idx >= 0 && idx < list.length - 1,
      onPrev: () => idx > 0 && navigate(`/app/teams/${list[idx - 1].id}`),
      onNext: () => idx >= 0 && idx < list.length - 1 && navigate(`/app/teams/${list[idx + 1].id}`),
      position: idx >= 0 ? `${idx + 1}/${list.length}` : '—',
    };
  }, [teamsData, teamId, navigate]);

  const [activeTab, setActiveTab] = useState<DetailTab>('members');
  const [asideHidden, setAsideHidden] = useState(false);
  const [propsCollapsed, setPropsCollapsed] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  // 成员添加
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberRole, setMemberRole] = useState<string>('member');

  // 邀请
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [userQuery, setUserQuery] = useState('');

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

  const updateField = async (patch: Record<string, unknown>) => {
    if (!teamId || !patch) return;
    setMutationError(null);
    try {
      await updateTeam.mutateAsync({ id: teamId, data: patch });
    } catch {
      setMutationError(t('teamDetail.updateFailed', '更新失败，请重试'));
    }
  };

  const persistTitle = useDebouncedCallback((value: string) => {
    if (!teamId || !value.trim() || value === team?.name) return;
    updateField({ name: value.trim() });
  }, 1500);

  const persistDescription = useDebouncedCallback((value: string) => {
    if (!teamId || value === (team?.description ?? '')) return;
    updateField({ description: value });
  }, 1500);

  const handleAdd = async () => {
    for (const memberId of selectedMembers) {
      await addMember.mutateAsync({ memberId, role: memberRole });
    }
    setSelectedMembers([]);
    setPickerOpen(false);
  };

  const handleArchive = async () => {
    if (!team) return;
    const ok = await confirmDialog({
      title: t('teams.archive', '归档团队'),
      description: t('teams.archiveConfirm', {
        defaultValue: '归档团队 {{name}}？归档后可从状态筛选中找回。',
        name: team.name,
      }),
      variant: 'destructive',
    });
    if (ok) archiveTeam.mutate(team.id);
  };

  const handleInvite = async () => {
    if (!teamId || !inviteEmail.trim()) return;
    setInviteBusy(true);
    try {
      await createTeamInvite(teamId, { email: inviteEmail.trim(), role: inviteRole });
      toast.success(t('teamDetail.invite.created', '邀请已创建，邮件进入发件箱（未配置 SMTP 时可复制链接）'));
      setInviteEmail('');
      refetchInvites();
      qc.invalidateQueries({ queryKey: ['mail-outbox'] });
    } catch (err) {
      toast.error(t('teamDetail.invite.createFailed', '创建邀请失败'));
      console.error(err);
    } finally {
      setInviteBusy(false);
    }
  };

  const handleDirectAdd = async (userId: string) => {
    if (!teamId) return;
    try {
      await directAddTeamMember(teamId, { userId, role: inviteRole });
      toast.success(t('teamDetail.invite.directAdded', '已直接加入团队'));
      qc.invalidateQueries({ queryKey: ['team-members', teamId] });
      qc.invalidateQueries({ queryKey: ['team', teamId] });
    } catch (err) {
      type ApiError = { response?: { data?: { error?: { message?: string } } } };
      toast.error((err as ApiError).response?.data?.error?.message || t('teamDetail.invite.directFailed', '直邀失败'));
    }
  };

  if (isLoading) {
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          {t('common.loading', '加载中…')}
        </div>
      </PageShell>
    );
  }
  if (!team) {
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          {t('teamDetail.notFound', '未找到团队')}
        </div>
      </PageShell>
    );
  }

  const tabItems: Array<{ value: DetailTab; label: string }> = [
    { value: 'members', label: t('teamDetail.tabs.members', '成员') },
    { value: 'projects', label: t('teamDetail.tabs.projects', '项目') },
    { value: 'hierarchy', label: t('teamDetail.tabs.hierarchy', '层级视图') },
    { value: 'prompt', label: t('teamDetail.tabs.prompt', '提示词') },
    { value: 'stats', label: t('teamDetail.tabs.stats', '统计') },
    { value: 'invites', label: t('teamDetail.tabs.invites', '邀请') },
  ];

  return (
    <PageShell className="overflow-hidden">
      {/* SubPageToolbar：返回 + 面包屑 + 居中页签 + 翻页器 + 侧栏开关 */}
      <SubPageToolbar
        aiId="team-member.team-detail"
        onBack={() => navigate('/app/teams')}
        backLabel={t('common.back', '返回')}
        breadcrumbs={[
          { label: t('teams.title', '团队'), to: '/app/teams' },
          { label: team.name },
        ]}
        tabs={{ value: activeTab, onChange: (v) => setActiveTab(v as DetailTab), items: tabItems }}
        actions={<FavoriteToggle label={team.name} />}
        pager={pager}
        sidebar={{ open: !asideHidden, onToggle: () => setAsideHidden((v) => !v) }}
      />

      {/* Body：主区 + 右栏并列 */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* 主区（纵向滚动） */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          {mutationError && (
            <div className="mx-6 mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {mutationError}
            </div>
          )}

          {/* 标题区：团队色块 + 热编辑名称 + 元信息行 */}
          <div className="shrink-0 border-b px-6 pb-3 pt-5">
            <div className="flex items-start gap-3">
              {team.avatarUrl ? (
                <img
                  src={team.avatarUrl}
                  alt={team.name}
                  className="size-10 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="flex size-10 shrink-0 items-center justify-center font-semibold text-white"
                  style={{ backgroundColor: team.color || '#5E6AD2' }}
                >
                  {team.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <AutoSizeTextarea
                key={`title-${team.id}`}
                defaultValue={team.name}
                rows={1}
                placeholder={t('teamDetail.unnamedTitle', '未命名团队')}
                onChange={(e) => persistTitle(e.target.value)}
                className="w-full text-28 font-bold leading-tight placeholder:text-muted-foreground/40 focus-visible:ring-0"
              />
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">@{team.slug}</span>
              <span className="opacity-50">•</span>
              {team.status === 'archived' ? (
                <Badge variant="secondary" className="text-10">
                  {t('teams.status.archived', '已归档')}
                </Badge>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-accent-green" />
                  {t('teams.status.active', '活跃')}
                </span>
              )}
              {team.ownerName && (
                <>
                  <span className="opacity-50">•</span>
                  <span>
                    {t('teams.owner', '创始人')} {team.ownerName}
                  </span>
                </>
              )}
              {(team.tags ?? []).length > 0 && (
                <span className="flex flex-wrap items-center gap-1">
                  {(team.tags ?? []).map((tag) => (
                    <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-10">
                      {tag}
                    </Badge>
                  ))}
                </span>
              )}
            </div>
          </div>

          {/* 描述区：热编辑 */}
          <div className="shrink-0 border-b px-6 pb-4 pt-4">
            <label className="mb-2 block text-10 font-semibold uppercase tracking-wider text-muted-foreground">
              {t('teamDetail.description', '描述')}
            </label>
            <AutoSizeTextarea
              rows={2}
              defaultValue={team.description ?? ''}
              onChange={(e) => persistDescription(e.target.value)}
              placeholder={t('teamDetail.addDescription', '添加描述…')}
              className="w-full text-sm leading-relaxed placeholder:text-muted-foreground/40"
            />
          </div>

          {/* 页签内容 */}
          <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-4">
            {activeTab === 'members' && (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {t('teamDetail.members.hint', '团队成员包含人类与 AI 成员，角色: owner / maintainer / member / guest')}
                  </div>
                  <Button size="sm" onClick={() => setPickerOpen(!pickerOpen)}>
                    <UserPlus className="mr-1 size-4" /> {t('teamDetail.members.add', '添加成员')}
                  </Button>
                </div>

                {pickerOpen && (
                  <Card>
                    <CardContent className="space-y-2 py-3">
                      <MemberPicker
                        value={selectedMembers}
                        onChange={setSelectedMembers}
                        multiple
                      />
                      <div className="flex items-center gap-2">
                        <label className="text-xs">{t('teamDetail.members.role', '角色')}:</label>
                        <Select value={memberRole} onValueChange={setMemberRole}>
                          <SelectTrigger size="sm" className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MEMBER_ROLE_OPTIONS.map((role) => (
                              <SelectItem key={role} value={role}>{role}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="ml-auto flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setPickerOpen(false)}>
                            {t('common.cancel', '取消')}
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleAdd}
                            disabled={selectedMembers.length === 0 || addMember.isPending}
                          >
                            {t('teamDetail.members.add', '添加')}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardContent className="p-0">
                    <Table className="w-full text-sm">
                      <TableHeader className="text-xs text-muted-foreground">
                        <TableRow>
                          <TableHead className="p-2 text-left">{t('teamDetail.members.member', '成员')}</TableHead>
                          <TableHead className="w-24 p-2 text-left">{t('teamDetail.members.type', '类型')}</TableHead>
                          <TableHead className="w-28 p-2 text-left">{t('teamDetail.members.role', '角色')}</TableHead>
                          <TableHead className="w-32 p-2 text-left">{t('teamDetail.members.joinedAt', '加入时间')}</TableHead>
                          <TableHead className="w-12 p-2 text-right"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {((members ?? []) as TeamMember[]).map((tm) => (
                          <TableRow key={tm.id}>
                            <TableCell className="p-2">
                              <MemberCardPopover
                                memberId={tm.memberId}
                                trigger={
                                  <div className="flex cursor-pointer items-center gap-2">
                                    <MemberAvatar
                                      member={tm.member}
                                      size="sm"
                                      showBadge={false}
                                    />
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-medium">
                                        {tm.member?.displayName}
                                      </div>
                                      <div className="truncate text-10 text-muted-foreground">
                                        @{tm.member?.handle}
                                      </div>
                                    </div>
                                  </div>
                                }
                              />
                            </TableCell>
                            <TableCell className="p-2">
                              {tm.member?.type === 'ai_agent' ? (
                                <Badge variant="secondary" className="text-10">AI</Badge>
                              ) : (
                                <Badge variant="outline" className="text-10">
                                  {t('members.filter.human', '人类')}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="p-2">
                              <Badge variant="outline" className="text-10">{tm.role}</Badge>
                            </TableCell>
                            <TableCell className="p-2 text-xs text-muted-foreground">
                              {new Date(tm.joinedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="p-2 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeMember.mutate(tm.memberId)}
                                className="size-6 p-0 text-accent-red"
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {((members ?? []) as TeamMember[]).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                              {t('teamDetail.members.empty', '暂无成员')}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === 'projects' && (
              <Card>
                <CardContent className="p-0">
                  <Table className="w-full text-sm">
                    <TableHeader className="text-xs text-muted-foreground">
                      <TableRow>
                        <TableHead className="p-2 text-left">{t('teamDetail.projects.project', '项目')}</TableHead>
                        <TableHead className="w-28 p-2 text-left">{t('teamDetail.members.role', '角色')}</TableHead>
                        <TableHead className="w-32 p-2 text-left">{t('teamDetail.projects.boundAt', '绑定时间')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(team.projects ?? []).map((tp) => (
                        <TableRow key={tp.id}>
                          <TableCell className="p-2">
                            <Link
                              to={`/app/projects/${tp.projectId}`}
                              className="flex items-center gap-2 text-sm hover:underline"
                            >
                              <span
                                className="size-2.5 rounded-full"
                                style={{ backgroundColor: tp.project?.color || '#5E6AD2' }}
                              />
                              {tp.project?.name ?? tp.projectId}
                            </Link>
                          </TableCell>
                          <TableCell className="p-2">
                            <Badge variant="outline" className="text-10">{tp.role}</Badge>
                          </TableCell>
                          <TableCell className="p-2 text-xs text-muted-foreground">
                            {new Date(tp.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(team.projects ?? []).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="p-6 text-center text-sm text-muted-foreground">
                            {t('teamDetail.projects.empty', '尚未绑定项目')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {activeTab === 'hierarchy' && <TeamHierarchySection teamId={team.id} />}
            {activeTab === 'prompt' && <TeamPromptSection team={team} />}
            {activeTab === 'stats' && <TeamStatsSection teamId={team.id} />}

            {activeTab === 'invites' && (
              <>
                {/* 邮件邀请 */}
                <Card>
                  <CardContent className="space-y-2 p-3">
                    <div className="flex items-center gap-2">
                      <Mail className="size-4 text-accent-blue" />
                      <span className="text-sm font-medium">{t('teamDetail.invite.mailTitle', '邮件邀请')}</span>
                      <span className="text-xs text-muted-foreground">
                        {t('teamDetail.invite.mailHint', '未配置 SMTP 时邮件落发件箱，可复制邀请链接手动发送')}
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
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger size="sm" className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MEMBER_ROLE_OPTIONS.filter((r) => r !== 'owner').map((role) => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={handleInvite} disabled={inviteBusy || !inviteEmail.trim()}>
                        {inviteBusy ? t('teamDetail.invite.pending', '创建中…') : t('teamDetail.invite.create', '创建邀请')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* 本地部署直邀 */}
                {isLocalMode && (
                  <Card>
                    <CardContent className="space-y-2 p-3">
                      <div className="flex items-center gap-2">
                        <HardDriveDownload className="size-4 text-accent-green" />
                        <span className="text-sm font-medium">
                          {t('teamDetail.invite.directTitle', '本地部署 · 数据库直邀')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t('teamDetail.invite.directHint', '检索本实例已有用户，直接加入团队（无需邮件）')}
                        </span>
                      </div>
                      <Input
                        value={userQuery}
                        onChange={(e) => setUserQuery(e.target.value)}
                        placeholder={t('teamDetail.invite.directPlaceholder', '按邮箱 / 用户名检索用户…')}
                        className="max-w-xs"
                      />
                      {(userHits ?? []).length > 0 && (
                        <div className="max-w-md divide-y divide-border rounded-md border border-border">
                          {(userHits ?? []).map((u) => (
                            <div key={u.id} className="flex items-center justify-between px-3 py-2">
                              <div className="min-w-0 text-sm">
                                <span className="font-medium">{u.displayName}</span>
                                <span className="ml-2 truncate text-xs text-muted-foreground">
                                  @{u.username} {u.email ? `· ${u.email}` : ''}
                                </span>
                              </div>
                              <Button variant="outline" size="sm" onClick={() => handleDirectAdd(u.id)}>
                                {t('teamDetail.invite.directAdd', '直接加入')}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      {userQuery.trim().length >= 1 && (userHits ?? []).length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          {t('teamDetail.invite.directEmpty', '未检索到匹配用户')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* 邀请列表 */}
                <Card>
                  <CardContent className="p-0">
                    <Table className="w-full text-sm">
                      <TableHeader className="text-xs text-muted-foreground">
                        <TableRow>
                          <TableHead className="p-2 text-left">{t('teamDetail.invites.email', '邮箱')}</TableHead>
                          <TableHead className="w-24 p-2 text-left">{t('teamDetail.members.role', '角色')}</TableHead>
                          <TableHead className="w-24 p-2 text-left">{t('teamDetail.invites.status', '状态')}</TableHead>
                          <TableHead className="w-32 p-2 text-left">{t('teamDetail.invites.expiresAt', '过期时间')}</TableHead>
                          <TableHead className="p-2 text-left">{t('teamDetail.invites.link', '邀请链接')}</TableHead>
                          <TableHead className="w-16 p-2 text-right"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(invites ?? []).map((inv) => {
                          const link = `${window.location.origin}/invite/${inv.token}`;
                          const dead = inv.status !== 'pending';
                          return (
                            <TableRow key={inv.id}>
                              <TableCell className="p-2">{inv.email || '—'}</TableCell>
                              <TableCell className="p-2">
                                <Badge variant="outline" className="text-10">{inv.role}</Badge>
                              </TableCell>
                              <TableCell className="p-2">
                                <Badge
                                  variant="secondary"
                                  className={
                                    inv.status === 'accepted'
                                      ? 'text-10 bg-accent-green/10 text-accent-green'
                                      : dead
                                        ? 'text-10 bg-muted text-muted-foreground'
                                        : 'text-10 bg-accent-yellow/10 text-accent-yellow'
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
                                    title={t('teamDetail.invites.copyLink', '复制邀请链接')}
                                    onClick={() => {
                                      navigator.clipboard.writeText(link);
                                      toast.success(t('teamDetail.invites.linkCopied', '邀请链接已复制'));
                                    }}
                                    className="block max-w-55 truncate text-left font-mono text-11 text-accent-blue hover:underline"
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
                                    className="h-6 px-2 text-11 text-accent-red"
                                    onClick={async () => {
                                      await revokeTeamInvite(teamId!, inv.id);
                                      refetchInvites();
                                    }}
                                  >
                                    {t('teamDetail.invites.revoke', '撤销')}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {(invites ?? []).length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                              {t('teamDetail.invites.empty', '暂无邀请记录')}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* 发件箱（最新 20 封） */}
                <Card>
                  <CardContent className="space-y-2 p-3">
                    <div className="text-sm font-medium">
                      {t('teamDetail.invites.outbox', '邮件发件箱（Outbox）')}
                    </div>
                    {(outbox ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {t('teamDetail.invites.outboxEmpty', '暂无待发邮件')}
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {(outbox ?? []).map((m) => (
                          <li
                            key={m.id}
                            className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="truncate font-medium">{m.subject}</div>
                              <div className="truncate text-muted-foreground">
                                {t('teamDetail.invites.outboxTo', { defaultValue: '收件人 {{to}}', to: m.to })} ·{' '}
                                {new Date(m.createdAt).toLocaleString()}
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
                              {m.status === 'sent'
                                ? t('teamDetail.invites.sent', '已发送')
                                : m.status === 'failed'
                                  ? t('teamDetail.invites.failed', '失败')
                                  : t('teamDetail.invites.pending2', '待发')}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>

        {/* 右侧栏（320px，可收起） */}
        <RightSidebar hidden={asideHidden} width={320}>
          <SidebarButtonGroup className="px-1">
            <SidebarButton
              variant="capsule"
              icon={UserPlus}
              label={t('teamDetail.members.add', '添加成员')}
              onClick={() => {
                setActiveTab('members');
                setPickerOpen(true);
              }}
            />
            {team.status === 'active' && (
              <SidebarButton
                icon={Archive}
                label={t('teams.archive', '归档')}
                onClick={handleArchive}
                className="text-destructive hover:text-destructive"
              />
            )}
          </SidebarButtonGroup>

          <PropsCard
            title={t('teamDetail.properties', '属性')}
            collapsed={propsCollapsed}
            onToggleCollapse={() => setPropsCollapsed((v) => !v)}
          >
            <PropertyRow icon={<Folder className="size-3.5" />} label="Slug">
              <span className="font-mono text-xs text-muted-foreground">@{team.slug}</span>
            </PropertyRow>
            <PropertyRow icon={<BarChart3 className="size-3.5" />} label={t('teamDetail.fields.status', '状态')}>
              <CapsuleSelect
                value={team.status}
                options={[
                  { value: 'active', label: t('teams.status.active', '活跃') },
                  { value: 'archived', label: t('teams.status.archived', '已归档') },
                ]}
                onChange={(v) => v && updateField({ status: v })}
              />
            </PropertyRow>
            <PropertyRow icon={<Users className="size-3.5" />} label={t('teamDetail.fields.members', '成员数')}>
              <span className="text-xs text-muted-foreground">
                {team.members?.length ?? team._count?.members ?? 0}
              </span>
            </PropertyRow>
            <PropertyRow icon={<Folder className="size-3.5" />} label={t('teamDetail.fields.projects', '绑定项目')}>
              <span className="text-xs text-muted-foreground">{team.projects?.length ?? 0}</span>
            </PropertyRow>
            <PropertyRow icon={<Network className="size-3.5" />} label={t('teams.owner', '创始人')}>
              <span className="truncate text-xs text-muted-foreground">{team.ownerName ?? '—'}</span>
            </PropertyRow>
          </PropsCard>

          <PropsCard
            title={t('teamDetail.tabs.prompt', '提示词')}
            collapsed={propsCollapsed}
            onToggleCollapse={() => setPropsCollapsed((v) => !v)}
          >
            <PropertyRow icon={<FileEdit className="size-3.5" />} label={t('teamDetail.fields.teamPrompt', '团队提示词')}>
              <span className="truncate text-xs text-muted-foreground">
                {team.teamPrompt ? t('teamDetail.fields.configured', '已配置') : t('teamDetail.fields.notConfigured', '未配置')}
              </span>
            </PropertyRow>
          </PropsCard>
        </RightSidebar>
      </div>
    </PageShell>
  );
}
