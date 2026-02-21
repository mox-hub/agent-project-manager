import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { TerminalService } from './terminal.service';
import { CreateTerminalSessionDto } from './dto/create-terminal-session.dto';
import { ExecuteCommandDto } from './dto/execute-command.dto';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('terminal')
@UseGuards(JwtAuthGuard)
export class TerminalController {
  constructor(private readonly terminalService: TerminalService) {}

  @Get('sessions')
  async getSessions(
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @CurrentUser() user?: { sub: string },
  ) {
    return this.terminalService.getSessions(projectId, status, user?.sub);
  }

  @Post('sessions')
  async createSession(
    @Body() dto: CreateTerminalSessionDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.terminalService.createSession(dto, user.sub);
  }

  @Get('sessions/:id')
  async getSessionById(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.terminalService.getSessionById(id, user.sub);
  }

  @Patch('sessions/:id')
  async updateSession(
    @Param('id') id: string,
    @Body() dto: { name?: string },
    @CurrentUser() user: { sub: string },
  ) {
    return this.terminalService.updateSession(id, dto, user.sub);
  }

  @Delete('sessions/:id')
  async closeSession(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.terminalService.closeSession(id, user.sub);
  }

  @Post('sessions/:id/commands')
  async executeCommand(
    @Param('id') id: string,
    @Body() dto: ExecuteCommandDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.terminalService.executeCommand(id, dto, user.sub);
  }

  @Get('sessions/:id/commands')
  async getCommandExecutions(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.terminalService.getCommandExecutions(id, user.sub);
  }

  @Get('commands/:commandId')
  async getCommandExecutionById(
    @Param('commandId') commandId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.terminalService.getCommandExecutionById(commandId, user.sub);
  }
}
