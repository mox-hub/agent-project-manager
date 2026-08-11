import { Module, forwardRef } from '@nestjs/common';
import { CliProviderRegistry } from './cli-provider.registry';
import { CliExecutorService } from './cli-executor.service';
import { CliDispatchService } from './dispatch.service';
import { CliResolutionService } from './cli-resolution.service';
import { CliDispatchController } from './cli-dispatch.controller';
import { ExecutionModule } from '@/modules/execution/execution.module';
import { TrustModule } from '@/modules/trust/trust.module';
import { AiHubModule } from '@/modules/ai-hub/ai-hub.module';
import { AcceptanceModule } from '@/modules/acceptance/acceptance.module';

// Adapters
import { ClaudeCodeAdapter } from './adapters/claude-code.adapter';
import { CodexAdapter } from './adapters/codex.adapter';
import { ZCodeAdapter } from './adapters/zcode.adapter';

@Module({
  imports: [ExecutionModule, TrustModule, AcceptanceModule, forwardRef(() => AiHubModule)],
  controllers: [CliDispatchController],
  providers: [
    // Registry
    CliProviderRegistry,
    // Adapters
    ClaudeCodeAdapter,
    CodexAdapter,
    ZCodeAdapter,
    // Services
    CliExecutorService,
    CliDispatchService,
    CliResolutionService,
  ],
  exports: [
    CliDispatchService,
    CliProviderRegistry,
    CliExecutorService,
    CliResolutionService,
  ],
})
export class CliDispatchModule {
  constructor(
    private readonly registry: CliProviderRegistry,
    private readonly claudeAdapter: ClaudeCodeAdapter,
    private readonly codexAdapter: CodexAdapter,
    private readonly zcodeAdapter: ZCodeAdapter,
  ) {
    // Register adapters on module init
    registry.registerAdapter(claudeAdapter);
    registry.registerAdapter(codexAdapter);
    registry.registerAdapter(zcodeAdapter);
  }
}
