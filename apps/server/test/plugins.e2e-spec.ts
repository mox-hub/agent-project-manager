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

describe('Plugins (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let pluginId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('Plugins e2e');
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

  describe('POST /_api/plugins', () => {
    it('should install a plugin', () => {
      return wsHttp
        .post('/_api/plugins')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'e2e-plugin',
          provider: 'github',
          scope: 'global',
          manifest: { version: '1.0.0', entry: 'index.js' },
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
          pluginId = res.body.data.id;
          expect(pluginId).toBeTruthy();
        });
    });
  });

  describe('GET /_api/plugins', () => {
    it('should list plugins', () => {
      return wsHttp
        .get('/_api/plugins')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect((res: Response) => {
          if (res.status !== 200) {
            console.error('PLUG-LIST', JSON.stringify(res.body));
          }
          expect(res.status).toBe(200);
        })
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain('e2e-plugin');
        });
    });
  });

  describe('GET /_api/plugins/:id', () => {
    it('should get plugin detail', () => {
      return wsHttp
        .get(`/_api/plugins/${pluginId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain(pluginId);
        });
    });
  });

  describe('PUT /_api/plugins/:id', () => {
    it('should update plugin manifest', () => {
      return wsHttp
        .put(`/_api/plugins/${pluginId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'e2e-plugin-v2', manifest: { version: '1.1.0' } })
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain('e2e-plugin-v2');
        });
    });
  });

  describe('POST /_api/plugins/:id/permissions/*', () => {
    it('should grant a permission', () => {
      return wsHttp
        .post(`/_api/plugins/${pluginId}/permissions/grant`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ permission: 'file.read' })
        .expect(201);
    });

    it('should grant all permissions', () => {
      return wsHttp
        .post(`/_api/plugins/${pluginId}/permissions/grant-all`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
    });

    it('should revoke a permission', () => {
      return wsHttp
        .post(`/_api/plugins/${pluginId}/permissions/revoke`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ permission: 'file.read' })
        .expect(201);
    });

    it('should revoke all permissions', () => {
      return wsHttp
        .post(`/_api/plugins/${pluginId}/permissions/revoke-all`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
    });
  });

  describe('POST /_api/plugins/:id/disable & enable', () => {
    it('should disable then enable plugin', async () => {
      await wsHttp
        .post(`/_api/plugins/${pluginId}/disable`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ enabled: false })
        .expect(201);
      return wsHttp
        .post(`/_api/plugins/${pluginId}/enable`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ enabled: true })
        .expect(201);
    });
  });

  describe('DELETE /_api/plugins/:id (second plugin)', () => {
    it('should uninstall a fresh plugin', async () => {
      const created = await wsHttp
        .post('/_api/plugins')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'e2e-plugin-delete',
          provider: 'github',
          scope: 'global',
          manifest: { version: '0.0.1' },
        });
      expect(created.status).toBe(201);
      return wsHttp
        .delete(`/_api/plugins/${created.body.data.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
