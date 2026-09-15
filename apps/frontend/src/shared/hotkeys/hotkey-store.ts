import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EDITABLE_HOTKEYS, getHotkeyDefinition } from './hotkey-definitions';

/**
 * 快捷键用户自定义 store——CAP-A-17。
 * 只存 override（id → combo），缺省值始终以注册表为准；纯设备级偏好不上后端。
 */

interface HotkeyState {
  overrides: Record<string, string>;
  setOverride: (id: string, combo: string) => void;
  resetOne: (id: string) => void;
  resetAll: () => void;
}

export const useHotkeyStore = create<HotkeyState>()(
  persist(
    (set) => ({
      overrides: {},
      setOverride: (id, combo) => set((s) => ({ overrides: { ...s.overrides, [id]: combo } })),
      resetOne: (id) =>
        set((s) => {
          if (!(id in s.overrides)) return s;
          const next = { ...s.overrides };
          delete next[id];
          return { overrides: next };
        }),
      resetAll: () => set({ overrides: {} }),
    }),
    {
      name: 'hotkey-storage',
      partialize: (state) => ({ overrides: state.overrides }),
    },
  ),
);

/** 动作当前生效 combo：override 优先，回落注册表缺省（非注册表 id 返回 null） */
export function getEffectiveCombo(id: string): string | null {
  const def = getHotkeyDefinition(id);
  if (!def) return null;
  return useHotkeyStore.getState().overrides[id] ?? def.defaultKeys;
}

/** 订阅式版本（组件内随 override 变化重渲染） */
export function useEffectiveCombo(id: string): string | null {
  const def = getHotkeyDefinition(id);
  return useHotkeyStore((s) => (def ? (s.overrides[id] ?? def.defaultKeys) : null));
}

/** 动作是否已被用户自定义（设置页徽标用） */
export function useIsOverridden(id: string): boolean {
  return useHotkeyStore((s) => id in s.overrides);
}

export interface HotkeyConflict {
  /** 撞车的 combo */
  combo: string;
  /** 使用该 combo 的可自定义动作 id 列表（≥2 才算冲突） */
  ids: string[];
}

/** 全量冲突检测：同一 combo 被多个可自定义动作同时占用（理论上设置页已拦截，兜底展示） */
export function getKeyConflicts(): HotkeyConflict[] {
  const { overrides } = useHotkeyStore.getState();
  const byCombo = new Map<string, string[]>();
  for (const def of EDITABLE_HOTKEYS) {
    const combo = overrides[def.id] ?? def.defaultKeys;
    const ids = byCombo.get(combo) ?? [];
    ids.push(def.id);
    byCombo.set(combo, ids);
  }
  return [...byCombo.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([combo, ids]) => ({ combo, ids }));
}

/**
 * 录制落库前的单点冲突检测：combo 是否与其他可自定义动作的当前生效键撞车。
 * 命中返回对方动作 id，未命中返回 null。
 */
export function findConflictingActionId(combo: string, selfId: string): string | null {
  const { overrides } = useHotkeyStore.getState();
  for (const def of EDITABLE_HOTKEYS) {
    if (def.id === selfId) continue;
    if ((overrides[def.id] ?? def.defaultKeys) === combo) {
      return def.id;
    }
  }
  return null;
}
