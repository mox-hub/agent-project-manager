/**
 * 访问 token（PAT）e2e：创建（明文一次性）→ PAT 免登录调用受保护端点
 * → 列表脱敏 → 吊销后失效。
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'supertest';
import { AppModule } from '../src/app.module';
import {
  createIsolatedWorkspace,
  initTestApp,
  wsRequest,
  type IsolatedWorkspace,
  type WsRequest,
} from './helpers/ws-app';

describe('Access Tokens (PAT) e2e', () => {
  let app: INestApplication;
  let jwt: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('AccessToken e2e');
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
  });

  it('POST /auth/tokens 创建 token：明文仅本次返回且不含 hash', async () => {
    const res: Response = await wsHttp
      .post('/_api/auth/tokens')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ name: 'e2e-pat' })
      .expect(201);

    const data = res.body.data;
    expect(data.token).toMatch(/^apm_pat_[0-9a-f]{64}$/);
    expect(data.tokenPrefix).toMatch(/^apm_pat_/);
    expect(JSON.stringify(data)).not.toContain('tokenHash');
  });

  it('PAT 免登录调用受保护端点（/auth/me、/auth/tokens）', async () => {
    const createRes = await wsHttp
      .post('/_api/auth/tokens')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ name: 'pat-for-ai' });
    const pat: string = createRes.body.data.token;

    const me = await wsHttp
      .get('/_api/auth/me')
      .set('Authorization', `Bearer ${pat}`)
      .expect(200);
    expect(me.body.data.user.username).toBe('admin');

    const list = await wsHttp
      .get('/_api/auth/tokens')
      .set('Authorization', `Bearer ${pat}`)
      .expect(200);
    const tokens = list.body.data as Array<Record<string, unknown>>;
    expect(tokens.length).toBeGreaterThanOrEqual(2);
    for (const item of tokens) {
      expect(item).not.toHaveProperty('tokenHash');
      expect(item).toHaveProperty('tokenPrefix');
    }
  });

  let createdTokenId: string;
  it('GET /auth/tokens 列表脱敏且含 lastUsedAt 字段', async () => {
    const createRes = await wsHttp
      .post('/_api/auth/tokens')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ name: 'pat-revoke-me' });
    createdTokenId = createRes.body.data.id;

    const list = await wsHttp
      .get('/_api/auth/tokens')
      .set('Authorization', `Bearer ${jwt}`)
      .expect(200);
    const target = (list.body.data as Array<Record<string, unknown>>).find(
      (t) => t.id === createdTokenId,
    );
    expect(target).toBeTruthy();
    expect(target).not.toHaveProperty('tokenHash');
  });

  it('非法/伪造 PAT 返回 401', async () => {
    await wsHttp
      .get('/_api/auth/me')
      .set('Authorization', 'Bearer apm_pat_deadbeef')
      .expect(401);
    await wsHttp
      .get('/_api/auth/me')
      .set('Authorization', `Bearer ${jwt.slice(0, -1)}x`)
      .expect(401);
  });

  it('DELETE /auth/tokens/:id 吊销后 PAT 立即失效', async () => {
    const createRes = await wsHttp
      .post('/_api/auth/tokens')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ name: 'pat-short-lived' });
    const pat: string = createRes.body.data.token;
    const tokenId: string = createRes.body.data.id;

    // 吊销前可用
    await wsHttp
      .get('/_api/auth/me')
      .set('Authorization', `Bearer ${pat}`)
      .expect(200);

    await wsHttp
      .delete(`/_api/auth/tokens/${tokenId}`)
      .set('Authorization', `Bearer ${jwt}`)
      .expect(200);

    await wsHttp
      .get('/_api/auth/me')
      .set('Authorization', `Bearer ${pat}`)
      .expect(401);
  });

  it('DELETE 不存在的 token 返回 404', async () => {
    await wsHttp
      .delete('/_api/auth/tokens/nonexistent-id')
      .set('Authorization', `Bearer ${jwt}`)
      .expect(404);
  });
});
