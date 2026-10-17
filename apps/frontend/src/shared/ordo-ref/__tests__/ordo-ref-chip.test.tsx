import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OrdoRefLink, ordoRefAnchorInterceptor } from '../ordo-ref-chip';

/**
 * ordo:// chip 渲染层测试（v2 纪要 §13）：
 * chip 形态、点击展开路由、非法引用降级、锚点拦截分流。
 */

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

const navigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

describe('OrdoRefLink', () => {
  it('ordo:// 引用渲染为 chip 并携带 data-ordo-ref', () => {
    renderWithRouter(
      <OrdoRefLink href="ordo://ordo/doc/D17">验收门禁设计</OrdoRefLink>,
    );
    const chip = screen.getByText('验收门禁设计').closest('a')!;
    expect(chip.getAttribute('data-ordo-ref')).toBe('ordo://ordo/doc/D17');
    expect(chip.getAttribute('title')).toContain('文档');
  });

  it('无子内容时回退展示 projectCode/shortId', () => {
    renderWithRouter(<OrdoRefLink href="ordo://ordo/doc/D17" />);
    expect(screen.getByText('ordo/D17')).toBeTruthy();
  });

  it('点击展开为应用路由（文档短号透传）', () => {
    navigate.mockClear();
    renderWithRouter(<OrdoRefLink href="ordo://ordo/doc/D17">链接</OrdoRefLink>);
    fireEvent.click(screen.getByText('链接'));
    expect(navigate).toHaveBeenCalledWith('/app/documents/D17');
  });

  it('非法引用降级为普通链接且不导航', () => {
    navigate.mockClear();
    renderWithRouter(<OrdoRefLink href="https://example.com">外链</OrdoRefLink>);
    const anchor = screen.getByText('外链') as HTMLAnchorElement;
    expect(anchor.getAttribute('data-ordo-ref')).toBeNull();
    fireEvent.click(anchor);
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('ordoRefAnchorInterceptor', () => {
  it('ordo:// 分流到 chip；普通 href 走原生锚点', () => {
    const { container } = renderWithRouter(
      <>
        {ordoRefAnchorInterceptor({ href: 'ordo://ordo/doc/D1', children: '引用' })}
        {ordoRefAnchorInterceptor({ href: '/relative', children: '相对' })}
      </>,
    );
    expect(container.querySelector('[data-ordo-ref]')).toBeTruthy();
    const plain = container.querySelectorAll('a')[1] as HTMLAnchorElement;
    expect(plain.getAttribute('data-ordo-ref')).toBeNull();
    expect(plain.getAttribute('href')).toBe('/relative');
  });
});
