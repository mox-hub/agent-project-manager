import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientWrapper } from '@/test-utils/providers';
import { useExpertise } from './use-expertise';
import { expertiseApi } from '../api/expertise-api';

vi.mock('../api/expertise-api', () => ({
  expertiseApi: {
    get: vi.fn(),
    feedback: vi.fn(),
  },
}));

const mockApi = vi.mocked(expertiseApi);

describe('useExpertise（档位 hook）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.get.mockResolvedValue({
      domains: [
        { domain: 'requirements', level: 'detailed', ignoreCount: 0 },
        { domain: 'technical', level: 'detailed', ignoreCount: 0 },
        { domain: 'acceptance', level: 'terse', ignoreCount: 3 },
        { domain: 'process', level: 'suppressed', ignoreCount: 0 },
      ],
    });
  });

  it('level() 返回对应领域档位；未知领域默认 detailed', async () => {
    const { result } = renderHook(() => useExpertise(), {
      wrapper: QueryClientWrapper,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.level('acceptance')).toBe('terse');
    expect(result.current.level('process')).toBe('suppressed');
    expect(result.current.level('unknown-domain')).toBe('detailed');
    expect(result.current.level(undefined)).toBe('detailed');
  });

  it('feedback 上报后失效缓存并拉新档位（suppress 立即生效）', async () => {
    mockApi.feedback.mockResolvedValue({
      domain: 'acceptance',
      level: 'suppressed',
      ignoreCount: 0,
    });
    // 第二次 get 返回抑制后的状态
    mockApi.get
      .mockResolvedValueOnce({
        domains: [{ domain: 'acceptance', level: 'detailed', ignoreCount: 0 }],
      })
      .mockResolvedValueOnce({
        domains: [{ domain: 'acceptance', level: 'suppressed', ignoreCount: 0 }],
      });

    const { result } = renderHook(() => useExpertise(), {
      wrapper: QueryClientWrapper,
    });
    await waitFor(() => expect(result.current.level('acceptance')).toBe('detailed'));

    await result.current.feedback('acceptance', 'suppress');

    await waitFor(() => {
      expect(result.current.level('acceptance')).toBe('suppressed');
    });
    expect(mockApi.feedback).toHaveBeenCalledWith('acceptance', 'suppress', undefined);
  });
});
