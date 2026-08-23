import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import {
  getMemberToolGrants,
  setMemberToolGrants,
  type MemberToolGrantScope,
} from '../api/team-member-api';

const SCOPE_META: Record<MemberToolGrantScope, { label: string; hint: string }> = {
  cli_tool: { label: 'CLI 工具', hint: '派发任务时该成员可用的 CLI Provider（白名单）' },
  mcp_server: { label: '外部 MCP Server', hint: '该成员可访问的外部 MCP 服务' },
  skill: { label: '技能', hint: '该成员可启用的内置/自定义技能' },
};

/**
 * 成员「工具与访问授权」管理区：
 * 未勾选任何条目 = 不限制；勾选后按白名单收敛（派发时生效）。
 */
export function MemberToolGrants({ memberId }: { memberId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['member-tool-grants', memberId],
    queryFn: () => getMemberToolGrants(memberId),
  });

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  // data 加载完成后同步勾选状态（渲染期间调整，避免 effect 内同步 setState）
  const [prevData, setPrevData] = useState(data);
  if (prevData !== data) {
    setPrevData(data);
    if (data) {
      const map: Record<string, boolean> = {};
      for (const g of data.grants) {
        if (g.granted) map[`${g.scope}:${g.refKey}`] = true;
      }
      setSelected(map);
    }
  }

  const configured = (data?.grants ?? []).length > 0;

  const items = useMemo(() => {
    if (!data) return [];
    return Object.entries(selected)
      .filter(([, on]) => on)
      .map(([key]) => {
        const [scope, ...rest] = key.split(':');
        return { scope: scope as MemberToolGrantScope, refKey: rest.join(':'), granted: true };
      });
  }, [selected, data]);

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
            ? '当前为白名单模式：仅勾选的对象可用，派发任务时按此收敛工具集。'
            : '尚未配置授权（不限制）。勾选对象后即切换为白名单模式。'}
        </p>
        {(Object.keys(SCOPE_META) as MemberToolGrantScope[]).map((scope) => {
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
                          <span className="ml-1.5 text-10 text-muted-foreground">
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
