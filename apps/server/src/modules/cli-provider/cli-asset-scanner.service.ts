import { Injectable, Logger } from '@nestjs/common';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * CLI 本地资产发现（CAP-A-02 增强 2026-09-30）：从 CLI 工具的本机配置
 * 读取技能与 MCP Server 清单，作为成员工具授权「CLI 来源」目录。
 *
 * 纯读取 best-effort：任何一路读不到（目录不存在/配置不可解析）返回空数组
 * 并附 note 说明，绝不抛错——standalone 场景 server 与 CLI 同机可行，
 * 远端 runtime 场景的发现通道留待接入层演进。
 */

export interface CliAssetItem {
  /** 目录内约定键（技能目录名 / mcpServers 键名） */
  key: string;
  /** 展示名 */
  name: string;
  description?: string | null;
}

export interface CliAssetsResult {
  providerId: string;
  skills: CliAssetItem[];
  mcpServers: CliAssetItem[];
  /** 每路扫描的降级说明（读不到时给人看） */
  notes: string[];
}

/** 从 SKILL.md 的 YAML frontmatter 抽 name/description（轻量正则，不引 YAML 依赖） */
function parseSkillMd(content: string): {
  name?: string;
  description?: string;
} {
  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return {};
  const body = fm[1];
  const name = body.match(/^name:\s*['"]?([^'"\r\n]+)['"]?\s*$/m)?.[1]?.trim();
  const description = body
    .match(/^description:\s*['"]?([^'"\r\n]+)['"]?\s*$/m)?.[1]
    ?.trim();
  return { name, description };
}

/** 列目录下子目录名（不存在/不可读返回空） */
function listSubdirs(dir: string): string[] {
  try {
    if (!existsSync(dir)) return [];
    return readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }
}

function readTextIfPresent(path: string): string | null {
  try {
    if (!existsSync(path)) return null;
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

/** 从 JSON 文本取顶层 mcpServers 对象的键 */
function jsonMcpServerKeys(text: string): string[] {
  try {
    const parsed = JSON.parse(text) as { mcpServers?: Record<string, unknown> };
    return Object.keys(parsed.mcpServers ?? {});
  } catch {
    return [];
  }
}

@Injectable()
export class CliAssetScannerService {
  private readonly logger = new Logger(CliAssetScannerService.name);

  listAssets(providerId: string): CliAssetsResult {
    switch (providerId) {
      case 'claude-code':
        return this.scanClaudeCode();
      case 'codex':
        return this.scanCodex();
      case 'zcode':
        return this.scanZcode();
      case 'opencode':
        return this.scanOpencode();
      default:
        return {
          providerId,
          skills: [],
          mcpServers: [],
          notes: [`未知 CLI provider：${providerId}`],
        };
    }
  }

  private scanClaudeCode(): CliAssetsResult {
    const notes: string[] = [];
    const home = homedir();

    const skillsDir = join(home, '.claude', 'skills');
    const skills: CliAssetItem[] = [];
    for (const dir of listSubdirs(skillsDir)) {
      const md = readTextIfPresent(join(skillsDir, dir, 'SKILL.md'));
      if (!md) continue;
      const meta = parseSkillMd(md);
      skills.push({
        key: dir,
        name: meta.name ?? dir,
        description: meta.description ?? null,
      });
    }
    if (skills.length === 0) notes.push('~/.claude/skills 未发现技能目录');

    const mcpServers: CliAssetItem[] = [];
    const claudeJson = readTextIfPresent(join(home, '.claude.json'));
    if (claudeJson) {
      for (const key of jsonMcpServerKeys(claudeJson)) {
        mcpServers.push({ key, name: key, description: null });
      }
    }
    if (mcpServers.length === 0)
      notes.push('~/.claude.json 未发现 mcpServers 配置');

    return { providerId: 'claude-code', skills, mcpServers, notes };
  }

  private scanCodex(): CliAssetsResult {
    const notes: string[] = [];
    const home = homedir();

    // config.toml 的 [mcp_servers.<name>] 段名（轻量正则，不引 TOML 依赖）
    const mcpServers: CliAssetItem[] = [];
    const configToml = readTextIfPresent(join(home, '.codex', 'config.toml'));
    if (configToml) {
      const seen = new Set<string>();
      for (const m of configToml.matchAll(/^\[mcp_servers\.([^.\]]+)\]/gm)) {
        const key = m[1]?.trim();
        if (key && !seen.has(key)) {
          seen.add(key);
          mcpServers.push({ key, name: key, description: null });
        }
      }
    }
    if (mcpServers.length === 0)
      notes.push('~/.codex/config.toml 未发现 mcp_servers 配置');

    return {
      providerId: 'codex',
      skills: [],
      mcpServers,
      notes: [...notes, 'codex 无标准技能目录约定'],
    };
  }

  private scanZcode(): CliAssetsResult {
    const notes: string[] = [];
    const home = homedir();

    const skillsDir = join(home, '.zcode', 'skills');
    const skills: CliAssetItem[] = [];
    for (const dir of listSubdirs(skillsDir)) {
      const md = readTextIfPresent(join(skillsDir, dir, 'SKILL.md'));
      const meta = md ? parseSkillMd(md) : {};
      skills.push({
        key: dir,
        name: meta.name ?? dir,
        description: meta.description ?? null,
      });
    }
    if (skills.length === 0) notes.push('~/.zcode/skills 未发现技能目录');

    const mcpServers: CliAssetItem[] = [];
    const configJson = readTextIfPresent(
      join(home, '.zcode', 'cli', 'config.json'),
    );
    if (configJson) {
      for (const key of jsonMcpServerKeys(configJson)) {
        mcpServers.push({ key, name: key, description: null });
      }
    }
    if (mcpServers.length === 0)
      notes.push('~/.zcode/cli/config.json 未发现 mcpServers 配置');

    return { providerId: 'zcode', skills, mcpServers, notes };
  }

  private scanOpencode(): CliAssetsResult {
    const notes: string[] = [];
    const home = homedir();

    const skillsDir = join(home, '.config', 'opencode', 'skills');
    const skills: CliAssetItem[] = [];
    for (const dir of listSubdirs(skillsDir)) {
      const md = readTextIfPresent(join(skillsDir, dir, 'SKILL.md'));
      const meta = md ? parseSkillMd(md) : {};
      skills.push({
        key: dir,
        name: meta.name ?? dir,
        description: meta.description ?? null,
      });
    }
    if (skills.length === 0)
      notes.push('~/.config/opencode/skills 未发现技能目录');

    return {
      providerId: 'opencode',
      skills,
      mcpServers: [],
      notes: [...notes, 'opencode 本地 MCP 配置解析留待接入层演进'],
    };
  }
}
