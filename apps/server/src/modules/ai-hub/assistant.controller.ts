import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';
import {
  AssistantConversationQueryDto,
  AssistantCreateConversationDto,
  AssistantDispatchDto,
  AssistantSendMessageDto,
  AssistantSilentDto,
} from './dto/assistant.dto';
import {
  AssistantConversationListItemDto,
  AssistantCreateConversationResponseDto,
  AssistantCurrentConversationResponseDto,
  AssistantDispatchResponseDto,
  AssistantSendMessageResponseDto,
  AssistantSilentResponseDto,
} from './dto/assistant-response.dto';
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
  @ApiOkResponse({
    type: [AssistantConversationListItemDto],
    description: '会话列表（含消息计数，按更新时间倒序）',
  })
  @ApiStandardErrors()
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
  @ApiCreatedResponse({
    type: AssistantCreateConversationResponseDto,
    description: '新会话 { conversationId, projectId, messages: [] }',
  })
  @ApiStandardErrors()
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
  @ApiOkResponse({
    type: AssistantCurrentConversationResponseDto,
    description: '当前会话 + 最近消息（可传 conversationId 切换历史会话）',
  })
  @ApiStandardErrors()
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
  @ApiOkResponse({
    type: AssistantSendMessageResponseDto,
    description: '回复回执（sync：消息内容；runtime：执行 ID + 派发状态）',
  })
  @ApiStandardErrors()
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
  // CLI 通道项与 LLM 项字段不同构，用 inline 动态对象描述
  @ApiOkResponse({
    description: '可选模型清单 { models: [...（字段按 type 而异）] }',
    schema: {
      type: 'object',
      properties: {
        models: {
          type: 'array',
          items: { type: 'object', additionalProperties: true },
          description:
            'type=runtime/runtime-provider：id, runtimeId, provider?, label, online, providers?；type=llm：id, provider, label, model',
        },
      },
      required: ['models'],
    },
  })
  @ApiStandardErrors()
  async listModels() {
    return this.assistantService.listModels();
  }

  @Get('tools')
  @ApiOperation({
    summary:
      'Assistant system tool catalog (HTTP form for CLI/PAT loop + server tools)',
  })
  // 工具目录为动态结构（describeTools），用 inline 动态对象描述
  @ApiOkResponse({
    description: '助手系统工具目录（动态结构，key→工具描述）',
    schema: { type: 'object', additionalProperties: true },
  })
  @ApiStandardErrors()
  async listTools() {
    return this.assistantService.listTools();
  }

  @Post('dispatches')
  @ApiOperation({
    summary: 'Dispatch a message to the CLI runtime as an execution run',
  })
  @ApiOkResponse({
    type: AssistantDispatchResponseDto,
    description: '执行派发回执 { executionRunId, runtimeId, status }',
  })
  @ApiStandardErrors()
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
  @ApiOkResponse({
    type: AssistantSilentResponseDto,
    description: '场景结果 { scenario, data（结构化 JSON） }',
  })
  @ApiStandardErrors()
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
