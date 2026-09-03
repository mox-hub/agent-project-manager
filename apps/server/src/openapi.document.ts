import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

/**
 * Swagger UI 展示选项。
 * 文档本体由 buildOpenApiDocument 生成，contract:export 脚本与运行时共用，
 * 保证 /_api/openapi.json 与仓库内 openapi.json 出自同一份配置。
 */
export const swaggerUiOptions = {
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
};

/** 生成全量 OpenAPI 文档（路由 + DTO 装饰器） */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
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

  return SwaggerModule.createDocument(app, config);
}
