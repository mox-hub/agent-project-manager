import { io, Socket } from 'socket.io-client';
import { createLogger } from '@/shared/lib/logger';

type EventHandler<T = unknown> = (payload: T) => void;

const log = createLogger({ prefix: 'EventClient' });

class EventClient {
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private socket: Socket | null = null;
  private reconnectTimer: number | null = null;
  private readonly reconnectDelay = 3000;
  private isConnecting = false;

  private inferDefaultWsUrl(): string {
    if (typeof window === 'undefined') {
      return '';
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${window.location.host}`;
  }

  connect(url?: string) {
    if (this.socket?.connected || this.isConnecting) return;

    const wsUrl = url || import.meta.env.VITE_WS_URL || this.inferDefaultWsUrl();
    if (!wsUrl) {
      log.warn('WebSocket URL not configured');
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
      log.info('Connected');
      this.isConnecting = false;
      this.emit('connected');
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    });

    this.socket.on('disconnect', () => {
      log.info('Disconnected');
      this.isConnecting = false;
      this.emit('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      log.error('Connection error:', error);
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
      // Linear sync events
      'linear.sync.completed',
      'linear.task.pulled',
      'linear.task.pushed',
      'linear.task.conflict',
      'linear.task.resolved',
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

  /**
   * 加入项目房间以便接收项目级 WebSocket 事件
   * (例如 linear.task.* 项目的细粒度推送)
   */
  joinProject(projectId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('subscribe', { projectId });
  }

  leaveProject(projectId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('unsubscribe', { projectId });
  }

  emit(event: string, ...args: unknown[]) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(args[0]);
        } catch (err) {
          log.error(`Error in handler for ${event}:`, err);
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
