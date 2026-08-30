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

describe('Metadata Project Roles (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let projectId: string;
  let roleId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('MetadataRoles e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;
    projectId = await createProjectFixture(
      wsHttp,
      accessToken,
      'E2E Roles Project',
    );
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  describe('POST /_api/metadata/project-roles', () => {
    it('should create a project role (admin is project owner)', () => {
      return wsHttp
        .post('/_api/metadata/project-roles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ projectId, key: 'reviewer', name: 'E2E 评审角色' })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
          roleId = res.body.data.id;
          expect(roleId).toBeTruthy();
        });
    });
  });

  describe('GET /_api/metadata/project-roles', () => {
    it('should list project roles filtered by project', () => {
      return wsHttp
        .get(`/_api/metadata/project-roles?projectId=${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
          expect(JSON.stringify(res.body.data)).toContain('reviewer');
        });
    });
  });

  describe('DELETE /_api/metadata/project-roles/:roleId', () => {
    it('should delete the project role', () => {
      return wsHttp
        .delete(`/_api/metadata/project-roles/${roleId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
