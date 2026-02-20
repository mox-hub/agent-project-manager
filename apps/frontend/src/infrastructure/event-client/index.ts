import { io, Socket } from 'socket.io-client';

type EventHandler<T = unknown> = (payload: T) => void;

class EventClient {
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private socket: Socket | null = null;
  private reconnectTimer: number | null = null;
  private readonly reconnectDelay = 3000;
  private isConnecting = false;

  connect(url?: string) {
    if (this.socket?.connected || this.isConnecting) return;

    const wsUrl = url || import.meta.env.VITE_WS_URL || '';
    if (!wsUrl) {
      console.warn('[EventClient] WebSocket URL not configured');
      return;
    }

    this.isConnecting = true;

    // 获取 token
    const token = localStorage.getItem('access_token');

    this.socket = io(`${wsUrl}/events`, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: Infinity,
    });

    this.socket.on('connect', () => {
      console.log('[EventClient] Connected');
      this.isConnecting = false;
      this.emit('connected');
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    });

    this.socket.on('disconnect', () => {
      console.log('[EventClient] Disconnected');
      this.isConnecting = false;
      this.emit('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('[EventClient] Connection error:', error);
      this.isConnecting = false;
      this.emit('error', error);
    });

    // 订阅所有事件类型
    const eventTypes = [
      'ai.stream',
      'ai.workflow.update',
      'task.updated',
      'task.created',
      'project.updated',
      'project.created',
      'notification.created',
      'notification.read',
      'terminal.output',
      'terminal.session.created',
      'terminal.command.executed',
    ];

    this.socket.emit('subscribe', { eventTypes });

    // 监听所有事件
    eventTypes.forEach((eventType) => {
      this.socket?.on(eventType, (payload: unknown) => {
        this.emit(eventType, payload);
        this.emit('*', { type: eventType, payload });
      });
    });
  }

  emit(event: string, ...args: unknown[]) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(args[0]);
        } catch (err) {
          console.error(`[EventClient] Error in handler for ${event}:`, err);
        }
      });
    }
  }

  on<T = unknown>(event: string, handler: EventHandler<T>) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as EventHandler);
  }

  off<T = unknown>(event: string, handler: EventHandler<T>) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler as EventHandler);
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
    this.isConnecting = false;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const eventClient = new EventClient();
