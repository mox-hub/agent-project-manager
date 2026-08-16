/**
 * MCP Server Controller
 *
 * 端点：
 *   GET  /_api/mcp/status         状态查询
 *   GET  /_api/mcp/sse?sessionId=&token=   SSE 握手
 *   POST /_api/mcp/messages?sessionId=&token=  JSON-RPC 消息上行
 *
 * 鉴权：使用 MCP session token（由 service.createSession 创建）
 */

import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { McpServerService } from './mcp-server.service';

@ApiTags('MCP Server')
@Controller('mcp')
export class McpServerController {
  private readonly logger = new Logger(McpServerController.name);

  /** 活跃 SSE transport 映射（sessionId -> transport） */
  private readonly transports = new Map<string, SSEServerTransport>();

  constructor(private readonly mcpServer: McpServerService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get MCP Server status' })
  @ApiResponse({ status: 200, description: 'MCP Server status' })
  async getStatus() {
    return {
      status: 'ready',
      version: '1.0.0',
      capabilities: { tools: true, resources: true, prompts: true },
      activeSessions: this.mcpServer.getSessionCount(),
    };
  }

  /**
   * SSE 握手
   * Client → GET /_api/mcp/sse?sessionId=...&token=...
   * 返回 text/event-stream
   */
  @Get('sse')
  async handleSse(
    @Res() res: Response,
    @Query('sessionId') sessionId?: string,
    @Query('token') token?: string,
  ) {
    // 1. 校验 token
    if (!token) {
      res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ error: 'token query parameter required' });
      return;
    }

    // 2. 校验 session（如果传入）
    let entry = sessionId ? this.mcpServer.validateSession(sessionId) : null;
    if (!entry) {
      // 创建新 session
      entry = this.mcpServer.createSession(null);
    }

    // 3. SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // 4. 创建 SSEServerTransport（endpoint 是客户端 POST 消息的相对路径）
    // include sessionId / token query 让客户端 POST 时复用
    const endpoint = `/_api/mcp/messages?sessionId=${entry.sessionId}&token=${token}`;
    const transport = new SSEServerTransport(endpoint, res);
    this.transports.set(entry.sessionId, transport);

    // 5. onclose 清理
    transport.onclose = () => {
      this.transports.delete(entry.sessionId);
      this.mcpServer.removeSession(entry.sessionId);
      this.logger.log(`SSE transport closed: ${entry.sessionId}`);
    };

    // 5.5 connect server to transport (one-shot; per-session)
    const server = this.mcpServer.createServerForSession();
    if (!server) {
      this.logger.error('MCP server not initialized');
      this.transports.delete(entry.sessionId);
      this.mcpServer.removeSession(entry.sessionId);
      res.status(HttpStatus.SERVICE_UNAVAILABLE).end();
      return;
    }

    try {
      // 6. 启动 transport（会发送 endpoint 事件）
      await transport.start();
      // 给 Server 绑定 transport；server 接管后由 server.onclose 回调清理
      await server.connect(transport);
      this.logger.log(`SSE transport started: ${entry.sessionId}`);
    } catch (err) {
      this.logger.error(`Failed to start SSE transport: ${err}`);
      this.transports.delete(entry.sessionId);
      this.mcpServer.removeSession(entry.sessionId);
      res.end();
    }
  }

  /**
   * 客户端 POST JSON-RPC 消息到 POST 端点
   */
  @Post('messages')
  async handleMessages(
    @Res() res: Response,
    @Query('sessionId') sessionId: string,
    @Query('token') token: string,
  ) {
    const transport = this.transports.get(sessionId);
    if (!transport) {
      res
        .status(HttpStatus.NOT_FOUND)
        .json({ error: `transport not found for session ${sessionId}` });
      return;
    }
    if (!token) {
      res.status(HttpStatus.UNAUTHORIZED).json({ error: 'token required' });
      return;
    }

    try {
      await transport.handlePostMessage(
        (res as any).req,
        res,
        (res as any).req.body,
      );
    } catch (err) {
      this.logger.error(`Failed to handle POST message: ${err}`);
      if (!res.headersSent) {
        res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ error: 'internal error' });
      }
    }
  }
}
