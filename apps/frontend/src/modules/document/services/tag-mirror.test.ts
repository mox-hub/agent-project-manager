import { describe, it, expect } from 'vitest';
import { computeTagMirror } from './tag-mirror';

const tag = (id: string, name: string) => ({ id, name });

describe('computeTagMirror', () => {
  it('plans create + attach for tags missing in DB', () => {
    const plan = computeTagMirror({
      existing: [tag('t1', 'feature')],
      attached: [],
      target: ['feature', 'mvp'],
    });
    expect(plan.toCreate).toEqual(['mvp']);
    expect(plan.toAttach).toEqual([tag('t1', 'feature')]);
    expect(plan.toDetach).toEqual([]);
  });

  it('plans detach for attached tags no longer in frontmatter', () => {
    const plan = computeTagMirror({
      existing: [tag('t1', 'feature'), tag('t2', 'stale')],
      attached: [tag('t1', 'feature'), tag('t2', 'stale')],
      target: ['feature'],
    });
    expect(plan.toCreate).toEqual([]);
    expect(plan.toAttach).toEqual([]);
    expect(plan.toDetach).toEqual([tag('t2', 'stale')]);
  });

  it('is a no-op when mirror already matches frontmatter', () => {
    const plan = computeTagMirror({
      existing: [tag('t1', 'feature')],
      attached: [tag('t1', 'feature')],
      target: ['feature'],
    });
    expect(plan).toEqual({ toCreate: [], toAttach: [], toDetach: [] });
  });

  it('detaches all tags when frontmatter has none', () => {
    const plan = computeTagMirror({
      existing: [tag('t1', 'a'), tag('t2', 'b')],
      attached: [tag('t1', 'a'), tag('t2', 'b')],
      target: [],
    });
    expect(plan.toDetach).toEqual([tag('t1', 'a'), tag('t2', 'b')]);
  });

  it('reattaches a known tag that was detached earlier', () => {
    const plan = computeTagMirror({
      existing: [tag('t1', 'feature')],
      attached: [],
      target: ['feature'],
    });
    expect(plan.toAttach).toEqual([tag('t1', 'feature')]);
  });
});
