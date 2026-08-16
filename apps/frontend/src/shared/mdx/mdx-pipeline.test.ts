import { describe, it, expect } from 'vitest';
import { compileMdx, extractHeadings, stripFrontmatter, buildFrontmatter } from './mdx-pipeline';

describe('mdx-pipeline', () => {
  it('extracts headings with depth and slugs', async () => {
    const src = `# H1\n\n## H2 a\n\n### H3 a.1\n`;
    const heads = extractHeadings(src);
    expect(heads).toHaveLength(3);
    expect(heads[0].level).toBe(1);
    expect(heads[1].level).toBe(2);
    expect(heads[2].level).toBe(3);
    expect(heads[1].id).toBeTruthy();
  });

  it('skips headings inside fenced code blocks', async () => {
    const src = `# Real\n\n\`\`\`\n# not a heading\n\`\`\`\n`;
    const heads = extractHeadings(src);
    expect(heads).toHaveLength(1);
    expect(heads[0].title).toBe('Real');
  });

  it('strips frontmatter from body', () => {
    const src = `---\ntitle: a\n---\n# body`;
    const out = stripFrontmatter(src);
    expect(out.trimStart().startsWith('# body')).toBe(true);
  });

  it('buildFrontmatter roundtrips', () => {
    const out = buildFrontmatter('body', { title: 't', tags: ['a'] });
    expect(out).toContain('title: t');
    expect(out).toContain('tags:');
    expect(out).toContain('body');
  });

  it('compiles GFM table into a real React component', async () => {
    const src = `
| a | b |
|---|---|
| 1 | 2 |
| 3 | 4 |
`;
    const result = await compileMdx(src);
    expect(result.code).toBeTruthy();
  });

  it('compiles task list into a real React component', async () => {
    const src = `
- [ ] todo
- [x] done
`;
    const result = await compileMdx(src);
    expect(result.code).toBeTruthy();
  });

  it('compiles strikethrough and autolink into code', async () => {
    const src = `
~~old~~ [link](https://example.com)
`;
    const result = await compileMdx(src);
    expect(result.code).toBeTruthy();
  });
});
