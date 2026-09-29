import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FolderGit2 } from 'lucide-react';
import { SectionCard } from './section-card';

/**
 * D14 测试基线（宪法 §18）。section-card 引用数 21，P2「装配原语」。
 *
 * SectionCard 的可测面集中在**条件装配分支**（§18.1 第三条）：
 * `title || description || actions` 才渲染 CardHeader——这是容易回归的地方
 * （删了 title 却把 header 空壳留下、或 actions 被吞掉）。
 */
describe('SectionCard 条件装配', () => {
  it('有标题时同时渲染标题、图标与内容', () => {
    render(
      <SectionCard title="仓库设置" icon={FolderGit2}>
        <p>正文内容</p>
      </SectionCard>,
    );

    expect(screen.getByText('仓库设置')).toBeInTheDocument();
    expect(screen.getByText('正文内容')).toBeInTheDocument();
  });

  it('只有 actions 也能撑起 header（不因缺 title 丢操作）', () => {
    render(
      <SectionCard actions={<button type="button">编辑</button>}>
        <p>正文内容</p>
      </SectionCard>,
    );

    expect(screen.getByRole('button', { name: '编辑' })).toBeInTheDocument();
    expect(screen.getByText('正文内容')).toBeInTheDocument();
  });

  it('只有 description 也能撑起 header', () => {
    render(
      <SectionCard description="仅补充说明">
        <p>正文内容</p>
      </SectionCard>,
    );

    expect(screen.getByText('仅补充说明')).toBeInTheDocument();
  });

  it('三个头插槽全空时不渲染空 header 区（§18.1 条件分支）', () => {
    const { container } = render(
      <SectionCard>
        <p>正文内容</p>
      </SectionCard>,
    );

    expect(screen.getByText('正文内容')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="card-header"]')).toBeNull();
  });

  it('actions 与 description 并存时两者都在（互不吞没）', () => {
    render(
      <SectionCard title="成员" description="共 12 人" actions={<button type="button">邀请</button>}>
        <p>列表</p>
      </SectionCard>,
    );

    expect(screen.getByText('成员')).toBeInTheDocument();
    expect(screen.getByText('共 12 人')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '邀请' })).toBeInTheDocument();
  });

  it('actions 回调可触发（受控回调下限，§18.2 交互）', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <SectionCard actions={<button type="button" onClick={onClick}>保存</button>}>
        <p>表单</p>
      </SectionCard>,
    );

    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('children 是必需插槽，始终渲染（无标题也不例外）', () => {
    render(
      <SectionCard contentClassName="pt-2">
        <span data-testid="slot-child">子树</span>
      </SectionCard>,
    );

    expect(screen.getByTestId('slot-child')).toBeInTheDocument();
  });
});
