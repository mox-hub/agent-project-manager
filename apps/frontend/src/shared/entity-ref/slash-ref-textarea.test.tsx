/**
 * SlashRefTextarea 单测（CAP-A-23 全局 Markdown 实体引用系统 · 插入侧）
 *
 * 覆盖 GAP-T-43 ②③：/ 词元触发与 URL 斜杠不误触发、类型筛选、
 * 键入过滤、键盘导航插入 apm:// markdown、成员 @handle 插入、
 * Esc 关菜单不外冒、菜单关闭时按键语义透传、无命中空态。
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  SlashRefTextarea,
  buildSlashInsertText,
} from './slash-ref-textarea';
import {
  searchApi,
  type SearchHit,
} from '@/modules/search/api/search-api';
import { suggestMentions } from '@/modules/team-member/api/team-member-api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/modules/search/api/search-api', () => ({
  searchApi: { search: vi.fn(async () => ({ items: [], total: 0 })) },
}));

vi.mock('@/modules/team-member/api/team-member-api', () => ({
  suggestMentions: vi.fn(async () => []),
}));

vi.mock('@/modules/team-member/components/member-avatar', () => ({
  MemberAvatar: () => <span data-testid="member-avatar" />,
}));

const hit = (over: Partial<SearchHit> = {}): SearchHit => ({
  id: 'i1',
  type: 'task',
  title: '修复登录超时',
  subtitle: 'APM-EXP · APM-PF-001',
  path: '/app/issues/i1',
  updatedAt: '2026-09-01T00:00:00.000Z',
  projectId: 'p1',
  apmRef: 'apm://APM-EXP/issue/APM-PF-001',
  ...over,
});

const renderTextarea = (
  initialValue = '',
  props: Partial<Parameters<typeof SlashRefTextarea>[0]> = {},
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onChange = vi.fn();
  const onKeyDown = vi.fn();
  // 有状态 harness：与真实父组件一致（onChange 回写 value 再流回 props），
  // 纯 spy 父组件会让 applySelection 读到过期 value
  function Harness() {
    const [value, setValue] = useState(initialValue);
    return (
      <QueryClientProvider client={queryClient}>
        <SlashRefTextarea
          value={value}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
          onKeyDown={onKeyDown}
          {...props}
        />
      </QueryClientProvider>
    );
  }
  const utils = render(<Harness />);
  const textarea = utils.container.querySelector(
    'textarea',
  ) as HTMLTextAreaElement;
  return { ...utils, onChange, onKeyDown, textarea };
};

/** fire change 并把光标置到末尾（真实键入的光标位置） */
const type = (textarea: HTMLTextAreaElement, text: string) => {
  fireEvent.change(textarea, { target: { value: text } });
  textarea.setSelectionRange(text.length, text.length);
};

const searchMock = vi.mocked(searchApi.search);
const mentionsMock = vi.mocked(suggestMentions);

describe('buildSlashInsertText', () => {
  it('命中以 [标题](apmRef) 插入，标题方括号剥除', () => {
    expect(
      buildSlashInsertText({
        kind: 'hit',
        hit: hit({ title: '修[复]登录' }),
      }),
    ).toBe('[修复登录](apm://APM-EXP/issue/APM-PF-001) ');
  });

  it('成员以 @handle 语法糖插入', () => {
    expect(
      buildSlashInsertText({
        kind: 'member',
        id: 'm1',
        handle: 'alice',
        displayName: 'Alice',
        avatarUrl: null,
        memberType: 'human',
      }),
    ).toBe('@alice ');
  });
});

describe('SlashRefTextarea', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchMock.mockResolvedValue({ items: [], total: 0 });
    mentionsMock.mockResolvedValue([]);
  });

  it('键入 /query 触发 searchApi 模糊匹配并弹候选', async () => {
    searchMock.mockResolvedValue({ items: [hit()], total: 1 });
    const { textarea } = renderTextarea();

    type(textarea, '/log');

    await screen.findByText('修复登录超时');
    expect(searchMock).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'log', types: undefined, limit: 8 }),
      expect.anything(),
    );
  });

  it('URL 中的斜杠不触发引用弹层', () => {
    const { container } = renderTextarea();

    type(container.querySelector('textarea')!, 'see https://example.com/a');

    expect(searchMock).not.toHaveBeenCalled();
    expect(container.querySelector('[class*="top-full"]')).toBeNull();
  });

  it('类型筛选：点「任务」后以 types=[task] 重查', async () => {
    searchMock.mockResolvedValue({ items: [hit()], total: 1 });
    const { textarea } = renderTextarea();

    type(textarea, '/log');
    await screen.findByText('修复登录超时');

    fireEvent.click(screen.getByText('entityRef.slash.filterTask'));
    await waitFor(() => {
      expect(searchMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ types: ['task'] }),
        expect.anything(),
      );
    });
  });

  it('Enter 以 apm:// markdown 链接替换词元并恢复光标', async () => {
    searchMock.mockResolvedValue({ items: [hit()], total: 1 });
    const { textarea, onChange } = renderTextarea();

    type(textarea, '前文 /log');
    await screen.findByText('修复登录超时');

    fireEvent.keyDown(textarea, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(
      '前文 [修复登录超时](apm://APM-EXP/issue/APM-PF-001) ',
    );
  });

  it('成员候选 Enter 插入 @handle', async () => {
    mentionsMock.mockResolvedValue([
      {
        id: 'm1',
        handle: 'alice',
        displayName: 'Alice',
        avatarUrl: null,
        type: 'human',
      },
    ]);
    const { textarea, onChange } = renderTextarea();

    type(textarea, '/ali');
    await screen.findByText('Alice');

    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('@alice ');
  });

  it('Esc 只关菜单不透传（不误关所在对话框）', async () => {
    searchMock.mockResolvedValue({ items: [hit()], total: 1 });
    const { container, textarea, onKeyDown } = renderTextarea();

    type(textarea, '/log');
    await screen.findByText('修复登录超时');

    fireEvent.keyDown(textarea, { key: 'Escape' });

    expect(container.querySelector('[class*="top-full"]')).toBeNull();
    expect(onKeyDown).not.toHaveBeenCalled();
  });

  it('菜单关闭时按键语义透传（评论 mod+Enter 提交不受影响）', () => {
    const { textarea, onKeyDown } = renderTextarea('普通文本');

    fireEvent.keyDown(textarea, {
      key: 'Enter',
      ctrlKey: true,
      metaKey: true,
    });

    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it('无命中显示空态；空态下 Enter 透传不劫持', async () => {
    const { textarea, onKeyDown } = renderTextarea();

    type(textarea, '/zzz-none');
    await screen.findByText('entityRef.slash.empty');

    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it('裸 / 显示键入提示行而非候选，不发搜索请求', async () => {
    const { textarea } = renderTextarea();

    type(textarea, '/');
    await screen.findByText('entityRef.slash.hint');

    expect(searchMock).not.toHaveBeenCalled();
  });

  it('无 apmRef 的命中不进候选（引用系统只产稳定引用）', async () => {
    searchMock.mockResolvedValue({
      items: [hit({ apmRef: null, title: '未绑定项目的工单' })],
      total: 1,
    });
    const { textarea } = renderTextarea();

    type(textarea, '/log');
    await screen.findByText('entityRef.slash.empty');
    expect(screen.queryByText('未绑定项目的工单')).toBeNull();
  });
});
