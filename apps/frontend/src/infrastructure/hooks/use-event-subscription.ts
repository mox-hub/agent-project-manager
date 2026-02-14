import { useEffect } from 'react';
import { eventClient } from '../event-client';

/**
 * Hook to subscribe to MessageBus events
 * @param eventType - Event type to subscribe to
 * @param handler - Event handler function
 * @param deps - Dependencies array for the handler
 */
export function useEventSubscription<T = unknown>(
  eventType: string,
  handler: (payload: T) => void,
  deps: unknown[] = [],
) {
  useEffect(() => {
    // Connect if not already connected
    const wsUrl = import.meta.env.VITE_WS_URL || '';
    if (wsUrl && !eventClient.isConnected()) {
      eventClient.connect(wsUrl);
    }

    // Subscribe to event
    eventClient.on(eventType, handler);

    // Cleanup
    return () => {
      eventClient.off(eventType, handler);
    };
  }, [eventType, ...deps]);
}

/**
 * Hook to subscribe to project-related events
 */
export function useProjectEvents(
  projectId: string | null | undefined,
  handlers: {
    onProjectUpdated?: (payload: any) => void;
    onProjectCreated?: (payload: any) => void;
    onTaskUpdated?: (payload: any) => void;
    onTaskCreated?: (payload: any) => void;
  },
) {
  const { onProjectUpdated, onProjectCreated, onTaskUpdated, onTaskCreated } = handlers;

  useEventSubscription(
    'project.updated',
    (payload: any) => {
      if (!projectId || payload.projectId === projectId) {
        onProjectUpdated?.(payload);
      }
    },
    [projectId, onProjectUpdated],
  );

  useEventSubscription(
    'project.created',
    (payload: any) => {
      onProjectCreated?.(payload);
    },
    [onProjectCreated],
  );

  useEventSubscription(
    'task.updated',
    (payload: any) => {
      if (!projectId || payload.projectId === projectId) {
        onTaskUpdated?.(payload);
      }
    },
    [projectId, onTaskUpdated],
  );

  useEventSubscription(
    'task.created',
    (payload: any) => {
      if (!projectId || payload.projectId === projectId) {
        onTaskCreated?.(payload);
      }
    },
    [projectId, onTaskCreated],
  );
}
