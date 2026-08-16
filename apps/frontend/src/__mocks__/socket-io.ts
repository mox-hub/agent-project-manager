import { EventEmitter } from 'events';

/**
 * Mock Socket 类
 * 模拟 Socket.IO Socket 的行为
 */
export class MockSocket extends EventEmitter {
  connected = false;
  connecting = false;

  /**
   * 连接 socket
   */
  connect(): this {
    if (this.connected || this.connecting) return this;

    this.connecting = true;
    // 模拟异步连接
    setTimeout(() => {
      this.connected = true;
      this.connecting = false;
      this.emit('connect');
    }, 0);

    return this;
  }

  /**
   * 断开 socket 连接
   */
  disconnect(): this {
    this.connected = false;
    this.connecting = false;
    this.emit('disconnect');
    return this;
  }

  /**
   * 订阅事件
   */
  on(event: string, handler: (...args: unknown[]) => void): this {
    super.on(event, handler);
    return this;
  }

  /**
   * 取消订阅事件
   */
  off(event: string, handler?: (...args: unknown[]) => void): this {
    if (handler) {
      super.off(event, handler);
    } else {
      this.removeAllListeners(event);
    }
    return this;
  }

  /**
   * 发送事件
   */
  emit(event: string, ...args: unknown[]): boolean {
    super.emit(event, ...args);
    return this.connected;
  }

  /**
   * 发送消息到服务器
   */
  emitWithAck(event: string, ...args: unknown[]): Promise<unknown> {
    return new Promise((resolve) => {
      super.emit(event, ...args, resolve);
    });
  }

  /**
   * 一次性事件监听器
   */
  once(event: string, handler: (...args: unknown[]) => void): this {
    super.once(event, handler);
    return this;
  }

  /**
   * 重置 mock 状态
   */
  reset(): void {
    this.connected = false;
    this.connecting = false;
    this.removeAllListeners();
  }
}

/**
 * 创建新的 MockSocket 实例
 */
export const createMockSocket = () => new MockSocket();
