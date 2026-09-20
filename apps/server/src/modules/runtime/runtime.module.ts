import { Module, forwardRef } from '@nestjs/common';
import { RuntimeController } from './runtime.controller';
import { RuntimeControlController } from './runtime-control.controller';
import { RuntimeQueryController } from './runtime-query.controller';
import { DaemonOpsService } from './daemon-ops.service';
import { RuntimeService } from './runtime.service';
import { RuntimeSessionGuard } from './guards/runtime-session.guard';
import { RuntimeGateway } from './runtime.gateway';
import { AiHubModule } from '@/modules/ai-hub/ai-hub.module';

@Module({
  imports: [forwardRef(() => AiHubModule)],
  controllers: [
    RuntimeController,
    RuntimeControlController,
    RuntimeQueryController,
  ],
  providers: [
    RuntimeService,
    RuntimeSessionGuard,
    RuntimeGateway,
    DaemonOpsService,
  ],
  exports: [RuntimeService],
})
export class RuntimeModule {}
