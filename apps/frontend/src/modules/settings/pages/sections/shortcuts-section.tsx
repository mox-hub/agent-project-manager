/**
 * 快捷键设置子页 —— CAP-A-17 全局键位注册表的用户自定义面。
 *
 * 两部分：
 * ① 全局动作（注册表 global 组）：行内「修改」进入录制态（capture 拦截，Esc 取消，
 *    单修饰键不算完成），录制组合归一化后与其他动作生效键做冲突检测——撞车则行内
 *    红字提示且不落库；改动即时写入 hotkey-store（zustand persist），监听器即时切换；
 * ② 上下文参考（readonly 条目）：文档保存/决策卡批阅/创建面板切换等页面与模态内
 *    既有键位，只读展示不参与录制——Esc 层级栈与编辑器键位不在注册表收编范围。
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/ui/page-shell';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { useTranslation } from 'react-i18next';
import { Keyboard, Pencil, RotateCcw } from 'lucide-react';
import { HOTKEY_DEFINITIONS, getHotkeyDefinition, type HotkeyDefinition } from '@/shared/hotkeys/hotkey-definitions';
import {
  findConflictingActionId,
  useHotkeyStore,
  useIsOverridden,
} from '@/shared/hotkeys/hotkey-store';
import { eventToCombo, formatComboForDisplay } from '@/shared/hotkeys/hotkey-utils';

function ComboKbd({ combo }: { combo: string }) {
  return (
    <KbdGroup>
      {formatComboForDisplay(combo).map((part) => (
        <Kbd key={part}>{part}</Kbd>
      ))}
    </KbdGroup>
  );
}

function GlobalHotkeyRow({
  def,
  recording,
  onStartRecording,
  onStopRecording,
}: {
  def: HotkeyDefinition;
  recording: boolean;
  onStartRecording: (id: string) => void;
  onStopRecording: () => void;
}) {
  const { t } = useTranslation();
  const combo = useHotkeyStore((s) => s.overrides[def.id] ?? def.defaultKeys);
  const overridden = useIsOverridden(def.id);
  const setOverride = useHotkeyStore((s) => s.setOverride);
  const resetOne = useHotkeyStore((s) => s.resetOne);
  const [conflictId, setConflictId] = useState<string | null>(null);

  // 录制态：capture 拦截全局（含注册表监听器），Esc 取消、单修饰键继续等待；
  // 冲突不落库只报红字，换键或取消即清除
  useEffect(() => {
    if (!recording) return;
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape') {
        onStopRecording();
        setConflictId(null);
        return;
      }
      const next = eventToCombo(event);
      if (!next) return;
      const conflict = findConflictingActionId(next, def.id);
      if (conflict) {
        setConflictId(conflict);
        return;
      }
      setOverride(def.id, next);
      setConflictId(null);
      onStopRecording();
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [recording, def.id, setOverride, onStopRecording]);

  const conflictDef = conflictId ? getHotkeyDefinition(conflictId) : null;

  return (
    <div
      className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
      data-testid={`shortcut-row-${def.id}`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{t(def.labelKey)}</span>
          {overridden ? (
            <span className="text-xs text-muted-foreground">{t('settings.shortcutsModified')}</span>
          ) : null}
        </div>
        {def.descKey ? (
          <p className="text-xs text-muted-foreground">{t(def.descKey)}</p>
        ) : null}
        {conflictDef ? (
          <p className="text-xs text-destructive" data-testid={`shortcut-conflict-${def.id}`}>
            {t('settings.shortcutsConflict', { action: t(conflictDef.labelKey) })}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {recording ? (
          <>
            <span
              className="text-xs text-muted-foreground"
              data-testid={`shortcut-recording-${def.id}`}
            >
              {t('settings.shortcutsRecordingHint')}
            </span>
            <Button
              variant="ghost"
              size="xs"
              onClick={onStopRecording}
              data-testid={`shortcut-cancel-${def.id}`}
            >
              {t('settings.shortcutsCancel')}
            </Button>
          </>
        ) : (
          <>
            <ComboKbd combo={combo} />
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                setConflictId(null);
                onStartRecording(def.id);
              }}
              data-testid={`shortcut-modify-${def.id}`}
            >
              <Pencil className="size-3" />
              {t('settings.shortcutsModify')}
            </Button>
            {overridden ? (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => resetOne(def.id)}
                data-testid={`shortcut-reset-${def.id}`}
              >
                <RotateCcw className="size-3" />
                {t('settings.shortcutsReset')}
              </Button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function ContextHotkeyRow({ def }: { def: HotkeyDefinition }) {
  const { t } = useTranslation();
  return (
    <div
      className="flex flex-col gap-1 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
      data-testid={`shortcut-row-${def.id}`}
    >
      <div className="min-w-0">
        <span className="text-sm font-medium">{t(def.labelKey)}</span>
        {def.descKey ? (
          <p className="text-xs text-muted-foreground">{t(def.descKey)}</p>
        ) : null}
      </div>
      <ComboKbd combo={def.defaultKeys} />
    </div>
  );
}

/** 快捷键设置子页：全局动作改键 + 上下文键只读参考 */
export function ShortcutsSettingsSection() {
  const { t } = useTranslation();
  const hasOverrides = useHotkeyStore((s) => Object.keys(s.overrides).length > 0);
  const resetAll = useHotkeyStore((s) => s.resetAll);
  const [recordingId, setRecordingId] = useState<string | null>(null);

  const globalDefs = HOTKEY_DEFINITIONS.filter((d) => d.group === 'global');
  const contextDefs = HOTKEY_DEFINITIONS.filter((d) => d.group !== 'global');

  return (
    <PageShell
      variant="standard"
      icon={Keyboard}
      iconColor="text-accent-blue"
      title={t('settings.shortcuts')}
      className="bg-background text-foreground"
      contentClassName="space-y-6"
    >
      <Card className="border-border shadow-none">
        <CardHeader className="flex-row items-center gap-2">
          <Keyboard className="size-4 text-muted-foreground" />
          <div className="flex-1">
            <CardTitle className="text-base">{t('settings.shortcutsGlobalTitle')}</CardTitle>
            <CardDescription>{t('settings.shortcutsGlobalDesc')}</CardDescription>
          </div>
          {hasOverrides ? (
            <Button variant="outline" size="xs" onClick={resetAll} data-testid="shortcut-reset-all">
              <RotateCcw className="size-3" />
              {t('settings.shortcutsResetAll')}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {globalDefs.map((def) => (
            <GlobalHotkeyRow
              key={def.id}
              def={def}
              recording={recordingId === def.id}
              onStartRecording={setRecordingId}
              onStopRecording={() => setRecordingId(null)}
            />
          ))}
        </CardContent>
      </Card>

      <Card className="border-border shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{t('settings.shortcutsContextTitle')}</CardTitle>
          <CardDescription>{t('settings.shortcutsContextDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {contextDefs.map((def) => (
            <ContextHotkeyRow key={def.id} def={def} />
          ))}
        </CardContent>
      </Card>
    </PageShell>
  );
}
