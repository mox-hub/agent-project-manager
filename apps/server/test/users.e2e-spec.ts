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

describe('Users (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let adminUserId: string;
  let roleAssignmentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('Users e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  describe('GET /_api/users', () => {
    it('should list users (template admin seeded)', () => {
      return wsHttp
        .get('/_api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThanOrEqual(1);
          adminUserId = res.body.data[0].id;
          expect(adminUserId).toBeTruthy();
        });
    });
  });

  describe('GET /_api/users/search', () => {
    it('should search users by keyword', () => {
      return wsHttp
        .get('/_api/users/search?q=admin')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data.length).toBeGreaterThanOrEqual(1);
        });
    });
  });

  describe('GET /_api/users/:userId', () => {
    it('should get user by id', () => {
      return wsHttp
        .get(`/_api/users/${adminUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data.id).toBe(adminUserId);
        });
    });

    it('should 404 on unknown id', () => {
      return wsHttp
        .get('/_api/users/nonexistent-user')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('POST /_api/users/:userId/roles', () => {
    it('should add a global role', () => {
      return wsHttp
        .post(`/_api/users/${adminUserId}/roles`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ scopeType: 'global', role: 'maintainer' })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toHaveProperty('id');
          roleAssignmentId = res.body.data.id;
        });
    });
  });

  describe('GET /_api/users/:userId/roles', () => {
    it('should list user role assignments', () => {
      return wsHttp
        .get(`/_api/users/${adminUserId}/roles`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(
            res.body.data.some(
              (r: { id: string }) => r.id === roleAssignmentId,
            ),
          ).toBe(true);
        });
    });
  });

  describe('DELETE /_api/users/:userId/roles/:roleAssignmentId', () => {
    it('should remove the role assignment', () => {
      return wsHttp
        .delete(`/_api/users/${adminUserId}/roles/${roleAssignmentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should 404 when removing again', () => {
      return wsHttp
        .delete(`/_api/users/${adminUserId}/roles/${roleAssignmentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});
