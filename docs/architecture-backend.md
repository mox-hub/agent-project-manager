# 后端架构与实现设计文档（Backend Architecture & Implementation）

本文件基于 `architecture-design.md`、`docs/api/*`、`docs/feature-design/*` 与 `docs/data-model/*`，给出一套**可直接落地实现**的后端方案，包括：

- 技术栈选型与项目结构
- NestJS 模块划分与组织
- 核心基础设施实现（CoreModule、Config、Logger、MessageBus）
- 数据访问层设计（Prisma/ORM）
- 各业务模块的实现设计
- 认证与权限控制
- WebSocket 网关实现
- 错误处理与异常管理
- 部署与运维方案

---

## 1. 技术栈与项目结构

### 1.1 技术选型

- **运行时**：Node.js 20+ LTS
- **框架**：NestJS 10+（提供依赖注入、模块化、中间件、守卫等企业级特性）
- **语言**：TypeScript 5+
- **数据库**：
  - 单机模式：SQLite（通过 Prisma）
  - 团队/企业模式：PostgreSQL 14+
- **ORM**：Prisma（类型安全、迁移管理、多数据库支持）
- **认证**：
  - 本地认证：JWT + bcrypt
  - OAuth2/OIDC：passport-oauth2、passport-openidconnect
- **实时通信**：WebSocket（NestJS @nestjs/websockets）
- **HTTP 客户端**：axios（用于调用外部 API，如 Git 平台、CI/CD、LLM 服务）
- **任务队列**：BullMQ + Redis（可选，用于异步任务处理）
- **日志**：Winston + Pino（结构化日志）
- **配置管理**：@nestjs/config（环境变量 + 配置文件）

### 1.2 项目目录结构

```text
apps/
  server/
    src/
      main.ts                    # 应用入口（启动 HTTP/WebSocket 服务器）
      app.module.ts              # 根模块
      
      # 核心基础设施
      core/
        config/                  # 配置模块
          config.module.ts
          config.service.ts
          config.schema.ts        # 配置验证 Schema（使用 Joi/Zod）
        logger/                   # 日志模块
          logger.module.ts
          logger.service.ts
        message-bus/             # 消息总线
          message-bus.module.ts
          message-bus.service.ts
          message-bus.types.ts
        database/                # 数据库连接与 Prisma 服务
          database.module.ts
          prisma.service.ts
        exceptions/               # 全局异常过滤器
          http-exception.filter.ts
          all-exceptions.filter.ts
        interceptors/            # 全局拦截器
          logging.interceptor.ts
          transform.interceptor.ts
        guards/                  # 全局守卫
          auth.guard.ts
          roles.guard.ts
        decorators/              # 自定义装饰器
          current-user.decorator.ts
          roles.decorator.ts
          public.decorator.ts
      
      # 业务模块（按领域划分）
      modules/
        auth/                    # 认证模块（本地 + OAuth2）
          auth.module.ts
          auth.controller.ts
          auth.service.ts
          strategies/
            local.strategy.ts
            jwt.strategy.ts
            oauth2.strategy.ts
          guards/
            jwt-auth.guard.ts
            oauth2-auth.guard.ts
        
        user/                    # 用户管理模块
          user.module.ts
          user.controller.ts
          user.service.ts
          user.repository.ts      # 数据访问层（可选，或直接使用 Prisma）
        
        project/                 # 项目管理模块
          project.module.ts
          project.controller.ts
          project.service.ts
          project.repository.ts
          entities/               # 领域实体（可选，Prisma 已生成类型）
          dto/                    # 数据传输对象
            create-project.dto.ts
            update-project.dto.ts
            project-query.dto.ts
        
        task/                    # 任务管理模块
          task.module.ts
          task.controller.ts
          task.service.ts
          task.repository.ts
          dto/
        
        ai-hub/                  # AI 集成模块
          ai-hub.module.ts
          ai-hub.controller.ts
          ai-hub.service.ts
          workflows/
            workflow-engine.service.ts
            workflow-executor.service.ts
          adapters/               # 模型适配器
            openai.adapter.ts
            claude.adapter.ts
            ollama.adapter.ts
          context/                # 上下文构建
            context-builder.service.ts
          prompts/                # Prompt 模板管理
            prompt-template.service.ts
        
        git/                     # Git 集成模块
          git.module.ts
          git.controller.ts
          git.service.ts
          adapters/
            local-git.adapter.ts
            github.adapter.ts
            gitlab.adapter.ts
        
        terminal/                # 终端模块
          terminal.module.ts
          terminal.gateway.ts    # WebSocket 网关
          terminal.service.ts
          session-manager.service.ts
        
        integration/              # 外部集成模块
          integration.module.ts
          integration.controller.ts
          integration.service.ts
          connectors/             # 连接器实现
            jira.connector.ts
            linear.connector.ts
            slack.connector.ts
            github-actions.connector.ts
        
        plugin/                  # 插件系统模块
          plugin.module.ts
          plugin.controller.ts
          plugin.service.ts
          plugin-loader.service.ts
          plugin-bridge.service.ts
          runtime/                # 插件运行时
            plugin-runtime.service.ts
            sandbox.service.ts
        
        notification/            # 通知模块
          notification.module.ts
          notification.controller.ts
          notification.service.ts
          notification.gateway.ts # WebSocket 推送
        
        metadata/                # 项目元数据模块（标签、状态、角色、模板）
          metadata.module.ts
          metadata.controller.ts
          metadata.service.ts
      
      # WebSocket 网关（统一管理实时连接）
      gateways/
        events.gateway.ts        # 统一事件推送网关
      
      # 共享工具
      common/
        dto/                     # 通用 DTO（分页、过滤等）
          pagination.dto.ts
          filter.dto.ts
        decorators/              # 共享装饰器
        pipes/                   # 验证管道
          validation.pipe.ts
        utils/                   # 工具函数
          date.utils.ts
          string.utils.ts
    
    prisma/
      schema.prisma              # Prisma Schema 定义
      migrations/                # 数据库迁移文件
      seed.ts                    # 种子数据脚本
    
    test/                        # 测试文件
      unit/
      e2e/
    
    .env.example
    .env.development
    .env.production
    nest-cli.json
    tsconfig.json
    package.json
```

