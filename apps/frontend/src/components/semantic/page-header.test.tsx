import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FolderGit2 } from 'lucide-react';
import { PageHeader } from './page-header';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import { renderWithProviders } from '@/test-utils/providers';
import { useAppStore } from '@/infrastructure/store/app-store';

// 收藏是 zustand persist 状态，setup.ts 只重置通用字段，这里显式清空收藏集合，
// 否则用例之间会串状态（收藏按钮读的就是这份数据）
beforeEach(() => {
  useAppStore.setState({ favoritePages: [] });
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

/**
 * D14 测试基线（宪法 §18）。page-header 引用数 23，P2「装配原语」。
 *
 * 页面头是全站最稳定的地标之一，硬契约有三条：
 * ① 标题必须是**唯一 h1**（§8.5 #7 语义标签，页面只有一个一级标题）；
 * ② actions/metrics 两个插槽不被吞（装配回归高发区）；
 * ③ 收藏/订阅按钮由业务调用方经 favorites/subscribe 槽位注入（ui→shared 分层倒置
 *    收编：PageHeader 不再内置构造），槽位节点装配在标题行原内置位置。
 */
const renderHeader = (props?: Partial<Parameters<typeof PageHeader>[0]>) =>
  renderWithProviders(<PageHeader title="项目详情" {...props} />);

describe('PageHeader 地标与标题语义', () => {
  it('标题渲染为页面唯一的 h1', () => {
    renderHeader();

    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('项目详情');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('外层是 header 地标（§8.5 #7 语义标签）', () => {
    const { container } = renderHeader();

    expect(container.querySelector('header')).not.toBeNull();
  });

  it('标题支持 ReactNode（不强制纯文本）', () => {
    renderWithProviders(<PageHeader title={<em data-testid="rich-title">富标题</em>} />);

    expect(screen.getByTestId('rich-title')).toBeInTheDocument();
  });

  it('默认标注 data-ai-component=ui.page-header（§12 协议）', () => {
    const { container } = renderHeader();

    expect(container.querySelector('header')?.getAttribute('data-ai-component')).toBe(
      'ui.page-header',
    );
  });

  it('传 aiId 时派生 <aiId>.header（§12 页面级唯一性）', () => {
    const { container } = renderHeader({ aiId: 'project.detail' });

    expect(container.querySelector('header')?.getAttribute('data-ai-component')).toBe(
      'project.detail.header',
    );
  });
});

describe('PageHeader 插槽装配', () => {
  it('actions 插槽渲染操作按钮', () => {
    renderHeader({ actions: <button type="button">新建工单</button> });

    expect(screen.getByRole('button', { name: '新建工单' })).toBeInTheDocument();
  });

  it('不传 actions 时不产生空操作区', () => {
    const { container } = renderHeader();

    // 收藏/订阅构造已移交业务调用方（favorites/subscribe 槽位），不传槽位则标题行无按钮
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });

  it.each(['default', 'success', 'warning', 'danger'] as const)(
    'metrics tone=%s 同时渲染标签与数值（状态不靠颜色单独传达，§8.5 #4）',
    (tone) => {
      renderHeader({ metrics: [{ label: '任务', value: 12, tone }] });

      expect(screen.getByText('任务')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    },
  );

  it('多个 metrics 全部渲染（不互相覆盖）', () => {
    renderHeader({
      metrics: [
        { id: 'tasks', label: '任务', value: 12 },
        { id: 'bugs', label: '缺陷', value: 3, tone: 'danger' },
      ],
    });

    expect(screen.getByText('任务')).toBeInTheDocument();
    expect(screen.getByText('缺陷')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('metrics 为空数组时不产生计数器容器', () => {
    renderHeader({ metrics: [] });

    expect(screen.queryByText('任务')).toBeNull();
  });

  it('icon 传入时渲染在标题行（装饰性图形不改变可访问名）', () => {
    renderHeader({ icon: FolderGit2 });

    expect(screen.getByRole('heading', { level: 1 })).toHaveAccessibleName('项目详情');
    expect(document.querySelectorAll('svg').length).toBeGreaterThan(0);
  });
});

describe('PageHeader 收藏槽位（§18.2 受控回调）', () => {
  it('favorites 槽位渲染调用方构造的收藏按钮，靠 aria-label 获得可访问名（§8.5 #1）', () => {
    renderHeader({
      favorites: <FavoriteToggle favoriteId="/app/projects/p1" label="项目详情" />,
    });

    const star = screen.getByRole('button', { pressed: false });
    expect(star.getAttribute('aria-label')).toBeTruthy();
  });

  it('收藏按钮带 aria-pressed，点击后状态翻转', async () => {
    const user = userEvent.setup();
    renderHeader({
      favorites: <FavoriteToggle favoriteId="/app/projects/p1" label="项目详情" />,
    });

    const star = screen.getByRole('button', { pressed: false });
    expect(star).toHaveAttribute('aria-pressed', 'false');

    await user.click(star);

    // aria-pressed 是屏幕阅读器唯一能读到的「已收藏」信号（§8.5 #4 不靠颜色）
    expect(screen.getByRole('button', { pressed: true })).toHaveAttribute('aria-pressed', 'true');
  });

  it('收藏状态按 favoriteId 隔离：不同页面互不影响', async () => {
    const user = userEvent.setup();
    const { unmount } = renderHeader({
      favorites: <FavoriteToggle favoriteId="/app/projects/p1" label="项目详情" />,
    });

    const star = screen.getByRole('button', { pressed: false });
    await user.click(star);
    unmount();

    renderHeader({
      favorites: <FavoriteToggle favoriteId="/app/projects/p2" label="项目详情" />,
    });
    expect(screen.getByRole('button', { pressed: false })).toBeInTheDocument();
  });
});
