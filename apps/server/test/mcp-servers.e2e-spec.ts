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

describe('MCP Servers (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let serverId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('McpServers e2e');
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

  describe('POST /_api/mcp/servers', () => {
    it('should register an MCP server config', () => {
      return wsHttp
        .post('/_api/mcp/servers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'e2e-mcp-server',
          transport: 'stdio',
          command: 'node',
          args: ['server.js'],
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
          serverId = res.body.data.id ?? res.body.data.server?.id;
          expect(serverId).toBeTruthy();
        });
    });
  });

  describe('GET /_api/mcp/servers', () => {
    it('should list MCP server configs', () => {
      return wsHttp
        .get('/_api/mcp/servers')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain('e2e-mcp-server');
        });
    });
  });

  describe('PUT /_api/mcp/servers/:id', () => {
    it('should update MCP server config', () => {
      return wsHttp
        .put(`/_api/mcp/servers/${serverId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'e2e-mcp-server-v2',
          transport: 'stdio',
          command: 'node',
        })
        .expect((res: Response) => {
          expect([200, 201]).toContain(res.status);
        });
    }, 30000);
  });

  describe('POST /_api/mcp/servers/refresh-all', () => {
    it('should refresh all servers', () => {
      return wsHttp
        .post('/_api/mcp/servers/refresh-all')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
    }, 30000);
  });

  describe('POST /_api/mcp/servers/:id/refresh', () => {
    it('should refresh one server', () => {
      return wsHttp
        .post(`/_api/mcp/servers/${serverId}/refresh`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
    }, 30000);
  });

  describe('GET /_api/mcp/status', () => {
    it('should report MCP status', () => {
      return wsHttp
        .get('/_api/mcp/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('DELETE /_api/mcp/servers/:id (second server)', () => {
    it('should remove a fresh server config', async () => {
      const created = await wsHttp
        .post('/_api/mcp/servers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'e2e-mcp-delete',
          transport: 'http',
          url: 'http://localhost:9999',
        });
      expect(created.status).toBe(201);
      const delId = created.body.data.id ?? created.body.data.server?.id;
      return wsHttp
        .delete(`/_api/mcp/servers/${delId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
