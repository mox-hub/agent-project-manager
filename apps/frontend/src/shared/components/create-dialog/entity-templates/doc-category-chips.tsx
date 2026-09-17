/**
 * DocCategoryChips - 文档类目规范 Chips 栏（CAP-A-18 V2）
 */
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Layers, Code, CheckSquare, BookOpen, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DocumentCategory as DocCategory } from '@/modules/document/api/document-api';

export interface DocCategoryChipsProps {
  value: DocCategory;
  onChange: (category: DocCategory) => void;
  onApplyTemplate?: (template: string) => void;
}

const CATEGORY_ITEMS: {
  value: DocCategory;
  labelKey: string;
  defaultLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  template: string;
}[] = [
  {
    value: 'requirement',
    labelKey: 'unifiedCreate.category.requirement',
    defaultLabel: '需求 PRD',
    icon: FileText,
    template: `## 一、需求背景与目标\n\n## 二、用户角色与核心场景\n\n## 三、详细功能清单\n\n## 四、非功能性需求与验收指标\n`,
  },
  {
    value: 'analysis',
    labelKey: 'unifiedCreate.category.analysis',
    defaultLabel: '分析报告',
    icon: BarChart3,
    template: `## 一、问题定义与现状评估\n\n## 二、可行性分析与技术选型\n\n## 三、影响面评估与依赖分析\n\n## 四、风险与应对预案\n`,
  },
  {
    value: 'design',
    labelKey: 'unifiedCreate.category.design',
    defaultLabel: '架构设计',
    icon: Layers,
    template: `## 一、系统架构设计\n\n## 二、核心模块与数据流\n\n## 三、实体模型定义\n\n## 四、时序图与交互协议\n`,
  },
  {
    value: 'api',
    labelKey: 'unifiedCreate.category.api',
    defaultLabel: '接口契约',
    icon: Code,
    template: `## 一、端点定义\n\n### GET /api/v1/...\n- **入参 Query**：\n- **返回 Body**：\n\n### POST /api/v1/...\n`,
  },
  {
    value: 'testing',
    labelKey: 'unifiedCreate.category.testing',
    defaultLabel: '测试方案',
    icon: CheckSquare,
    template: `## 一、测试范围与用例矩阵\n\n## 二、边界值与异常流验证\n\n## 三、自动化覆盖率指标\n`,
  },
  {
    value: 'guide',
    labelKey: 'unifiedCreate.category.guide',
    defaultLabel: '操作指南',
    icon: BookOpen,
    template: `## 一、快速上手\n\n## 二、安装与环境要求\n\n## 三、常见问题排查 (FAQ)\n`,
  },
];

export function DocCategoryChips({
  value,
  onChange,
  onApplyTemplate,
}: DocCategoryChipsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 scrollbar-none">
      {CATEGORY_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => {
              onChange(item.value);
              if (onApplyTemplate) {
                onApplyTemplate(item.template);
              }
            }}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all shrink-0 border select-none',
              active
                ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                : 'border-border/60 bg-muted/20 hover:bg-accent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className={cn('size-3.5', active ? 'text-primary-foreground' : 'text-muted-foreground')} />
            <span>{t(item.labelKey, { defaultValue: item.defaultLabel })}</span>
          </button>
        );
      })}
    </div>
  );
}