---

## 2. CoreModule 核心基础设施实现

### 2.1 ConfigModule（配置管理）

```typescript
// core/config/config.schema.ts
import * as Joi from 'joi';

export const configSchema = Joi.object({
  // 应用配置
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(4300),
  APP_MODE: Joi.string().valid('standalone', 'server', 'client').default('standalone'),
  
  // 数据库配置
  DATABASE_URL: Joi.string().required(),
  DATABASE_TYPE: Joi.string().valid('sqlite', 'postgresql').default('sqlite'),
  
  // JWT 配置
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  
  // OAuth2 配置（可选）
  OAUTH2_PROVIDERS: Joi.string().optional(), // JSON 字符串
  
  // AI 配置
  AI_OPENAI_API_KEY: Joi.string().optional(),
  AI_ANTHROPIC_API_KEY: Joi.string().optional(),
  AI_DEFAULT_MODEL: Joi.string().default('gpt-4o'),
  
  // 文件存储
  UPLOAD_DIR: Joi.string().default('./uploads'),
  
  // 日志配置
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
});

// core/config/config.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private nestConfigService: NestConfigService) {}

  get<T = any>(key: string): T {
    return this.nestConfigService.get<T>(key);
  }

  getOrThrow<T = any>(key: string): T {
    const value = this.nestConfigService.get<T>(key);
    if (value === undefined) {
      throw new Error(`Configuration key "${key}" is required but not set`);
    }
    return value;
  }

  // 便捷方法
  get appMode(): 'standalone' | 'server' | 'client' {
    return this.get('APP_MODE');
  }

  get databaseUrl(): string {
    return this.getOrThrow('DATABASE_URL');
  }

  get jwtSecret(): string {
    return this.getOrThrow('JWT_SECRET');
  }
}

// core/config/config.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ConfigService } from './config.service';
import { configSchema } from './config.schema';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configSchema,
      envFilePath: ['.env.local', '.env'],
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
```

### 2.2 LoggerModule（日志与审计）

