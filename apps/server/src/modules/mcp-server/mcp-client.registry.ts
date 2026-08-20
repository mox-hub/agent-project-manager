/**
 * MCP Client Registry
 *
 * 通过 @modelcontextprotocol/sdk 的 Client 连接外部 MCP server：
 * - stdio：本地命令（npx / node / 自定义二进制）
 * - http：Streamable HTTP 端点
 * - sse：旧版 SSE 端点
 *
 * probe() 连接 + listTools，返回在线状态 / 工具数 / 延迟；带超时保护，
 * 每次探测使用独立连接并在结束后关闭，不维持长连接。
 */

import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

export type McpTransportType = 'stdio' | 'http' | 'sse';

export interface McpProbeTarget {
  transport: McpTransportType;
  command?: string | null;
  args?: string[] | null;
  env?: Record<string, string> | null;
  url?: string | null;
  headers?: Record<string, string> | null;
}

export interface McpProbeResult {
  online: boolean;
  toolCount: number;
  latencyMs: number;
  error?: string;
  serverName?: string;
  serverVersion?: string;
}

/** 单步超时（连接 / listTools 各自计时） */
const STEP_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timeout after ${STEP_TIMEOUT_MS}ms`)),
        STEP_TIMEOUT_MS,
      ),
    ),
  ]);
}

@Injectable()
export class McpClientRegistry {
  private readonly logger = new Logger(McpClientRegistry.name);

  /**
   * 探测一个外部 MCP server：连接 → listTools → 关闭
   */
  async probe(target: McpProbeTarget): Promise<McpProbeResult> {
    const start = Date.now();
    const client = new Client(
      { name: 'apm-mcp-probe', version: '1.0.0' },
      { capabilities: {} },
    );

    try {
      const transport = this.createTransport(target);
      await withTimeout(client.connect(transport), 'connect');
      const listResult = await withTimeout(client.listTools(), 'listTools');

      let serverName: string | undefined;
      let serverVersion: string | undefined;
      try {
        const serverInfo = client.getServerVersion();
        serverName = serverInfo?.name;
        serverVersion = serverInfo?.version;
      } catch {
        // 某些 server 不返回版本信息，忽略
      }

      return {
        online: true,
        toolCount: listResult.tools?.length ?? 0,
        latencyMs: Date.now() - start,
        serverName,
        serverVersion,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`MCP probe failed (${target.transport}): ${message}`);
      return {
        online: false,
        toolCount: 0,
        latencyMs: Date.now() - start,
        error: message,
      };
    } finally {
      await client.close().catch(() => undefined);
    }
  }

  private createTransport(target: McpProbeTarget) {
    if (target.transport === 'stdio') {
      if (!target.command) {
        throw new Error('stdio transport requires a command');
      }
      // SDK 的 stdio transport 会整体替换 env，这里合并进程环境保证 PATH 可用
      const env = {
        ...(process.env as unknown as Record<string, string>),
        ...(target.env ?? {}),
      };
      return new StdioClientTransport({
        command: target.command,
        args: target.args ?? [],
        env,
        stderr: 'pipe',
      });
    }

    if (!target.url) {
      throw new Error(`${target.transport} transport requires a url`);
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(target.url);
    } catch {
      throw new Error(`invalid url: ${target.url}`);
    }

    const requestInit = target.headers
      ? { headers: target.headers }
      : undefined;
    if (target.transport === 'http') {
      return new StreamableHTTPClientTransport(
        parsedUrl,
        requestInit ? { requestInit } : undefined,
      );
    }
    return new SSEClientTransport(
      parsedUrl,
      requestInit ? { requestInit } : undefined,
    );
  }
}
