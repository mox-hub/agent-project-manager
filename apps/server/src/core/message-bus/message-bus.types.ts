export interface MessageBusEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: Date;
  correlationId?: string;
}

export type EventHandler<T = unknown> = (
  payload: T,
  event: MessageBusEvent<T>,
) => void | Promise<void>;

