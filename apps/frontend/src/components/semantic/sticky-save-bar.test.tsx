import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StickySaveBar } from './sticky-save-bar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('StickySaveBar（设置页脏状态保存栏）', () => {
  it('dirty=false 渲染 null 不占位', () => {
    const { container } = render(<StickySaveBar dirty={false} onSave={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('dirty=true 渲染缺省说明与保存钮，回调可达', () => {
    const onSave = vi.fn();
    render(<StickySaveBar dirty onSave={onSave} />);
    expect(screen.getByText('settings.unsavedChanges')).toBeTruthy();
    fireEvent.click(screen.getByText('common.save'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('onDiscard 传入时渲染放弃钮，回调可达', () => {
    const onDiscard = vi.fn();
    render(<StickySaveBar dirty onSave={() => {}} onDiscard={onDiscard} />);
    fireEvent.click(screen.getByText('settings.discardChanges'));
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it('onDiscard 不传时无放弃钮', () => {
    render(<StickySaveBar dirty onSave={() => {}} />);
    expect(screen.queryByText('settings.discardChanges')).toBeNull();
  });

  it('saving=true：双钮禁用且保存钮文案切保存中，自定义 hint 生效', () => {
    const onSave = vi.fn();
    render(<StickySaveBar dirty saving onSave={onSave} onDiscard={() => {}} hint="模型偏好已修改" />);
    expect(screen.getByText('模型偏好已修改')).toBeTruthy();
    const save = screen.getByText('common.saving');
    expect((save as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText('settings.discardChanges') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(save);
    expect(onSave).not.toHaveBeenCalled();
  });
});
