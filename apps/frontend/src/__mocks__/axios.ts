import { vi } from 'vitest';

/**
 * Axios 模拟工厂
 * 用于单元测试中模拟 axios 实例
 */
export const mockAxiosInstance = () => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  request: vi.fn(),
  interceptors: {
    request: {
      use: vi.fn(),
      eject: vi.fn(),
      clear: vi.fn(),
    },
    response: {
      use: vi.fn(),
      eject: vi.fn(),
      clear: vi.fn(),
    },
  },
});

/**
 * 重置 axios 模拟
 * 在每个测试后调用以清除所有调用记录
 */
export const resetAxiosMock = (mock: ReturnType<typeof mockAxiosInstance>) => {
  vi.clearAllMocks();
  mock.get.mockClear();
  mock.post.mockClear();
  mock.put.mockClear();
  mock.patch.mockClear();
  mock.delete.mockClear();
  mock.request.mockClear();
  mock.interceptors.request.use.mockClear();
  mock.interceptors.response.use.mockClear();
};
