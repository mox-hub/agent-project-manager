import { useEffect } from 'react';
import { eventClient } from '../event-client';

/**
 * Hook to subscribe to MessageBus events
 * @param eventType - Event type to subscribe to
 * @param handler - Event handler function
 * @param deps - Dependencies array for handler
 */
export function useEventSubscription<T = unknown>(
  eventType: string,
  handler: (payload: T) => void,
  deps: unknown[] = [],
) {
  const depsKey = deps.map((dep) => String(dep)).join("|");

  useEffect(() => {
    // Connect if not already connected
    if (!eventClient.isConnected()) {
      eventClient.connect(import.meta.env.VITE_WS_URL || undefined);
    }

    // Subscribe to event
    eventClient.on<T>(eventType, handler);

    // Cleanup
    return () => {
      eventClient.off(eventType, handler);
    };
  }, [eventType, handler, depsKey]);
}

/**
 * Hook to subscribe to project-related events
 */

interface ProjectEventPayload {
  projectId: string;
  [key: string]: unknown;
}

interface TaskEventPayload {
  projectId: string;
  taskId: string;
  [key: string]: unknown;
}

export function useProjectEvents(
  projectId: string | null | undefined,
  handlers: {
    onProjectUpdated?: (payload: ProjectEventPayload) => void;
    onProjectCreated?: (payload: ProjectEventPayload) => void;
    onTaskUpdated?: (payload: TaskEventPayload) => void;
    onTaskCreated?: (payload: TaskEventPayload) => void;
  },
) {
  const { onProjectUpdated, onProjectCreated, onTaskUpdated, onTaskCreated } = handlers;

  useEventSubscription<ProjectEventPayload>(
    'project.updated',
    (payload: ProjectEventPayload) => {
      if (!projectId || payload.projectId === projectId) {
        onProjectUpdated?.(payload);
      }
    },
    [projectId, onProjectUpdated],
  );

  useEventSubscription<ProjectEventPayload>(
    'project.created',
    (payload: ProjectEventPayload) => {
      onProjectCreated?.(payload);
    },
    [onProjectCreated],
  );

  useEventSubscription<TaskEventPayload>(
    'task.updated',
    (payload: TaskEventPayload) => {
      if (!projectId || payload.projectId === projectId) {
        onTaskUpdated?.(payload);
      }
    },
    [projectId, onTaskUpdated],
  );

  useEventSubscription<TaskEventPayload>(
    'task.created',
    (payload: TaskEventPayload) => {
      if (!projectId || payload.projectId === projectId) {
        onTaskCreated?.(payload);
      }
    },
    [projectId, onTaskCreated],
  );
}
