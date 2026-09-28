/**
 * BugTemplateHelper - 缺陷专属排查模板快捷注入器（CAP-A-18 V2）
 */
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';

export const BUG_MARKDOWN_TEMPLATE = `### 1. 复现步骤
1. 
2. 

### 2. 实际表现 vs 期望结果
- **实际表现**：
- **期望结果**：

### 3. 错误日志 / 截图信息
`;

export function BugTemplateHelper({
  onInject,
  hasContent,
}: {
  onInject: (template: string) => void;
  hasContent: boolean;
}) {
  const { t } = useTranslation();

  if (hasContent) return null;

  return (
    <div className="flex items-center gap-2 py-1">
      <button
        type="button"
        onClick={() => onInject(BUG_MARKDOWN_TEMPLATE)}
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-dashed border-border/80 bg-muted/20 hover:bg-accent hover:text-foreground text-xs text-muted-foreground transition-colors"
      >
        <FileText className="size-3 text-accent-orange" />
        <span>{t('unifiedCreate.bug.injectTemplate', { defaultValue: '填入标准缺陷排查模板' })}</span>
      </button>
    </div>
  );
}
