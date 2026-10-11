/**
 * DocumentTableView 行为级测试（CAP-A-29 / GAP-T-66）
 * 覆盖：行渲染 / 行点击预览 / 右键菜单删除回调。
 * useNavigate 需 MemoryRouter 包裹。
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DocumentTableView } from './document-table-view';
import type { DocumentListItem } from '../api/document-api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | { defaultValue?: string }) => {
      if (typeof defaultValue === 'string') return defaultValue;
      return defaultValue?.defaultValue ?? key;
    },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const buildDocument = (overrides: Partial<DocumentListItem>): DocumentListItem =>
  ({
    id: overrides.title === 'Alpha' ? 'd1' : 'd2',
    title: overrides.title ?? 'doc',
    category: 'design',
    status: 'published',
    updatedAt: '2026-01-02T00:00:00Z',
    ...overrides,
  }) as DocumentListItem;

const documents: DocumentListItem[] = [
  buildDocument({ title: 'Alpha', project: { id: 'p1', name: '项目一' } as DocumentListItem['project'] }),
  buildDocument({ title: 'Beta' }),
];

const renderView = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('DocumentTableView（CAP-A-29 表格视图）', () => {
  it('renders document rows with project column', () => {
    renderView(<DocumentTableView documents={documents} onPreview={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();
    expect(screen.getByText('项目一')).toBeTruthy();
    // 公共文档回落文案（无 project）
    expect(screen.getAllByText('document.publicDoc').length).toBeGreaterThan(0);
  });

  it('row click triggers the preview callback', () => {
    const onPreview = vi.fn();
    renderView(<DocumentTableView documents={documents} onPreview={onPreview} onDelete={vi.fn()} />);

    fireEvent.click(screen.getByText('Alpha'));
    expect(onPreview).toHaveBeenCalledTimes(1);
    expect(onPreview.mock.calls[0][0].title).toBe('Alpha');
  });

  it('row context menu delete reports to onDelete', async () => {
    const onDelete = vi.fn();
    renderView(<DocumentTableView documents={documents} onPreview={vi.fn()} onDelete={onDelete} />);

    fireEvent.contextMenu(screen.getByText('Alpha').closest('tr') as HTMLElement);
    fireEvent.click(await screen.findByText('document.actions.delete'));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete.mock.calls[0][0].title).toBe('Alpha');
  });
});
