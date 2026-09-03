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
  AssistantDispatchDto,
  AssistantSendMessageDto,
} from './dto/assistant.dto';
import { AssistantService } from './assistant.service';

@ApiTags('AI Assistant')
@Controller('ai/assistant')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Get('conversations/current')
  @ApiOperation({
    summary: 'Get or create the main AI session for current scope',
  })
  async getCurrentConversation(
    @Query() query: AssistantConversationQueryDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.assistantService.getCurrentConversation(
      query.projectId ?? null,
      req.user.id,
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
    );
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
}
