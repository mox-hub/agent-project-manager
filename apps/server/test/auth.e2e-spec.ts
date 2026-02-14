import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /_api/auth/login', () => {
    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/_api/auth/login')
        .send({
          username: 'admin',
          password: 'password123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('accessToken');
          expect(res.body.data).toHaveProperty('user');
          expect(res.body.data.user.username).toBe('admin');
        });
    });

    it('should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/_api/auth/login')
        .send({
          username: 'admin',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should reject missing credentials', () => {
      return request(app.getHttpServer())
        .post('/_api/auth/login')
        .send({})
        .expect(401);
    });
  });

  describe('GET /_api/auth/me', () => {
    let accessToken: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/_api/auth/login')
        .send({
          username: 'admin',
          password: 'password123',
        });
      accessToken = response.body.data.accessToken;
    });

    it('should get current user with valid token', () => {
      return request(app.getHttpServer())
        .get('/_api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('user');
          expect(res.body.data).toHaveProperty('roles');
          expect(res.body.data.user.username).toBe('admin');
        });
    });

    it('should reject request without token', () => {
      return request(app.getHttpServer()).get('/_api/auth/me').expect(401);
    });

    it('should reject request with invalid token', () => {
      return request(app.getHttpServer())
        .get('/_api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /_api/auth/logout', () => {
    let accessToken: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/_api/auth/login')
        .send({
          username: 'admin',
          password: 'password123',
        });
      accessToken = response.body.data.accessToken;
    });

    it('should logout successfully', () => {
      return request(app.getHttpServer())
        .post('/_api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
    });
  });
});
