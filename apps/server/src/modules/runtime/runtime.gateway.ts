import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LoggerService } from '@/core/logger/logger.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import { RuntimeService } from './runtime.service';

@WebSocketGateway({
  namespace: '/runtime/ws',
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
    credentials: true,
  },
})
export class RuntimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly runtimeSockets = new Map<string, Set<string>>();

  constructor(
    private readonly logger: LoggerService,
    private readonly runtimeService: RuntimeService,
    private readonly messageBus: MessageBusService,
  ) {
    this.logger.setContext('RuntimeGateway');
    this.setupSubscriptions();
  }

  async handleConnection(client: Socket) {
    try {
      const runtimeSessionId = this.readHandshakeValue(client, 'runtimeSessionId');
      const runtimeSessionToken =
        this.readHandshakeValue(client, 'runtimeSessionToken') ||
        this.readHandshakeValue(client, 'token');

      if (!runtimeSessionId || !runtimeSessionToken) {
        client.disconnect();
        return;
      }

      const session = await this.runtimeService.validateSession(
        runtimeSessionId,
        runtimeSessionToken,
      );

      client.data.runtimeId = session.runtimeId;
      client.data.runtimeSessionId = session.runtimeSessionId;

      if (!this.runtimeSockets.has(session.runtimeId)) {
        this.runtimeSockets.set(session.runtimeId, new Set());
      }
      this.runtimeSockets.get(session.runtimeId)?.add(client.id);

      client.emit('runtime:connected', {
        runtimeId: session.runtimeId,
        runtimeSessionId: session.runtimeSessionId,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Runtime connected: ${session.runtimeId} (${client.id})`);
    } catch (error) {
      this.logger.error(
        'Runtime websocket auth failed',
        error instanceof Error ? error.stack : String(error),
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const runtimeId = client.data.runtimeId as string | undefined;
    if (runtimeId) {
      const sockets = this.runtimeSockets.get(runtimeId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.runtimeSockets.delete(runtimeId);
        }
      }

      this.emitToRuntime(runtimeId, 'runtime:disconnected', {
        runtimeId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage('runtime:heartbeat')
  handleHeartbeat(client: Socket, payload: Record<string, unknown>) {
    const runtimeId = client.data.runtimeId as string | undefined;
    if (!runtimeId) {
      return { ok: false };
    }

    this.emitToRuntime(runtimeId, 'runtime:heartbeat', {
      runtimeId,
      ...(payload ?? {}),
      timestamp: new Date().toISOString(),
    });

    return { ok: true };
  }

  private setupSubscriptions() {
    this.messageBus.subscribe('runtime.dispatch.created', (payload: any) => {
      const runtimeId = String(payload.runtimeId || '');
      if (!runtimeId) {
        return;
      }

      this.emitToRuntime(runtimeId, 'runtime:dispatch.created', payload);
    });

    this.messageBus.subscribe('runtime.approval.resolved', (payload: any) => {
      const runtimeId = payload.runtimeId ? String(payload.runtimeId) : undefined;
      if (runtimeId) {
        this.emitToRuntime(runtimeId, 'runtime:approval.resolved', payload);
        return;
      }

      this.server.emit('runtime:approval.resolved', payload);
    });

    this.messageBus.subscribe('runtime.execution.cancelled', (payload: any) => {
      const runtimeId = payload.runtimeId ? String(payload.runtimeId) : undefined;
      if (runtimeId) {
        this.emitToRuntime(runtimeId, 'runtime:execution.cancelled', payload);
        return;
      }

      this.server.emit('runtime:execution.cancelled', payload);
    });
  }

  private emitToRuntime(runtimeId: string, eventName: string, payload: unknown) {
    const sockets = this.runtimeSockets.get(runtimeId);
    if (!sockets) {
      return;
    }

    sockets.forEach((socketId) => {
      const socket = this.server.sockets.sockets.get(socketId);
      socket?.emit(eventName, payload);
    });
  }

  private readHandshakeValue(client: Socket, key: string): string | undefined {
    const authValue = client.handshake.auth?.[key];
    if (typeof authValue === 'string' && authValue.length > 0) {
      return authValue;
    }

    const queryValue = client.handshake.query?.[key];
    if (typeof queryValue === 'string' && queryValue.length > 0) {
      return queryValue;
    }

    return undefined;
  }
}