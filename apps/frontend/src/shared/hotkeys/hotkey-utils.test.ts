import { describe, expect, it } from 'vitest';
import {
  eventToCombo,
  formatComboForDisplay,
  isEditableTarget,
} from './hotkey-utils';

function keyEvent(init: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}) {
  return { key: init.key, ctrlKey: !!init.ctrlKey, metaKey: !!init.metaKey, altKey: !!init.altKey, shiftKey: !!init.shiftKey };
}

describe('eventToCombo 归一化', () => {
  it('ctrl/meta 均归一化为 mod，主键小写', () => {
    expect(eventToCombo(keyEvent({ key: 'K', ctrlKey: true }))).toBe('mod+k');
    expect(eventToCombo(keyEvent({ key: 'k', metaKey: true }))).toBe('mod+k');
    expect(eventToCombo(keyEvent({ key: 'A', altKey: true }))).toBe('alt+a');
  });

  it('修饰序固定 mod+alt+shift+主键（不依赖按键顺序）', () => {
    expect(
      eventToCombo(keyEvent({ key: 'P', shiftKey: true, altKey: true, ctrlKey: true })),
    ).toBe('mod+alt+shift+p');
  });

  it('方向键去 Arrow 前缀、空格归一为 space', () => {
    expect(eventToCombo(keyEvent({ key: 'ArrowLeft', ctrlKey: true }))).toBe('mod+left');
    expect(eventToCombo(keyEvent({ key: ' ', altKey: true }))).toBe('alt+space');
  });

  it('单修饰键不算录制完成（返回 null）', () => {
    expect(eventToCombo(keyEvent({ key: 'Control' }))).toBeNull();
    expect(eventToCombo(keyEvent({ key: 'Meta' }))).toBeNull();
    expect(eventToCombo(keyEvent({ key: 'Shift', ctrlKey: true }))).toBeNull();
  });

  it('纯 Shift+字母（文本输入行为）不构成快捷键', () => {
    expect(eventToCombo(keyEvent({ key: 'K', shiftKey: true }))).toBeNull();
  });

  it('无修饰单键可构成快捷键（如决策卡 Enter/F）', () => {
    expect(eventToCombo(keyEvent({ key: 'Enter' }))).toBe('enter');
    expect(eventToCombo(keyEvent({ key: 'f' }))).toBeNull(); // 可打印单字符仍拒绝
  });
});

describe('formatComboForDisplay 展示格式化', () => {
  it('非 mac 平台 mod 渲染为 Ctrl、主键大写', () => {
    expect(formatComboForDisplay('mod+k', false)).toEqual(['Ctrl', 'K']);
    expect(formatComboForDisplay('mod+alt+shift+p', false)).toEqual(['Ctrl', 'Alt', 'Shift', 'P']);
  });

  it('mac 平台 mod/alt/shift 渲染为符号', () => {
    expect(formatComboForDisplay('mod+k', true)).toEqual(['⌘', 'K']);
    expect(formatComboForDisplay('alt+a', true)).toEqual(['⌥', 'A']);
  });

  it('方向键渲染为箭头符号', () => {
    expect(formatComboForDisplay('mod+left', false)).toEqual(['Ctrl', '←']);
  });
});

describe('isEditableTarget 输入态判定', () => {
  it('input/textarea/contentEditable 判为输入态，普通元素与 null 不判', () => {
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const div = document.createElement('div');
    const editable = document.createElement('div');
    // jsdom 下 el.contentEditable 赋值不反映到 isContentEditable，须走 attribute
    editable.setAttribute('contenteditable', 'true');
    expect(isEditableTarget(input)).toBe(true);
    expect(isEditableTarget(textarea)).toBe(true);
    expect(isEditableTarget(editable)).toBe(true);
    expect(isEditableTarget(div)).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});
