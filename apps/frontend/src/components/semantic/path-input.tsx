/**
 * PathInput - 路径输入语义组件（CAP-A-28，2026-10-03）
 *
 * 全仓路径录入统一件：手输 + 桌面壳系统选择器（choose_directory / choose_file）
 * + 后端实测验证（onValidate）+ 失效一键创建（onCreate，仅目录且结果 missing 时出现）
 * + 全失败路径保底报错（动作抛错原样呈现，绝不静默）。
 * 验证结论一律来自后端（props 注入），组件不做路径格式臆断拦截；
 * 纯 web 无壳时选择器入口隐藏、手输全通——选择器是加速项不是唯一入口。
 * 与 SettingsFieldRow 的分工：本件是路径专用字段（自带选择器/验证/创建），
 * 不是通用「左说明右控件」行骨架；勿混用。
 * props 面封闭：不接 className、不透传样式（inputClassName 仅输入框内文体，如等宽）。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  invoke,
  isDesktopShellAvailable,
} from '@/shared/types/electron-api';

/** 后端实测校验结果（与 WorkspaceValidationResult 同形，机器字段 missing 驱动创建动作） */
export interface PathCheckResult {
  status: 'valid' | 'invalid' | 'unknown';
  error?: string;
  suggestion?: string;
  gitRepoDetected?: boolean;
  /** 路径不存在——onCreate 在场时出现「创建目录」动作 */
  missing?: boolean;
}

export interface PathInputProps {
  /** 受控值（绝对路径） */
  value: string;
  onChange: (next: string) => void;
  /** 选择器种类：目录（默认）或单文件 */
  kind?: 'directory' | 'file';
  /** 字段标签 */
  label?: React.ReactNode;
  /** helper 说明 */
  description?: React.ReactNode;
  placeholder?: string;
  /** 输入框 id（表单关联/测试锚点） */
  id?: string;
  /** 远端配置加载中——输入与全部动作禁用 */
  loading?: boolean;
  disabled?: boolean;
  /** 系统选择器窗口标题；缺省按 kind 取组件文案 */
  pickerTitle?: string;
  /** 单文件选择器扩展名过滤（仅 Windows 有意义，按平台条件传入） */
  pickerFilters?: { name: string; extensions: string[] }[];
  /** 后端验证（入参 = 输入框当前值）；不传则无验证钮与状态徽标 */
  onValidate?: (path: string) => Promise<PathCheckResult>;
  /** 失效建目录（仅 kind='directory' 且验证结果 missing 时出现在动作区） */
  onCreate?: (path: string) => Promise<PathCheckResult>;
  /** 已存记录的验证回显（来自 DB，如 workspace.validationStatus）——无即时结果时展示 */
  savedStatus?: 'valid' | 'invalid' | 'unknown' | null;
  savedValidatedAt?: string | null;
  /** 输入框文体（等宽等）；仅作用于输入框 */
  inputClassName?: string;
}

type Phase = 'idle' | 'checking' | 'creating';

