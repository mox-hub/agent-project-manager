import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { setupServer } from 'msw/node';
import { allHandlers } from '@/test-utils/mock-handlers';
import { useAppStore } from '@/infrastructure/store/app-store';
import { resetEventClientMock } from '@/__mocks__/event-client';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

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
global.localStorage = localStorageMock as any;

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    pathname: '/',
  },
  writable: true,
});
