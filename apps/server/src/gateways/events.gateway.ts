import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
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
    // 订阅 AI 流式输出事件
    this.messageBus.subscribe('ai.stream', (payload: any) => {
      const { conversationId, token, done } = payload;
      // 广播给所有连接的客户端（或根据 conversationId 过滤）
      this.server.emit('ai.stream', {
        conversationId,
        token,
        done,
      });
    });

    // 订阅工作流更新事件
    this.messageBus.subscribe('ai.workflow.update', (payload: any) => {
      this.server.emit('ai.workflow.update', payload);
    });

    // 订阅任务更新事件
    this.messageBus.subscribe('task.updated', (payload: any) => {
      const { projectId, taskId } = payload;
      // 可以只推送给相关项目的成员
      this.server.emit('task.updated', payload);
    });

    // 订阅项目更新事件
    this.messageBus.subscribe('project.updated', (payload: any) => {
      this.server.emit('project.updated', payload);
    });

    // 订阅项目创建事件
    this.messageBus.subscribe('project.created', (payload: any) => {
      this.server.emit('project.created', payload);
    });

    // 订阅任务创建事件
    this.messageBus.subscribe('task.created', (payload: any) => {
      this.server.emit('task.created', payload);
    });

    // 订阅通知创建事件
    this.messageBus.subscribe('notification.created', (payload: any) => {
      const { userId } = payload;
      // 只推送给特定用户
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.forEach((socketId) => {
          const socket = this.server.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('notification.created', payload);
          }
        });
      }
    });

    // 订阅通知已读事件
    this.messageBus.subscribe('notification.read', (payload: any) => {
      const { userId } = payload;
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.forEach((socketId) => {
          const socket = this.server.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit('notification.read', payload);
          }
        });
      }
    });

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
  }

  // 客户端可以订阅特定事件
  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, payload: { eventTypes: string[] }) {
    // 可以在这里实现更细粒度的事件订阅
    if (payload.eventTypes && Array.isArray(payload.eventTypes)) {
      payload.eventTypes.forEach((eventType) => {
        client.join(eventType);
      });
    }
    return { success: true };
  }
}
