/**
 * Socket.IO Event Types
 *
 * Provides type-safe event handling for WebSocket communications
 */

/**
 * SocketEventMap - Type-safe mapping of event names to their payloads
 */
export type SocketEventMap = {
  // AI Hub events
  'ai:chunk': {
    conversationId: string;
    chunk: string;
  };
  'ai:stream': {
    conversationId: string;
    messageId: string;
    chunk: string;
    isFinal: boolean;
  };

  // Project events
  'project.created': {
    projectId: string;
    project: {
      id: string;
      name: string;
      description?: string | null;
    };
  };
  'project.updated': {
    projectId: string;
    project: {
      id: string;
      name: string;
      description?: string | null;
    };
  };

  // Task events
  'task.created': {
    projectId: string;
    taskId: string;
    task: {
      id: string;
      title: string;
    };
  };
  'task.updated': {
    projectId: string;
    taskId: string;
    task: {
      id: string;
      title: string;
      status: string;
    };
  };

  // Git events
  'git:status': {
    repositoryId: string;
    status: {
      branch: string;
      ahead: number;
      behind: number;
      staged: number;
      modified: number;
      untracked: number;
    };
  };
  'git:commit': {
    repositoryId: string;
    commit: {
      id: string;
      message: string;
      author: string;
      timestamp: string;
    };
  };

  // Terminal events
  'terminal:output': {
    sessionId: string;
    output: string;
  };
  'terminal:status': {
    sessionId: string;
    status: 'running' | 'stopped' | 'error';
  };

  // Workflow events
  'workflow:progress': {
    workflowRunId: string;
    stepId?: string;
    status: string;
    output?: any;
    error?: any;
  };
  'workflow:completed': {
    workflowRunId: string;
    status: 'succeeded' | 'failed';
    output?: any;
    error?: any;
  };
};

/**
 * Event key type - all valid event names
 */
export type SocketEventName = keyof SocketEventMap;

/**
 * Event handler type
 */
export type EventHandler<T extends SocketEventName> = (
  payload: SocketEventMap[T]
) => void;
