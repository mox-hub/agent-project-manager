/**
 * Skills 管理面 e2e（GAP-T-10）：CRUD 全链 / builtin 禁删 / key 冲突 / 本地 SKILL.md 导入
 */
import { INestApplication } from '@nestjs/common';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
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

describe('Skills CRUD (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;
  let tmpDir: string;

  const auth = () => ({ Authorization: `Bearer ${accessToken}` });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('Skills CRUD e2e');
    wsHttp = wsRequest(app, ws.id);
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apm-skills-'));

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;

    // 种一条 builtin（不依赖 onModuleInit：种子只落 default 库）
    await ws.db.skillConfig.create({
      data: {
        key: 'e2e-builtin',
        name: 'E2E Builtin',
        source: 'builtin',
        content: '内置指令',
      },
    });
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('POST /skills 创建 custom 技能（content 落库）', () => {
    return wsHttp
      .post('/_api/skills')
      .set(auth())
      .send({ key: 'my-skill', name: 'My Skill', content: '指令正文' })
      .expect(201)
      .expect((res: Response) => {
        expect(res.body.data).toMatchObject({
          key: 'my-skill',
          name: 'My Skill',
          source: 'custom',
          content: '指令正文',
          enabled: true,
        });
      });
  });

  it('POST /skills key 冲突 409', () => {
    return wsHttp
      .post('/_api/skills')
      .set(auth())
      .send({ key: 'my-skill', name: 'Dup' })
      .expect(409);
  });

  it('POST /skills 非法 key 400', () => {
    return wsHttp
      .post('/_api/skills')
      .set(auth())
      .send({ key: 'Bad_Key!', name: 'Bad' })
      .expect(400);
  });

  it('GET /skills 列表为轻量形态（不含 content），GET /skills/:key 含全量', async () => {
    const listRes = await wsHttp
      .get('/_api/skills')
      .set(auth())
      .expect(200)
      .expect((res: Response) => {
        const skills = res.body.data.skills as Array<Record<string, unknown>>;
        const row = skills.find((s) => s.key === 'my-skill');
        expect(row).toBeDefined();
        expect(row).not.toHaveProperty('content');
      });

    void listRes;
    await wsHttp
      .get('/_api/skills/my-skill')
      .set(auth())
      .expect(200)
      .expect((res: Response) => {
        expect(res.body.data).toMatchObject({
          key: 'my-skill',
          content: '指令正文',
        });
      });
  });

  it('GET /skills/:key 未知 key 404', () => {
    return wsHttp.get('/_api/skills/ghost').set(auth()).expect(404);
  });

  it('PUT /skills/:key 更新 content', () => {
    return wsHttp
      .put('/_api/skills/my-skill')
      .set(auth())
      .send({ content: '新指令' })
      .expect(200)
      .expect((res: Response) => {
        expect(res.body.data.name).toBe('My Skill');
      });
  });

  it('DELETE builtin 403；DELETE custom 200 后 GET 404', async () => {
    await wsHttp.delete('/_api/skills/e2e-builtin').set(auth()).expect(403);

    await wsHttp.delete('/_api/skills/my-skill').set(auth()).expect(200);
    await wsHttp.get('/_api/skills/my-skill').set(auth()).expect(404);
  });

  describe('POST /skills/import', () => {
    it('导入本地 SKILL.md：frontmatter 提取元数据、正文物化 content', async () => {
      const skillDir = path.join(tmpDir, 'grill-import');
      fs.mkdirSync(skillDir, { recursive: true });
      const file = path.join(skillDir, 'SKILL.md');
      fs.writeFileSync(
        file,
        '---\nname: Grill Import\ndescription: "from frontmatter"\n---\n# 指令\n一次一问。',
        'utf8',
      );

      await wsHttp
        .post('/_api/skills/import')
        .set(auth())
        .send({ sourcePath: file, key: 'grill-import' })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toMatchObject({
            key: 'grill-import',
            name: 'Grill Import',
            description: 'from frontmatter',
            content: '# 指令\n一次一问。',
            sourcePath: file,
            source: 'custom',
          });
        });
    });

    it('文件不可读 400', () => {
      return wsHttp
        .post('/_api/skills/import')
        .set(auth())
        .send({
          sourcePath: path.join(tmpDir, 'nope', 'SKILL.md'),
          key: 'nope-skill',
        })
        .expect(400);
    });
  });
});
