/**
 * MCP Server Controller
 *
 * 端点：
 *   GET  /_api/mcp/status         状态查询
 *   GET  /_api/mcp/sse?sessionId=&token=   SSE 握手
 *   POST /_api/mcp/messages?sessionId=&token=  JSON-RPC 消息上行
 *
 * 鉴权（P0-6 止血）：
 * - sse / messages 标记 @Public 绕过全局 JWT 守卫（MCP 客户端走 ?token= 通道，
 *   无法带 Authorization 头），鉴权在本控制器内完成；
 * - token 必须是有效 PAT（AccessTokenService.validate，apm_pat_ 前缀），
 *   无 token → 401，token 无效/过期/吊销 → 401；
 * - SSE 长连接只在建连时查库校验一次；token 摘要存入 session，
 *   消息上行时做零成本比对（防跨会话伪造），不重复查库。
 */

import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { AccessTokenService } from '@/modules/auth/access-token.service';
import { hashMcpToken, McpServerService } from './mcp-server.service';
import { McpStatusResponseDto } from './dto/mcp-response.dto';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';
import { Public } from '@/common/decorators/public.decorator';

@ApiTags('MCP Server')
@Controller('mcp')
export class McpServerController {
  private readonly logger = new Logger(McpServerController.name);

  /** 活跃 SSE transport 映射（SDK transport.sessionId -> transport） */
  private readonly transports = new Map<string, SSEServerTransport>();

  /**
   * SDK sessionId → 会话鉴权信息（service 的 mcp_* 会话 id + 建连时校验通过的
   * token 摘要）。SDK endpoint 事件对客户端暴露的是 transport.sessionId（UUID），
   * 消息上行按它寻址；service 会话表仍以 mcp_* id 做 TTL/归因。
   */
  private readonly sessionAuth = new Map<
    string,
    { entryId: string; tokenHash: string }
  >();

  constructor(
    private readonly mcpServer: McpServerService,
    private readonly accessTokenService: AccessTokenService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get MCP Server status' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: McpStatusResponseDto,
    description: 'MCP Server status',
  })
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
  @Public()
  @Get('sse')
  async handleSse(
    @Res() res: Response,
    @Req() req: Request,
    @Query('sessionId') sessionId?: string,
    @Query('token') token?: string,
  ) {
    // 1. 校验 token：必须为有效 PAT（长连接仅在此时查库一次）
    const principal = await this.authenticate(res, token, req);
    if (!principal) return;

    // 2. 校验 session（如果传入）；复用时重绑身份（支持 PAT 轮换后重连）
    const tokenHash = hashMcpToken(token as string);
    let entry = sessionId
      ? this.mcpServer.bindSession(sessionId, principal.id, tokenHash)
      : null;
    if (!entry) {
      // 创建新 session
      entry = this.mcpServer.createSession(principal.id, tokenHash);
    }

    // 3. SSE headers
    // 注意：不要在这里 flushHeaders——SDK 的 transport.start() 需要 res.writeHead(200)
    // 自己发头，提前 flush 会导致 ERR_HTTP_HEADERS_SENT、SSE 流发不出 endpoint 事件
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // 4. 创建 SSEServerTransport（endpoint 是客户端 POST 消息的相对路径）
    // include sessionId / token query 让客户端 POST 时复用
    const endpoint = `/_api/mcp/messages?sessionId=${entry.sessionId}&token=${token}`;
    const transport = new SSEServerTransport(endpoint, res);
    // SDK endpoint 事件暴露的是 transport.sessionId（UUID），消息上行按它寻址；
    // service 的 mcp_* 会话 id 只在服务端做 TTL/归因，两套 id 在此对接
    this.transports.set(transport.sessionId, transport);
    this.sessionAuth.set(transport.sessionId, {
      entryId: entry.sessionId,
      tokenHash,
    });

    // 5. onclose 清理
    transport.onclose = () => {
      this.transports.delete(transport.sessionId);
      this.sessionAuth.delete(transport.sessionId);
      this.mcpServer.removeSession(entry.sessionId);
      this.logger.log(`SSE transport closed: ${entry.sessionId}`);
    };

    // 5.5 connect server to transport (one-shot; per-session)
    const server = this.mcpServer.createServerForSession(principal.id);
    if (!server) {
      this.logger.error('MCP server not initialized');
      this.transports.delete(entry.sessionId);
      this.mcpServer.removeSession(entry.sessionId);
      res.status(HttpStatus.SERVICE_UNAVAILABLE).end();
      return;
    }

    try {
      // 6. 启动 transport：SDK 的 Server.connect() 内部会调用 transport.start()
      // 并发送 endpoint 事件——不要手动 start()，否则 "already started" 异常
      // 会导致会话刚建即被清理、消息通道 404
      await server.connect(transport);
      this.logger.log(
        `SSE transport started: ${entry.sessionId} (user=${principal.id})`,
      );
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
  @Public()
  @Post('messages')
  async handleMessages(
    @Res() res: Response,
    @Req() req: Request,
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

    // 消息上行校验：与建连时登记的 token 摘要比对（不重复查库），
    // 防止知道 sessionId 的第三方用任意 token 向会话注入消息
    const auth = this.sessionAuth.get(sessionId);
    if (!auth || auth.tokenHash !== hashMcpToken(token)) {
      res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ error: 'token does not match session' });
      return;
    }
    // 顺带刷新 service 会话 TTL（lastSeenAt）
    this.mcpServer.validateSession(auth.entryId);

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

  /**
   * PAT 校验：query token 优先（MCP 客户端标准通道），兼容 Authorization Bearer。
   * 校验失败时写响应并返回 null；通过时返回 PAT principal（含 userId）。
   */
  private async authenticate(
    res: Response,
    token: string | undefined,
    req?: Request,
  ): Promise<{ id: string } | null> {
    const bearer = req?.headers?.authorization;
    const candidate = token ?? bearer?.replace(/^Bearer\s+/i, '') ?? undefined;
    if (!candidate) {
      res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ error: 'token query parameter required' });
      return null;
    }
    const principal = await this.accessTokenService.validate(candidate);
    if (!principal) {
      this.logger.warn('MCP authentication failed: invalid or expired token');
      res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ error: 'invalid or expired token' });
      return null;
    }
    return { id: principal.id };
  }
}
