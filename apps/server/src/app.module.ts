import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './core/config/config.module';
import { LoggerModule } from './core/logger/logger.module';
import { MessageBusModule } from './core/message-bus/message-bus.module';
import { DatabaseModule } from './core/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { MetadataModule } from './modules/metadata/metadata.module';
import { ProjectModule } from './modules/project/project.module';
import { TaskModule } from './modules/task/task.module';
import { IterationModule } from './modules/iteration/iteration.module';
import { UserModule } from './modules/user/user.module';
import { HttpExceptionFilter } from './core/exceptions/http-exception.filter';
import { AllExceptionsFilter } from './core/exceptions/all-exceptions.filter';
import { LoggingInterceptor } from './core/interceptors/logging.interceptor';
import { TransformInterceptor } from './core/interceptors/transform.interceptor';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { EventsGateway } from './gateways/events.gateway';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    MessageBusModule,
    DatabaseModule,
    AuthModule,
    MetadataModule,
    ProjectModule,
    TaskModule,
    IterationModule,
    UserModule,
  ],
  providers: [EventsGateway],
  controllers: [AppController],
  providers: [
    AppService,
    EventsGateway,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
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
