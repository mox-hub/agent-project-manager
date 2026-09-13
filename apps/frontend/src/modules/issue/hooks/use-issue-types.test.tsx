import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useIssueTypeOf } from './use-issue-types';
import type { IssueTypeMeta } from '../api/issue-type-api';

vi.mock('../api/issue-type-api', () => ({
  issueTypeApi: {
    list: vi.fn().mockResolvedValue([
      { id: 't-task', key: 'task', name: '任务', icon: 'Circle', color: '#5E6AD2', order: 10, isSystem: true, enabled: true, fieldSchema: null },
      { id: 't-bug', key: 'bug', name: '缺陷', icon: 'Bug', color: '#EF4444', order: 20, isSystem: true, enabled: true, fieldSchema: null },
    ]),
  },
}));

const builtinTypes: IssueTypeMeta[] = [
  { id: 't-task', key: 'task', name: '任务', icon: 'Circle', color: '#5E6AD2', order: 10, isSystem: true, enabled: true },
  { id: 't-bug', key: 'bug', name: '缺陷', icon: 'Bug', color: '#EF4444', order: 20, isSystem: true, enabled: true },
];

describe('useIssueTypeOf（类型图标解析，GAP-T-25）', () => {
  it('typeId 事实源优先；遗留行按旧 type 字符串桥接；缺省 task；未知回落 undefined', async () => {
    const qc = new QueryClient();
    const { result } = renderHook(() => useIssueTypeOf(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current({ typeId: 't-bug' })?.key).toBe('bug');
    });

    // 遗留行：typeId 空，按旧 type 字符串解析
    expect(result.current({ type: 'bug' })?.id).toBe('t-bug');
    expect(result.current({ type: 'task' })?.id).toBe('t-task');
    expect(result.current({})?.id).toBe('t-task');
    expect(result.current({ type: 'unknown-type' })).toBeUndefined();
    expect(builtinTypes.length).toBe(2);
  });
});
