interface ServerEvent<T = unknown> {
  type: string;
  correlationId?: string;
  payload: T;
}

type EventHandler = (...args: unknown[]) => void;

class EventClient {
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private readonly reconnectDelay = 3000;
  private readonly heartbeatInterval = 30000;

  connect(url: string) {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(url);
    this.ws.onopen = () => {
      console.log('[EventClient] Connected');
      this.emit('connected');
      this.startHeartbeat();
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const serverEvent: ServerEvent = JSON.parse(event.data);
        this.emit(serverEvent.type, serverEvent.payload, serverEvent.correlationId);
        this.emit('*', serverEvent);
      } catch (err) {
        console.error('[EventClient] Failed to parse event:', err);
      }
    };

    this.ws.onerror = (error) => {
      console.error('[EventClient] WebSocket error:', error);
      this.emit('error', error);
    };

    this.ws.onclose = () => {
      console.log('[EventClient] Disconnected');
      this.emit('disconnected');
      this.stopHeartbeat();
      this.scheduleReconnect(url);
    };
  }

  emit(event: string, ...args: unknown[]) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(...args);
        } catch (err) {
          console.error(`[EventClient] Error in handler for ${event}:`, err);
        }
      });
    }
  }

  on(event: string, handler: EventHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private startHeartbeat() {
    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, this.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(url: string) {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(url);
    }, this.reconnectDelay);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }
}

export const eventClient = new EventClient();
