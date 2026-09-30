/**
 * 实体针对性辅助组件与穿梭按钮单元测试（CAP-A-18 V2）
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProjectSourceTabs } from '../entity-templates/project-source-tabs';
import { ModeShuttleButton } from '../mode-shuttle-button';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue || key,
  }),
}));

describe('实体针对性辅助与模式穿梭组件（CAP-A-18 V2）', () => {
  describe('ProjectSourceTabs', () => {
    it('渲染立项来源三分流 Tab，支持切换', () => {
      const onChange = vi.fn();
      render(<ProjectSourceTabs value="scratch" onChange={onChange} />);
      expect(screen.getByText('从零全新立项')).toBeInTheDocument();
      expect(screen.getByText('接入已有代码库')).toBeInTheDocument();
      expect(screen.getByText('✨ AI 访谈立项 (Grill)')).toBeInTheDocument();

      fireEvent.click(screen.getByText('接入已有代码库'));
      expect(onChange).toHaveBeenCalledWith('existing');
    });

    it('sources 子集过滤：只渲染传入项且保持传入顺序（existing 无专属 UI 场景）', () => {
      const onChange = vi.fn();
      render(<ProjectSourceTabs value="scratch" onChange={onChange} sources={['ai', 'scratch']} />);
      expect(screen.getByText('✨ AI 访谈立项 (Grill)')).toBeInTheDocument();
      expect(screen.getByText('从零全新立项')).toBeInTheDocument();
      expect(screen.queryByText('接入已有代码库')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('✨ AI 访谈立项 (Grill)'));
      expect(onChange).toHaveBeenCalledWith('ai');
    });
  });

  describe('ModeShuttleButton', () => {
    it('手动模式显示「切换到智能体」，点击触发 onToggle', () => {
      const onToggle = vi.fn();
      render(<ModeShuttleButton mode="manual" onToggle={onToggle} />);
      const btn = screen.getByText('切换到智能体');
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(onToggle).toHaveBeenCalled();
    });

    it('AI 模式显示「返回手动编辑」', () => {
      render(<ModeShuttleButton mode="ai" onToggle={vi.fn()} />);
      expect(screen.getByText('返回手动编辑')).toBeInTheDocument();
    });
  });
});
