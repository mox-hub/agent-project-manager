import { describe, expect, it } from 'vitest';
import {
  buildFilterStateFromQuery,
  buildQueryFromFilterState,
  serializeFilters,
} from './adapters';

describe('filter adapters', () => {
  it('should build query from state with dedupe and sort', () => {
    const query = buildQueryFromFilterState(
      { q: 'hello', page: 1, pageSize: 20 },
      {
        status: ['archived', 'active', 'active'],
        type: undefined,
      },
      ['status', 'type'] as const,
    );

    expect(query).toEqual({
      q: 'hello',
      page: 1,
      pageSize: 20,
      filters: {
        status: ['active', 'archived'],
      },
    });
  });

  it('should build state from query filters', () => {
    const state = buildFilterStateFromQuery(
      {
        status: ['archived', 'active'],
      },
      ['status', 'type'] as const,
    );

    expect(state).toEqual({
      status: ['active', 'archived'],
      type: undefined,
    });
  });

  it('should serialize filters with stable key order', () => {
    const result = serializeFilters({
      type: ['team'],
      status: ['archived', 'active'],
      empty: undefined,
    });

    expect(result).toBe('{"status":["active","archived"],"type":["team"]}');
  });
});