```typescript
// core/logger/logger.service.ts
import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { createLogger, format, transports, Logger } from 'winston';
import { ConfigService } from '../config/config.service';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: Logger;
  private context?: string;

  constructor(private configService: ConfigService) {
    this.logger = createLogger({
      level: this.configService.get('LOG_LEVEL') || 'info',
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json(),
      ),
      transports: [
        new transports.Console({
          format: format.combine(
            format.colorize(),
            format.printf(({ timestamp, level, message, context, ...meta }) => {
              return `${timestamp} [${context || 'App'}] ${level}: ${message} ${
                Object.keys(meta).length ? JSON.stringify(meta) : ''
              }`;
            }),
          ),
        }),
        // 可选：文件输出
        new transports.File({ filename: 'logs/error.log', level: 'error' }),
        new transports.File({ filename: 'logs/combined.log' }),
      ],
    });
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, ...meta: any[]) {
    this.logger.info(message, { context: this.context, ...meta });
  }

  error(message: string, trace?: string, ...meta: any[]) {
    this.logger.error(message, { context: this.context, trace, ...meta });
  }

  warn(message: string, ...meta: any[]) {
    this.logger.warn(message, { context: this.context, ...meta });
  }

  debug(message: string, ...meta: any[]) {
    this.logger.debug(message, { context: this.context, ...meta });
  }

  // 审计日志（记录安全相关操作）
  async audit(
    action: string,
    actorId: string | null,
    resourceType: string,
    resourceId: string | null,
    metadata?: Record<string, any>,
  ) {
    // 写入数据库（通过 Prisma）
    // 这里简化示例，实际应注入 PrismaService
    this.logger.info('AUDIT', {
      action,
      actorId,
      resourceType,
      resourceId,
      metadata,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### 2.3 MessageBusModule（消息总线）

```typescript
// core/message-bus/message-bus.types.ts
export interface MessageBusEvent<T = any> {
  type: string;
  payload: T;
  timestamp: Date;
  correlationId?: string;
}

export type EventHandler<T = any> = (payload: T, event: MessageBusEvent<T>) => void | Promise<void>;

// core/message-bus/message-bus.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LoggerService } from '../logger/logger.service';
import { MessageBusEvent, EventHandler } from './message-bus.types';

@Injectable()
export class MessageBusService implements OnModuleInit, OnModuleDestroy {
  private handlers = new Map<string, Set<EventHandler>>();

  constructor(
    private eventEmitter: EventEmitter2,
    private logger: LoggerService,
  ) {
    this.logger.setContext('MessageBus');
  }

  onModuleInit() {
    // 可以在这里订阅系统级事件
  }

  onModuleDestroy() {
    this.handlers.clear();
  }

  /**
   * 发布事件（同步）
   */
  publish<T = any>(eventType: string, payload: T, correlationId?: string): void {
    const event: MessageBusEvent<T> = {
      type: eventType,
      payload,
      timestamp: new Date(),
      correlationId,
    };

    this.logger.debug(`Publishing event: ${eventType}`, { correlationId });
    this.eventEmitter.emit(eventType, payload, event);
  }

  /**
   * 发布异步事件（通过 EventEmitter2 的异步支持）
   */
  async publishAsync<T = any>(eventType: string, payload: T, correlationId?: string): Promise<void> {
    const event: MessageBusEvent<T> = {
      type: eventType,
      payload,
      timestamp: new Date(),
      correlationId,
    };

    this.logger.debug(`Publishing async event: ${eventType}`, { correlationId });
    await this.eventEmitter.emitAsync(eventType, payload, event);
  }

  /**
   * 订阅事件
   */
  subscribe<T = any>(eventType: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }

    const handlerWrapper = (payload: T, event: MessageBusEvent<T>) => {
      try {
        const result = handler(payload, event);
        if (result instanceof Promise) {
          result.catch((err) => {
            this.logger.error(`Error in event handler for ${eventType}`, err.stack);
          });
        }
      } catch (err) {
        this.logger.error(`Error in event handler for ${eventType}`, err.stack);
      }
    };

    this.handlers.get(eventType)!.add(handler);
    this.eventEmitter.on(eventType, handlerWrapper);

    // 返回取消订阅函数
    return () => {
      this.handlers.get(eventType)?.delete(handler);
      this.eventEmitter.off(eventType, handlerWrapper);
    };
  }
}

// core/message-bus/message-bus.module.ts
import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MessageBusService } from './message-bus.service';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),
  ],
  providers: [MessageBusService],
  exports: [MessageBusService],
})
export class MessageBusModule {}
```

### 2.4 DatabaseModule（Prisma 集成）

```typescript
// core/database/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private logger: LoggerService) {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });

    // 监听 Prisma 日志事件
    this.$on('query' as never, (e: any) => {
      this.logger.debug('Prisma Query', { query: e.query, duration: e.duration });
    });

    this.$on('error' as never, (e: any) => {
      this.logger.error('Prisma Error', e);
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }
}

