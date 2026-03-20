import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request, { type Response } from 'supertest';
import { AppModule } from '../src/app.module';

describe('Metadata (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('_api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    // Login to get token
    const response = await request(app.getHttpServer())
      .post('/_api/auth/login')
      .send({
        username: 'admin',
        password: 'password123',
      });
    accessToken = response.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /_api/metadata/tags', () => {
    it('should get tags list', () => {
      return request(app.getHttpServer())
        .get('/_api/metadata/tags')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should filter tags by resourceType', () => {
      return request(app.getHttpServer())
        .get('/_api/metadata/tags')
        .query({ resourceType: 'task' })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('GET /_api/metadata/statuses', () => {
    it('should get status definitions', () => {
      return request(app.getHttpServer())
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
      return request(app.getHttpServer())
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
      return request(app.getHttpServer())
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
