import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './core/config/config.module';
import { LoggerModule } from './core/logger/logger.module';
import { MessageBusModule } from './core/message-bus/message-bus.module';
import { DatabaseModule } from './core/database/database.module';
import { I18nConfigModule } from './i18n';
import { AuthModule } from './modules/auth/auth.module';
import { MetadataModule } from './modules/metadata/metadata.module';
import { ProjectModule } from './modules/project/project.module';
import { TaskModule } from './modules/task/task.module';
import { TaskTemplateModule } from './modules/task-template/task-template.module';
import { IterationModule } from './modules/iteration/iteration.module';
import { UserModule } from './modules/user/user.module';
import { AiHubModule } from './modules/ai-hub/ai-hub.module';
import { IntegrationModule } from './modules/integration/integration.module';
import { NotificationModule } from './modules/notification/notification.module';
import { GitModule } from './modules/git/git.module';
import { TerminalModule } from './modules/terminal/terminal.module';
import { ConfigModule as AppConfigModule } from './modules/config/config.module';
import { DocumentEnhanceModule } from './modules/document/document-enhance.module';
import { EventsGateway } from './gateways/events.gateway';
import { PluginModule } from './modules/plugins/plugin.module';
import { RuntimeModule } from './modules/runtime/runtime.module';
import { ExecutionModule } from './modules/execution/execution.module';
import { TrustModule } from './modules/trust/trust.module';
import { ContextModule } from './modules/context/context.module';

// Common infrastructure
import {
  GlobalExceptionFilter,
  LoggingInterceptor,
  TransformInterceptor,
  JwtAuthGuard,
  RateLimitGuard,
  ValidationPipe,
  CsrfConfig,
} from './common';
import { throttlerConfig } from './common/throttler/throttler.config';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    MessageBusModule,
    DatabaseModule,
    I18nConfigModule,
    AuthModule,
    MetadataModule,
    ProjectModule,
    TaskModule,
    TaskTemplateModule,
    IterationModule,
    UserModule,
    AiHubModule,
    IntegrationModule,
    NotificationModule,
    GitModule,
    TerminalModule,
    AppConfigModule,
    throttlerConfig,
    PluginModule,
    RuntimeModule,
    ExecutionModule,
    TrustModule,
    ContextModule,
    DocumentEnhanceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    EventsGateway,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
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
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
    CsrfConfig,
  ],
})
export class AppModule {}
