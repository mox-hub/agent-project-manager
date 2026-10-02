import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/ui/input';
import {
  SelectField,
  SelectFieldOption,
} from '@/components/ui/select-field';
import {
  getRecentWorkspaces,
  type PublicWorkspace,
} from '@/modules/workspace/api/workspace-api';
import { usePublicWorkspaceList } from '@/modules/workspace/hooks/use-public-workspace-list';

const DEFAULT_WORKSPACE_ID = 'default';
const MANUAL_VALUE = '__manual__';

interface LoginWorkspacePickerProps {
  /** 当前选中的工作区 id（'default' 表示默认空间） */
  value: string;
  /** 选择变化：`name` 仅在选择已有工作区时可用（用于记入本机最近列表） */
  onChange: (id: string, name?: string) => void;
  disabled?: boolean;
}

/**
 * 登录卡片的工作区选择器（CAP-A-26）。
 *
 * 候选项来源分两档（服务端开关决定）：
 *  - 公开名单开启：列出注册表里的工作区（脱敏 id/名称）；
 *  - 关闭 / 端点不可达：回落到**本机最近使用过**的工作区 + 手动输入 id。
 * 无论如何，用户都能在登录前看清并改变「本次登录落在哪个工作区」——
 * 这正是此前被 localStorage 隐形决定、导致选错工作区后弹回登录页的那一环。
 */
export function LoginWorkspacePicker({
  value,
  onChange,
  disabled,
}: LoginWorkspacePickerProps) {
  const { t } = useTranslation();
  const { data } = usePublicWorkspaceList();
  const [manual, setManual] = useState(false);

  const options = useMemo<PublicWorkspace[]>(() => {
    const defaultWorkspace: PublicWorkspace = {
      id: DEFAULT_WORKSPACE_ID,
      name: t('auth.workspace.defaultName'),
      isDefault: true,
    };
    const source = data?.enabled ? data.workspaces : getRecentWorkspaces();
    const seen = new Set<string>([DEFAULT_WORKSPACE_ID]);
    const rest = source.filter((w) => {
      if (seen.has(w.id)) return false;
      seen.add(w.id);
      return true;
    });
    return [defaultWorkspace, ...rest];
  }, [data, t]);

  const handleSelect = (next: string) => {
    if (next === MANUAL_VALUE) {
      setManual(true);
      return;
    }
    setManual(false);
    const picked = options.find((w) => w.id === next);
    onChange(next, picked?.name);
  };

  return (
    <div className="space-y-1.5">
      <label
        className="text-xs font-medium text-foreground"
        htmlFor="login-workspace"
      >
        {t('auth.workspace.label')}
      </label>

      {manual ? (
        <Input
          id="login-workspace"
          type="text"
          value={value === DEFAULT_WORKSPACE_ID ? '' : value}
          onChange={(e) => onChange(e.target.value.trim() || DEFAULT_WORKSPACE_ID)}
          placeholder={t('auth.workspace.manualPlaceholder')}
          disabled={disabled}
          className="h-10 text-sm"
          autoComplete="off"
        />
      ) : (
        <SelectField
          id="login-workspace"
          value={value}
          onChange={(e) => handleSelect(e.target.value)}
          disabled={disabled}
          className="h-10 text-sm"
        >
          {options.map((w) => (
            <SelectFieldOption key={w.id} value={w.id}>
              {w.name}
            </SelectFieldOption>
          ))}
          <SelectFieldOption value={MANUAL_VALUE}>
            {t('auth.workspace.manualOption')}
          </SelectFieldOption>
        </SelectField>
      )}
    </div>
  );
}
