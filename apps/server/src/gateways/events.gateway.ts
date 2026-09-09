import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { DomainEventTypes } from '@/core/message-bus/domain-events';
import { Server, Socket } from 'socket.io';
import { LoggerService } from '../core/logger/logger.service';
import { MessageBusService } from '../core/message-bus/message-bus.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '../core/config/config.service';
import { isAllowedOrigin, parseAllowedOriginsFromEnv } from '../common';

const allowedOrigins = parseAllowedOriginsFromEnv();

@WebSocketGateway({
  cors: {
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (isAllowedOrigin(origin, allowedOrigins)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, Set<string>>(); // userId -> socketIds

  constructor(
    private logger: LoggerService,
    private messageBus: MessageBusService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.logger.setContext('EventsGateway');
    this.setupMessageBusSubscriptions();
  }

  async handleConnection(client: Socket) {
    try {
      // 从 query 或 handshake auth 中获取 token
      const token =
        client.handshake.auth?.token || client.handshake.query?.token;
      if (!token) {
        client.disconnect();
        return;
      }

      // 验证 JWT
      const payload = this.jwtService.verify(token as string, {
        secret: this.configService.getOrThrow('JWT_SECRET'),
      });

      const userId = payload.sub;
      client.data.userId = userId;

      // 记录用户连接
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
    } catch (error) {
      this.logger.error('WebSocket connection error', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private setupMessageBusSubscriptions() {
    // 订阅 AI 流式输出事件（载荷：{conversationId, messageId, chunk, isFinal, userId}，
    // 仅推送会话属主，不再全局广播）
    this.messageBus.subscribe('ai.stream', (payload: any) => {
      const { userId } = payload;
      if (!userId) return;
      const sockets = this.userSockets.get(userId);
      if (!sockets) return;
      sockets.forEach((socketId) => {
        // 按用户已连接的 socket id 定向推送（server.to 兼容各 socket.io 版本，
        // 不依赖 server.sockets.sockets 内部 Map）
        this.server.to(socketId).emit('ai.stream', payload);
      });
    });

    // 订阅工作流更新事件
    this.messageBus.subscribe('ai.workflow.update', (payload: any) => {
      this.server.emit('ai.workflow.update', payload);
    });

    // 订阅任务更新事件
    this.messageBus.subscribe(DomainEventTypes.TaskUpdated, (payload: any) => {
      const { projectId, issueId } = payload;
      // 可以只推送给相关项目的成员
      this.server.emit(DomainEventTypes.TaskUpdated, payload);
    });

    // 订阅项目更新事件
    this.messageBus.subscribe(
      DomainEventTypes.ProjectUpdated,
      (payload: any) => {
        this.server.emit(DomainEventTypes.ProjectUpdated, payload);
      },
    );

    // 订阅项目创建事件
    this.messageBus.subscribe(
      DomainEventTypes.ProjectCreated,
      (payload: any) => {
        this.server.emit(DomainEventTypes.ProjectCreated, payload);
      },
    );

    // 订阅任务创建事件
    this.messageBus.subscribe(DomainEventTypes.TaskCreated, (payload: any) => {
      this.server.emit(DomainEventTypes.TaskCreated, payload);
    });

    // 订阅通知创建事件
    this.messageBus.subscribe(
      DomainEventTypes.NotificationCreated,
      (payload: any) => {
        const { userId } = payload;
        // 只推送给特定用户（server.to(socketId)：当前版本 server.sockets.sockets
        // 直接索引为 undefined，get 会崩——同 ai.stream 的修法）
        const sockets = this.userSockets.get(userId);
        if (sockets) {
          sockets.forEach((socketId) => {
            this.server
              .to(socketId)
              .emit(DomainEventTypes.NotificationCreated, payload);
          });
        }
      },
    );

    // 订阅通知已读事件
    this.messageBus.subscribe(
      DomainEventTypes.NotificationRead,
      (payload: any) => {
        const { userId } = payload;
        const sockets = this.userSockets.get(userId);
        if (sockets) {
          sockets.forEach((socketId) => {
            this.server
              .to(socketId)
              .emit(DomainEventTypes.NotificationRead, payload);
          });
        }
      },
    );

    // Terminal事件订阅已废弃 - Terminal模块已并入Runtime模块
    // 以下事件现在由Runtime模块的terminal capability处理
    // 如需恢复，请参考 Runtime模块的terminal capability实现
    /*
    // 订阅终端输出事件
    this.messageBus.subscribe('terminal.output', (payload: any) => {
      const { sessionId, chunk, isError, isEnd } = payload;
      this.server.emit('terminal.output', { sessionId, chunk, isError, isEnd });
    });

    // 订阅终端会话创建事件
    this.messageBus.subscribe('terminal.session.created', (payload: any) => {
      this.server.emit('terminal.session.created', payload);
    });

    // 订阅终端命令执行事件
    this.messageBus.subscribe('terminal.command.executed', (payload: any) => {
      this.server.emit('terminal.command.executed', payload);
    });
    */

    // ── Runtime dispatch 生命周期 → 统一转发为 runtime.dispatch.changed ──
    // 前端同事位状态（use-assistant-status）与设置页派发表原先各挂 5s 轮询
    // GET /runtime/dispatches；改为事件驱动失效后轮询仅作 30s 兜底。
    const dispatchEvents = [
      'runtime.dispatch.created',
      'runtime.execution.event',
      'runtime.execution.result',
      'runtime.approval.requested',
      'runtime.approval.resolved',
      'runtime.execution.cancelled',
    ] as const;
    dispatchEvents.forEach((evt) => {
      this.messageBus.subscribe(evt, (payload: unknown) => {
        this.server.emit('runtime.dispatch.changed', {
          source: evt,
          payload,
        });
      });
    });

    // ── Linear sync events ─────────────────────────────────
    this.messageBus.subscribe('linear.sync.progress', (payload: any) => {
      const { projectId } = payload ?? {};
      if (projectId) {
        this.server
          .to(`project:${projectId}`)
          .emit('linear.sync.progress', payload);
        return;
      }
      this.server.emit('linear.sync.progress', payload);
    });

    this.messageBus.subscribe('linear.sync.completed', (payload: any) => {
      this.server.emit('linear.sync.completed', payload);
    });

    this.messageBus.subscribe('linear.task.pulled', (payload: any) => {
      const { projectId } = payload ?? {};
      if (projectId) {
        this.server
          .to(`project:${projectId}`)
          .emit('linear.task.pulled', payload);
        return;
      }
      this.server.emit('linear.task.pulled', payload);
    });

    this.messageBus.subscribe('linear.task.pushed', (payload: any) => {
      const { projectId } = payload ?? {};
      if (projectId) {
        this.server
          .to(`project:${projectId}`)
          .emit('linear.task.pushed', payload);
        return;
      }
      this.server.emit('linear.task.pushed', payload);
    });

    this.messageBus.subscribe('linear.task.conflict', (payload: any) => {
      const { projectId } = payload ?? {};
      if (projectId) {
        this.server
          .to(`project:${projectId}`)
          .emit('linear.task.conflict', payload);
        return;
      }
      this.server.emit('linear.task.conflict', payload);
    });

    this.messageBus.subscribe('linear.task.resolved', (payload: any) => {
      const { projectId } = payload ?? {};
      if (projectId) {
        this.server
          .to(`project:${projectId}`)
          .emit('linear.task.resolved', payload);
        return;
      }
      this.server.emit('linear.task.resolved', payload);
    });
  }

  // 客户端可以订阅特定事件
  @SubscribeMessage('subscribe')
  handleSubscribe(
    client: Socket,
    payload: { eventTypes?: string[]; projectId?: string },
  ) {
    if (payload?.eventTypes && Array.isArray(payload.eventTypes)) {
      payload.eventTypes.forEach((eventType) => {
        client.join(eventType);
      });
    }
    if (payload?.projectId) {
      client.join(`project:${payload.projectId}`);
    }
    return { success: true };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    client: Socket,
    payload: { eventTypes?: string[]; projectId?: string },
  ) {
    if (payload?.eventTypes && Array.isArray(payload.eventTypes)) {
      payload.eventTypes.forEach((eventType) => {
        client.leave(eventType);
      });
    }
    if (payload?.projectId) {
      client.leave(`project:${payload.projectId}`);
    }
    return { success: true };
  }
}
