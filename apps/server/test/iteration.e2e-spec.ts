import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request, { type Response } from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database/prisma.service';

describe('Iteration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;
  let projectId: string;
  let iterationId: string;

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

    // Login to get token
    const loginRes = await request(app.getHttpServer())
      .post('/_api/auth/login')
      .send({
        username: 'admin',
        password: 'password123',
      });
    accessToken = loginRes.body.data.accessToken;
    userId = loginRes.body.data.user.id;

    // Create a test project
    const projectRes = await request(app.getHttpServer())
      .post('/_api/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Test Project for Iterations',
        description: 'Test Description',
        type: 'software',
        visibility: 'private',
      });
    projectId = projectRes.body.data.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (iterationId) {
      await prisma.iteration.deleteMany({
        where: { id: iterationId },
      });
    }
    if (projectId) {
      await prisma.project.deleteMany({
        where: { id: projectId },
      });
    }
    await app.close();
  });

  describe('POST /_api/projects/:projectId/iterations', () => {
    it('should create a new iteration', () => {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 14);

      return request(app.getHttpServer())
        .post(`/_api/projects/${projectId}/iterations`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Sprint 1',
          goal: 'Complete core features',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          capacity: 100,
        })
        .expect(201)
        .expect((res: Response) => {
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data.name).toBe('Sprint 1');
          expect(res.body.data.status).toBe('planned');
          expect(res.body.data).toHaveProperty('_count');
          iterationId = res.body.data.id;
        });
    });

    it('should reject request without maintainer role', async () => {
      // Create a regular user project member
      const regularUser = await prisma.user.findFirst({
        where: { username: 'testuser' },
      });

      if (regularUser) {
        // Add user as member with 'developer' role (not maintainer)
        await prisma.projectMember.create({
          data: {
            projectId,
            userId: regularUser.id,
            role: 'developer',
          },
        });

        // Login as regular user
        const loginRes = await request(app.getHttpServer())
          .post('/_api/auth/login')
          .send({
            username: 'testuser',
            password: 'password123',
          });

        if (loginRes.status === 201) {
          const regularToken = loginRes.body.data.accessToken;

          return request(app.getHttpServer())
            .post(`/_api/projects/${projectId}/iterations`)
            .set('Authorization', `Bearer ${regularToken}`)
            .send({
              name: 'Unauthorized Sprint',
              startDate: new Date().toISOString(),
              endDate: new Date().toISOString(),
            })
            .expect(403);
        }
      }
    });
  });

  describe('GET /_api/projects/:projectId/iterations', () => {
    it('should get iterations for project', () => {
      return request(app.getHttpServer())
        .get(`/_api/projects/${projectId}/iterations`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: Response) => {
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should return 404 for non-existent project', () => {
      return request(app.getHttpServer())
        .get('/_api/projects/non-existent-id/iterations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});

