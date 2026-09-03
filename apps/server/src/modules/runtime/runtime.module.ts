import { Module } from '@nestjs/common';
import { RuntimeController } from './runtime.controller';
import { RuntimeControlController } from './runtime-control.controller';
import { RuntimeQueryController } from './runtime-query.controller';
import { RuntimeService } from './runtime.service';
import { RuntimeSessionGuard } from './guards/runtime-session.guard';
import { RuntimeGateway } from './runtime.gateway';

@Module({
  controllers: [
    RuntimeController,
    RuntimeControlController,
    RuntimeQueryController,
  ],
  providers: [RuntimeService, RuntimeSessionGuard, RuntimeGateway],
  exports: [RuntimeService],
})
export class RuntimeModule {}
