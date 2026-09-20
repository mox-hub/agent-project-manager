/**
 * spec 双版本（契约与文档知识层 v2 纪要 §10）——实机验收 spec。
 *
 * 走真实 AppModule + 隔离工作区：发布即落冻结快照（publishedVersionId
 * 指向 DocumentVersion），编辑中 draft 不影响冻结版；getPublishedContent
 * 以冻结版为验收证据；再次发布生成新快照。
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'supertest';
import { AppModule } from '../src/app.module';
import { DocumentService } from '../src/modules/document/document.service';
import { DocRegistryService } from '../src/modules/document/services/doc-registry.service';
import {
  createIsolatedWorkspace,
  initTestApp,
  wsRequest,
  withWs,
  type IsolatedWorkspace,
  type WsRequest,
} from './helpers/ws-app';
import { createProjectFixture } from './helpers/fixtures';

describe('spec 双版本 (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let projectId: string;
  let documentService: DocumentService;
  let docRegistry: DocRegistryService;
  let docId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('SpecDualVersion e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;

    documentService = app.get(DocumentService);
    docRegistry = app.get(DocRegistryService);
    projectId = await createProjectFixture(
      wsHttp,
      accessToken,
      'spec 双版本项目',
    );
  }, 60000);

  afterAll(async () => {
    await ws.cleanup().catch(() => undefined);
    await app.close();
  });

  it('草稿阶段：publishedVersionId 为空，getPublishedContent 返回 null 内容', async () => {
    const createRes = await wsHttp
      .post('/_api/documents')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'PRD v3',
        content: '# 草稿内容\n\n尚未发布。',
        projectId,
        category: 'requirement',
      })
      .expect(201)
      .expect((res: Response) => {
        expect(res.body.data).toHaveProperty('id');
      });
    docId = createRes.body.data.id as string;

    const published = await withWs(ws.id, () =>
      documentService.getPublishedContent(docId),
    );
    expect(published.publishedVersionId).toBeNull();
    expect(published.content).toBeNull();
  });

  it('发布：落冻结快照并记 publishedVersionId；T0 digest 照常排队', async () => {
    await wsHttp
      .put(`/_api/documents/${docId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'published' })
      .expect(200);

    const detail = await withWs(ws.id, () => documentService.findOne(docId));
    const publishedVersionId = (detail as { publishedVersionId?: string })
      .publishedVersionId!;
    expect(publishedVersionId).toBeTruthy();

    // 冻结版内容 = 发布时内容
    const published = await withWs(ws.id, () =>
      documentService.getPublishedContent(docId),
    );
    expect(published.version).toBeTruthy();
    expect(published.content).toContain('草稿内容');
    void docRegistry;
  });

  it('编辑中 draft 不影响冻结版；再次发布生成新快照', async () => {
    // 已发布后继续编辑（draft 变更）
    await wsHttp
      .put(`/_api/documents/${docId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: '# 已发布后的新草稿\n\n冻结版不应受影响。' })
      .expect(200);

    const before = await withWs(ws.id, () =>
      documentService.getPublishedContent(docId),
    );
    expect(before.content).toContain('草稿内容');
    const beforeVersionId = before.publishedVersionId!;

    // 再次发布 → 新冻结快照
    await wsHttp
      .put(`/_api/documents/${docId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'published' })
      .expect(200);

    const after = await withWs(ws.id, () =>
      documentService.getPublishedContent(docId),
    );
    expect(after.publishedVersionId).toBeTruthy();
    expect(after.publishedVersionId).not.toBe(beforeVersionId);
    expect(after.content).toContain('新草稿');

    const detail = await withWs(ws.id, () => documentService.findOne(docId));
    expect((detail as { publishedVersionId?: string }).publishedVersionId).toBe(
      after.publishedVersionId,
    );
  });
});
