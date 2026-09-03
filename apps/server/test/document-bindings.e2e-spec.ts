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
import { createMemberFixture, createProjectFixture } from './helpers/fixtures';

describe('Document Bindings & References (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let adminUserId: string;
  let documentId: string;
  let taskId: string;
  let linkId: string;
  let memberId: string;
  let member2Id: string;
  let reviewerId: string;
  let reviewer2Id: string;
  let linkAssigneeId: string;
  let sectionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('DocBindings e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;

    const user = await ws.db.user.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!user) throw new Error('fixture: workspace db has no user');
    adminUserId = user.id;

    const project = await createProjectFixture(
      wsHttp,
      accessToken,
      'E2E Doc Project',
    );

    // 任务与文档同项目（doc-task-link 需要 projectId），种子模块与状态定义
    await ws.db.projectModule.create({
      data: { projectId: project, code: 'TP', name: '平台功能' },
    });
    await ws.db.statusDefinition.createMany({
      data: [
        {
          projectId: project,
          type: 'task',
          key: 'todo',
          name: '待办',
          order: 1,
        },
        {
          projectId: project,
          type: 'task',
          key: 'in_progress',
          name: '进行中',
          order: 2,
        },
      ],
    });
    const taskRes = await wsHttp
      .post('/_api/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ projectId: project, moduleCode: 'TP', title: 'E2E Doc Task' });
    expect(taskRes.status).toBe(201);
    taskId = taskRes.body.data.id;

    const docRes = await wsHttp
      .post('/_api/documents')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'E2E 绑定文档',
        content: '# 标题\n\n正文',
        projectId: project,
        category: 'design',
      });
    expect(docRes.status).toBe(201);
    documentId = docRes.body.data.id;

    const section = await ws.db.documentSection.create({
      data: {
        documentId,
        title: 'E2E 章节',
        anchor: 'e2e-section',
        level: 1,
        order: 0,
      },
    });
    sectionId = section.id;

    const linkRes = await wsHttp
      .post(`/_api/documents/${documentId}/links`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ taskId, projectId: project });
    expect([200, 201]).toContain(linkRes.status);
    linkId = linkRes.body.data.id;
    expect(linkId).toBeTruthy();

    const m1 = await createMemberFixture(
      wsHttp,
      ws,
      accessToken,
      'E2E 作者',
      'ai_agent',
    );
    memberId = m1.id;
    const m2 = await createMemberFixture(
      wsHttp,
      ws,
      accessToken,
      'E2E 审阅者',
      'ai_agent',
    );
    member2Id = m2.id;
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  describe('POST /_api/document-bindings/authors', () => {
    it('should add document author', () => {
      return wsHttp
        .post('/_api/document-bindings/authors')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentId, memberId, role: 'author' })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });
  });

  describe('GET /_api/document-bindings/document/:documentId/authors', () => {
    it('should list document authors', () => {
      return wsHttp
        .get(`/_api/document-bindings/document/${documentId}/authors`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain(memberId);
        });
    });
  });

  describe('POST /_api/document-bindings/reviewers', () => {
    it('should add document reviewer', () => {
      return wsHttp
        .post('/_api/document-bindings/reviewers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentId, memberId: member2Id })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
          reviewerId = res.body.data.id;
          expect(reviewerId).toBeTruthy();
        });
    });

    it('should add a second reviewer for removal test', async () => {
      const m3 = await createMemberFixture(
        wsHttp,
        ws,
        accessToken,
        'E2E 审阅者2',
        'ai_agent',
      );
      const res = await wsHttp
        .post('/_api/document-bindings/reviewers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentId, memberId: m3.id });
      expect(res.status).toBe(201);
      reviewer2Id = res.body.data.id;
    });
  });

  describe('PATCH /_api/document-bindings/reviewers/:id', () => {
    it('should approve the reviewer', () => {
      return wsHttp
        .patch(`/_api/document-bindings/reviewers/${reviewerId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'approved', comment: 'e2e 通过' })
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain('approved');
        });
    });
  });

  describe('GET /_api/document-bindings/document/:documentId/reviewers', () => {
    it('should list document reviewers', () => {
      return wsHttp
        .get(`/_api/document-bindings/document/${documentId}/reviewers`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain(member2Id);
        });
    });
  });

  describe('DELETE /_api/document-bindings/reviewers/:id', () => {
    it('should remove the second reviewer', () => {
      return wsHttp
        .delete(`/_api/document-bindings/reviewers/${reviewer2Id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('POST /_api/document-bindings/doc-task-link/assignees', () => {
    it('should add link assignee', () => {
      return wsHttp
        .post('/_api/document-bindings/doc-task-link/assignees')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ documentTaskLinkId: linkId, memberId, role: 'owner' })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
          linkAssigneeId = res.body.data.id;
          expect(linkAssigneeId).toBeTruthy();
        });
    });
  });

  describe('GET /_api/document-bindings/doc-task-link/:linkId/assignees', () => {
    it('should list link assignees', () => {
      return wsHttp
        .get(`/_api/document-bindings/doc-task-link/${linkId}/assignees`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain(memberId);
        });
    });
  });

  describe('DELETE /_api/document-bindings/doc-task-link/assignees/:id', () => {
    it('should remove link assignee', () => {
      return wsHttp
        .delete(
          `/_api/document-bindings/doc-task-link/assignees/${linkAssigneeId}`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('DELETE /_api/document-bindings/document/:documentId/authors/:memberId/role/:role', () => {
    it('should remove document author (do last, keeps authors list non-empty before)', () => {
      return wsHttp
        .delete(
          `/_api/document-bindings/document/${documentId}/authors/${memberId}/role/author`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  // ============ Document References (Source) ============

  describe('GET /_api/references/generate', () => {
    it('should generate a reference string', () => {
      return wsHttp
        .get(
          `/_api/references/generate?documentId=${documentId}&sectionId=${sectionId}`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data.reference).toBe(
            `[[doc:${documentId}:${sectionId}]]`,
          );
        });
    });
  });

  describe('GET /_api/references/parse', () => {
    it('should parse a reference string', () => {
      const ref = encodeURIComponent(`[[doc:${documentId}#e2e-section]]`);
      return wsHttp
        .get(`/_api/references/parse?reference=${ref}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data.documentId).toBe(documentId);
          expect(res.body.data.anchor).toBe('e2e-section');
        });
    });
  });

  describe('GET /_api/references/source/:sourceType/:sourceId', () => {
    it('should return references created from the task source', async () => {
      const created = await wsHttp
        .post(
          `/_api/documents/${documentId}/references?createdBy=${adminUserId}`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ sourceType: 'task', sourceId: taskId, sectionId });
      expect(created.status).toBe(201);
      return wsHttp
        .get(`/_api/references/source/task/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(JSON.stringify(res.body.data)).toContain(documentId);
        });
    });
  });

  describe('GET /_api/references/section/:sectionId', () => {
    it('should return references of the section', () => {
      return wsHttp
        .get(`/_api/references/section/${sectionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('DELETE /_api/references/source/:sourceType/:sourceId', () => {
    it('should delete references of the source', () => {
      return wsHttp
        .delete(`/_api/references/source/task/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
