import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { CapsuleSelect } from '@/shared/components/property-panel';
import {
  Menu,
  MenuCheckboxItem,
  MenuPopup,
  MenuSeparator,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuTrigger,
} from '@/components/ui/menu';
import { getProviderMeta } from '@/shared/ai-providers/provider-meta';
import {
  MEMBER_THINKING_LEVELS,
} from '@/shared/member/types';
import {
  machineDisplayName,
  pickRepresentativeRegistrations,
  useRuntimeRegistrations,
  type RuntimeRegistration,
} from '@/shared/runtime/runtime-api';
import {
  getMemberToolGrants,
  setMemberToolGrants,
  type MemberToolGrantConfig,
  type MemberToolGrantScope,
} from '../api/team-member-api';

interface MachineOption {
  key: string;
  name: string;
  online: boolean;
  providers: string[];
}

/** 在线状态点：在线绿点 / 离线灰点 */
function PresenceDot({ online }: { online: boolean }) {
  return (
    <span
      className={`size-1.5 shrink-0 rounded-full ${
        online ? 'bg-accent-green' : 'bg-muted-foreground/30'
      }`}
    />
  );
}

/** i18n 化的 scope 标签键（memberDetail.grants.*） */
const SCOPE_LABEL_KEYS: Record<MemberToolGrantScope, { labelKey: string; hintKey: string }> = {
  cli_tool: {
    labelKey: 'memberDetail.grants.cliTool',
    hintKey: 'memberDetail.grants.cliToolHint',
  },
  mcp_server: {
    labelKey: 'memberDetail.grants.mcp',
    hintKey: 'memberDetail.grants.mcpHint',
  },
  skill: {
    labelKey: 'memberDetail.grants.skill',
    hintKey: 'memberDetail.grants.skillHint',
  },
};

/**
 * 成员「工具与访问授权」管理区（CAP-A-02 增强 2026-09-30）：
 * - CLI 工具单选白名单（机器→CLI Provider 级联）；选中后可进一步配置
 *   该 CLI 的模型与思考强度覆盖（空 = 回落 CLI 默认配置），派发生效。
 * - 技能 / MCP 目录双来源：platform（平台配置）+ cli（CLI 本机资产发现，
 *   refKey 带 cli:<providerId>:<key> 命名空间），分组展示。
 * 未选择任何条目 = 不限制；选定后按白名单收敛（派发时生效）。
 */
