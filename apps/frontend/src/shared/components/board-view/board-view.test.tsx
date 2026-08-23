import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  BoardView,
  type BoardCardModel,
  type BoardColumnDef,
} from './board-view';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | { defaultValue?: string }) => {
      if (typeof defaultValue === 'string') return defaultValue;
      return defaultValue?.defaultValue ?? key;
    },
  }),
}));

interface TestItem {
  id: string;
  title: string;
  status: string;
}

const columns: BoardColumnDef[] = [
  { id: 'todo', title: 'To Do', color: 'muted' },
  { id: 'done', title: 'Done', color: 'green', wipLimit: 2 },
];

const items: TestItem[] = [
  { id: 't1', title: 'First task', status: 'todo' },
  { id: 't2', title: 'Second task', status: 'done' },
  { id: 't3', title: 'Orphan task', status: 'unknown-status' },
];

const card: BoardCardModel<TestItem> = {
  title: (item) => item.title,
  row1: (item) => <span data-testid={`row1-${item.id}`}>{item.id}</span>,
};

function renderBoard(props: Partial<Parameters<typeof BoardView<TestItem>>[0]> = {}) {
  const onItemAdd = vi.fn();
  const onItemClick = vi.fn();
  const utils = render(
    <BoardView<TestItem>
      columns={columns}
      items={items}
      groupBy={(item) => item.status}
      card={card}
      onItemAdd={onItemAdd}
      onItemClick={onItemClick}
      {...props}
    />,
  );
  return { ...utils, onItemAdd, onItemClick };
}

describe('BoardView', () => {
  it('renders columns with counts and groups items via groupBy', () => {
    renderBoard();

    expect(screen.getByText('To Do')).toBeTruthy();
    expect(screen.getByText('Done')).toBeTruthy();
    // 计数：todo 1 项 / done 1 项（unknown-status 未命中列不展示）
    expect(screen.getAllByText('1').length).toBe(2);
    expect(screen.queryByText('Orphan task')).toBeNull();
    // 卡片渲染在默认三行卡片内
    expect(screen.getByText('First task')).toBeTruthy();
    expect(screen.getByText('Second task')).toBeTruthy();
  });

  it('fires onItemAdd when clicking the column add button', () => {
    const { onItemAdd } = renderBoard();

    const addButtons = screen.getAllByRole('button', { name: 'Add card' });
    fireEvent.click(addButtons[0]);
    expect(onItemAdd).toHaveBeenCalledWith('todo');
    fireEvent.click(addButtons[1]);
    expect(onItemAdd).toHaveBeenCalledWith('done');
  });

  it('fires onItemClick when clicking a default card', () => {
    const { onItemClick } = renderBoard();

    fireEvent.click(screen.getByText('First task'));
    expect(onItemClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't1' }),
      'todo',
    );
  });

  it('renders fully custom cards via renderCard', () => {
    renderBoard({
      renderCard: (item) => <div data-testid={`custom-${item.id}`}>custom {item.title}</div>,
    });

    expect(screen.getByTestId('custom-t1')).toBeTruthy();
    expect(screen.getByTestId('custom-t2')).toBeTruthy();
  });

  it('shows empty column state for columns without items', () => {
    render(
      <BoardView<TestItem>
        columns={columns}
        items={[items[0]]}
        groupBy={(item) => item.status}
        card={card}
      />,
    );

    // done 列为空 → 默认空列文案（i18n defaultValue）
    expect(screen.getByText('拖拽卡片到此列')).toBeTruthy();
  });

  it('renders custom empty column content when provided', () => {
    render(
      <BoardView<TestItem>
        columns={columns}
        items={[items[0]]}
        groupBy={(item) => item.status}
        card={card}
        emptyColumnState={<span>nothing here</span>}
      />,
    );

    expect(screen.getByText('nothing here')).toBeTruthy();
  });

  it('renders loading skeletons when loading with empty columns', () => {
    render(
      <BoardView<TestItem>
        columns={columns}
        items={[]}
        groupBy={(item) => item.status}
        card={card}
        loading
      />,
    );

    expect(screen.getByText('To Do')).toBeTruthy();
    expect(screen.queryByText('拖拽卡片到此列')).toBeNull();
  });
});