// core/database/database.module.ts
import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
```

---

## 3. 认证与权限控制

### 3.1 AuthModule 实现

```typescript
// modules/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../core/database/prisma.service';
import { ConfigService } from '../../core/config/config.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async validateJwtPayload(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}

// modules/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '../../../core/config/config.service';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const user = await this.authService.validateJwtPayload(payload);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}

// modules/auth/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../core/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}

// core/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// core/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

### 3.2 权限控制（RBAC）

```typescript
// core/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// core/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user?.role === role);
  }
}

// 使用示例（在 Controller 中）
@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectController {
  @Post()
  @Roles('owner', 'maintainer')
  async createProject(@Body() dto: CreateProjectDto, @CurrentUser() user: User) {
    // 只有 owner 或 maintainer 可以创建项目
  }
}
```

---

## 4. 业务模块实现示例（ProjectModule）

### 4.1 ProjectService 实现

```typescript
// modules/project/project.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { LoggerService } from '../../core/logger/logger.service';
import { CreateProjectDto, UpdateProjectDto, ProjectQueryDto } from './dto';
import { User } from '@prisma/client';

@Injectable()
export class ProjectService {
  constructor(
    private prisma: PrismaService,
    private messageBus: MessageBusService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('ProjectService');
  }

  async create(dto: CreateProjectDto, creator: User) {
    const project = await this.prisma.project.create({
      data: {
        ...dto,
        createdBy: creator.id,
        members: {
          create: {
            userId: creator.id,
            role: 'owner',
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    // 发布领域事件
    this.messageBus.publish('project.created', {
      projectId: project.id,
      creatorId: creator.id,
    });

    this.logger.log(`Project created: ${project.id} by ${creator.id}`);
    return project;
  }

  async findAll(query: ProjectQueryDto, user: User) {
    const where: any = {};

    // 权限过滤：只返回用户参与的项目
    where.members = {
      some: {
        userId: user.id,
      },
    };

    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.type) {
      where.type = query.type;
    }

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: { tasks: true, members: true },
          },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      data,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
      },
    };
  }

  async findOne(id: string, user: User) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        _count: {
          select: { tasks: true, iterations: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    // 权限检查
    const isMember = project.members.some((m) => m.userId === user.id);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this project');
    }

    return project;
  }

  async update(id: string, dto: UpdateProjectDto, user: User) {
    // 检查权限（只有 owner/maintainer 可以更新）
    const project = await this.findOne(id, user);
    const membership = project.members.find((m) => m.userId === user.id);
    if (!['owner', 'maintainer'].includes(membership?.role || '')) {
      throw new ForbiddenException('Only owner or maintainer can update project');
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: dto,
    });

    this.messageBus.publish('project.updated', {
      projectId: id,
      updatedBy: user.id,
      changes: dto,
    });

    return updated;
  }

  async archive(id: string, user: User) {
    const project = await this.findOne(id, user);
    const membership = project.members.find((m) => m.userId === user.id);
    if (!['owner'].includes(membership?.role || '')) {
      throw new ForbiddenException('Only owner can archive project');
    }

    const archived = await this.prisma.project.update({
      where: { id },
      data: { status: 'archived' },
    });

    this.messageBus.publish('project.archived', {
      projectId: id,
      archivedBy: user.id,
    });

    return archived;
  }
}
```

### 4.2 ProjectController 实现

```typescript
// modules/project/project.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { CreateProjectDto, UpdateProjectDto, ProjectQueryDto } from './dto';
import { User } from '@prisma/client';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  async create(@Body() dto: CreateProjectDto, @CurrentUser() user: User) {
    return this.projectService.create(dto, user);
  }

  @Get()
  async findAll(@Query() query: ProjectQueryDto, @CurrentUser() user: User) {
    return this.projectService.findAll(query, user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.projectService.findOne(id, user);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: User,
  ) {
    return this.projectService.update(id, dto, user);
  }

  @Post(':id/archive')
  async archive(@Param('id') id: string, @CurrentUser() user: User) {
    return this.projectService.archive(id, user);
  }
}
```

