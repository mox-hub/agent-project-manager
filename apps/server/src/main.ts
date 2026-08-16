import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './core/config/config.service';
import { LoggerService } from './core/logger/logger.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { RateLimitException } from './common';
import helmet from 'helmet';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { isAllowedOrigin, parseAllowedOriginsFromEnv } from './common';
import express, { type Request, type Response } from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    abortOnError: false,
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const logger = app.get(LoggerService);
  logger.setContext('Bootstrap');
  app.useLogger(logger);
  app.flushLogs();

  app.setGlobalPrefix('_api');

  // Global JSON body parser (must be before routes)
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

  // GitHub webhook requires raw body for HMAC signature verification
  app.use(
    '/_api/integrations/github/webhook',
    bodyParser.json({
      verify: (req, _res, buf) => {
        (req as Request & { rawBody?: Buffer }).rawBody = buf;
      },
      limit: '5mb',
    }),
  );

  // Global validation pipe
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

  // CSRF protection (note: disabled for API endpoints, handled at route level if needed)
  // app.use(csurf({ cookie: false }));

  // Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      crossOriginEmbedderPolicy: { policy: 'require-corp' },
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
    }),
  );

  // CORS configuration with whitelist
  const allowedOrigins = parseAllowedOriginsFromEnv();
  app.enableCors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin, allowedOrigins)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  // Custom rate limit exception handler
  app.use((err: unknown, req: unknown, res: unknown, next: unknown) => {
    if (err instanceof RateLimitException) {
      const response = res as any;
      response.status(err.getStatus()).json({
        statusCode: err.getStatus(),
        message: err.message,
        error: 'Rate limit exceeded',
        timestamp: new Date().toISOString(),
        path: (req as any).url,
      });
      return;
    }
    (next as any)();
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Agent Project Manager API')
    .setDescription('Agent Project Manager API Documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'x-runtime-session-token',
        description:
          'Runtime session token, and include x-runtime-session-id header together',
      },
      'RuntimeSession',
    )
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Projects', 'Project management endpoints')
    .addTag('Tasks', 'Task management endpoints')
    .addTag('Iterations', 'Iteration management endpoints')
    .addTag('Metadata', 'Metadata management endpoints')
    .addTag('AI Hub', 'AI Hub endpoints')
    .addTag('Integration', 'Integration management endpoints')
    .addTag('Notification', 'Notification endpoints')
    .addTag('OAuth2', 'OAuth2 authentication endpoints')
    .addTag('Runtime', 'Local runtime integration endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('_api/docs', app, document, {
    customSiteTitle: 'Agent Project Manager API',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
      showExtensions: true,
      showCommonExtensions: true,
      docExpansion: 'list', // 'none', 'list', or 'full'
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 1,
      displayOperationId: true,
      showMutatedRequest: true,
      requestInterceptor: (request: any) => {
        return request;
      },
      responseInterceptor: (response: any) => {
        return response;
      },
    },
  });

  // Add OpenAPI JSON export endpoint
  app.getHttpAdapter().get('/_api/openapi.json', (req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(document);
  });

  configureFrontendStaticHosting(app, logger);

  const port = configService.port;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Environment: ${configService.nodeEnv}`);
  logger.log(`Swagger documentation: http://localhost:${port}/_api/docs`);
}

function configureFrontendStaticHosting(
  app: INestApplication,
  logger: LoggerService,
) {
  const frontendDistDir = process.env.FRONTEND_DIST_DIR;
  if (!frontendDistDir) {
    return;
  }

  const indexFilePath = path.join(frontendDistDir, 'index.html');
  if (!existsSync(indexFilePath)) {
    logger.warn(
      `FRONTEND_DIST_DIR is set but index.html is missing: ${indexFilePath}`,
    );
    return;
  }

  const expressInstance = app.getHttpAdapter().getInstance();
  expressInstance.use(express.static(frontendDistDir));
  expressInstance.get(
    /^(?!\/(_api|socket\.io)).*/,
    (req: Request, res: Response, next: () => void) => {
      if (req.method !== 'GET') {
        next();
        return;
      }
      res.sendFile(indexFilePath);
    },
  );

  logger.log(`Frontend static hosting enabled: ${frontendDistDir}`);
}

bootstrap().catch((error) => {
  console.error('Bootstrap failed', error);
  process.exitCode = 1;
});
