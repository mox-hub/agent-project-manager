import { useEffect, useCallback, useState } from 'react';
import { eventClient } from '@/infrastructure/event-client';

export interface SyncProgressPayload {
  projectId: string;
  phase: 'fetching' | 'syncing' | 'completed' | 'error';
  current: number;
  total: number;
  message: string;
  currentItem?: string;
}

export interface SyncCompletedPayload {
  integrationId: string;
  projectId: string;
  action: string;
  summary?: {
    added: number;
    updated: number;
    conflicts: number;
    errors: number;
  };
}

interface UseSyncProgressOptions {
  projectId: string | null | undefined;
  onProgress?: (progress: SyncProgressPayload) => void;
  onCompleted?: (result: SyncCompletedPayload) => void;
}

/**
 * Hook to subscribe to Linear sync progress events
 */
export function useSyncProgress({ projectId, onProgress, onCompleted }: UseSyncProgressOptions) {
  const [progress, setProgress] = useState<SyncProgressPayload | null>(null);
  const [isActive, setIsActive] = useState(false);

  const handleProgress = useCallback((payload: unknown) => {
    const p = payload as SyncProgressPayload;
    if (p.projectId !== projectId) return;
    
    setProgress(p);
    setIsActive(p.phase !== 'completed' && p.phase !== 'error');
    onProgress?.(p);
  }, [projectId, onProgress]);

  const handleCompleted = useCallback((payload: unknown) => {
    const p = payload as SyncCompletedPayload;
    if (p.projectId !== projectId) return;
    
    setIsActive(false);
    onCompleted?.(p);
  }, [projectId, onCompleted]);

  useEffect(() => {
    if (!projectId) return;

    // Join project room to receive events
    eventClient.joinProject(projectId);

    // Subscribe to events
    eventClient.on<SyncProgressPayload>('linear.sync.progress', handleProgress);
    eventClient.on<SyncCompletedPayload>('linear.sync.completed', handleCompleted);

    return () => {
      eventClient.off<SyncProgressPayload>('linear.sync.progress', handleProgress);
      eventClient.off<SyncCompletedPayload>('linear.sync.completed', handleCompleted);
      eventClient.leaveProject(projectId);
    };
  }, [projectId, handleProgress, handleCompleted]);

  const resetProgress = useCallback(() => {
    setProgress(null);
    setIsActive(false);
  }, []);

  return {
    progress,
    isActive,
    resetProgress,
  };
}
