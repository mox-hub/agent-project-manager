/**
 * 环境按需安装 e2e（CAP-A-30 环境自足，GAP-T-70）。
 *
 * stub runner 零网络走完整作业链：白名单检测 → 发起安装（201）→ 轮询至
 * succeeded → 白名单外 422 → 非法键 400（ValidationPipe）→ 未知作业 404。
 * 409 并发窗口由单测覆盖（stub 秒级完成抓不到 running 窗口）。
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { Response } from 'supertest';
import { AppModule } from '../src/app.module';
import {
  createIsolatedWorkspace,
  initTestApp,
  wsRequest,
  type IsolatedWorkspace,
  type WsRequest,
} from './helpers/ws-app';

// stub runner（零网络）+ 工具目录指临时目录（不污染 ~/.ordo）；本文件独立
// fork 进程执行（vitest fileParallelism=false + pool=forks），env 注入不外泄
process.env.ORDO_ENV_INSTALL_STUB = '1';
const runTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ordo-env-install-e2e-'));
process.env.ORDO_TOOLS_DIR = path.join(runTmp, 'tools');

describe('Environment install (e2e)', () => {
  let app: INestApplication;
  let jwt: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('EnvironmentInstall e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    jwt = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
    fs.rmSync(runTmp, { recursive: true, force: true });
  });

  it('GET /environment 返回六项检测 + installableTools 白名单', async () => {
    const res: Response = await wsHttp
      .get('/_api/environment')
      .set('Authorization', `Bearer ${jwt}`)
      .expect(200);
    // 六个基线键必在；dev 库播种了扩容批 provider 时 tools 会超 6（db 真相源）
    const toolKeys = (res.body.data.tools as { key: string }[]).map(
      (t) => t.key,
    );
    for (const key of [
      'node',
      'git',
      'claude-code',
      'codex',
      'zcode',
      'opencode',
    ]) {
      expect(toolKeys).toContain(key);
    }
    expect(res.body.data.installableTools).toEqual([
      'claude-code',
      'codex',
      'opencode',
    ]);
  });

  it('POST /environment/install 白名单工具 → 201，轮询至 succeeded', async () => {
    const start: Response = await wsHttp
      .post('/_api/environment/install')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ tool: 'claude-code' })
      .expect(201);
    expect(start.body.data.status).toBe('running');
    expect(start.body.data.package).toBe('@anthropic-ai/claude-code');
    const jobId = start.body.data.jobId as string;

    let job = start.body.data;
    for (let i = 0; i < 20 && job.status === 'running'; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const poll: Response = await wsHttp
        .get(`/_api/environment/install/${jobId}`)
        .set('Authorization', `Bearer ${jwt}`)
        .expect(200);
      job = poll.body.data;
    }
    expect(job.status).toBe('succeeded');
    expect(job.exitCode).toBe(0);
    // stub 命令输出进日志尾部
    expect(job.log).toContain('stub-install-ok');
  });

  it('POST 白名单外工具（zcode）→ 422 结构化信封', async () => {
    const res: Response = await wsHttp
      .post('/_api/environment/install')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ tool: 'zcode' })
      .expect(422);
    expect(res.body.success).toBe(false);
  });

  it('POST 非法工具键 → 400（ValidationPipe IsIn）', async () => {
    await wsHttp
      .post('/_api/environment/install')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ tool: 'definitely-not-a-tool' })
      .expect(400);
  });

  it('GET 未知作业 → 404', async () => {
    await wsHttp
      .get('/_api/environment/install/env-install-nope')
      .set('Authorization', `Bearer ${jwt}`)
      .expect(404);
  });
});