export function MemberToolGrants({ memberId }: { memberId: string }) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['member-tool-grants', memberId],
    queryFn: () => getMemberToolGrants(memberId),
  });
  const registrations = useRuntimeRegistrations();

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [cliSelected, setCliSelected] = useState<string | null>(null);
  const [cliConfig, setCliConfig] = useState<MemberToolGrantConfig>({});
  const [saving, setSaving] = useState(false);

  // data 加载完成后同步勾选状态（渲染期间调整，避免 effect 内同步 setState）
  const [prevData, setPrevData] = useState(data);
  if (prevData !== data) {
    setPrevData(data);
    if (data) {
      const map: Record<string, boolean> = {};
      let cli: string | null = null;
      let cfg: MemberToolGrantConfig = {};
      for (const g of data.grants) {
        if (!g.granted) continue;
        if (g.scope === 'cli_tool') {
          cli = g.refKey;
          cfg = {
            model:
              typeof g.config?.model === 'string' ? g.config.model : undefined,
            thinkingLevel:
              typeof g.config?.thinkingLevel === 'string'
                ? g.config.thinkingLevel
                : undefined,
          };
        } else {
          map[`${g.scope}:${g.refKey}`] = true;
        }
      }
      setSelected(map);
      setCliSelected(cli);
      setCliConfig(cfg);
    }
  }

  // 机器选项：守护进程注册按设备去重；无 daemon 时回落服务端配置的 catalog
  const machines = useMemo<MachineOption[]>(() => {
    const regs = registrations.data ?? [];
    if (regs.length > 0) {
      return pickRepresentativeRegistrations(regs).map((reg: RuntimeRegistration) => ({
        key: reg.runtimeId,
        name: machineDisplayName(reg),
        online: reg.status === 'online',
        providers: [...new Set(reg.cliProviders ?? [])],
      }));
    }
    const catalog = data?.catalog?.cli_tool ?? [];
    if (catalog.length === 0) return [];
    return [
      {
        key: 'server-local',
        name: t('memberDetail.grants.serverLocal', '服务器本地'),
        online: false,
        providers: catalog.map((c) => c.refKey),
      },
    ];
  }, [registrations.data, data, t]);

  const configured = cliSelected !== null || Object.values(selected).some(Boolean);

  const items = useMemo(() => {
    const result: Array<{
      scope: MemberToolGrantScope;
      refKey: string;
      granted: boolean;
      config?: MemberToolGrantConfig | null;
    }> = [];
    if (cliSelected) {
      const hasModel = Boolean(cliConfig.model?.trim());
      const hasThinking = Boolean(cliConfig.thinkingLevel?.trim());
      result.push({
        scope: 'cli_tool',
        refKey: cliSelected,
        granted: true,
        config:
          hasModel || hasThinking
            ? {
                ...(hasModel ? { model: cliConfig.model!.trim() } : {}),
                ...(hasThinking
                  ? { thinkingLevel: cliConfig.thinkingLevel!.trim() }
                  : {}),
              }
            : null,
      });
    }
    for (const [key, on] of Object.entries(selected)) {
      if (!on) continue;
      const [scope, ...rest] = key.split(':');
      result.push({
        scope: scope as MemberToolGrantScope,
        refKey: rest.join(':'),
        granted: true,
      });
    }
    return result;
  }, [cliSelected, cliConfig, selected]);

  const save = async () => {
    setSaving(true);
    try {
      await setMemberToolGrants(memberId, items);
      toast.success(t('memberDetail.grants.saved', '授权已保存'));
      qc.invalidateQueries({ queryKey: ['member-tool-grants', memberId] });
    } catch (err) {
      console.error('Save tool grants failed', err);
      toast.error(t('memberDetail.grants.saveFailed', '保存失败'));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        {t('common.loading', '加载中…')}
      </div>
    );
  }

  // 触发器展示：已选工具的 logo + 名称 · 机器名 + 在线点；未选显示不限制
  const selectedMachine =
    cliSelected != null
      ? machines.find((m) => m.providers.includes(cliSelected))
      : undefined;
  const selectedMeta = cliSelected != null ? getProviderMeta(cliSelected) : null;
  const SelectedIcon = selectedMeta?.Color ?? selectedMeta?.Icon;

  const thinkingOptions = [
    { value: '', label: t('memberDetail.grants.cliDefault', 'CLI 默认') },
    ...MEMBER_THINKING_LEVELS.map((l) => ({ value: l.value, label: l.label })),
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">
          {t('memberDetail.grants.title', '工具与访问授权')}
        </CardTitle>
        <Button size="sm" disabled={saving} onClick={save}>
          {saving
            ? t('memberDetail.grants.saving', '保存中…')
            : t('memberDetail.grants.save', '保存授权')}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <p className="text-xs text-muted-foreground">
          {configured
            ? t(
                'memberDetail.grants.whitelistMode',
                '当前为白名单模式：仅选定的对象可用，派发任务时按此收敛工具集。',
              )
            : t(
                'memberDetail.grants.unrestrictedMode',
                '尚未配置授权（不限制）。选择对象后即切换为白名单模式。',
              )}
        </p>
        {(Object.keys(SCOPE_LABEL_KEYS) as MemberToolGrantScope[]).map((scope) => {
          if (scope === 'cli_tool') {
            return (
              <div key={scope} className="space-y-1.5">
                <div className="text-xs font-semibold">
                  {t(SCOPE_LABEL_KEYS[scope].labelKey, 'CLI 工具')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t(SCOPE_LABEL_KEYS[scope].hintKey, '派发任务时该成员使用的 CLI Provider')}
                  {t('memberDetail.grants.singleSelect', '（单选白名单）')}
                </p>
                <Menu>
                  <MenuTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-72 justify-between px-2.5 font-normal"
                      >
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          {selectedMeta && SelectedIcon && (
                            <SelectedIcon size={14} className="shrink-0" />
                          )}
                          {cliSelected && selectedMeta ? (
                            <>
                              <span className="truncate">{selectedMeta.label}</span>
                              <span className="truncate text-xs text-muted-foreground">
                                · {selectedMachine ? selectedMachine.name : ''}
                              </span>
                              <PresenceDot online={selectedMachine?.online ?? false} />
                            </>
                          ) : (
                            <span className="truncate text-muted-foreground">
                              {t('memberDetail.grants.unrestricted', '不限制（可用全部 CLI 工具）')}
                            </span>
                          )}
                        </span>
                        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
                      </Button>
                    }
                  />
                  <MenuPopup align="start" className="w-72">
                    <MenuCheckboxItem
                      checked={cliSelected == null}
                      onCheckedChange={() => {
                        setCliSelected(null);
                        setCliConfig({});
                      }}
                    >
                      {t('memberDetail.grants.unrestrictedShort', '不限制')}
                    </MenuCheckboxItem>
                    {machines.length > 0 && <MenuSeparator />}
                    {machines.map((machine) => {
                      const onlineCount = machine.online ? machine.providers.length : 0;
                      const holdsSelection =
                        cliSelected != null && machine.providers.includes(cliSelected);
                      return (
                        <MenuSub key={machine.key}>
                          <MenuSubTrigger>
                            <Check
                              className={`size-3.5 shrink-0 ${
                                holdsSelection ? '' : 'opacity-0'
                              }`}
                            />
                            <span className="min-w-0 flex-1 truncate">{machine.name}</span>
                            <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                              <PresenceDot online={machine.online} />
                              {onlineCount}/{machine.providers.length}
                            </span>
                          </MenuSubTrigger>
                          <MenuSubPopup className="w-64">
                            {machine.providers.length === 0 ? (
                              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                {t(
                                  'memberDetail.grants.noRuntime',
                                  '该机器未上报 CLI 运行时',
                                )}
                              </div>
                            ) : (
                              machine.providers.map((pid) => {
                                const meta = getProviderMeta(pid);
                                const PIcon = meta.Color ?? meta.Icon;
                                return (
                                  <MenuCheckboxItem
                                    key={pid}
                                    checked={cliSelected === pid}
                                    onCheckedChange={() => setCliSelected(pid)}
                                  >
                                    <span className="flex w-full items-center gap-2">
                                      <PIcon size={14} className="shrink-0" />
                                      <span className="min-w-0 flex-1 truncate">{meta.label}</span>
                                      <PresenceDot online={machine.online} />
                                    </span>
                                  </MenuCheckboxItem>
                                );
                              })
                            )}
                          </MenuSubPopup>
                        </MenuSub>
                      );
                    })}
                  </MenuPopup>
                </Menu>

                {/* 选中 CLI 后的执行配置：模型 + 思考强度覆盖（空 = CLI 默认配置） */}
                {cliSelected && (
                  <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
                    <p className="text-2xs text-muted-foreground">
                      {t(
                        'memberDetail.grants.cliConfigHint',
                        '执行配置（可选）：为该成员覆盖此 CLI 的模型与思考强度；留空使用 CLI 默认配置。',
                      )}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="w-20 shrink-0 text-xs font-medium">
                        {t('memberDetail.grants.modelOverride', '模型')}
                      </span>
                      <Input
                        value={cliConfig.model ?? ''}
                        onChange={(e) =>
                          setCliConfig((c) => ({ ...c, model: e.target.value }))
                        }
                        placeholder={t(
                          'memberDetail.grants.modelPlaceholder',
                          '留空使用 CLI 默认模型',
                        )}
                        className="h-7 flex-1 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-20 shrink-0 text-xs font-medium">
                        {t('memberDetail.grants.thinkingOverride', '思考强度')}
                      </span>
                      <CapsuleSelect
                        value={cliConfig.thinkingLevel ?? ''}
                        options={thinkingOptions}
                        onChange={(v) =>
                          setCliConfig((c) => ({ ...c, thinkingLevel: v || undefined }))
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          }
          const catalog = data?.catalog?.[scope] ?? [];
          if (catalog.length === 0) return null;
          // 双来源分组：平台配置在前，CLI 本机资产在后
          const platformItems = catalog.filter((c) => c.source !== 'cli');
          const cliItems = catalog.filter((c) => c.source === 'cli');
          return (
            <div key={scope} className="space-y-1.5">
              <div className="text-xs font-semibold">
                {t(SCOPE_LABEL_KEYS[scope].labelKey, scope)}
              </div>
              <p className="text-2xs text-muted-foreground">
                {t(SCOPE_LABEL_KEYS[scope].hintKey, '')}
              </p>
              <div className="divide-y divide-border rounded-md border border-border">
                {platformItems.map((item) => {
                  const key = `${scope}:${item.refKey}`;
                  const on = Boolean(selected[key]);
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between px-3 py-2"
                    >
                      <span className="text-sm">
                        {item.label}
                        {!item.enabled && (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            {t('memberDetail.grants.disabled', '（未启用）')}
                          </span>
                        )}
                      </span>
                      <Switch
                        checked={on}
                        onCheckedChange={(v) =>
                          setSelected((s) => ({ ...s, [key]: v }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
              {cliItems.length > 0 && (
                <>
                  <p className="pt-1 text-2xs font-semibold text-muted-foreground">
                    {t(
                      'memberDetail.grants.cliSource',
                      'CLI 本机资产（从 CLI 工具读取）',
                    )}
                  </p>
                  <div className="divide-y divide-border rounded-md border border-border">
                    {cliItems.map((item) => {
                      const key = `${scope}:${item.refKey}`;
                      const on = Boolean(selected[key]);
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between px-3 py-2"
                        >
                          <span className="text-sm">
                            {item.label}
                            {!item.enabled && (
                              <span className="ml-1.5 text-xs text-muted-foreground">
                                {t('memberDetail.grants.disabled', '（未启用）')}
                              </span>
                            )}
                          </span>
                          <Switch
                            checked={on}
                            onCheckedChange={(v) =>
                              setSelected((s) => ({ ...s, [key]: v }))
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
