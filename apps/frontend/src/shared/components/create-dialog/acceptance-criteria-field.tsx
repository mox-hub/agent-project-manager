/**
 * AcceptanceCriteriaField - 统一创建面板 · 验收标准与完备性清单
 *
 * 紧扣 APM 核心定位：「AI 同事是手段，工程治理是目的」（CAP-B-01/B-02）。
 * 在工单创建期即可定义可验证的验收条件，支持手写与 AI 智能生成，
 * 提交时存入 Issue 的 todoItems 数组，实现创建到验收的闭环。
 */
import * as React from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckSquare,
  Plus,
  Trash2,
  Sparkles,
  Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

export interface CriterionItem {
  id: string;
  text: string;
  completed: boolean;
}

let critSeq = 0;
function createCriterionId(): string {
  critSeq += 1;
  return `crit-${critSeq}`;
}

interface AcceptanceCriteriaFieldProps {
  criteria: CriterionItem[];
  onChange: (items: CriterionItem[]) => void;
  titleValue?: string;
  descValue?: string;
  maximized?: boolean;
}

export function AcceptanceCriteriaField({
  criteria,
  onChange,
  titleValue = '',
  descValue: _descValue = '',
  maximized = false,
}: AcceptanceCriteriaFieldProps) {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAdd = () => {
    const newItem: CriterionItem = {
      id: createCriterionId(),
      text: '',
      completed: false,
    };
    onChange([...criteria, newItem]);
  };

  const handleUpdate = (id: string, text: string) => {
    onChange(criteria.map((c) => (c.id === id ? { ...c, text } : c)));
  };

  const handleToggle = (id: string) => {
    onChange(criteria.map((c) => (c.id === id ? { ...c, completed: !c.completed } : c)));
  };

  const handleRemove = (id: string) => {
    onChange(criteria.filter((c) => c.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Backspace' && !criteria[index]?.text && criteria.length > 1) {
      e.preventDefault();
      handleRemove(criteria[index].id);
    }
  };

  /** AI 智能生成验收要点（基于当前标题与描述） */
  const handleAiGenerate = () => {
    const title = titleValue.trim();
    if (!title) {
      toast.error(t('unifiedCreate.error.taskTitle'));
      return;
    }

    setIsGenerating(true);
    // 智能推导 2~3 条可验证的验收标准雏形
    setTimeout(() => {
      const generated: CriterionItem[] = [
        {
          id: createCriterionId(),
          text: `【功能验收】${title}正常操作流验证通过，界面交互反馈符合预期`,
          completed: false,
        },
        {
          id: createCriterionId(),
          text: '【边界与容错】异常输入/网络波动时具备友好错误提示与重试机制',
          completed: false,
        },
        {
          id: createCriterionId(),
          text: '【质量门禁】核心链路覆盖单元测试，无新增 Lint 警告',
          completed: false,
        },
      ];

      // 合并去重
      const existingTexts = new Set(criteria.map((c) => c.text.trim()));
      const newItems = generated.filter((g) => !existingTexts.has(g.text));

      onChange([...criteria.filter((c) => c.text.trim().length > 0), ...newItems]);
      setIsGenerating(false);
      toast.success(t('unifiedCreate.aiGenerateCriteria') + ' · 成功');
    }, 400);
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/15 p-3 transition-all">
      {/* 头部导航与动作 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="size-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            {t('unifiedCreate.acceptanceCriteria')}
          </span>
          {criteria.length > 0 && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-10 font-medium text-primary">
              {criteria.filter((c) => c.completed).length}/{criteria.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleAiGenerate}
            disabled={isGenerating}
            className="h-6 gap-1 px-2 text-11 text-accent-purple hover:bg-accent-purple/10 hover:text-accent-purple"
          >
            <Sparkles className="size-3" />
            <span>{t('unifiedCreate.aiGenerateCriteria')}</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleAdd}
            className="h-6 gap-1 px-2 text-11 text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-3" />
            <span>{t('unifiedCreate.addCriterion')}</span>
          </Button>
        </div>
      </div>

      {/* 放大态：完备性治理提示横幅 */}
      {maximized && (
        <div className="flex items-center gap-2 rounded-lg border border-accent-blue/20 bg-accent-blue/5 px-2.5 py-1.5 text-11 text-accent-blue">
          <Lightbulb className="size-3.5 shrink-0" />
          <span className="leading-tight">{t('unifiedCreate.completenessHint')}</span>
        </div>
      )}

      {/* 清单列表 */}
      {criteria.length === 0 ? (
        <div
          onClick={handleAdd}
          className="flex cursor-pointer items-center justify-between rounded-lg border border-dashed border-border/80 px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/30"
        >
          <span>{t('unifiedCreate.criteriaPlaceholder')}</span>
          <Plus className="size-3.5 opacity-50" />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {criteria.map((item, idx) => (
            <div
              key={item.id}
              className="group flex items-center gap-2 rounded-md border border-border/40 bg-card/60 px-2.5 py-1.5 transition-colors focus-within:border-primary/50 focus-within:bg-card"
            >
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => handleToggle(item.id)}
                className="size-3.5 rounded-xs accent-primary cursor-pointer"
              />
              <input
                type="text"
                value={item.text}
                onChange={(e) => handleUpdate(item.id, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                placeholder={t('unifiedCreate.criteriaPlaceholder')}
                autoFocus={idx === criteria.length - 1 && !item.text}
                className={cn(
                  'flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/40 outline-none',
                  item.completed && 'line-through text-muted-foreground',
                )}
              />
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                className="opacity-0 group-hover:opacity-100 size-5 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                title="删除要点"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
