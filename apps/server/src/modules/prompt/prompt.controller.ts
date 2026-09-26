/**
 * Prompt Controller（CAP-A-24）
 *
 * REST 端点：
 *   GET /_api/prompts/system          系统提示词列表（只读元数据）
 *   GET /_api/prompts/system/:key     系统提示词详情（只读全文）
 *   GET /_api/prompts/config          注入开关 + 项目级提示词（?projectId= 选填）
 *   PUT /_api/prompts/config          更新注入开关 / 项目级提示词（空串清空）
 *
 * 系统提示词无写端点：内置资产只读，升级随版本发布（治理铁律——系统规范
 * 不提供人工改写通道）。派发完整 prompt 的干跑预览在
 * GET /_api/ai/issues/:issueId/prompt-preview（cli-dispatch 侧）。
 */

import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PromptService } from './prompt.service';
import {
  PromptConfigResponseDto,
  SystemPromptDetailDto,
  SystemPromptListResponseDto,
  UpdatePromptConfigDto,
} from './dto/prompt.dto';

@ApiTags('Prompts')
@Controller('prompts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PromptController {
  constructor(private readonly promptService: PromptService) {}

  @Get('system')
  @ApiOperation({ summary: '系统提示词列表（内置只读）' })
  @ApiOkResponse({
    type: SystemPromptListResponseDto,
    description: '内置系统提示词元数据（无写端点，升级随版本发布）',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  listSystemPrompts() {
    return { items: this.promptService.listSystemPrompts() };
  }

  @Get('system/:key')
  @ApiOperation({ summary: '系统提示词详情（只读全文）' })
  @ApiOkResponse({
    type: SystemPromptDetailDto,
    description: '系统提示词 markdown 全文',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'System prompt not found' })
  getSystemPrompt(@Param('key') key: string) {
    return this.promptService.getSystemPrompt(key);
  }

  @Get('config')
  @ApiOperation({ summary: '提示词注入配置（开关 + 项目级提示词）' })
  @ApiOkResponse({
    type: PromptConfigResponseDto,
    description: '注入开关（缺省全开）与项目级提示词（未配置 null）',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getConfig(@Query('projectId') projectId?: string) {
    return this.promptService.getConfig(projectId || undefined);
  }

  @Put('config')
  @ApiOperation({ summary: '更新注入开关 / 项目级提示词' })
  @ApiOkResponse({
    type: PromptConfigResponseDto,
    description:
      '更新后的配置（开关全量返回；项目提示词按传入 projectId 返回）',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateConfig(@Body() dto: UpdatePromptConfigDto) {
    const {
      system,
      project,
      role,
      team,
      member,
      task,
      skills,
      context,
      projectId,
      projectPrompt,
    } = dto;
    return this.promptService.updateConfig({
      toggles: {
        ...(system === undefined ? {} : { system }),
        ...(project === undefined ? {} : { project }),
        ...(role === undefined ? {} : { role }),
        ...(team === undefined ? {} : { team }),
        ...(member === undefined ? {} : { member }),
        ...(task === undefined ? {} : { task }),
        ...(skills === undefined ? {} : { skills }),
        ...(context === undefined ? {} : { context }),
      },
      projectId,
      projectPrompt,
    });
  }
}