export function PathInput({
  value,
  onChange,
  kind = 'directory',
  label,
  description,
  placeholder,
  id,
  loading = false,
  disabled = false,
  pickerTitle,
  pickerFilters,
  onValidate,
  onCreate,
  savedStatus = null,
  savedValidatedAt = null,
  inputClassName,
}: PathInputProps) {
  const { t } = useTranslation();
  const [check, setCheck] = useState<PathCheckResult | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [actionError, setActionError] = useState<string | null>(null);

  const canPick = isDesktopShellAvailable();
  const busy = phase !== 'idle';
  const allDisabled = disabled || loading;

  const resetResult = () => {
    setCheck(null);
    setActionError(null);
  };

  const handlePick = async () => {
    try {
      const result = await invoke<{ path: string | null }>(
        kind === 'file' ? 'choose_file' : 'choose_directory',
        {
          title:
            pickerTitle ??
            (kind === 'file'
              ? t('path-input.pickFile')
              : t('path-input.pickDirectory')),
          filters: pickerFilters,
        },
      );
      if (result.path) {
        resetResult();
        onChange(result.path);
      }
    } catch {
      // 壳桥失败静默回落手输——选择器是加速项不是唯一入口
    }
  };

  const runAction = async (phaseName: Phase, action: (p: string) => Promise<PathCheckResult>) => {
    if (!value.trim()) return;
    setPhase(phaseName);
    setActionError(null);
    try {
      setCheck(await action(value.trim()));
    } catch (err) {
      setCheck(null);
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setPhase('idle');
    }
  };

  // 状态展示优先级：进行中 > 即时验证结果 > 已存回显 > 未验证（无验证能力时整行省略）
  const showCreate =
    kind === 'directory' && !!onCreate && check?.missing === true;

  let statusVariant: 'secondary' | 'destructive' | 'outline' = 'outline';
  let statusLabel: string = t('path-input.status.unknown');
  if (phase === 'checking') {
    statusLabel = t('path-input.status.checking');
  } else if (phase === 'creating') {
    statusLabel = t('path-input.status.creating');
  } else if (check) {
    if (check.status === 'valid') {
      statusVariant = 'secondary';
      statusLabel = t('path-input.status.valid');
    } else {
      statusVariant = 'destructive';
      statusLabel = t('path-input.status.invalid');
    }
  } else if (savedStatus) {
    if (savedStatus === 'valid') {
      statusVariant = 'secondary';
      statusLabel = t('path-input.status.valid');
    } else if (savedStatus === 'invalid') {
      statusVariant = 'destructive';
      statusLabel = t('path-input.status.invalid');
    }
  }
  const showStatusRow = busy || !!check || !!savedStatus;

  return (
    <div data-slot="path-input" className="space-y-1.5">
      {label ? (
        <Label htmlFor={id}>{label}</Label>
      ) : null}

      <div className="flex gap-2">
        <Input
          id={id}
          value={value}
          onChange={(e) => {
            resetResult();
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          disabled={allDisabled}
          className={inputClassName}
        />
        {canPick ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handlePick}
            disabled={allDisabled}
            title={pickerTitle ?? (kind === 'file' ? t('path-input.pickFile') : t('path-input.pickDirectory'))}
            aria-label={
              pickerTitle ?? (kind === 'file' ? t('path-input.pickFile') : t('path-input.pickDirectory'))
            }
          >
            <FolderOpen className="size-4" />
          </Button>
        ) : null}
      </div>

      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}

      {showStatusRow ? (
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant}>
            {busy ? <Spinner size="sm" /> : null}
            {statusLabel}
          </Badge>
          {!check && !busy && savedValidatedAt ? (
            <span className="text-xs text-muted-foreground">
              {t('path-input.savedAt', {
                time: new Date(savedValidatedAt).toLocaleString(),
              })}
            </span>
          ) : null}
        </div>
      ) : null}

      {check?.status === 'invalid' && (check.error || check.suggestion) ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
          {check.error ? (
            <p className="text-xs text-destructive">{check.error}</p>
          ) : null}
          {check.suggestion ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{check.suggestion}</p>
          ) : null}
        </div>
      ) : null}

      {actionError ? (
        <p className="text-xs text-destructive" role="alert">
          {t('path-input.actionFailed', { message: actionError })}
        </p>
      ) : null}

      {onValidate || showCreate ? (
        <div className="flex gap-2">
          {onValidate ? (
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => runAction('checking', onValidate)}
              disabled={allDisabled || busy || !value.trim()}
            >
              {t('path-input.action.validate')}
            </Button>
          ) : null}
          {showCreate ? (
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={() => (onCreate ? runAction('creating', onCreate) : undefined)}
              disabled={allDisabled || busy || !value.trim()}
            >
              {t('path-input.action.create')}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