### 4.3 DTO 定义

```typescript
// modules/project/dto/create-project.dto.ts
import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['personal', 'team', 'experiment', 'enterprise'])
  type: 'personal' | 'team' | 'experiment' | 'enterprise';

  @IsEnum(['public', 'internal', 'private'])
  visibility: 'public' | 'internal' | 'private';

  @IsObject()
  @IsOptional()
  repoBinding?: {
    localPath?: string;
    remoteUrl?: string;
    role?: 'backend' | 'frontend' | 'fullstack';
  };

  @IsString()
  @IsOptional()
  templateId?: string;
}

// modules/project/dto/project-query.dto.ts
import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ProjectQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(['active', 'archived'])
  status?: 'active' | 'archived';

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  memberId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number = 20;
}
```

---

## 5. WebSocket 网关实现

### 5.1 EventsGateway（统一事件推送）

```typescript
// gateways/events.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LoggerService } from '../core/logger/logger.service';
import { MessageBusService } from '../core/message-bus/message-bus.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '../core/config/config.service';

@WebSocketGateway({
  cors: {
    origin: '*', // 生产环境应限制来源
  },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, Set<string>>(); // userId -> socketIds

  constructor(
    private logger: LoggerService,
    private messageBus: MessageBusService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.logger.setContext('EventsGateway');
    this.setupMessageBusSubscriptions();
  }

  async handleConnection(client: Socket) {
    try {
      // 从 query 或 handshake auth 中获取 token
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      if (!token) {
        client.disconnect();
        return;
      }

      // 验证 JWT
      const payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow('JWT_SECRET'),
      });

      const userId = payload.sub;
      client.data.userId = userId;

      // 记录用户连接
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
    } catch (error) {
      this.logger.error('WebSocket connection error', error.stack);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private setupMessageBusSubscriptions() {
    // 订阅 AI 流式输出事件
    this.messageBus.subscribe('ai.stream', (payload: any) => {
      const { conversationId, token, done } = payload;
      // 广播给所有连接的客户端（或根据 conversationId 过滤）
      this.server.emit('ai.stream', {
        conversationId,
        token,
        done,
      });
    });

    // 订阅工作流更新事件
    this.messageBus.subscribe('ai.workflow.update', (payload: any) => {
      this.server.emit('ai.workflow.update', payload);
    });

    // 订阅任务更新事件
    this.messageBus.subscribe('task.updated', (payload: any) => {
      const { projectId, taskId } = payload;
      // 可以只推送给相关项目的成员
      this.server.emit('task.updated', payload);
    });

    // 订阅项目更新事件
    this.messageBus.subscribe('project.updated', (payload: any) => {
      this.server.emit('project.updated', payload);
    });
  }

  // 客户端可以订阅特定事件
  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, payload: { eventTypes: string[] }) {
    // 可以在这里实现更细粒度的事件订阅
    client.join(payload.eventTypes);
    return { success: true };
  }
}
```

---

## 6. AIHub 模块实现示例

### 6.1 AIHubService（模型路由与调用）

