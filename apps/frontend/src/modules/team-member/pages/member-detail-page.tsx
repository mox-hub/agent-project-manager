import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { SubPageToolbar } from '@/components/ui/sub-page-toolbar';
import { PageShell } from '@/components/ui/page-shell';
import { Mail, Phone, MapPin, Bot, User, Folder, Users, Clock } from 'lucide-react';
import { useMemberDetail, useMemberCard, useBindMemberProject, useUnbindMemberProject } from '../hooks';
import { MemberAvatar } from '../components/member-avatar';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/infrastructure/api-client';

export default function MemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { data: member, isLoading } = useMemberDetail(memberId);
  const { data: card } = useMemberCard(memberId);
  const bind = useBindMemberProject(memberId!);
  const unbind = useUnbindMemberProject(memberId!);

  const { data: projectsData } = useQuery({
    queryKey: ['projects-for-bind', memberId],
    queryFn: async () => {
      return api.get<{ items: Array<{ id: string; name: string; color: string | null }> }>('/projects', { limit: 100 });
    },
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <PageShell>
        <div className="text-center py-12 text-muted-foreground">加载中…</div>
      </PageShell>
    );
  }
  if (!member) {
    return (
      <PageShell>
        <div className="text-center py-12 text-muted-foreground">未找到成员</div>
      </PageShell>
    );
  }

  const isAI = member.type === 'ai_agent';
  const boundIds = new Set((card?.projects ?? []).map((p) => p.projectId));
  const availableProjects = (projectsData?.items ?? []).filter((p) => !boundIds.has(p.id));

  return (
    <PageShell>
      <SubPageToolbar
        aiId="team-member.member-detail"
        onBack={() => navigate('/app/members')}
        breadcrumbs={[{ label: '成员管理', to: '/app/members' }, { label: member.displayName }]}
      />
      <PageHeader
        title={member.displayName}
        icon={isAI ? Bot : User}
      />
      <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-7 space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <MemberAvatar member={member} size="xl" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-semibold truncate">{member.displayName}</h2>
                  {isAI ? (
                    <Bot className="h-4 w-4 text-violet-500" />
                  ) : (
                    <User className="h-4 w-4 text-blue-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">@{member.handle}</p>
              </div>
            </div>

            {member.bio && (
              <p className="text-sm text-muted-foreground">{member.bio}</p>
            )}

            <div className="space-y-1.5 text-xs">
              {member.email && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{member.email}</span>
                </div>
              )}
              {member.phone && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{member.phone}</span>
                </div>
              )}
              {member.timezone && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{member.timezone}</span>
                </div>
              )}
              {isAI && member.aiModelConfig && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Bot className="h-3 w-3 text-violet-500" />
                  <span>
                    {member.aiModelConfig.name} · {member.aiModelConfig.provider}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1">
              {(member.tags ?? []).map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px]">
                  {t}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">统计</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <div className="text-muted-foreground">待办任务</div>
                <div className="text-lg font-semibold text-amber-500">{card?.load.todo ?? 0}</div>
              </div>
              <div>
                <div className="text-muted-foreground">进行中</div>
                <div className="text-lg font-semibold text-blue-500">{card?.load.inProgress ?? 0}</div>
              </div>
              <div>
                <div className="text-muted-foreground">已完成</div>
                <div className="text-lg font-semibold text-emerald-500">{card?.load.completed ?? 0}</div>
              </div>
              <div>
                <div className="text-muted-foreground">最近活跃</div>
                <div className="text-sm font-medium">
                  {card?.lastActiveAt ? new Date(card.lastActiveAt).toLocaleString() : '从未'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="projects" className="mt-4">
        <TabsList>
          <TabsTrigger value="projects">
            <Folder className="h-3.5 w-3.5 mr-1" /> 参与项目
          </TabsTrigger>
          <TabsTrigger value="teams">
            <Users className="h-3.5 w-3.5 mr-1" /> 所属团队
          </TabsTrigger>
          <TabsTrigger value="activities">
            <Clock className="h-3.5 w-3.5 mr-1" /> 活动
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-3 space-y-3">
          <Card>
            <CardContent className="p-3">
              {(card?.projects ?? []).length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-6">
                  暂未参与任何项目
                </div>
              ) : (
                <ul className="space-y-1">
                  {(card?.projects ?? []).map((p) => (
                    <li
                      key={p.projectId}
                      className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted/30"
                    >
                      <Link
                        to={`/app/projects/${p.projectId}`}
                        className="flex items-center gap-2 text-sm hover:underline"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: p.color || '#5E6AD2' }}
                        />
                        {p.projectName}
                      </Link>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{p.role}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 text-[10px] text-red-500"
                          onClick={() => unbind.mutate(p.projectId)}
                        >
                          解除
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {availableProjects.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">绑定到新项目</CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <ul className="space-y-1">
                  {availableProjects.slice(0, 10).map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted/30"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: p.color || '#5E6AD2' }}
                        />
                        {p.name}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-[10px]"
                        onClick={() => bind.mutate({ projectId: p.id, role: 'member' })}
                      >
                        绑定
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="teams" className="mt-3">
          <Card>
            <CardContent className="p-3">
              {(card?.teams ?? []).length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-6">
                  不在任何团队
                </div>
              ) : (
                <ul className="space-y-1">
                  {(card?.teams ?? []).map((t) => (
                    <li
                      key={t.teamId}
                      className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted/30"
                    >
                      <Link
                        to={`/app/teams/${t.teamId}`}
                        className="flex items-center gap-2 text-sm hover:underline"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: t.color || '#5E6AD2' }}
                        />
                        {t.teamName}
                      </Link>
                      <Badge variant="outline" className="text-[10px]">{t.role}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="mt-3">
          <Card>
            <CardContent className="p-3">
              {(card?.recentActivities ?? []).length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-6">
                  暂无活动记录
                </div>
              ) : (
                <ul className="space-y-2">
                  {(card?.recentActivities ?? []).map((a) => (
                    <li
                      key={a.id}
                      className="text-xs text-muted-foreground flex items-center justify-between gap-2"
                    >
                      <span>{a.type}</span>
                      <span>{new Date(a.createdAt).toLocaleString()}</span>
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
