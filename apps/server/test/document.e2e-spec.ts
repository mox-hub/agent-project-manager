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
import { createProjectFixture } from './helpers/fixtures';

describe('Document (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let projectId: string;
  let documentId: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('Document e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;
    projectId = await createProjectFixture(
      wsHttp,
      accessToken,
      'E2E Document Project',
    );
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  describe('POST /_api/documents', () => {
    it('should create a new document', () => {
      return wsHttp
        .post('/_api/documents')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'E2E 文档',
          content: '# 标题\n\n正文内容',
          projectId,
          category: 'design',
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data.title).toBe('E2E 文档');
          documentId = res.body.data.id;
        });
    });
  });

  describe('GET /_api/documents', () => {
    it('should list documents', () => {
      return wsHttp
        .get('/_api/documents')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should return document stats', () => {
      return wsHttp
        .get('/_api/documents/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('GET /_api/documents/:id', () => {
    it('should get document by id', () => {
      return wsHttp
        .get(`/_api/documents/${documentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data.id).toBe(documentId);
        });
    });

    it('should return 404 for non-existent document', () => {
      return wsHttp
        .get('/_api/documents/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('DELETE + restore', () => {
    it('should soft-delete document then restore it', async () => {
      await wsHttp
        .delete(`/_api/documents/${documentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect((res: Response) => {
          expect([200, 204]).toContain(res.status);
        });

      return wsHttp
        .post(`/_api/documents/${documentId}/restore`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect((res: Response) => {
          expect([200, 201]).toContain(res.status);
        });
    });
  });
});
