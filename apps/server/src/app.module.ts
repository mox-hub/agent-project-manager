import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './core/config/config.module';
import { CryptoModule } from './core/crypto/crypto.module';
import { LoggerModule } from './core/logger/logger.module';
import { TracingModule } from './core/tracing/tracing.module';
import { AuditModule } from './core/audit/audit.module';
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
import { TeamModule } from './modules/team/team.module';
import { MailModule } from './modules/mail/mail.module';
import { AiHubModule } from './modules/ai-hub/ai-hub.module';
import { IntegrationModule } from './modules/integration/integration.module';
import { NotificationModule } from './modules/notification/notification.module';
import { GitModule } from './modules/git/git.module';
// Terminal模块已废弃，功能并入Runtime模块
import { ConfigModule as AppConfigModule } from './modules/config/config.module';
import { DocumentEnhanceModule } from './modules/document/document-enhance.module';
import { DocumentModule } from './modules/document/document.module';
import { EventsGateway } from './gateways/events.gateway';
import { PluginModule } from './modules/plugins/plugin.module';
import { RuntimeModule } from './modules/runtime/runtime.module';
import { ExecutionModule } from './modules/execution/execution.module';
import { TrustModule } from './modules/trust/trust.module';
import { ContextModule } from './modules/context/context.module';
import { AcceptanceModule } from './modules/acceptance/acceptance.module';
import { CliDispatchModule } from './modules/cli-dispatch/cli-dispatch.module';
import { McpServerModule } from './modules/mcp-server/mcp-server.module';
import { CliProviderModule } from './modules/cli-provider/cli-provider.module';
import { SkillsModule } from './modules/skills/skills.module';
import { ProjectRoleModule } from './modules/role/project-role.module';

// Common infrastructure
import {
  GlobalExceptionFilter,
  LoggingInterceptor,
  TransformInterceptor,
  JwtAuthGuard,
  RateLimitGuard,
  CsrfConfig,
} from './common';
import { throttlerConfig } from './common/throttler/throttler.config';

@Module({
  imports: [
    ConfigModule,
    CryptoModule,
    LoggerModule,
    TracingModule,
    AuditModule,
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
    TeamModule,
    MailModule,
    AiHubModule,
    IntegrationModule,
    NotificationModule,
    GitModule,
    // TerminalModule 已废弃，功能并入Runtime模块
    AppConfigModule,
    throttlerConfig,
    PluginModule,
    RuntimeModule,
    ExecutionModule,
    TrustModule,
    ContextModule,
    AcceptanceModule,
    DocumentEnhanceModule,
    DocumentModule,
    CliDispatchModule,
    McpServerModule,
    CliProviderModule,
    SkillsModule,
    ProjectRoleModule,
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
    CsrfConfig,
  ],
})
export class AppModule {}
