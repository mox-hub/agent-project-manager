import {
  Controller,
  Post,
  Get,
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
import { AiWorkerCoordinatorService } from './services/ai-worker-coordinator.service';
import { ChatRequestDto } from './dto/chat.dto';
import { ConversationQueryDto } from './dto/conversation-query.dto';
import { RunWorkflowDto } from './dto/workflow-run.dto';
import { UsageQueryDto } from './dto/usage-query.dto';

@ApiTags('AI Hub')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AiHubController {
  constructor(
    private readonly aiHubService: AiHubService,
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
  async getModels() {
    return this.aiHubService.getModels();
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get AI usage statistics' })
  @ApiResponse({ status: 200, description: 'Returns usage statistics' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUsage(@Query() query: UsageQueryDto) {
    return this.aiHubService.getUsage(query);
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