```typescript
// modules/ai-hub/ai-hub.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { LoggerService } from '../../core/logger/logger.service';
import { OpenAiAdapter } from './adapters/openai.adapter';
import { ClaudeAdapter } from './adapters/claude.adapter';
import { ContextBuilderService } from './context/context-builder.service';

@Injectable()
export class AiHubService {
  private adapters = new Map<string, any>();

  constructor(
    private prisma: PrismaService,
    private messageBus: MessageBusService,
    private logger: LoggerService,
    private openAiAdapter: OpenAiAdapter,
    private claudeAdapter: ClaudeAdapter,
    private contextBuilder: ContextBuilderService,
  ) {
    this.logger.setContext('AiHubService');
    this.adapters.set('openai', openAiAdapter);
    this.adapters.set('anthropic', claudeAdapter);
  }

  async chat(dto: {
    projectId?: string;
    taskId?: string;
    conversationId?: string;
    message: { role: 'user'; content: string };
    contextHints?: {
      includeGitDiff?: boolean;
      includeRecentActivities?: boolean;
    };
    modelPreference?: string;
  }) {
    // 1. 选择模型
    const model = await this.selectModel(dto.modelPreference, dto.message.content);

    // 2. 构建上下文
    const context = await this.contextBuilder.build({
      projectId: dto.projectId,
      taskId: dto.taskId,
      hints: dto.contextHints,
    });

    // 3. 获取或创建会话
    let conversation = dto.conversationId
      ? await this.prisma.aIConversation.findUnique({
          where: { id: dto.conversationId },
          include: { messages: { orderBy: { createdAt: 'asc' } } },
        })
      : null;

    if (!conversation) {
      conversation = await this.prisma.aIConversation.create({
        data: {
          projectId: dto.projectId,
          taskId: dto.taskId,
          title: dto.message.content.substring(0, 100),
        },
        include: { messages: true },
      });
    }

    // 4. 构建消息历史
    const messages = [
      ...(context.systemPrompt ? [{ role: 'system', content: context.systemPrompt }] : []),
      ...conversation.messages.map((m) => ({ role: m.role, content: m.content })),
      dto.message,
    ];

    // 5. 调用模型（支持流式输出）
    const adapter = this.adapters.get(model.provider);
    if (!adapter) {
      throw new Error(`Adapter not found for provider: ${model.provider}`);
    }

    // 保存用户消息
    await this.prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: dto.message.content,
      },
    });

    // 流式调用
    const assistantMessage = await adapter.chatStream({
      model: model.name,
      messages,
      onChunk: async (token: string) => {
        // 通过消息总线推送流式 token
        this.messageBus.publish('ai.stream', {
          conversationId: conversation.id,
          token,
          done: false,
        });
      },
    });

    // 保存助手回复
    const savedMessage = await this.prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: assistantMessage.content,
        modelName: model.name,
        tokenCount: assistantMessage.tokenCount,
        cost: assistantMessage.cost,
      },
    });

    // 发送完成事件
    this.messageBus.publish('ai.stream', {
      conversationId: conversation.id,
      token: '',
      done: true,
      messageId: savedMessage.id,
    });

    return {
      conversationId: conversation.id,
      message: savedMessage,
    };
  }

  private async selectModel(preference?: string, content?: string): Promise<any> {
    // 模型选择逻辑（根据偏好、任务类型、成本等）
    if (preference) {
      const model = await this.prisma.aIModel.findFirst({
        where: { name: preference, enabled: true },
      });
      if (model) return model;
    }

    // 默认模型
    return await this.prisma.aIModel.findFirst({
      where: { enabled: true, isDefault: true },
    });
  }
}
```

---

## 7. 全局异常处理

### 7.1 统一异常过滤器

```typescript
// core/exceptions/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../logger/logger.service';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private logger: LoggerService) {
    this.logger.setContext('HttpExceptionFilter');
  }

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const errorResponse = {
      error: {
        code: exception.name,
        message: exception.message,
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    };

    this.logger.error(
      `${status} ${request.method} ${request.url}`,
      exception.stack,
    );

    response.status(status).json(errorResponse);
  }
}

// core/exceptions/all-exceptions.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../logger/logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private logger: LoggerService) {
    this.logger.setContext('AllExceptionsFilter');
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getMessage()
        : 'Internal server error';

    const errorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message,
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    };

    this.logger.error(
      `Unhandled exception: ${status} ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(status).json(errorResponse);
  }
}
```

---

## 8. 应用入口与模块组装

### 8.1 AppModule

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from './core/config/config.module';
import { LoggerModule } from './core/logger/logger.module';
import { MessageBusModule } from './core/message-bus/message-bus.module';
import { DatabaseModule } from './core/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ProjectModule } from './modules/project/project.module';
import { TaskModule } from './modules/task/task.module';
import { AiHubModule } from './modules/ai-hub/ai-hub.module';
import { GitModule } from './modules/git/git.module';
import { TerminalModule } from './modules/terminal/terminal.module';
import { IntegrationModule } from './modules/integration/integration.module';
import { PluginModule } from './modules/plugin/plugin.module';
import { NotificationModule } from './modules/notification/notification.module';
import { MetadataModule } from './modules/metadata/metadata.module';
import { EventsGateway } from './gateways/events.gateway';
import { HttpExceptionFilter } from './core/exceptions/http-exception.filter';
import { AllExceptionsFilter } from './core/exceptions/all-exceptions.filter';
import { LoggingInterceptor } from './core/interceptors/logging.interceptor';
import { TransformInterceptor } from './core/interceptors/transform.interceptor';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

@Module({
  imports: [
    // 核心模块
    ConfigModule,
    LoggerModule,
    MessageBusModule,
    DatabaseModule,
    
    // 业务模块
    AuthModule,
    UserModule,
    ProjectModule,
    TaskModule,
    AiHubModule,
    GitModule,
    TerminalModule,
    IntegrationModule,
    PluginModule,
    NotificationModule,
    MetadataModule,
  ],
  providers: [
    EventsGateway,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
```

