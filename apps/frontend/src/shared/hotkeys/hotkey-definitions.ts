/**
 * 全局快捷键注册表——CAP-A-17 单一真相源。
 *
 * 语义边界：
 * - `global` 组 = 全局壳层动作，走 {@link use-global-hotkey} 匹配分发，用户可在
 *   设置 · 快捷键中改键（localStorage 持久化，见 hotkey-store）；
 * - 上下文参考条目（document/decision/create 组）为页面或模态内的既有键位，
 *   `readonly` 只读展示：录制/冲突检测均不参与，Esc 层级栈亦不在此收编。
 */

export type HotkeyGroupId = 'global' | 'document' | 'decision' | 'create';

export interface HotkeyDefinition {
  /** 动作唯一 id（如 command-palette），也是 override 记录的键 */
  id: string;
  group: HotkeyGroupId;
  /** 缺省 combo（规范格式见 hotkey-utils），仅 global 组参与匹配 */
  defaultKeys: string;
  /** 动作名 i18n 键 */
  labelKey: string;
  /** 动作描述 i18n 键（可选） */
  descKey?: string;
  /** 上下文键只读展示，不可录制改键 */
  readonly?: boolean;
}

export const HOTKEY_DEFINITIONS: HotkeyDefinition[] = [
  {
    id: 'command-palette',
    group: 'global',
    defaultKeys: 'mod+k',
    labelKey: 'hotkeys.commandPalette',
    descKey: 'hotkeys.commandPaletteDesc',
  },
  {
    // 全局搜索（v0.7.4 搜索悬浮化）：与命令面板同一下浮层，聚焦全文检索入口
    id: 'global-search',
    group: 'global',
    defaultKeys: 'mod+shift+f',
    labelKey: 'hotkeys.globalSearch',
    descKey: 'hotkeys.globalSearchDesc',
  },
  {
    id: 'ai-assistant',
    group: 'global',
    defaultKeys: 'alt+a',
    labelKey: 'hotkeys.aiAssistant',
    descKey: 'hotkeys.aiAssistantDesc',
  },
  {
    id: 'document-save',
    group: 'document',
    defaultKeys: 'mod+s',
    labelKey: 'hotkeys.documentSave',
    descKey: 'hotkeys.documentSaveDesc',
    readonly: true,
  },
  {
    id: 'decision-review',
    group: 'decision',
    defaultKeys: 'enter',
    labelKey: 'hotkeys.decisionReview',
    descKey: 'hotkeys.decisionReviewDesc',
    readonly: true,
  },
  {
    id: 'create-panel-switch',
    group: 'create',
    defaultKeys: 'mod+1',
    labelKey: 'hotkeys.createPanelSwitch',
    descKey: 'hotkeys.createPanelSwitchDesc',
    readonly: true,
  },
  {
    id: 'create-panel-submit',
    group: 'create',
    defaultKeys: 'mod+enter',
    labelKey: 'hotkeys.createPanelSubmit',
    descKey: 'hotkeys.createPanelSubmitDesc',
    readonly: true,
  },
];

export const EDITABLE_HOTKEYS = HOTKEY_DEFINITIONS.filter((d) => !d.readonly);

export function getHotkeyDefinition(id: string): HotkeyDefinition | undefined {
  return HOTKEY_DEFINITIONS.find((d) => d.id === id);
}
