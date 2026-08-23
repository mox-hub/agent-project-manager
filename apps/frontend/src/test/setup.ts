import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { setupServer } from 'msw/node';
import { allHandlers } from '@/test-utils/mock-handlers';
import { useAppStore } from '@/infrastructure/store/app-store';
import { resetEventClientMock } from '@/__mocks__/event-client';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// jsdom 无真实布局：为 recharts 的 ResponsiveContainer 提供可测量的容器尺寸，
// 消除 "The width(0) and height(0) of chart" 警告。
Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
  configurable: true,
  value() {
    return {
      width: 800,
      height: 400,
      top: 0,
      left: 0,
      right: 800,
      bottom: 400,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;
  },
});

// jsdom 无 ResizeObserver：提供空 stub（仅保证组件不崩溃，
// 不立即回调以免在 act 外触发 floating-ui/recharts 的异步状态更新）
class ResizeObserverStub implements ResizeObserver {
  private callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

// Setup MSW server
const server = setupServer(...allHandlers);

beforeAll(() => {
  // Start MSW server before all tests
  server.listen({
    onUnhandledRequest: 'error', // 报告未处理的请求
  });
});

afterEach(() => {
  // Cleanup React Testing Library
  cleanup();

  // Reset MSW handlers after each test
  server.resetHandlers();

  // Reset all mocks
  vi.clearAllMocks();

  // Reset eventClient mock
  resetEventClientMock();

  // Reset Zustand store
  useAppStore.setState({
    currentUser: null,
    currentProjectId: null,
    currentTaskId: null,
    sidebarCollapsed: false,
    viewMode: 'kanban',
    aiPanelOpen: false,
  });
});

afterAll(() => {
  // Close MSW server after all tests
  server.close();
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as unknown as Storage;

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    pathname: '/',
  },
  writable: true,
});