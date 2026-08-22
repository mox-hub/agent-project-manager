import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { updateTeam } from '../api/team-member-api';
import type { Team } from '../types';

/** 团队提示词编辑：teamPrompt 会注入成员任务派发上下文（Team Rules） */
export function TeamPromptSection({ team }: { team: Team }) {
  const [prompt, setPrompt] = useState(team.teamPrompt ?? '');
  const [tagsInput, setTagsInput] = useState((team.tags ?? []).join(', '));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPrompt(team.teamPrompt ?? '');
    setTagsInput((team.tags ?? []).join(', '));
  }, [team.id, team.teamPrompt, team.tags]);

  const save = async () => {
    setSaving(true);
    try {
      await updateTeam(team.id, {
        teamPrompt: prompt || undefined,
        tags: tagsInput
          ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
      } as never);
      toast.success('团队提示词已保存');
    } catch (err) {
      console.error(err);
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">团队提示词</CardTitle>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </Button>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          作为团队整体需遵守的规则，派发任务给团队成员时注入上下文（Team Rules 段）。
        </p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={8}
          placeholder="如：所有提交必须附带测试；沟通使用中文；代码风格遵循仓库 ESLint 配置…"
          className="w-full px-2.5 py-2 rounded-md border border-input bg-background text-sm resize-y placeholder:text-muted-foreground focus-visible:border-accent-blue focus-visible:outline-hidden"
        />
        <div className="space-y-1.5">
          <label className="text-xs font-medium">团队标签（逗号分隔）</label>
          <Input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="如: 平台组, 核心"
          />
        </div>
      </CardContent>
    </Card>
  );
}
