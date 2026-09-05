import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AssistantConversationQueryDto,
  AssistantCreateConversationDto,
  AssistantDispatchDto,
  AssistantSendMessageDto,
  AssistantSilentDto,
} from './dto/assistant.dto';
import { AssistantService } from './assistant.service';
import { AssistantSilentService } from './services/assistant-silent.service';

@ApiTags('AI Assistant')
@Controller('ai/assistant')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AssistantController {
  constructor(
    private readonly assistantService: AssistantService,
    private readonly silentService: AssistantSilentService,
  ) {}

  @Get('conversations')
  @ApiOperation({ summary: 'List main AI conversations for current scope' })
  async listConversations(
    @Query() query: AssistantConversationQueryDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.assistantService.listConversations(
      query.projectId ?? null,
      req.user.id,
    );
  }

  @Post('conversations')
  @ApiOperation({
    summary: 'Create a new main AI conversation for current scope',
  })
  async createConversation(
    @Body() dto: AssistantCreateConversationDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.assistantService.createConversation(
      dto.projectId ?? null,
      req.user.id,
    );
  }

  @Get('conversations/current')
  @ApiOperation({
    summary:
      'Get the current main AI session (latest updatedAt), or a specific conversation via conversationId',
  })
  async getCurrentConversation(
    @Query() query: AssistantConversationQueryDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.assistantService.getCurrentConversation(
      query.projectId ?? null,
      req.user.id,
      query.conversationId,
    );
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send a message to the main AI session' })
  async sendMessage(
    @Body() dto: AssistantSendMessageDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.assistantService.sendMessage(
      dto.content,
      dto.projectId ?? null,
      req.user.id,
      dto.conversationId,
      dto.model,
      dto.viewing,
    );
  }

  @Get('models')
  @ApiOperation({
    summary:
      'Selectable models: online CLI runtime channels + enabled LLM providers',
  })
  async listModels() {
    return this.assistantService.listModels();
  }

  @Get('tools')
  @ApiOperation({
    summary:
      'Assistant system tool catalog (HTTP form for CLI/PAT loop + server tools)',
  })
  async listTools() {
    return this.assistantService.listTools();
  }

  @Post('dispatches')
  @ApiOperation({
    summary: 'Dispatch a message to the CLI runtime as an execution run',
  })
  async dispatch(
    @Body() dto: AssistantDispatchDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.assistantService.dispatchExecution(
      dto.content,
      dto.projectId,
      req.user.id,
    );
  }

  @Post('silent')
  @ApiOperation({
    summary:
      'Unified silent AI channel: run a registered scenario and return structured JSON',
  })
  async silent(
    @Body() dto: AssistantSilentDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.silentService.run(
      dto.scenario,
      dto.context,
      dto.projectId ?? null,
      req.user.id,
    );
  }
}
