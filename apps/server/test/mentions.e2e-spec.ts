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
import { createMemberFixture, createTaskFixture } from './helpers/fixtures';

describe('Mentions (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let taskId: string;
  let memberId: string;
  let memberHandle: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('Mentions e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;

    const fixture = await createTaskFixture(wsHttp, ws, accessToken);
    taskId = fixture.taskId;
    const member = await createMemberFixture(
      wsHttp,
      ws,
      accessToken,
      'E2E Mentioned',
      'ai_agent',
    );
    memberId = member.id;
    memberHandle = member.handle;
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  describe('POST /_api/mentions', () => {
    it('should create a mention on task', () => {
      return wsHttp
        .post('/_api/mentions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ sourceType: 'task', sourceId: taskId, memberId })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });
  });

  describe('POST /_api/mentions/parse', () => {
    it('should parse @handle text into mentions', () => {
      return wsHttp
        .post('/_api/mentions/parse')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          text: `请 @${memberHandle} 关注这个任务`,
          sourceType: 'task',
          sourceId: taskId,
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });
  });

  describe('GET /_api/mentions/member/:memberId', () => {
    it('should list mentions of member', () => {
      return wsHttp
        .get(`/_api/mentions/member/${memberId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });
  });

  describe('GET /_api/mentions/source/:sourceType/:sourceId', () => {
    it('should list mentions on the task', () => {
      return wsHttp
        .get(`/_api/mentions/source/task/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });
  });

  describe('GET /_api/mentions/suggest', () => {
    it('should suggest members by keyword', () => {
      return wsHttp
        .get('/_api/mentions/suggest?q=E2E')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });
  });
});
