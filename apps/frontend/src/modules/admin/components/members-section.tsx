import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal, Pencil, Ban, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTableShell } from '@/components/ui/data-table-shell';
import { Menu, MenuTrigger, MenuPopup, MenuItem } from '@/components/ui/menu';
import { AsyncState } from '@/components/ui/async-state';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { toast } from '@/components/ui/toast';
import { MemberAvatar } from '@/modules/team-member/components/member-avatar';
import { MemberCreateDialog } from '@/modules/team-member/components/member-create-dialog';
import {
  useMembers,
  useDeactivateMember,
  useDeleteMember,
} from '@/modules/team-member/hooks';
import type { Member } from '@/modules/team-member/types';

/** 成员增删改查（管理员视角）：创建/编辑复用 MemberCreateDialog 双模式；搜索/类型筛选由页面 ToolbarRow 承载 */
export function MembersSection({
  createOpen,
  onCreateOpenChange,
  search,
  typeFilter,
}: {
  /** 创建弹窗由页头按钮触发，状态提升到页面 */
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  search: string;
  typeFilter: string;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<Member | null>(null);

  const { data, isLoading } = useMembers({ limit: 200 });
  const deactivate = useDeactivateMember();
  const deleteMember = useDeleteMember();
  const confirmDialog = useConfirm();

  const members = data?.items ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (typeFilter !== 'all' && m.type !== typeFilter) return false;
      if (!q) return true;
      return (
        m.displayName.toLowerCase().includes(q) ||
        (m.handle ?? '').toLowerCase().includes(q) ||
        (m.email ?? '').toLowerCase().includes(q)
      );
    });
  }, [members, search, typeFilter]);

  const handleDeactivate = async (m: Member) => {
    const ok = await confirmDialog({
      title: t('admin.deactivateMember', '停用成员'),
      description: t('admin.deactivateMemberConfirm', {
        defaultValue: '停用 {{name}}？停用后不再出现在派发与选择器中。',
        name: m.displayName,
      }),
      variant: 'destructive',
    });
    if (ok) {
      await deactivate.mutateAsync(m.id);
      toast.success(t('admin.memberDeactivated', '成员已停用'));
    }
  };

  const handleDelete = async (m: Member) => {
    const ok = await confirmDialog({
      title: t('admin.deleteMember', '删除成员'),
      description: t('admin.deleteMemberConfirm', {
        defaultValue:
          '永久删除成员 {{name}}？其任务指派、团队归属等关联数据将被清理，不可恢复。',
        name: m.displayName,
      }),
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await deleteMember.mutateAsync(m.id);
      toast.success(t('admin.memberDeleted', '成员已删除'));
    } catch (err) {
      type ApiError = { response?: { data?: { error?: { message?: string } } } };
      const apiError = err as ApiError;
      toast.error(
        apiError.response?.data?.error?.message || t('admin.deleteMemberFailed', '删除失败'),
      );
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {t('admin.memberCount', { defaultValue: '{{count}} 位成员', count: filtered.length })}
      </p>

      <AsyncState isLoading={isLoading} isEmpty={filtered.length === 0}>
        <DataTableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.member', '成员')}</TableHead>
                <TableHead>{t('admin.type', '类型')}</TableHead>
                <TableHead>{t('admin.status', '状态')}</TableHead>
                <TableHead>{t('admin.linkedAccount', '关联账号')}</TableHead>
                <TableHead>{t('admin.memberShortId', 'Short ID')}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MemberAvatar member={m} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{m.displayName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {m.handle ? `@${m.handle}` : '—'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {m.type === 'ai_agent' ? (
                      <Badge variant="secondary">{t('admin.typeAi', 'AI')}</Badge>
                    ) : (
                      <Badge variant="outline">{t('admin.typeHuman', '人类')}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      tone={m.status === 'active' ? 'success' : 'default'}
                    >
                      {m.status === 'active'
                        ? t('admin.memberActive', '活跃')
                        : t('admin.memberInactive', '已停用')}
                    </StatusPill>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {m.user?.username ?? (m.userId ? '—' : t('admin.noAccount', '无账号'))}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {m.shortId}
                  </TableCell>
                  <TableCell>
                    <Menu>
                      <MenuTrigger
                        render={
                          <Button variant="ghost" size="icon-sm" aria-label="more">
                            <MoreHorizontal />
                          </Button>
                        }
                      />
                      <MenuPopup align="end">
                        <MenuItem onClick={() => setEditing(m)}>
                          <Pencil className="size-3.5" />
                          {t('admin.editMember', '编辑成员')}
                        </MenuItem>
                        {m.status === 'active' ? (
                          <MenuItem onClick={() => handleDeactivate(m)}>
                            <Ban className="size-3.5" />
                            {t('admin.deactivateMember', '停用成员')}
                          </MenuItem>
                        ) : null}
                        <MenuItem
                          variant="destructive"
                          disabled={Boolean(m.userId)}
                          onClick={() => handleDelete(m)}
                        >
                          <Trash2 className="size-3.5" />
                          {m.userId
                            ? t('admin.deleteBlocked', '已绑定账号，无法删除')
                            : t('admin.deleteMember', '删除成员')}
                        </MenuItem>
                      </MenuPopup>
                    </Menu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      </AsyncState>

      {/* 创建（页头按钮控制）与编辑（行菜单触发）各持一个实例 */}
      <MemberCreateDialog open={createOpen} onOpenChange={onCreateOpenChange} />
      <MemberCreateDialog
        open={Boolean(editing)}
        onOpenChange={(o) => !o && setEditing(null)}
        member={editing}
      />
    </div>
  );
}
