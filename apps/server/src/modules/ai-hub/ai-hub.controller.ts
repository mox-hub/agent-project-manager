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
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';
import { AiHubService } from './ai-hub.service';
import { ProviderConfigService } from './services/provider-config.service';
import { AiWorkerCoordinatorService } from './services/ai-worker-coordinator.service';
import { ChatRequestDto } from './dto/chat.dto';
import { UsageQueryDto } from './dto/usage-query.dto';
import { ConversationQueryDto } from './dto/conversation-query.dto';
import {
  CreateProviderConfigDto,
  UpdateProviderConfigDto,
  ValidateProviderDto,
  ProviderConfigResponseDto,
  ValidateProviderResponseDto,
} from './dto/provider-config.dto';
import {
  AIModelDto,
  AssignIssueResponseDto,
  ChatResponseDto,
  ConversationDetailResponseDto,
  ConversationListResponseDto,
  DeleteProviderResponseDto,
  DetectModelsResponseDto,
  UsageResponseDto,
} from './dto/ai-hub-response.dto';

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
  @ApiOkResponse({
    type: ChatResponseDto,
    description: '助手回复（sync 模式：会话 ID + 消息）',
  })
  @ApiStandardErrors()
  async chat(@Body() chatDto: ChatRequestDto, @Request() req: any) {
    return this.aiHubService.chat(chatDto, req.user.id);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get conversations' })
  @ApiOkResponse({
    type: ConversationListResponseDto,
    description:
      '会话分页列表（{ data, meta: page/pageSize/total/totalPages }）',
  })
  @ApiStandardErrors()
  async getConversations(
    @Query() query: ConversationQueryDto,
    @Request() req: any,
  ) {
    return this.aiHubService.getConversations(query, req.user.id);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation by ID' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiOkResponse({
    type: ConversationDetailResponseDto,
    description: '会话详情（含完整消息列表）',
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @ApiStandardErrors()
  async getConversation(@Param('id') id: string, @Request() req: any) {
    return this.aiHubService.getConversation(id, req.user.id);
  }

  // 工作流端点已迁出至 modules/workflow（CAP-A-11 Mastra 引擎基座）：
  // GET /workflows、GET /workflows/:id、POST /workflows/:id/run、
  // GET /workflow-runs、GET /workflow-runs/:id、POST /workflow-runs/:id/resume

  @Get('usage')
  @ApiOperation({ summary: 'AI 用量统计（总量/按模型/按日）' })
  @ApiOkResponse({
    type: UsageResponseDto,
    description: '用量统计 { totalTokens, totalCost, byModel[], byDay[] }',
  })
  @ApiStandardErrors()
  async getUsage(@Query() query: UsageQueryDto) {
    return this.aiHubService.getUsage(query);
  }

  @Get('models')
  @ApiOperation({ summary: 'Get available AI models' })
  @ApiOkResponse({
    type: [AIModelDto],
    description: '可用模型列表（DB 配置 + 适配器派生）',
  })
  @ApiStandardErrors()
  async getModels(@Query('provider') provider?: string) {
    return this.aiHubService.getModels(provider);
  }

  // ─── Provider CRUD Endpoints ─────────────────────────────────

  @Get('providers')
  @ApiOperation({ summary: 'List all AI providers' })
  @ApiOkResponse({
    type: [ProviderConfigResponseDto],
    description: 'Provider 配置列表（不含 API Key）',
  })
  @ApiStandardErrors()
  async listProviders() {
    return this.providerConfigService.listProviders();
  }

  @Get('providers/:id')
  @ApiOperation({ summary: 'Get AI provider by ID' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiOkResponse({
    type: ProviderConfigResponseDto,
    description: 'Provider 配置详情（不含 API Key）',
  })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  @ApiStandardErrors()
  async getProvider(@Param('id') id: string) {
    return this.providerConfigService.getProvider(id);
  }

  @Post('providers')
  @ApiOperation({ summary: 'Create AI provider configuration' })
  @ApiCreatedResponse({
    type: ProviderConfigResponseDto,
    description: '创建后的 Provider 配置（不含 API Key）',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or provider already exists',
  })
  @ApiStandardErrors()
  async createProvider(@Body() dto: CreateProviderConfigDto) {
    return this.providerConfigService.createProvider(dto);
  }

  @Patch('providers/:id')
  @ApiOperation({ summary: 'Update AI provider configuration' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiOkResponse({
    type: ProviderConfigResponseDto,
    description: '更新后的 Provider 配置（不含 API Key）',
  })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  @ApiStandardErrors()
  async updateProvider(
    @Param('id') id: string,
    @Body() dto: UpdateProviderConfigDto,
  ) {
    return this.providerConfigService.updateProvider(id, dto);
  }

  @Delete('providers/:id')
  @ApiOperation({ summary: 'Delete AI provider configuration' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiOkResponse({
    type: DeleteProviderResponseDto,
    description: '删除成功标记 { success: true }',
  })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  @ApiStandardErrors()
  async deleteProvider(@Param('id') id: string) {
    await this.providerConfigService.deleteProvider(id);
    return { success: true };
  }

  @Post('providers/validate')
  @ApiOperation({ summary: 'Validate provider credentials (not persisted)' })
  @ApiOkResponse({
    type: ValidateProviderResponseDto,
    description: '校验结果 { valid, models?, error? }',
  })
  @ApiStandardErrors()
  async validateProvider(@Body() dto: ValidateProviderDto) {
    return this.providerConfigService.validateProvider(dto);
  }

  @Post('providers/:id/test')
  @ApiOperation({
    summary: 'Test connection for a saved provider (updates status)',
  })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiOkResponse({
    type: ValidateProviderResponseDto,
    description: '连接测试结果（同时更新 Provider 状态）',
  })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  @ApiStandardErrors()
  async testProvider(@Param('id') id: string) {
    return this.providerConfigService.testSavedProvider(id);
  }

  @Post('providers/:id/detect-models')
  @ApiOperation({ summary: 'Auto-detect available models for provider' })
  @ApiParam({ name: 'id', description: 'Provider ID' })
  @ApiOkResponse({
    type: DetectModelsResponseDto,
    description: '探测到的模型列表 { models: string[] }',
  })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  @ApiStandardErrors()
  async detectModels(@Param('id') id: string) {
    const models = await this.providerConfigService.detectModels(id);
    return { models };
  }

  // ─── AI Worker Endpoints ──────────────────────────────────────────

  @Post('assign-issue')
  @ApiOperation({ summary: 'Assign a task to an AI member (V3: Member.id)' })
  @ApiOkResponse({
    type: AssignIssueResponseDto,
    description: '指派/派发结果 { issueId, executionRunId?, status, ... }',
  })
  @ApiResponse({ status: 404, description: 'Task or member not found' })
  @ApiStandardErrors()
  async assignTaskToAI(
    @Body() body: { issueId: string; memberId: string; executionId?: string },
    @CurrentUser() user: any,
  ) {
    return this.coordinator.assignTaskToAI(
      body.issueId,
      body.memberId,
      user.id,
      { executionId: body.executionId },
    );
  }
}
