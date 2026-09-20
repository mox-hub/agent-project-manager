import { io, Socket } from 'socket.io-client';
import { DomainEventTypes } from '@apm/shared/events/domain-events';
import { createLogger } from '@/shared/lib/logger';

type EventHandler<T = unknown> = (payload: T) => void;

const log = createLogger({ prefix: 'EventClient' });

/**
 * WS 订阅白名单 —— 一律从 `@apm/shared` 的事件名单源取，**禁止在此写字面量**。
 *
 * 2026-09-14 收口：此前本文件硬编码 `'ai.workflow.update'` / `'linear.*'` /
 * `'runtime.dispatch.changed'`，而它们不在单源里——契约已漂移，本次补齐单源。
 *
 * 扩订同源约束：加入本表只决定"客户端愿意听"，事件真正能否到达还取决于
 * server `gateways/events.gateway.ts` 是否有对应转发（治理族转发为该次补遗）。
 */
const SUBSCRIBED_EVENT_TYPES = [
  // AI 流与工作流
  DomainEventTypes.AiStream,
  DomainEventTypes.AiWorkflowUpdate,

  // 工单 / 项目
  DomainEventTypes.TaskUpdated,
  DomainEventTypes.TaskCreated,
  DomainEventTypes.ProjectUpdated,
  DomainEventTypes.ProjectCreated,

  // 通知
  DomainEventTypes.NotificationCreated,
  DomainEventTypes.NotificationRead,

  // 治理族：执行过程（盯盘主料）
  DomainEventTypes.ExecutionRunCreated,
  DomainEventTypes.ExecutionRunUpdated,
  DomainEventTypes.ExecutionCompleted,
  DomainEventTypes.ExecutionStepCreated,
  DomainEventTypes.ExecutionStepUpdated,
  DomainEventTypes.ExecutionApprovalNeeded,

  // 治理族：审批 / 验收 / 发版
  DomainEventTypes.ApprovalRequestCreated,
  DomainEventTypes.ApprovalRequested,
  DomainEventTypes.ApprovalResolved,
  DomainEventTypes.ApprovalCancelled,
  DomainEventTypes.AcceptanceCreated,
  DomainEventTypes.AcceptanceResolved,
  DomainEventTypes.AcceptanceDeleted,
  DomainEventTypes.ReleaseCreated,
  DomainEventTypes.ReleaseApproved,

  // 决策提案创建（收件箱/侧栏徽标实时失效，兜底改造批 4；暂无注册表键）
  'decision.proposal.created',

  // 运行时（本地执行节点）：含聚合通道，覆盖 heartbeat / execution.event 等
  DomainEventTypes.RuntimeConnected,
  DomainEventTypes.RuntimeHeartbeat,
  DomainEventTypes.RuntimeExecutionEvent,
  DomainEventTypes.RuntimeExecutionResult,
  DomainEventTypes.RuntimeExecutionCancelled,
  DomainEventTypes.RuntimeDispatchCreated,
  DomainEventTypes.RuntimeDispatchChanged,
  DomainEventTypes.RuntimeApprovalRequested,
  DomainEventTypes.RuntimeApprovalResolved,

  // 外部同步（Linear）
  DomainEventTypes.LinearSyncProgress,
  DomainEventTypes.LinearSyncCompleted,
  DomainEventTypes.LinearTaskPulled,
  DomainEventTypes.LinearTaskPushed,
  DomainEventTypes.LinearTaskConflict,
  DomainEventTypes.LinearTaskResolved,
] as const;

class EventClient {
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private socket: Socket | null = null;
  private readonly reconnectDelay = 3000;
  private isConnecting = false;
  /** 已加入的项目房间——重连后需重放（socket.io 重连不保留服务端房间） */
  private joinedProjects = new Set<string>();

  private inferDefaultWsUrl(): string {
    if (typeof window === 'undefined') {
      return '';
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${window.location.host}`;
  }

  connect(url?: string) {
    if (this.socket?.connected || this.isConnecting) return;
    // 上次连接失败留下的死 socket（boot 重试场景）：断开丢弃，避免泄漏与双连接
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

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
      // ⚠️ 订阅必须在每次 connect 时补发：socket.io 自动重连会新建服务端房间，
      // 若只在首次 connect() 调用时 emit 一次，重连后将不再收到任何推送。
      this.socket?.emit('subscribe', {
        eventTypes: [...SUBSCRIBED_EVENT_TYPES],
      });
      // 项目房间同样需重放
      this.joinedProjects.forEach((projectId) => {
        this.socket?.emit('subscribe', { projectId });
      });
      this.emit('connected');
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

    // 监听所有已订阅事件（handler 挂在同一 socket 实例上，跨重连保持）
    SUBSCRIBED_EVENT_TYPES.forEach((eventType) => {
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
    this.joinedProjects.add(projectId);
    if (!this.socket?.connected) return;
    this.socket.emit('subscribe', { projectId });
  }

  leaveProject(projectId: string) {
    this.joinedProjects.delete(projectId);
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
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
    this.joinedProjects.clear();
    this.isConnecting = false;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const eventClient = new EventClient();
export { SUBSCRIBED_EVENT_TYPES };
