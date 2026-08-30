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

describe('Metadata (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('Metadata e2e');
    wsHttp = wsRequest(app, ws.id);

    // Login to get token
    const response = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = response.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  describe('GET /_api/metadata/tags', () => {
    it('should get tags list', () => {
      return wsHttp
        .get('/_api/metadata/tags')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should filter tags by resourceType', () => {
      return wsHttp
        .get('/_api/metadata/tags')
        .query({ resourceType: 'task' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('GET /_api/metadata/statuses', () => {
    it('should get status definitions', () => {
      return wsHttp
        .get('/_api/metadata/statuses')
        .query({ type: 'task' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  describe('GET /_api/metadata/templates/projects', () => {
    it('should get project templates', () => {
      return wsHttp
        .get('/_api/metadata/templates/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  describe('POST /_api/metadata/tags', () => {
    it('should create a new tag', () => {
      return wsHttp
        .post('/_api/metadata/tags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'test-tag',
          color: '#FF0000',
          description: 'Test tag',
          resourceTypes: ['task'],
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data.name).toBe('test-tag');
        });
    });
  });
});
