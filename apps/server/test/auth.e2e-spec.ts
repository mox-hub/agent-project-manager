import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import type { Response } from 'supertest';
import {
  createIsolatedWorkspace,
  initTestApp,
  wsRequest,
  type IsolatedWorkspace,
  type WsRequest,
} from './helpers/ws-app';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('Auth e2e');
    wsHttp = wsRequest(app, ws.id);
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  describe('POST /_api/auth/login', () => {
    it('should login with valid credentials', () => {
      return wsHttp
        .post('/_api/auth/login')
        .send({
          username: 'admin',
          password: 'password123',
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toHaveProperty('accessToken');
          expect(res.body.data).toHaveProperty('user');
          expect(res.body.data.user.username).toBe('admin');
        });
    });

    it('should reject invalid credentials', () => {
      return wsHttp
        .post('/_api/auth/login')
        .send({
          username: 'admin',
          password: 'wrongpassword',
        })
        .expect(401)
        .expect((res: Response) => {
          // 语义化错误码：前端据此定向映射"用户名或密码错误"
          expect(res.body.error?.code).toBe('INVALID_CREDENTIALS');
        });
    });

    it('should reject empty body with 400 validation error', () => {
      return wsHttp
        .post('/_api/auth/login')
        .send({})
        .expect(400)
        .expect((res: Response) => {
          expect(res.body.error?.code).toBe('VALIDATION_ERROR');
        });
    });

    /**
     * 【P1-4】提交 email 字段（而非 username）必须是 400 字段校验错误，
     * 而非撞认证逻辑的 401——修复前 guard 先于 ValidationPipe 执行，
     * passport-local 在 body 中找不到 username 字段直接 fail('Missing credentials', 401)。
     */
    it('should reject email-field body with 400 field error (not 401)', () => {
      return wsHttp
        .post('/_api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'password123',
        })
        .expect(400)
        .expect((res: Response) => {
          expect(res.body.error?.code).toBe('VALIDATION_ERROR');
          expect(res.body.error?.details).toBeDefined();
        });
    });
  });

  describe('GET /_api/auth/me', () => {
    let accessToken: string;

    beforeAll(async () => {
      const response = await wsHttp.post('/_api/auth/login').send({
        username: 'admin',
        password: 'password123',
      });
      accessToken = response.body.data.accessToken;
    });

    it('should get current user with valid token', () => {
      return wsHttp
        .get('/_api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toHaveProperty('user');
          expect(res.body.data).toHaveProperty('roles');
          expect(res.body.data.user.username).toBe('admin');
        });
    });

    it('should reject request without token', () => {
      return wsHttp.get('/_api/auth/me').expect(401);
    });

    it('should reject request with invalid token', () => {
      return wsHttp
        .get('/_api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /_api/auth/logout', () => {
    let accessToken: string;

    beforeAll(async () => {
      const response = await wsHttp.post('/_api/auth/login').send({
        username: 'admin',
        password: 'password123',
      });
      accessToken = response.body.data.accessToken;
    });

    it('should logout successfully', () => {
      return wsHttp
        .post('/_api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
    });
  });
});
