import { Global, Module } from '@nestjs/common';
import {
  PrismaService,
  createWorkspaceAwarePrismaService,
} from './prisma.service';
import { LoggerService } from '../logger/logger.service';

@Global()
@Module({
  providers: [
    {
      provide: PrismaService,
      useFactory: (logger: LoggerService) =>
        createWorkspaceAwarePrismaService(logger),
      inject: [LoggerService],
    },
  ],
  exports: [PrismaService],
})
export class DatabaseModule {}
