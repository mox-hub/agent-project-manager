/**
 * MCP Config Generator
 *
 * 生成客户端可用的 MCP 配置（HTTP / SSE transport）
 *
 * V3 Addon:
 * - 旧设计（已废弃）：stdio 客户端 (npx @anthropic/mcp-cli)
 * - 新设计：HTTP SSE 客户端
 *   - Claude/Codex 等支持 HTTP MCP 的客户端可直接使用 URL 配置
 *   - URL 形如 http://host:port/_api/mcp/sse?token=<token>&sessionId=<sessionId>
 *   - 注意：客户端拿到 config 后需先 GET URL 建立 SSE，
 *     拿到 endpoint 事件后再 POST JSON-RPC 消息
 *   - 简化方案：让客户端持续复用单个 session（共享 sessionId）
 *
 * 下一里程碑：将 stdio 启动器 (apps/server/bin/apm-mcp-stdio.js) 重新加回，
 * 兼容 Claude Desktop 等只支持 stdio 的客户端。
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';

export interface McpServerHttpConfig {
  type: 'http' | 'sse';
  url: string;
  headers?: Record<string, string>;
}

export interface McpConfig {
  mcpServers: {
    [key: string]: McpServerHttpConfig;
  };
}

export interface GenerateConfigOptions {
  /**
   * 调用方传入的 sessionId；如果不传，每次生成新 sessionId。
   * 推荐：调用方缓存 sessionId 并跨多次使用复用。
   */
  sessionId?: string;
}

@Injectable()
export class McpConfigGenerator {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 为项目生成 MCP 配置
   * runtimeSessionToken 来自 RuntimeService.validateSession 的 token
   */
  async generateConfig(
    projectId: string,
    baseUrl: string,
    runtimeSessionToken: string,
    options: GenerateConfigOptions = {},
  ): Promise<McpConfig> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const sessionId = options.sessionId ?? `mcp_project_${projectId}`;
    const url = this.buildSseUrl(baseUrl, sessionId, runtimeSessionToken);

    return {
      mcpServers: {
        apm: {
          type: 'http',
          url: url.toString(),
          headers: {
            'x-project-id': projectId,
          },
        },
      },
    };
  }

  /**
   * 生成 Runtime 内部用的 MCP 配置（无 project 上下文）
   */
  generateRuntimeConfig(
    runtimeSessionToken: string,
    baseUrl: string,
    options: GenerateConfigOptions = {},
  ): McpConfig {
    const sessionId = options.sessionId ?? 'mcp_runtime_default';
    const url = this.buildSseUrl(baseUrl, sessionId, runtimeSessionToken);

    return {
      mcpServers: {
        apm: {
          type: 'http',
          url: url.toString(),
        },
      },
    };
  }

  /**
   * 生成 SSE-only 风格的配置（兼容只支持 sse 字段的客户端）
   */
  generateSseConfig(
    runtimeSessionToken: string,
    baseUrl: string,
    options: GenerateConfigOptions = {},
  ): McpConfig {
    const result = this.generateRuntimeConfig(
      runtimeSessionToken,
      baseUrl,
      options,
    );
    return {
      mcpServers: {
        apm: {
          ...result.mcpServers['apm'],
          type: 'sse',
        },
      },
    };
  }

  private buildSseUrl(baseUrl: string, sessionId: string, token: string): URL {
    const url = new URL('/_api/mcp/sse', baseUrl);
    url.searchParams.set('sessionId', sessionId);
    url.searchParams.set('token', token);
    return url;
  }
}
