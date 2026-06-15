import { describe, it, expect } from 'vitest';
import { parseFrontmatter, mergeFrontmatter, stringifyFrontmatter } from './mdx-frontmatter';

describe('mdx-frontmatter', () => {
  it('returns empty data when content has no frontmatter', () => {
    const result = parseFrontmatter('# Hello\n\nbody');
    expect(result.data).toEqual({});
    expect(result.body).toContain('body');
  });

  it('parses known string fields and tags array', () => {
    const src = `---
title: "Spec"
author: alice
tags: [feature, mvp]
aliases: [A, B]
status: draft
project: APM
module: PF
short_id: APM-PF-001
draft: true
---
body`;
    const r = parseFrontmatter(src);
    expect(r.data.title).toBe('Spec');
    expect(r.data.author).toBe('alice');
    expect(r.data.tags).toEqual(['feature', 'mvp']);
    expect(r.data.aliases).toEqual(['A', 'B']);
    expect(r.data.status).toBe('draft');
    expect(r.data.project).toBe('APM');
    expect(r.data.module).toBe('PF');
    expect(r.data.short_id).toBe('APM-PF-001');
    expect(r.data.draft).toBe(true);
  });

  it('normalizes comma-separated tags string into array', () => {
    const src = `---
tags: a, b , c,
---`;
    const r = parseFrontmatter(src);
    expect(r.data.tags).toEqual(['a', 'b', 'c']);
  });

  it('rejects invalid status values', () => {
    const src = `---
status: garbage
---`;
    const r = parseFrontmatter(src);
    expect(r.data.status).toBeUndefined();
  });

  it('preserves unknown keys into custom bucket', () => {
    const src = `---
title: x
client: contoso
priority: P1
---`;
    const r = parseFrontmatter(src);
    expect(r.data.title).toBe('x');
    expect(r.data.custom).toEqual({ client: 'contoso', priority: 'P1' });
  });

  it('falls back to body mode when YAML is malformed', () => {
    const src = `---
title: "unterminated
---`;
    const r = parseFrontmatter(src);
    // gray-matter 解析失败时, 我们降级, 整段当 body
    expect(r.body.length).toBeGreaterThan(0);
  });

  it('mergeFrontmatter preserves unknown keys', () => {
    const src = `---
title: original
client: contoso
---`;
    const out = mergeFrontmatter(src, { title: 'updated', tags: ['a'] });
    expect(out).toContain('title: updated');
    expect(out).toContain('client: contoso');
    expect(out).toContain('tags:');
  });

  it('stringifyFrontmatter + parseFrontmatter roundtrips known fields', () => {
    const out = stringifyFrontmatter('body', {
      title: 't',
      tags: ['a', 'b'],
      status: 'published',
    });
    const r = parseFrontmatter(out);
    expect(r.data.title).toBe('t');
    expect(r.data.tags).toEqual(['a', 'b']);
    expect(r.data.status).toBe('published');
    expect(r.body).toContain('body');
  });
});
