/**
 * 实体针对性辅助组件与穿梭按钮单元测试（CAP-A-18 V2）
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BugTemplateHelper, BUG_MARKDOWN_TEMPLATE } from '../entity-templates/bug-template-helper';
import { DocCategoryChips } from '../entity-templates/doc-category-chips';
import { ProjectSourceTabs } from '../entity-templates/project-source-tabs';
import { ModeShuttleButton } from '../mode-shuttle-button';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue || key,
  }),
}));

describe('实体针对性辅助与模式穿梭组件（CAP-A-18 V2）', () => {
  describe('BugTemplateHelper', () => {
    it('无内容时渲染快捷填入模板按钮，点击触发注入', () => {
      const onInject = vi.fn();
      render(<BugTemplateHelper hasContent={false} onInject={onInject} />);
      const btn = screen.getByText('填入标准缺陷排查模板');
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(onInject).toHaveBeenCalledWith(BUG_MARKDOWN_TEMPLATE);
    });

    it('已有描述时不渲染注入按钮', () => {
      const { container } = render(<BugTemplateHelper hasContent={true} onInject={vi.fn()} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('DocCategoryChips', () => {
    it('渲染 6 大类目 Chips，点击切换类目并传递模板骨架', () => {
      const onChange = vi.fn();
      const onApplyTemplate = vi.fn();
      render(
        <DocCategoryChips
          value="requirement"
          onChange={onChange}
          onApplyTemplate={onApplyTemplate}
        />,
      );
      expect(screen.getByText('需求 PRD')).toBeInTheDocument();
      expect(screen.getByText('架构设计')).toBeInTheDocument();
      expect(screen.getByText('接口契约')).toBeInTheDocument();
      expect(screen.getByText('测试方案')).toBeInTheDocument();
      expect(screen.getByText('操作指南')).toBeInTheDocument();
      expect(screen.getByText('分析报告')).toBeInTheDocument();

      fireEvent.click(screen.getByText('架构设计'));
      expect(onChange).toHaveBeenCalledWith('design');
      expect(onApplyTemplate).toHaveBeenCalledWith(expect.stringContaining('## 一、系统架构设计'));
    });
  });

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
