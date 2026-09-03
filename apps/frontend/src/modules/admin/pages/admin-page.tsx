import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, UserPlus, MailPlus, Plus, User, Mail, UsersRound } from 'lucide-react';

import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { ToolbarRow, useToolbarViews } from '@/components/ui/toolbar-row';
import { AdminGuard } from '@/modules/auth/components/admin-guard';
import { useAdminUsers, useRegistrationInvites } from '../hooks/use-admin';
import { useMembers } from '@/modules/team-member/hooks';
import { UserAccountsSection } from '../components/user-accounts-section';
import { UserCreateDialog } from '../components/user-create-dialog';
import { GeneratedPasswordDialog } from '../components/generated-password-dialog';
import { InvitesSection } from '../components/invites-section';
import { InviteCreateDialog } from '../components/invite-create-dialog';
import { MembersSection } from '../components/members-section';
import type { CreateAdminUserResponse } from '../api/admin-api';

/** 三分区（ToolbarRow 居中样式切换承载）与筛选的页面态，随视图快照持久化 */
interface AdminPageState {
  section: 'accounts' | 'invites' | 'members';
  search: string;
  accountStatus: string;
  inviteStatus: string;
  memberType: string;
}

const DEFAULT_STATE: AdminPageState = {
  section: 'accounts',
  search: '',
  accountStatus: 'all',
  inviteStatus: 'all',
  memberType: 'all',
};

/**
 * 管理员成员管理页：ToolbarRow 标准形态（左侧视图快照 / 居中分区切换 / 右侧筛选）。
 * AdminGuard 校验全局 admin 角色（非 admin 重定向回 /app）。
 */
export function AdminPage() {
  return (
    <AdminGuard>
      <AdminPageContent />
    </AdminGuard>
  );
}

