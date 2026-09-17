import { beforeAll, describe, expect, it, vi } from 'vitest';
import { useHotkeyStore, getEffectiveCombo, getKeyConflicts, findConflictingActionId } from './hotkey-store';
import { EDITABLE_HOTKEYS, HOTKEY_DEFINITIONS, getHotkeyDefinition } from './hotkey-definitions';

// setup 把 localStorage mock 成无实现 vi.fn()：断言 persist 落盘须自接内存实现（toolbar-row 先例）
const memoryStorage = new Map<string, string>();
beforeAll(() => {
  vi.mocked(localStorage.getItem).mockImplementation((k) => memoryStorage.get(String(k)) ?? null);
  vi.mocked(localStorage.setItem).mockImplementation((k, v) => void memoryStorage.set(String(k), String(v)));
});

describe('hotkey-definitions 注册表单一真相源', () => {
  it('global 组恰为两个壳层动作（命令面板/AI 助理），均非 readonly', () => {
    const globals = HOTKEY_DEFINITIONS.filter((d) => d.group === 'global');
    expect(globals.map((d) => d.id)).toEqual(['command-palette', 'ai-assistant']);
    expect(globals.every((d) => !d.readonly)).toBe(true);
  });

  it('上下文参考条目全部 readonly，与收编范围裁决一致', () => {
    const contexts = HOTKEY_DEFINITIONS.filter((d) => d.group !== 'global');
    expect(contexts.length).toBeGreaterThan(0);
    expect(contexts.every((d) => d.readonly)).toBe(true);
  });

  it('EDITABLE_HOTKEYS 与 readonly 过滤互为补集；id 唯一', () => {
    expect(EDITABLE_HOTKEYS.length + HOTKEY_DEFINITIONS.filter((d) => d.readonly).length)
      .toBe(HOTKEY_DEFINITIONS.length);
    const ids = HOTKEY_DEFINITIONS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(getHotkeyDefinition('command-palette')?.defaultKeys).toBe('mod+k');
    expect(getHotkeyDefinition('not-exist')).toBeUndefined();
  });
});

describe('hotkey-store override 语义', () => {
  it('无 override 时生效键回落注册表缺省；setOverride 后覆盖、resetOne 恢复', () => {
    useHotkeyStore.getState().resetAll();
    expect(getEffectiveCombo('command-palette')).toBe('mod+k');

    useHotkeyStore.getState().setOverride('command-palette', 'mod+j');
    expect(getEffectiveCombo('command-palette')).toBe('mod+j');

    useHotkeyStore.getState().resetOne('command-palette');
    expect(getEffectiveCombo('command-palette')).toBe('mod+k');
  });

  it('override 写入 persist 落 localStorage（hotkey-storage）', () => {
    useHotkeyStore.getState().resetAll();
    useHotkeyStore.getState().setOverride('ai-assistant', 'alt+j');
    const raw = localStorage.getItem('hotkey-storage');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string).state.overrides).toEqual({ 'ai-assistant': 'alt+j' });
    useHotkeyStore.getState().resetAll();
  });

  it('findConflictingActionId：撞车返回对方动作 id，含自身与空闲键返回 null', () => {
    useHotkeyStore.getState().resetAll();
    // mod+k 是 command-palette 的缺省键：ai-assistant 想占用即冲突
    expect(findConflictingActionId('mod+k', 'ai-assistant')).toBe('command-palette');
    expect(findConflictingActionId('mod+j', 'ai-assistant')).toBeNull();
    // 自己的当前键不算冲突
    expect(findConflictingActionId('mod+k', 'command-palette')).toBeNull();
  });

  it('getKeyConflicts 兜底检测：人为构造同键后可发现（设置页正常路径已拦截）', () => {
    useHotkeyStore.getState().resetAll();
    useHotkeyStore.getState().setOverride('ai-assistant', 'mod+k');
    const conflicts = getKeyConflicts();
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].combo).toBe('mod+k');
    expect([...conflicts[0].ids].sort()).toEqual(['ai-assistant', 'command-palette']);
    useHotkeyStore.getState().resetAll();
  });

  it('非注册表 id 的生效键返回 null（防拼写错误静默）', () => {
    expect(getEffectiveCombo('not-exist')).toBeNull();
  });
});
