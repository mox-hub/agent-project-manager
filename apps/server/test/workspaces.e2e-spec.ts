import * as fs from 'fs';
import * as path from 'path';
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

describe('Workspaces (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let createdWsId: string;
  let createdWsPath: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('Workspaces e2e');
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

  describe('GET /_api/workspaces', () => {
    it('should list workspaces including default', () => {
      return wsHttp
        .get('/_api/workspaces')
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toHaveProperty('workspaces');
          expect(Array.isArray(res.body.data.workspaces)).toBe(true);
          expect(res.body.data.workspaces.length).toBeGreaterThanOrEqual(1);
        });
    });
  });

  describe('GET /_api/workspaces/current', () => {
    it('should echo the x-workspace-id header', () => {
      return wsHttp
        .get('/_api/workspaces/current')
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data.workspaceId).toBe(ws.id);
        });
    });
  });

  describe('POST /_api/workspaces', () => {
    it('should create and initialize a new workspace from template', () => {
      createdWsPath = path.join(ws.root, 'extra-ws');
      return wsHttp
        .post('/_api/workspaces')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'E2E Extra WS', path: createdWsPath })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toHaveProperty('id');
          createdWsId = res.body.data.id;
          expect(
            fs.existsSync(path.join(createdWsPath, 'data', 'apm.db')),
          ).toBe(true);
        });
    });
  });

  describe('POST /_api/workspaces/:id/activate', () => {
    it('should mark workspace as recently opened', () => {
      return wsHttp
        .post(`/_api/workspaces/${createdWsId}/activate`)
        .expect((res: Response) => {
          expect([200, 201]).toContain(res.status);
          expect(res.body.data.id).toBe(createdWsId);
        });
    });

    it('should 404 on unknown id', () => {
      return wsHttp
        .post('/_api/workspaces/nonexistent-ws/activate')
        .expect(404);
    });
  });
});
