import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { execSync } from 'node:child_process';
import * as fs from 'fs';
import * as path from 'path';
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

describe('Git (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let projectId: string;
  let repoId: string;
  let localRepoPath: string;
  let ws: IsolatedWorkspace;
  let wsHttp: WsRequest;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = await initTestApp(moduleFixture);

    ws = createIsolatedWorkspace('Git e2e');
    wsHttp = wsRequest(app, ws.id);

    const loginRes = await wsHttp.post('/_api/auth/login').send({
      username: 'admin',
      password: 'password123',
    });
    accessToken = loginRes.body.data.accessToken;
    projectId = await createProjectFixture(
      wsHttp,
      accessToken,
      'E2E Git Project',
    );

    // 建一个真实的本地 git 仓库供只读接口（status/commits/branches）使用
    localRepoPath = path.join(ws.root, 'fixture-repo');
    fs.mkdirSync(localRepoPath, { recursive: true });
    execSync('git init -b main', { cwd: localRepoPath, stdio: 'ignore' });
    execSync(
      'git config user.email e2e@apm.local && git config user.name e2e',
      {
        cwd: localRepoPath,
        stdio: 'ignore',
        shell: 'bash',
      },
    );
    fs.writeFileSync(path.join(localRepoPath, 'README.md'), '# e2e fixture\n');
    execSync('git add . && git commit -m "init commit"', {
      cwd: localRepoPath,
      stdio: 'ignore',
      shell: 'bash',
    });
    // 第二个提交：根提交无父提交，服务端 diff <hash>^ 会对根提交报错
    fs.writeFileSync(path.join(localRepoPath, 'CHANGELOG.md'), '# changelog\n');
    execSync('git add . && git commit -m "second commit"', {
      cwd: localRepoPath,
      stdio: 'ignore',
      shell: 'bash',
    });
  });

  afterAll(async () => {
    await app.close();
    await ws.cleanup();
  });

  describe('GET /_api/git/tool/check', () => {
    it('should check git tool availability', () => {
      return wsHttp
        .get('/_api/git/tool/check')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('POST /_api/git/repos', () => {
    it('should register a local repository', () => {
      return wsHttp
        .post('/_api/git/repos')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          projectId,
          name: 'e2e-fixture-repo',
          localPath: localRepoPath,
          defaultBranch: 'main',
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toHaveProperty('id');
          repoId = res.body.data.id;
        });
    });

    it('should reject non-existent local path', () => {
      return wsHttp
        .post('/_api/git/repos')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          projectId,
          name: 'bad-repo',
          localPath: path.join(ws.root, 'no-such-dir'),
        })
        .expect(400);
    });
  });

  describe('GET /_api/git/repos', () => {
    it('should list repositories', () => {
      return wsHttp
        .get('/_api/git/repos')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ projectId })
        .expect(200);
    });
  });

  describe('GET /_api/git/repos/:repoId/status', () => {
    it('should return working tree status', () => {
      return wsHttp
        .get(`/_api/git/repos/${repoId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('GET /_api/git/repos/:repoId/commits', () => {
    it('should list commits', () => {
      return wsHttp
        .get(`/_api/git/repos/${repoId}/commits`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('GET /_api/git/repos/:repoId/branches', () => {
    it('should list branches', () => {
      return wsHttp
        .get(`/_api/git/repos/${repoId}/branches`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('GET /_api/git/repos/:repoId', () => {
    it('should get repository detail', () => {
      return wsHttp
        .get(`/_api/git/repos/${repoId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
