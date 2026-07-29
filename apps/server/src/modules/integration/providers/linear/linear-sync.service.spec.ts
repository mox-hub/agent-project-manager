import { LinearSyncService } from './linear-sync.service';

describe('LinearSyncService mappings', () => {
  let svc: LinearSyncService;

  beforeEach(() => {
    svc = new LinearSyncService(
      {} as any,
      {} as any,
      {} as any,
      { publish: jest.fn(), createEvent: jest.fn(), publishAsync: jest.fn() } as any,
    );
  });

  describe('normalizeWorkflowStatus', () => {
    it('maps Linear state.type to APM workflowStatus', () => {
      // private but we can access via casting
      const fn = (svc as any).normalizeWorkflowStatus.bind(svc);
      expect(fn('backlog', 'Backlog')).toBe('backlog');
      expect(fn('triage', 'Triage')).toBe('backlog');
      expect(fn('unstarted', 'Todo')).toBe('planned');
      expect(fn('started', 'In Progress')).toBe('in_progress');
      expect(fn('completed', 'Done')).toBe('completed');
      expect(fn('canceled', 'Canceled')).toBe('canceled');
      expect(fn(null, 'planned')).toBe('planned');
      expect(fn(null, 'in_progress')).toBe('in_progress');
      expect(fn(undefined, undefined)).toBe('planned');
    });
  });

  describe('normalizePriority', () => {
    it('maps Linear priority (inverted) to APM priority', () => {
      const fn = (svc as any).normalizePriority.bind(svc);
      expect(fn(0)).toBe('low');
      expect(fn(1)).toBe('critical');
      expect(fn(2)).toBe('high');
      expect(fn(3)).toBe('medium');
      expect(fn(4)).toBe('low');
      expect(fn(null)).toBe('medium');
      expect(fn(undefined)).toBe('medium');
    });
  });

  describe('detectConflict', () => {
    it('flags conflict when both local and remote moved >2s after base', () => {
      const fn = (svc as any).detectConflict.bind(svc);
      const base = '2026-01-01T00:00:00.000Z';
      const remote = new Date(Date.parse(base) + 60_000).toISOString();
      const localUpdatedAt = new Date(Date.parse(base) + 30_000);
      const result = fn(
        {
          externalVersion: base,
          localUpdatedAt,
          metadata: {},
        },
        { updatedAt: remote } as any,
      );
      expect(result.hasConflict).toBe(true);
      expect(result.localFields).toContain('title');
    });

    it('does NOT flag conflict when only remote moved', () => {
      const fn = (svc as any).detectConflict.bind(svc);
      const base = '2026-01-01T00:00:00.000Z';
      const remote = new Date(Date.parse(base) + 60_000).toISOString();
      const result = fn(
        {
          externalVersion: base,
          localUpdatedAt: new Date(base),
          metadata: {},
        },
        { updatedAt: remote } as any,
      );
      expect(result.hasConflict).toBe(false);
    });

    it('does NOT flag conflict when only local moved and remote is older', () => {
      const fn = (svc as any).detectConflict.bind(svc);
      const base = '2026-01-01T00:00:00.000Z';
      // remote is OLDER than local externalVersion but the timestamps come close
      const result = fn(
        {
          externalVersion: base,
          localUpdatedAt: new Date(Date.parse(base) + 5_000),
          metadata: {},
        },
        { updatedAt: base } as any,
      );
      expect(result.hasConflict).toBe(false);
    });

    it('returns no conflict when no base version', () => {
      const fn = (svc as any).detectConflict.bind(svc);
      const result = fn(
        {
          externalVersion: null,
          localUpdatedAt: new Date(),
          metadata: {},
        },
        { updatedAt: new Date().toISOString() } as any,
      );
      expect(result.hasConflict).toBe(false);
    });
  });

  describe('taskToIssueInput', () => {
    it('reverses priority mapping correctly', () => {
      const fn = (svc as any).taskToIssueInput.bind(svc);
      expect(fn({ priority: 'critical', status: 'in_progress', title: 'T' })).toMatchObject({
        priority: 1,
        title: 'T',
      });
      expect(fn({ priority: 'high' })).toMatchObject({ priority: 2 });
      expect(fn({ priority: 'medium' })).toMatchObject({ priority: 3 });
      expect(fn({ priority: 'low' })).toMatchObject({ priority: 4 });
      expect(fn({ priority: 'unknown' })).toMatchObject({ priority: 0 });
    });
  });

  describe('isProjectFieldLocked', () => {
    it('returns true for locked fields', () => {
      expect(svc.isProjectFieldLocked('name')).toBe(true);
      expect(svc.isProjectFieldLocked('description')).toBe(true);
      expect(svc.isProjectFieldLocked('color')).toBe(true);
      expect(svc.isProjectFieldLocked('workflowStatus')).toBe(true);
      expect(svc.isProjectFieldLocked('priority')).toBe(true);
      expect(svc.isProjectFieldLocked('healthStatus')).toBe(true);
    });

    it('returns false for non-locked fields', () => {
      expect(svc.isProjectFieldLocked('members')).toBe(false);
      expect(svc.isProjectFieldLocked('documentsRepoPath')).toBe(false);
      expect(svc.isProjectFieldLocked('metadata')).toBe(false);
      expect(svc.isProjectFieldLocked('progress')).toBe(false);
    });
  });
});