### 8.2 main.ts（应用启动）

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from './core/config/config.service';
import { LoggerService } from './core/logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: false, // 使用自定义 Logger
  });

  const configService = app.get(ConfigService);
  const logger = app.get(LoggerService);
  logger.setContext('Bootstrap');

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 全局前缀
  app.setGlobalPrefix('_api');

  // CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = configService.get('PORT') || 4300;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Environment: ${configService.get('NODE_ENV')}`);
  logger.log(`App Mode: ${configService.get('APP_MODE')}`);
}

bootstrap();
```

---

## 9. Prisma Schema 示例

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite" // 或 "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  passwordHash  String?
  role          String   @default("user")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  projects      ProjectMember[]
  sessions      Session[]
  auditLogs     AuditLog[]
}

model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  type        String
  visibility  String
  status      String   @default("active")
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members     ProjectMember[]
  tasks       Task[]
  iterations  Iteration[]
  milestones  Milestone[]
  conversations AIConversation[]
}

model ProjectMember {
  id        String   @id @default(cuid())
  projectId String
  userId    String
  role      String
  createdAt DateTime @default(now())

  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId])
}

model Task {
  id          String   @id @default(cuid())
  projectId   String
  parentTaskId String?
  title       String
  description String?
  status      String   @default("todo")
  priority    String?
  assigneeId  String?
  iterationId String?
  dueDate     DateTime?
  estimate    Int?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  parent      Task?    @relation("TaskHierarchy", fields: [parentTaskId], references: [id])
  children    Task[]   @relation("TaskHierarchy")
  dependencies TaskDependency[] @relation("TaskDependencies")
  dependents   TaskDependency[] @relation("TaskDependents")
  activities  TaskActivity[]
  tags        TaskTag[]
  conversations AIConversation[]
}

model AIConversation {
  id        String   @id @default(cuid())
  projectId String?
  taskId    String?
  title     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  project   Project? @relation(fields: [projectId], references: [id], onDelete: Cascade)
  task      Task?    @relation(fields: [taskId], references: [id], onDelete: Cascade)
  messages  AIMessage[]
}

model AIMessage {
  id            String   @id @default(cuid())
  conversationId String
  role          String
  content       String
  modelName     String?
  tokenCount    Int?
  cost          Float?
  createdAt     DateTime @default(now())

  conversation  AIConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
}

// ... 更多模型定义
```

---

## 10. 部署与运维

### 10.1 Docker 部署

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npm run build
RUN npx prisma generate

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

EXPOSE 4300

CMD ["node", "dist/main.js"]
```

### 10.2 环境变量配置

```bash
# .env.production
NODE_ENV=production
PORT=4300
APP_MODE=server

DATABASE_URL=postgresql://user:password@localhost:5432/agent_pm
DATABASE_TYPE=postgresql

JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

AI_OPENAI_API_KEY=sk-...
AI_ANTHROPIC_API_KEY=sk-ant-...
AI_DEFAULT_MODEL=gpt-4o

LOG_LEVEL=info
```

---

## 11. 总结

本文档提供了后端架构的完整实现方案，包括：

1. ✅ **技术栈选型**：NestJS + TypeScript + Prisma
2. ✅ **项目结构**：清晰的模块划分与目录组织
3. ✅ **核心基础设施**：Config、Logger、MessageBus、Database
4. ✅ **认证与权限**：JWT、OAuth2、RBAC
5. ✅ **业务模块实现**：Project、AIHub 等示例
6. ✅ **WebSocket 网关**：实时事件推送
7. ✅ **异常处理**：统一错误响应格式
8. ✅ **部署方案**：Docker 与环境配置

在实际开发时，可以：
- 按照本文档的结构搭建 NestJS 项目
- 参考示例代码实现各个模块
- 根据实际需求扩展和调整设计
- 为每个模块补充详细的单元测试与集成测试
