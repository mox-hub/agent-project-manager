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
  let commitHash: string;
  let commitId: string;
  let bareRepoUrl: string;
  let clonePath: string;
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

  describe('GET /_api/git/repos/:repoId/commits (capture hash)', () => {
    it('should list commits and capture latest hash', () => {
      return wsHttp
        .get(`/_api/git/repos/${repoId}/commits`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          const list = Array.isArray(res.body.data)
            ? res.body.data
            : (res.body.data?.items ?? []);
          expect(list.length).toBeGreaterThanOrEqual(1);
          commitHash = list[0].hash;
          commitId = list[0].id;
          expect(commitHash).toBeTruthy();
          expect(commitId).toBeTruthy();
        });
    });
  });

  describe('GET /_api/git/commits/:commitId', () => {
    it('should get commit detail with files', () => {
      return wsHttp
        .get(`/_api/git/commits/${commitId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          const detail = res.body.data;
          expect(detail).toBeTruthy();
          expect(detail.files).toBeTruthy();
        });
    });
  });

  describe('POST /_api/git/diff', () => {
    it('should generate diff between commits', () => {
      return wsHttp
        .post('/_api/git/diff')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ repoId, baseRef: 'main~1', targetRef: 'main' })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });
  });

  describe('POST /_api/git/tool/path', () => {
    it('should set git executable path (real path)', () => {
      const where = execSync('where git || which git', {
        encoding: 'utf8',
        shell: 'bash',
      }).trim();
      const gitPath = where.split(/\r?\n/)[0].trim();
      expect(gitPath).toBeTruthy();
      return wsHttp
        .post('/_api/git/tool/path')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ gitPath })
        .expect((res: Response) => {
          expect([200, 201]).toContain(res.status);
        });
    });
  });

  describe('GET /_api/git/projects/:projectId/workspace', () => {
    it('should return empty workspace config initially', () => {
      return wsHttp
        .get(`/_api/git/projects/${projectId}/workspace`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('PUT /_api/git/projects/:projectId/workspace', () => {
    it('should set local workspace path', () => {
      return wsHttp
        .put(`/_api/git/projects/${projectId}/workspace`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ localPath: localRepoPath })
        .expect(200)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });
  });

  describe('POST /_api/git/projects/:projectId/workspace/validate', () => {
    it('should validate the configured workspace', () => {
      return wsHttp
        .post(`/_api/git/projects/${projectId}/workspace/validate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toBeTruthy();
        });
    });
  });

  describe('POST /_api/git/projects/:projectId/workspace/clone', () => {
    it('should clone a local bare repository offline', async () => {
      // 本地裸库做 clone 源，全程离线
      bareRepoUrl = path.join(ws.root, 'fixture-bare.git');
      execSync(`git clone --bare "${localRepoPath}" "${bareRepoUrl}"`, {
        stdio: 'ignore',
        shell: 'bash',
      });
      clonePath = path.join(ws.root, 'cloned-repo');
      return wsHttp
        .post(`/_api/git/projects/${projectId}/workspace/clone`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ remoteUrl: bareRepoUrl, localPath: clonePath })
        .expect((res: Response) => {
          if (res.status !== 201) {
            console.error('CLONE-ERR', JSON.stringify(res.body));
          }
          expect(res.status).toBe(201);
          expect(res.body.data).toBeTruthy();
        });
    });
  });

  describe('GET /_api/git/projects/:projectId/workspace (after setup)', () => {
    it('should return workspace pointed at the cloned repo', () => {
      return wsHttp
        .get(`/_api/git/projects/${projectId}/workspace`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          // clone 流程最后会把 localPath/remoteUrl 更新为克隆产物
          // JSON.stringify 会转义反斜杠，先还原再比较
          const text = JSON.stringify(res.body.data)
            .replace(/\\\\/g, '\\')
            .toLowerCase();
          expect(text).toContain(clonePath.toLowerCase());
          expect(text).toContain('bare.git');
        });
    });
  });
});
