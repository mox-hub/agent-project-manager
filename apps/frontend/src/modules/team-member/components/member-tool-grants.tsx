import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
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
  machineDisplayName,
  pickRepresentativeRegistrations,
  useRuntimeRegistrations,
  type RuntimeRegistration,
} from '@/shared/runtime/runtime-api';
import {
  getMemberToolGrants,
  setMemberToolGrants,
  type MemberToolGrantScope,
} from '../api/team-member-api';

const SCOPE_META: Record<MemberToolGrantScope, { label: string; hint: string }> = {
  cli_tool: { label: 'CLI 工具', hint: '派发任务时该成员使用的 CLI Provider' },
  mcp_server: { label: '外部 MCP Server', hint: '该成员可访问的外部 MCP 服务' },
  skill: { label: '技能', hint: '该成员可启用的内置/自定义技能' },
};

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

/**
 * 成员「工具与访问授权」管理区：
 * CLI 工具为单选（级联下拉：机器 → CLI Provider，带在线状态）；
 * 未选择任何条目 = 不限制；选定后按白名单收敛（派发时生效）。
 */
export function MemberToolGrants({ memberId }: { memberId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['member-tool-grants', memberId],
    queryFn: () => getMemberToolGrants(memberId),
  });
  const registrations = useRuntimeRegistrations();

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [cliSelected, setCliSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // data 加载完成后同步勾选状态（渲染期间调整，避免 effect 内同步 setState）
  const [prevData, setPrevData] = useState(data);
  if (prevData !== data) {
    setPrevData(data);
    if (data) {
      const map: Record<string, boolean> = {};
      let cli: string | null = null;
      for (const g of data.grants) {
        if (!g.granted) continue;
        if (g.scope === 'cli_tool') {
          cli = g.refKey;
        } else {
          map[`${g.scope}:${g.refKey}`] = true;
        }
      }
      setSelected(map);
      setCliSelected(cli);
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
        name: '服务器本地',
        online: false,
        providers: catalog.map((c) => c.refKey),
      },
    ];
  }, [registrations.data, data]);

  const configured = cliSelected !== null || Object.values(selected).some(Boolean);

  const items = useMemo(() => {
    const result: Array<{
      scope: MemberToolGrantScope;
      refKey: string;
      granted: boolean;
    }> = [];
    if (cliSelected) {
      result.push({ scope: 'cli_tool', refKey: cliSelected, granted: true });
    }
    for (const [key, on] of Object.entries(selected)) {
      if (!on) continue;
      const [scope, ...rest] = key.split(':');
      result.push({ scope: scope as MemberToolGrantScope, refKey: rest.join(':'), granted: true });
    }
    return result;
  }, [cliSelected, selected]);

  const save = async () => {
    setSaving(true);
    try {
      await setMemberToolGrants(memberId, items);
      toast.success('授权已保存');
      qc.invalidateQueries({ queryKey: ['member-tool-grants', memberId] });
    } catch (err) {
      console.error('Save tool grants failed', err);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-6 text-center">加载中…</div>;
  }

  // 触发器展示：已选工具的 logo + 名称 · 机器名 + 在线点；未选显示不限制
  const selectedMachine =
    cliSelected != null
      ? machines.find((m) => m.providers.includes(cliSelected))
      : undefined;
  const selectedMeta = cliSelected != null ? getProviderMeta(cliSelected) : null;
  const SelectedIcon = selectedMeta?.Color ?? selectedMeta?.Icon;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">工具与访问授权</CardTitle>
        <Button size="sm" disabled={saving} onClick={save}>
          {saving ? '保存中…' : '保存授权'}
        </Button>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <p className="text-xs text-muted-foreground">
          {configured
            ? '当前为白名单模式：仅选定的对象可用，派发任务时按此收敛工具集。'
            : '尚未配置授权（不限制）。选择对象后即切换为白名单模式。'}
        </p>
        {(Object.keys(SCOPE_META) as MemberToolGrantScope[]).map((scope) => {
          if (scope === 'cli_tool') {
            return (
              <div key={scope} className="space-y-1.5">
                <div className="text-xs font-semibold">{SCOPE_META[scope].label}</div>
                <p className="text-xs text-muted-foreground">{SCOPE_META[scope].hint}（单选白名单）</p>
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
                              不限制（可用全部 CLI 工具）
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
                      onCheckedChange={() => setCliSelected(null)}
                    >
                      不限制
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
                              {onlineCount}/{machine.providers.length} 在线
                            </span>
                          </MenuSubTrigger>
                          <MenuSubPopup className="w-64">
                            {machine.providers.length === 0 ? (
                              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                该机器未上报 CLI 运行时
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
              </div>
            );
          }
          const catalog = data?.catalog?.[scope] ?? [];
          if (catalog.length === 0) return null;
          return (
            <div key={scope} className="space-y-1.5">
              <div className="text-xs font-semibold">{SCOPE_META[scope].label}</div>
              <p className="text-11 text-muted-foreground">{SCOPE_META[scope].hint}</p>
              <div className="rounded-md border border-border divide-y divide-border">
                {catalog.map((item) => {
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
                            （未启用）
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
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
