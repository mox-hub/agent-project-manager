import { describe, it, expect } from 'vitest';
import {
  parseFrontmatter,
  mergeFrontmatter,
  stringifyFrontmatter,
  parseFrontmatterProperties,
  setFrontmatterProperties,
} from './mdx-frontmatter';

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

  it('mergeFrontmatter writes unknown keys back at top level (not nested under custom)', () => {
    const src = `---
title: original
client: contoso
priority: P1
---`;
    const out = mergeFrontmatter(src, { title: 'updated' });
    const r = parseFrontmatter(out);
    // 顶层键扁平回写：再次解析仍能在 custom 桶看到同名键，且 YAML 里不存在 custom: 嵌套块
    expect(r.data.title).toBe('updated');
    expect(r.data.custom).toEqual({ client: 'contoso', priority: 'P1' });
    expect(out).not.toMatch(/^custom:/m);
    expect(out).toContain('client: contoso');
  });

  describe('parseFrontmatterProperties', () => {
    it('returns ordered full property list with inferred types', () => {
      const src = `---
title: Spec
tags: [a, b]
draft: true
priority: 3
created: 2026-09-17T10:00:00Z
client: contoso
---`;
      const r = parseFrontmatterProperties(src);
      expect(r.malformed).toBe(false);
      expect(r.properties.map((p) => p.key)).toEqual([
        'title',
        'tags',
        'draft',
        'priority',
        'created',
        'client',
      ]);
      const byKey = Object.fromEntries(r.properties.map((p) => [p.key, p]));
      expect(byKey.title.type).toBe('text');
      expect(byKey.tags.type).toBe('list');
      expect(byKey.draft.type).toBe('boolean');
      expect(byKey.draft.value).toBe(true);
      expect(byKey.priority.type).toBe('number');
      expect(byKey.priority.value).toBe(3);
      expect(byKey.created.type).toBe('date');
      expect(byKey.client.type).toBe('text');
    });

    it('marks system mirror keys readonly', () => {
      const src = `---
title: Spec
status: draft
project: APM
module: PF
short_id: APM-PF-001
author: alice
---`;
      const r = parseFrontmatterProperties(src);
      const readonlyKeys = r.properties.filter((p) => p.readonly).map((p) => p.key);
      expect(readonlyKeys).toEqual(['title', 'status', 'project', 'module', 'short_id']);
      expect(r.properties.find((p) => p.key === 'author')?.readonly).toBe(false);
    });

    it('treats comma-separated tags string as list type', () => {
      const r = parseFrontmatterProperties('---\ntags: a, b\n---');
      expect(r.properties[0]?.type).toBe('list');
    });

    it('flags malformed YAML instead of throwing', () => {
      const r = parseFrontmatterProperties('---\ntitle: "unterminated\n---');
      expect(r.malformed).toBe(true);
      expect(r.properties).toEqual([]);
    });

    it('returns empty list for content without frontmatter', () => {
      const r = parseFrontmatterProperties('# Hello');
      expect(r.properties).toEqual([]);
      expect(r.malformed).toBe(false);
    });
  });

  describe('setFrontmatterProperties', () => {
    it('adds keys to content without frontmatter (first block creation)', () => {
      const out = setFrontmatterProperties('# Hello', { author: 'alice', tags: ['x'] });
      const r = parseFrontmatter(out);
      expect(r.data.author).toBe('alice');
      expect(r.data.tags).toEqual(['x']);
      expect(r.body).toContain('Hello');
    });

    it('updates existing keys and preserves unknown ones', () => {
      const src = `---
title: old
client: contoso
---`;
      const out = setFrontmatterProperties(src, { title: 'new', author: 'alice' });
      const r = parseFrontmatter(out);
      expect(r.data.title).toBe('new');
      expect(r.data.author).toBe('alice');
      expect(r.data.custom).toEqual({ client: 'contoso' });
    });

    it('deletes keys on null / empty string / empty array', () => {
      const src = `---
title: t
tags: [a]
author: alice
draft: true
---`;
      const out = setFrontmatterProperties(src, {
        title: null,
        tags: [],
        author: '',
      });
      const r = parseFrontmatterProperties(out);
      expect(r.properties.map((p) => p.key)).toEqual(['draft']);
    });

    it('returns content untouched when frontmatter is malformed', () => {
      const src = '---\ntitle: "unterminated\n---';
      expect(setFrontmatterProperties(src, { author: 'x' })).toBe(src);
    });
  });
});