function AdminPageContent() {
  const { t } = useTranslation();
  const [state, setState] = useState<AdminPageState>(DEFAULT_STATE);
  const [userCreateOpen, setUserCreateOpen] = useState(false);
  const [inviteCreateOpen, setInviteCreateOpen] = useState(false);
  const [memberCreateOpen, setMemberCreateOpen] = useState(false);
  const [passwordInfo, setPasswordInfo] = useState<{
    password: string;
    displayName: string;
  } | null>(null);

  const { section, search, accountStatus, inviteStatus, memberType } = state;
  const patch = (partial: Partial<AdminPageState>) =>
    setState((prev) => ({ ...prev, ...partial }));

  const { data: users } = useAdminUsers();
  const { data: invites } = useRegistrationInvites();
  const { data: membersData } = useMembers({ limit: 200 });
  const pendingInvites =
    (invites ?? []).filter((i) => i.status === 'pending').length ?? 0;

  // 已保存视图：快照记忆分区 + 搜索 + 各分区筛选
  const toolbar = useToolbarViews({
    key: 'admin-page',
    defaults: [
      {
        id: 'all',
        name: t('admin.viewAll', '全部'),
        icon: 'list',
        builtIn: true,
        snapshot: { ...DEFAULT_STATE },
      },
    ],
    onApply: (snapshot) => {
      const snap = (snapshot ?? {}) as Partial<AdminPageState>;
      setState((prev) => ({
        section: snap.section ?? prev.section,
        search: snap.search ?? '',
        accountStatus: snap.accountStatus ?? 'all',
        inviteStatus: snap.inviteStatus ?? 'all',
        memberType: snap.memberType ?? 'all',
      }));
    },
  });
  const { updateActiveSnapshot } = toolbar;

  useEffect(() => {
    updateActiveSnapshot({ section, search, accountStatus, inviteStatus, memberType });
  }, [updateActiveSnapshot, section, search, accountStatus, inviteStatus, memberType]);

  // 当前分区生效的筛选数（搜索 + 对应状态/类型），用作筛选按钮红点
  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (section === 'accounts'
      ? accountStatus !== 'all'
        ? 1
        : 0
      : section === 'invites'
        ? inviteStatus !== 'all'
          ? 1
          : 0
        : memberType !== 'all'
          ? 1
          : 0);

  const searchPlaceholder =
    section === 'members'
      ? t('admin.searchMembers', '搜索姓名 / @handle / 邮箱')
      : t('admin.searchUsers', '搜索姓名 / 登录名 / 邮箱');

  const filterItems =
    section === 'members'
      ? [
          { type: 'label' as const, label: t('admin.filterType', '类型') },
          ...(['all', 'human', 'ai_agent'] as const).map((value) => ({
            id: `member-type-${value}`,
            type: 'checkbox' as const,
            label:
              value === 'all'
                ? t('admin.filterAll', '全部')
                : value === 'human'
                  ? t('admin.typeHuman', '人类')
                  : t('admin.typeAi', 'AI'),
            checked: memberType === value,
            onSelect: () => patch({ memberType: value }),
          })),
        ]
      : section === 'invites'
        ? [
            { type: 'label' as const, label: t('admin.filterStatus', '状态') },
            ...(['all', 'pending', 'accepted', 'revoked', 'expired'] as const).map(
              (value) => ({
                id: `invite-status-${value}`,
                type: 'checkbox' as const,
                label:
                  value === 'all'
                    ? t('admin.filterAll', '全部')
                    : t(`admin.inviteStatus.${value}`),
                checked: inviteStatus === value,
                onSelect: () => patch({ inviteStatus: value }),
              }),
            ),
          ]
        : [
            { type: 'label' as const, label: t('admin.filterStatus', '状态') },
            ...(['all', 'active', 'inactive'] as const).map((value) => ({
              id: `account-status-${value}`,
              type: 'checkbox' as const,
              label:
                value === 'all'
                  ? t('admin.filterAll', '全部')
                  : value === 'active'
                    ? t('admin.active', '已启用')
                    : t('admin.inactive', '已停用'),
              checked: accountStatus === value,
              onSelect: () => patch({ accountStatus: value }),
            })),
          ];

  const headerAction = () => {
    if (section === 'accounts') {
      return (
        <HeaderActionButton
          icon={UserPlus}
          label={t('admin.createUser', '创建成员账号')}
          onClick={() => setUserCreateOpen(true)}
        />
      );
    }
    if (section === 'invites') {
      return (
        <HeaderActionButton
          icon={MailPlus}
          label={t('admin.createInvite', '邀请成员注册')}
          onClick={() => setInviteCreateOpen(true)}
        />
      );
    }
    return (
      <HeaderActionButton
        icon={Plus}
        label={t('admin.createMember', '新建成员')}
        onClick={() => setMemberCreateOpen(true)}
      />
    );
  };

  return (
    <PageShell aiPage="admin.admin" className="overflow-hidden">
      <PageHeader
        icon={ShieldCheck}
        iconColor="text-accent-red"
        title={t('nav.admin', '管理后台')}
        metrics={[
          { id: 'users', label: t('admin.accounts', '账号'), value: users?.length ?? 0 },
          {
            id: 'members',
            label: t('admin.members', '成员'),
            value: membersData?.total ?? 0,
          },
          {
            id: 'pending-invites',
            label: t('admin.pendingInvites', '待接受邀请'),
            value: pendingInvites,
          },
        ]}
        actions={headerAction()}
      />

      <ToolbarRow
        aiId="admin.admin"
        views={toolbar.views}
        activeViewId={toolbar.activeViewId}
        onSelectView={toolbar.selectView}
        onCreateView={toolbar.createView}
        onUpdateView={toolbar.updateView}
        onDeleteView={toolbar.deleteView}
        viewStyle={{
          value: section,
          onChange: (v) => patch({ section: v as AdminPageState['section'] }),
          options: [
            {
              value: 'accounts',
              label: t('admin.tabAccounts', '用户账号'),
              icon: User,
            },
            {
              value: 'invites',
              label: t('admin.tabInvites', '注册邀请'),
              icon: Mail,
            },
            {
              value: 'members',
              label: t('admin.tabMembers', '成员管理'),
              icon: UsersRound,
            },
          ],
        }}
        filterMenu={{
          badge: activeFilterCount,
          search: {
            value: search,
            onChange: (v) => patch({ search: v }),
            placeholder: searchPlaceholder,
          },
          items: filterItems,
        }}
        displayMenu={{ items: [] }}
        downloadMenu={{
          items: [
            { id: 'export-label', type: 'label' as const, label: t('admin.export', '导出') },
            { id: 'csv', type: 'item' as const, label: 'CSV', disabled: true },
          ],
        }}
      />

      <div className="flex-1 overflow-auto p-6 pt-4">
        {section === 'accounts' ? (
          <UserAccountsSection search={search} statusFilter={accountStatus} />
        ) : section === 'invites' ? (
          <InvitesSection statusFilter={inviteStatus} />
        ) : (
          <MembersSection
            createOpen={memberCreateOpen}
            onCreateOpenChange={setMemberCreateOpen}
            search={search}
            typeFilter={memberType}
          />
        )}
      </div>

      <UserCreateDialog
        open={userCreateOpen}
        onOpenChange={setUserCreateOpen}
        onCreated={(res: CreateAdminUserResponse) =>
          setPasswordInfo({
            password: res.generatedPassword,
            displayName: res.user.displayName,
          })
        }
      />
      <InviteCreateDialog open={inviteCreateOpen} onOpenChange={setInviteCreateOpen} />
      <GeneratedPasswordDialog
        open={Boolean(passwordInfo)}
        onOpenChange={(o) => !o && setPasswordInfo(null)}
        password={passwordInfo?.password ?? ''}
        displayName={passwordInfo?.displayName}
      />
    </PageShell>
  );
}
