/**
 * MCP Server Controller 单测（P0-6 止血）
 *
 * 重点覆盖：
 * - 无 token / 无效 token 的 SSE 握手拒绝（401）
 * - 有效 PAT 的握手通过（会话绑定 userId + tokenHash）
 * - 消息上行与建连 token 摘要不一致 → 拒绝（防跨会话伪造）
 * - 未知会话保持既有 404 语义
 */
import { HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { McpServerController } from './mcp-server.controller';
import { hashMcpToken } from './mcp-server.service';

describe('McpServerController - PAT 鉴权（P0-6）', () => {
  let controller: McpServerController;
  let accessTokenService: { validate: ReturnType<typeof vi.fn> };
  let mcpServer: Record<string, ReturnType<typeof vi.fn>>;

  const mockRes = (): Response & Record<string, ReturnType<typeof vi.fn>> => {
    const res: Record<string, unknown> = {
      // handlePostMessage 读取 (res as any).req.body，mock 同步补齐
      req: { body: {} },
    };
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    res.setHeader = vi.fn().mockReturnValue(res);
    res.flushHeaders = vi.fn().mockReturnValue(res);
    res.writeHead = vi.fn().mockReturnValue(res);
    res.write = vi.fn().mockReturnValue(res);
    res.end = vi.fn().mockReturnValue(res);
    return res as unknown as Response &
      Record<string, ReturnType<typeof vi.fn>>;
  };

  const mockReq = (headers: Record<string, string> = {}) =>
    ({ headers }) as unknown as Request;

  beforeEach(() => {
    accessTokenService = { validate: vi.fn() };
    mcpServer = {
      createSession: vi.fn().mockImplementation((userId, tokenHash) => ({
        sessionId: 'mcp_test_session',
        userId,
        tokenHash,
        createdAt: new Date(),
        lastSeenAt: new Date(),
      })),
      bindSession: vi.fn().mockReturnValue(null),
      validateSession: vi.fn().mockReturnValue(null),
      createServerForSession: vi
        .fn()
        .mockReturnValue({ connect: vi.fn().mockResolvedValue(undefined) }),
      removeSession: vi.fn(),
      getSessionCount: vi.fn().mockReturnValue(0),
    };
    controller = new McpServerController(
      mcpServer as never,
      accessTokenService as never,
    );
  });

  it('无 token 的 SSE 握手 → 401，且不做 PAT 校验', async () => {
    const res = mockRes();
    await controller.handleSse(res, mockReq(), undefined, undefined);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'token query parameter required' }),
    );
    expect(accessTokenService.validate).not.toHaveBeenCalled();
  });

  it('无效 token 的 SSE 握手 → 401', async () => {
    accessTokenService.validate.mockResolvedValue(null);
    const res = mockRes();
    await controller.handleSse(res, mockReq(), undefined, 'apm_pat_bad');

    expect(accessTokenService.validate).toHaveBeenCalledWith('apm_pat_bad');
    expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'invalid or expired token' }),
    );
  });

  it('有效 PAT 握手通过：创建会话并绑定 userId/tokenHash，SSE 头就绪', async () => {
    accessTokenService.validate.mockResolvedValue({
      id: 'user-1',
      accessTokenId: 'pat-1',
    });
    const res = mockRes();
    await controller.handleSse(res, mockReq(), undefined, 'apm_pat_good');

    expect(res.status).not.toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(mcpServer.createSession).toHaveBeenCalledWith(
      'user-1',
      hashMcpToken('apm_pat_good'),
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/event-stream',
    );
    // 连接建立交给 SDK（Server.connect 内部 start），归因 userId 传递到会话 Server
    expect(mcpServer.createServerForSession).toHaveBeenCalledWith('user-1');
  });

  it('复用 sessionId 重连时经 bindSession 重绑身份', async () => {
    accessTokenService.validate.mockResolvedValue({ id: 'user-2' });
    const res = mockRes();
    await controller.handleSse(
      res,
      mockReq(),
      'mcp_existing',
      'apm_pat_rotate',
    );

    expect(mcpServer.bindSession).toHaveBeenCalledWith(
      'mcp_existing',
      'user-2',
      hashMcpToken('apm_pat_rotate'),
    );
  });

  /** 构造一条已建连的会话：transport 表 + sessionAuth 表都挂上 SDK sessionId 键 */
  const registerLiveSession = (sdkSessionId: string, tokenHash: string) => {
    (
      controller as unknown as { transports: Map<string, unknown> }
    ).transports.set(sdkSessionId, {
      handlePostMessage: vi.fn().mockResolvedValue(undefined),
    });
    (
      controller as unknown as {
        sessionAuth: Map<string, { entryId: string; tokenHash: string }>;
      }
    ).sessionAuth.set(sdkSessionId, { entryId: 'mcp_entry_1', tokenHash });
  };

  it('消息上行 token 与会话摘要不匹配 → 401', async () => {
    const res = mockRes();
    registerLiveSession('sdk-s1', hashMcpToken('apm_pat_a'));

    await controller.handleMessages(res, mockReq(), 'sdk-s1', 'apm_pat_b');

    expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'token does not match session' }),
    );
  });

  it('消息上行 token 匹配 → 交给 transport 处理并刷新会话 TTL', async () => {
    const res = mockRes();
    registerLiveSession('sdk-s2', hashMcpToken('apm_pat_a'));

    await controller.handleMessages(res, mockReq(), 'sdk-s2', 'apm_pat_a');

    expect(mcpServer.validateSession).toHaveBeenCalledWith('mcp_entry_1');
    expect(res.status).not.toHaveBeenCalled();
  });

  it('未知会话保持 404 语义（先于 token 校验）', async () => {
    const res = mockRes();
    await controller.handleMessages(res, mockReq(), 'mcp_missing', 'apm_pat_x');

    expect(res.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(accessTokenService.validate).not.toHaveBeenCalled();
  });

  it('无 token 的消息上行 → 401', async () => {
    const res = mockRes();
    registerLiveSession('sdk-s3', hashMcpToken('apm_pat_a'));

    await controller.handleMessages(res, mockReq(), 'sdk-s3', undefined);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'token required' }),
    );
  });
});
