/**
 * 契约导出：把全量 OpenAPI 文档写到磁盘（默认仓库根 openapi.json）。
 *
 * 仅在 OPENAPI_EXPORT=1 时执行实际导出，常规 test:e2e 直接空跑跳过——
 * 复用 jest + ts-jest 的模块解析链路（tsx/ts-node 对 @octokit 等传递依赖的
 * exports 字段解析不兼容，jest 的 moduleNameMapper 原生支持 @/ 别名）。
 *
 * 数据库用 template.db 的一次性副本：导出只需要路由与 DTO 元数据，
 * PrismaService 的 JSON 修复写入落在副本上，不触碰 dev 库与模板库。
 *
 * 用法: pnpm --filter ./apps/server run contract:export
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { buildOpenApiDocument } from '../src/openapi.document';

const enabled = process.env.OPENAPI_EXPORT === '1';

describe('Contract export (openapi.json)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    if (!enabled) return;

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apm-openapi-'));
    const tmpDb = path.join(tmpDir, 'contract.db');
    fs.copyFileSync(
      path.resolve(__dirname, '..', 'prisma', 'template.db'),
      tmpDb,
    );
    process.env.DATABASE_URL = 'file:' + tmpDb.replace(/\\/g, '/');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication({ logger: ['error', 'warn'] });
    app.setGlobalPrefix('_api');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('export-openapi', async () => {
    if (!enabled) return;

    // 冒烟：应用可正常处理请求后再导出，避免导出半初始化的文档
    const probe = await request(app.getHttpServer()).get('/_api/openapi.json');
    expect([200, 404]).toContain(probe.status);

    const document = buildOpenApiDocument(app);
    const outPath = path.resolve(
      process.env.OPENAPI_OUT_PATH ??
        path.resolve(__dirname, '..', '..', '..', 'openapi.json'),
    );
    const content = JSON.stringify(document, null, 2) + '\n';
    fs.writeFileSync(outPath, content, 'utf-8');

    const pathCount = Object.keys(document.paths ?? {}).length;
    console.log(`contract:export ✓ ${outPath}（${pathCount} paths）`);
    expect(pathCount).toBeGreaterThan(0);
  });
});
