import { Textarea } from '@/components/ui/textarea';
import { FieldLabel } from '@/components/ui/field';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
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
        <CardTitle size="sm">团队提示词</CardTitle>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </Button>
      </CardHeader>
      <CardContent inset="md" >
        <p className="text-xs text-muted-foreground">
          作为团队整体需遵守的规则，派发任务给团队成员时注入上下文（Team Rules 段）。
        </p>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={8}
          placeholder="如：所有提交必须附带测试；沟通使用中文；代码风格遵循仓库 ESLint 配置…"
          className="resize-y focus-visible:outline-hidden"
        />
        <div className="space-y-1.5">
          <FieldLabel size="xs" variant="muted" >团队标签（逗号分隔）</FieldLabel>
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
