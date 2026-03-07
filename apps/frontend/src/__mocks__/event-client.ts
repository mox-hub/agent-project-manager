import { vi } from 'vitest';
import { MockSocket } from './socket-io';

/**
 * Mock EventClient
 * 模拟 event-client/index.ts 中的 EventClient 类
 */
const mockSocket = new MockSocket();

export const eventClient = {
  connect: vi.fn((url?: string) => {
    if (url) {
      mockSocket.connect();
    }
    return mockSocket;
  }),

  disconnect: vi.fn(() => {
    mockSocket.disconnect();
  }),

  on: vi.fn(<T = unknown>(event: string, handler: (payload: T) => void) => {
    mockSocket.on(event, handler);
    return eventClient;
  }),

  off: vi.fn(<T = unknown>(event: string, handler?: (payload: T) => void) => {
    if (handler) {
      mockSocket.off(event, handler);
    } else {
      mockSocket.off(event);
    }
    return eventClient;
  }),

  emit: vi.fn((event: string, ...args: unknown[]) => {
    return mockSocket.emit(event, ...args);
  }),

  isConnected: vi.fn(() => mockSocket.connected),

  // 暴露 mockSocket 供测试使用
  _mockSocket: mockSocket,
};

/**
 * 重置 eventClient mock
 * 在每个测试后调用以清除所有调用记录和事件监听器
 */
export const resetEventClientMock = () => {
  vi.clearAllMocks();
  eventClient.connect.mockClear();
  eventClient.disconnect.mockClear();
  eventClient.on.mockClear();
  eventClient.off.mockClear();
  eventClient.emit.mockClear();
  eventClient.isConnected.mockClear();
  mockSocket.reset();
};

/**
 * 模拟 socket 连接成功
 */
export const mockSocketConnected = () => {
  mockSocket.connect();
  eventClient.isConnected.mockReturnValue(true);
};

/**
 * 模拟 socket 断开连接
 */
export const mockSocketDisconnected = () => {
  mockSocket.disconnect();
  eventClient.isConnected.mockReturnValue(false);
};

/**
 * 触发一个事件
 */
export const triggerEvent = (event: string, payload?: unknown) => {
  mockSocket.emit(event, payload);
};
