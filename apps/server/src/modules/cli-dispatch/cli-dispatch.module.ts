import { Module, forwardRef } from '@nestjs/common';
import { CliProviderRegistry } from './cli-provider.registry';
import { CliExecutorService } from './cli-executor.service';
import { CliDispatchService } from './dispatch.service';
import { CliResolutionService } from './cli-resolution.service';
import { CliAssetScannerService } from '@/modules/cli-provider/cli-asset-scanner.service';
import { CliDispatchController } from './cli-dispatch.controller';
import { ExecutionModule } from '@/modules/execution/execution.module';
import { TrustModule } from '@/modules/trust/trust.module';
import { AiHubModule } from '@/modules/ai-hub/ai-hub.module';
import { AcceptanceModule } from '@/modules/acceptance/acceptance.module';
import { RuntimeModule } from '@/modules/runtime/runtime.module';
import { ExecutionWorktreeModule } from '@/modules/git/execution-worktree.module';

// Adapters
import { ClaudeCodeAdapter } from './adapters/claude-code.adapter';
import { CodexAdapter } from './adapters/codex.adapter';
import { ZCodeAdapter } from './adapters/zcode.adapter';
import { OpenCodeAdapter } from './adapters/opencode.adapter';
import { CursorAgentAdapter } from './adapters/cursor-agent.adapter';
import { GeminiCliAdapter } from './adapters/gemini-cli.adapter';
import { QwenCodeAdapter } from './adapters/qwen-code.adapter';
import { CodeBuddyAdapter } from './adapters/codebuddy.adapter';
import { GrokAdapter } from './adapters/grok.adapter';

@Module({
  imports: [
    ExecutionModule,
    TrustModule,
    AcceptanceModule,
    RuntimeModule,
    ExecutionWorktreeModule,
    forwardRef(() => AiHubModule),
  ],
  controllers: [CliDispatchController],
  providers: [
    // Registry
    CliProviderRegistry,
    // Adapters
    ClaudeCodeAdapter,
    CodexAdapter,
    ZCodeAdapter,
    OpenCodeAdapter,
    CursorAgentAdapter,
    GeminiCliAdapter,
    QwenCodeAdapter,
    CodeBuddyAdapter,
    GrokAdapter,
    // Services
    CliExecutorService,
    CliDispatchService,
    CliResolutionService,
    CliAssetScannerService,
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
    private readonly opencodeAdapter: OpenCodeAdapter,
    private readonly cursorAgentAdapter: CursorAgentAdapter,
    private readonly geminiCliAdapter: GeminiCliAdapter,
    private readonly qwenCodeAdapter: QwenCodeAdapter,
    private readonly codeBuddyAdapter: CodeBuddyAdapter,
    private readonly grokAdapter: GrokAdapter,
  ) {
    // Register adapters on module init
    registry.registerAdapter(claudeAdapter);
    registry.registerAdapter(codexAdapter);
    registry.registerAdapter(zcodeAdapter);
    registry.registerAdapter(opencodeAdapter);
    registry.registerAdapter(cursorAgentAdapter);
    registry.registerAdapter(geminiCliAdapter);
    registry.registerAdapter(qwenCodeAdapter);
    registry.registerAdapter(codeBuddyAdapter);
    registry.registerAdapter(grokAdapter);
  }
}
