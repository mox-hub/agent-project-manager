/**
 * MCP Config Generator
 * 生成项目级 .mcp.json 配置文件
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';

export interface McpConfig {
  mcpServers: {
    [key: string]: {
      command: string;
      args: string[];
      env?: Record<string, string>;
    };
  };
}

@Injectable()
export class McpConfigGenerator {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate .mcp.json content for a project
   */
  async generateConfig(projectId: string, baseUrl: string): Promise<McpConfig> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    return {
      mcpServers: {
        'apm-tasks': {
          command: 'npx',
          args: ['@anthropic/mcp-cli', '--base-url', baseUrl],
          env: {
            APM_PROJECT_ID: projectId,
          },
        },
      },
    };
  }

  /**
   * Generate MCP configuration for a specific runtime
   */
  generateRuntimeConfig(runtimeSessionToken: string, baseUrl: string): McpConfig {
    return {
      mcpServers: {
        'apm-tasks': {
          command: 'npx',
          args: ['@anthropic/mcp-cli', '--base-url', baseUrl, '--token', runtimeSessionToken],
          env: {
            APM_SESSION_TOKEN: runtimeSessionToken,
          },
        },
      },
    };
  }
}
