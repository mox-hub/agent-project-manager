import { Module } from '@nestjs/common';
import { RuntimeController } from './runtime.controller';
import { RuntimeService } from './runtime.service';
import { RuntimeSessionGuard } from './guards/runtime-session.guard';
import { RuntimeGateway } from './runtime.gateway';

@Module({
  controllers: [RuntimeController],
  providers: [RuntimeService, RuntimeSessionGuard, RuntimeGateway],
  exports: [RuntimeService],
})
export class RuntimeModule {}