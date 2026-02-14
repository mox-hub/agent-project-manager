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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiHubService } from './ai-hub.service';
import { ChatRequestDto } from './dto/chat.dto';
import { ConversationQueryDto } from './dto/conversation-query.dto';
import { RunWorkflowDto } from './dto/workflow-run.dto';
import { UsageQueryDto } from './dto/usage-query.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiHubController {
  constructor(private readonly aiHubService: AiHubService) {}

  @Post('chat')
  async chat(@Body() chatDto: ChatRequestDto, @Request() req: any) {
    return this.aiHubService.chat(chatDto, req.user.userId);
  }

  @Get('conversations')
  async getConversations(
    @Query() query: ConversationQueryDto,
    @Request() req: any,
  ) {
    return this.aiHubService.getConversations(query, req.user.userId);
  }

  @Get('conversations/:id')
  async getConversation(@Param('id') id: string, @Request() req: any) {
    return this.aiHubService.getConversation(id, req.user.userId);
  }

  @Get('workflows')
  async getWorkflows() {
    return this.aiHubService.getWorkflows();
  }

  @Get('workflows/:id')
  async getWorkflow(@Param('id') id: string) {
    return this.aiHubService.getWorkflow(id);
  }

  @Post('workflows/:id/run')
  async runWorkflow(
    @Param('id') id: string,
    @Body() runDto: RunWorkflowDto,
    @Request() req: any,
  ) {
    return this.aiHubService.runWorkflow(id, runDto, req.user.userId);
  }

  @Get('workflow-runs')
  async getWorkflowRuns(@Query() query: any) {
    return this.aiHubService.getWorkflowRuns(query);
  }

  @Get('workflow-runs/:id')
  async getWorkflowRun(@Param('id') id: string) {
    // TODO: Implement getWorkflowRun detail
    return { id, message: 'Not implemented yet' };
  }

  @Get('models')
  async getModels() {
    return this.aiHubService.getModels();
  }

  @Get('usage')
  async getUsage(@Query() query: UsageQueryDto) {
    return this.aiHubService.getUsage(query);
  }
}
