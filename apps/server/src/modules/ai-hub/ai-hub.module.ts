import { Module, forwardRef } from '@nestjs/common';
import { AiHubController } from './ai-hub.controller';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { AssistantRuntimeBridge } from './assistant-runtime-bridge.service';
import { AiHubService } from './ai-hub.service';
import { ContextBuilderService } from './services/context-builder.service';
import { AdapterRegistryService } from './services/adapter-registry.service';
import { ProviderConfigService } from './services/provider-config.service';
import { AiSdkAdapterFactory } from './adapters/ai-sdk-adapter.factory';
import { AiWorkerCoordinatorService } from './services/ai-worker-coordinator.service';
import { AssistantToolsService } from './services/assistant-tools.service';
import { AssistantSilentService } from './services/assistant-silent.service';
import { AssistantMemoryDigestService } from './services/assistant-memory-digest.service';
import { UsagePricingService } from './services/usage-pricing.service';
import { MemoryModule } from '../memory/memory.module';
import { CollaborationModule } from '../collaboration/collaboration.module';
import { ProfileModule } from '@/modules/profile/profile.module';
import { RuntimeModule } from '../runtime/runtime.module';
import { IssueModule } from '../issue/issue.module';
import { CliDispatchModule } from '../cli-dispatch/cli-dispatch.module';
import { ExecutionModule } from '../execution/execution.module';
import { ProjectModule } from '../project/project.module';
import { DocumentModule } from '../document/document.module';
import { TeamModule } from '../team/team.module';
import { AcceptanceModule } from '../acceptance/acceptance.module';

@Module({
  imports: [
    forwardRef(() => RuntimeModule),
    forwardRef(() => IssueModule),
    forwardRef(() => CliDispatchModule),
    forwardRef(() => ExecutionModule),
    forwardRef(() => ProjectModule),
    forwardRef(() => DocumentModule),
    forwardRef(() => TeamModule),
    forwardRef(() => AcceptanceModule),
    MemoryModule,
    CollaborationModule,
    forwardRef(() => ProfileModule),
  ],
  controllers: [AiHubController, AssistantController],
  providers: [
    AiHubService,
    AssistantService,
    AssistantRuntimeBridge,
    ContextBuilderService,
    AdapterRegistryService,
    ProviderConfigService,
    AssistantToolsService,
    AssistantSilentService,
    AssistantMemoryDigestService,
    AiSdkAdapterFactory,
    AiWorkerCoordinatorService,
    UsagePricingService,
  ],
  exports: [
    AiHubService,
    AssistantService,
    AiWorkerCoordinatorService,
    ContextBuilderService,
    AdapterRegistryService,
    ProviderConfigService,
    UsagePricingService,
  ],
})
export class AiHubModule {}
