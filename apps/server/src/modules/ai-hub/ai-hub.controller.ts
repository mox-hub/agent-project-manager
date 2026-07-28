import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiHubService } from './ai-hub.service';
import { ProviderConfigService } from './services/provider-config.service';
import { AiWorkerCoordinatorService } from './services/ai-worker-coordinator.service';
import { ChatRequestDto } from './dto/chat.dto';
import { ConversationQueryDto } from './dto/conversation-query.dto';
import { RunWorkflowDto } from './dto/workflow-run.dto';
import { UsageQueryDto } from './dto/usage-query.dto';
import {
  CreateProviderConfigDto,
  UpdateProviderConfigDto,
  ValidateProviderDto,
  ProviderConfigResponseDto,
  ValidateProviderResponseDto,
} from './dto/provider-config.dto';

@ApiTags('AI Hub')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AiHubController {
  constructor(
    private readonly aiHubService: AiHubService,
    private readonly providerConfigService: ProviderConfigService,
    private readonly coordinator: AiWorkerCoordinatorService,
  ) {}

  @Post('chat')
  @ApiOperation({ summary: 'Send chat message to AI' })
  @ApiResponse({ status: 200, description: 'Chat response' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async chat(@Body() chatDto: ChatRequestDto, @Request() req: any) {
    return this.aiHubService.chat(chatDto, req.user.userId);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get conversations' })
  @ApiResponse({ status: 200, description: 'Returns list of conversations' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getConversations(
    @Query() query: ConversationQueryDto,
    @Request() req: any,
  ) {
    return this.aiHubService.getConversations(query, req.user.userId);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation by ID' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Returns conversation details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getConversation(@Param('id') id: string, @Request() req: any) {
    return this.aiHubService.getConversation(id, req.user.userId);
  }

  @Get('workflows')
  @ApiOperation({ summary: 'Get available workflows' })
  @ApiResponse({ status: 200, description: 'Returns list of workflows' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getWorkflows() {
    return this.aiHubService.getWorkflows();
  }

  @Get('workflows/:id')
  @ApiOperation({ summary: 'Get workflow by ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({ status: 200, description: 'Returns workflow details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async getWorkflow(@Param('id') id: string) {
    return this.aiHubService.getWorkflow(id);
  }

  @Post('workflows/:id/run')
  @ApiOperation({ summary: 'Run workflow' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiResponse({ status: 200, description: 'Workflow run started' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async runWorkflow(
    @Param('id') id: string,
    @Body() runDto: RunWorkflowDto,
    @Request() req: any,
  ) {
    return this.aiHubService.runWorkflow(id, runDto, req.user.userId);
  }

  @Get('workflow-runs')
  @ApiOperation({ summary: 'Get workflow runs' })
  @ApiResponse({ status: 200, description: 'Returns list of workflow runs' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getWorkflowRuns(@Query() query: any) {
    return this.aiHubService.getWorkflowRuns(query);
  }

  @Get('workflow-runs/:id')
  @ApiOperation({ summary: 'Get workflow run by ID' })
  @ApiParam({ name: 'id', description: 'Workflow run ID' })
  @ApiResponse({ status: 200, description: 'Returns workflow run details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 501, description: 'Not implemented yet' })
  async getWorkflowRun(@Param('id') id: string) {
    // TODO: Implement getWorkflowRun detail
    return { id, message: 'Not implemented yet' };
  }

  @Get('models')
  @ApiOperation({ summary: 'Get available AI models' })
  @ApiResponse({ status: 200, description: 'Returns list of AI models' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getModels(@Query('provider') provider?: string) {
    return this.aiHubService.getModels(provider);
  }

  // ─── Provider CRUD Endpoints ─────────────────────────────────

  @Get('providers')
  @ApiOperation({ summary: 'List all AI providers' })
  @ApiResponse({ status: 200, description: 'Returns list of providers' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listProviders() {
    return this.providerConfigService.listProviders();
  }

  @Get('providers/:id')
  @ApiOperation({ summary: 'Get AI provider by ID' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({ status: 200, description: 'Returns provider details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async getProvider(@Param('id') id: string) {
    return this.providerConfigService.getProvider(id);
  }

  @Post('providers')
  @ApiOperation({ summary: 'Create AI provider configuration' })
  @ApiResponse({ status: 201, description: 'Provider created' })
  @ApiResponse({ status: 400, description: 'Invalid request or provider already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createProvider(@Body() dto: CreateProviderConfigDto) {
    return this.providerConfigService.createProvider(dto);
  }

  @Patch('providers/:id')
  @ApiOperation({ summary: 'Update AI provider configuration' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({ status: 200, description: 'Provider updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async updateProvider(
    @Param('id') id: string,
    @Body() dto: UpdateProviderConfigDto,
  ) {
    return this.providerConfigService.updateProvider(id, dto);
  }

  @Delete('providers/:id')
  @ApiOperation({ summary: 'Delete AI provider configuration' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({ status: 200, description: 'Provider deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async deleteProvider(@Param('id') id: string) {
    await this.providerConfigService.deleteProvider(id);
    return { success: true };
  }

  @Post('providers/validate')
  @ApiOperation({ summary: 'Validate provider credentials (not persisted)' })
  @ApiResponse({ status: 200, description: 'Returns validation result' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async validateProvider(@Body() dto: ValidateProviderDto) {
    return this.providerConfigService.validateProvider(dto);
  }

  @Post('providers/:id/test')
  @ApiOperation({ summary: 'Test connection for a saved provider (updates status)' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({ status: 200, description: 'Returns validation result and updates provider status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async testProvider(@Param('id') id: string) {
    return this.providerConfigService.testSavedProvider(id);
  }

  @Post('providers/:id/detect-models')
  @ApiOperation({ summary: 'Auto-detect available models for provider' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiResponse({ status: 200, description: 'Returns list of available models' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async detectModels(@Param('id') id: string) {
    const models = await this.providerConfigService.detectModels(id);
    return { models };
  }

  // ─── AI Worker Endpoints ──────────────────────────────────────────

  @Get('agents')
  @ApiOperation({ summary: 'List available AI agents for a project' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of available AI agents',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAvailableAgents(@Query('projectId') projectId: string) {
    return this.coordinator.getAvailableAgents(projectId);
  }

  @Post('assign-task')
  @ApiOperation({ summary: 'Assign a task to an AI agent' })
  @ApiResponse({ status: 200, description: 'Task dispatched to AI agent' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task or agent not found' })
  async assignTaskToAI(
    @Body() body: { taskId: string; agentSubjectId: string; projectId: string },
    @CurrentUser() user: any,
  ) {
    return this.coordinator.assignTaskToAI(
      body.taskId,
      body.agentSubjectId,
      body.projectId,
      user.id,
    );
  }
}
