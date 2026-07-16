import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import {
  ArrowLeft,
  Users,
  Folder,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useTeamDetail, useTeamMembers, useAddTeamMember, useRemoveTeamMember } from '../hooks';
import { MemberAvatar } from '../components/member-avatar';
import { MemberCardPopover } from '../components/member-card-popover';
import { MemberPicker } from '../components/member-picker';

export default function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberRole, setMemberRole] = useState('member');

  const { data: team, isLoading } = useTeamDetail(teamId);
  const { data: members } = useTeamMembers(teamId);
  const addMember = useAddTeamMember(teamId!);
  const removeMember = useRemoveTeamMember(teamId!);

  const handleAdd = async () => {
    for (const memberId of selectedMembers) {
      await addMember.mutateAsync({ memberId, role: memberRole });
    }
    setSelectedMembers([]);
    setPickerOpen(false);
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
      <PageHeader
        title={team.name}
        description={team.description ?? undefined}
        icon={Users}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/app/teams">
              <ArrowLeft className="h-4 w-4 mr-1" /> 返回列表
            </Link>
          </Button>
        }
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
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left p-2">成员</th>
                    <th className="text-left p-2 w-24">类型</th>
                    <th className="text-left p-2 w-28">角色</th>
                    <th className="text-left p-2 w-32">加入时间</th>
                    <th className="text-right p-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {(members ?? []).map((tm: any) => (
                    <tr key={tm.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                      <td className="p-2">
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
                      </td>
                      <td className="p-2">
                        {tm.member?.type === 'ai_agent' ? (
                          <Badge variant="secondary" className="text-[10px]">AI</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">人类</Badge>
                        )}
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-[10px]">{tm.role}</Badge>
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {new Date(tm.joinedAt).toLocaleDateString()}
                      </td>
                      <td className="p-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMember.mutate(tm.memberId)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {(members ?? []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">
                        暂无成员
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-3">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left p-2">项目</th>
                    <th className="text-left p-2 w-28">角色</th>
                    <th className="text-left p-2 w-32">绑定时间</th>
                  </tr>
                </thead>
                <tbody>
                  {(team.projects ?? []).map((tp: any) => (
                    <tr key={tp.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                      <td className="p-2">
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
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-[10px]">{tp.role}</Badge>
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {new Date(tp.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {(team.projects ?? []).length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-sm text-muted-foreground">
                        尚未绑定项目
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </PageShell>
  );
}
