import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { eventClient } from '@/infrastructure/event-client';
import { toast } from '@/hooks/use-toast';

interface LinearSyncPulledPayload {
  integrationId: string;
  projectId: string;
  taskId: string;
  externalIssueId: string;
  identifier?: string | null;
  direction: string;
}

interface LinearSyncPushedPayload {
  integrationId: string;
  projectId: string;
  taskId: string;
  externalIssueId: string;
  identifier?: string | null;
  direction: string;
}

interface LinearSyncConflictPayload {
  integrationId: string;
  projectId: string;
  taskId: string;
  externalIssueId: string;
  identifier?: string | null;
  localFields?: string[];
  detectedAt: string;
}

interface LinearSyncResolvedPayload {
  integrationId: string;
  projectId: string;
  taskId: string;
  externalIssueId: string;
  identifier?: string | null;
  resolution: 'use_linear' | 'use_local' | 'keep_both';
  createdRemoteCopyId?: string;
}

/**
 * Subscribe to project-scoped Linear sync events.
 * Joins the project room when active and invalidates the relevant queries
 * when sync events arrive.
 */
export function useLinearSyncEvents(projectId: string | null | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    eventClient.joinProject(projectId);

    const handlePulled = (payload: unknown) => {
      const p = payload as LinearSyncPulledPayload;
      if (p.projectId !== projectId) return;
      qc.invalidateQueries({ queryKey: ['tasks', { projectId }] });
      qc.invalidateQueries({ queryKey: ['task', p.taskId] });
    };

    const handlePushed = (payload: unknown) => {
      const p = payload as LinearSyncPushedPayload;
      if (p.projectId !== projectId) return;
      qc.invalidateQueries({ queryKey: ['tasks', { projectId }] });
      qc.invalidateQueries({ queryKey: ['task', p.taskId] });
    };

    const handleConflict = (payload: unknown) => {
      const p = payload as LinearSyncConflictPayload;
      if (p.projectId !== projectId) return;
      qc.invalidateQueries({ queryKey: ['tasks', { projectId }] });
      qc.invalidateQueries({ queryKey: ['task', p.taskId] });
      toast({
        title: 'Linear sync conflict',
        description: `${p.identifier ?? p.externalIssueId} — both sides changed`,
        variant: 'destructive',
      });
    };

    const handleResolved = (payload: unknown) => {
      const p = payload as LinearSyncResolvedPayload;
      if (p.projectId !== projectId) return;
      qc.invalidateQueries({ queryKey: ['tasks', { projectId }] });
      qc.invalidateQueries({ queryKey: ['task', p.taskId] });
    };

    eventClient.on<LinearSyncPulledPayload>('linear.task.pulled', handlePulled);
    eventClient.on<LinearSyncPushedPayload>('linear.task.pushed', handlePushed);
    eventClient.on<LinearSyncConflictPayload>('linear.task.conflict', handleConflict);
    eventClient.on<LinearSyncResolvedPayload>('linear.task.resolved', handleResolved);

    return () => {
      eventClient.off<LinearSyncPulledPayload>('linear.task.pulled', handlePulled);
      eventClient.off<LinearSyncPushedPayload>('linear.task.pushed', handlePushed);
      eventClient.off<LinearSyncConflictPayload>('linear.task.conflict', handleConflict);
      eventClient.off<LinearSyncResolvedPayload>('linear.task.resolved', handleResolved);
      eventClient.leaveProject(projectId);
    };
  }, [projectId, qc]);
}

/**
 * Global Linear sync listener (e.g. for project list / integration detail page)
 */
export function useGlobalLinearSyncEvents() {
  const qc = useQueryClient();

  useEffect(() => {
    const handle = (payload: unknown) => {
      const p = payload as { projectId?: string };
      qc.invalidateQueries({ queryKey: ['integrations'] });
      qc.invalidateQueries({ queryKey: ['linear-sync-logs'] });
      if (p.projectId) {
        qc.invalidateQueries({ queryKey: ['project', p.projectId] });
      }
    };

    eventClient.on('linear.sync.completed', handle);

    return () => {
      eventClient.off('linear.sync.completed', handle);
    };
  }, [qc]);
}

/**
 * Compact helper: render toast on global Linear events
 */
export function useLinearEventToasts() {
  useEffect(() => {
    const handlePulled = (payload: unknown) => {
      const p = payload as LinearSyncPulledPayload;
      toast({
        title: 'Pulled from Linear',
        description: p.identifier ?? p.externalIssueId,
      });
    };

    eventClient.on('linear.task.pulled', handlePulled);
    return () => {
      eventClient.off('linear.task.pulled', handlePulled);
    };
  }, []);
}