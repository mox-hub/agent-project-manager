/**
 * Prompt Controller（CAP-A-24 + 增强 A/C/D）
 *
 * REST 端点：
 *   GET  /_api/prompts/system                系统提示词列表（只读元数据）
 *   GET  /_api/prompts/system/:key           系统提示词详情（只读全文）
 *   GET  /_api/prompts/config                注入开关 + 项目级提示词 + AGENTS.md 状态（?projectId=）
 *   PUT  /_api/prompts/config                更新开关 / 项目提示词（保存后物化 AGENTS.md）
 *   GET  /_api/prompts/usage-stats           注入率统计（最近执行载荷段头解析）
 *   GET  /_api/prompts/templates             模板库（内置常量 + 自定义表，?target=&scope=&projectId=）
 *   POST /_api/prompts/templates             新建模板
 *   PUT  /_api/prompts/templates/:id         更新模板
 *   DELETE /_api/prompts/templates/:id       删除模板（内置模板不在表内天然不可删）
 *   POST /_api/prompts/templates/preview     模板插值干跑（按任务事实）
 *
 * 系统提示词无写端点：内置资产只读，升级随版本发布（治理铁律——系统规范
 * 不提供人工改写通道）。派发完整 prompt 的干跑预览在
 * GET /_api/ai/issues/:issueId/prompt-preview（cli-dispatch 侧）。
 */

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
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
  CreatePromptTemplateDto,
  PromptConfigResponseDto,
  PromptConfigUpdateResponseDto,
  PromptTemplateListResponseDto,
  PromptTemplatePreviewRequestDto,
  PromptTemplatePreviewResponseDto,
  PromptUsageStatsResponseDto,
  SystemPromptDetailDto,
  SystemPromptListResponseDto,
  UpdatePromptConfigDto,
  UpdatePromptTemplateDto,
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
  @ApiOperation({
    summary: '提示词注入配置（开关 + 项目提示词 + AGENTS.md 状态）',
  })
  @ApiOkResponse({
    type: PromptConfigResponseDto,
    description:
      '注入开关（缺省全开）、项目级提示词（未配置 null）与 AGENTS.md 文件侧状态',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getConfig(@Query('projectId') projectId?: string) {
    return this.promptService.getConfig(projectId || undefined);
  }

  @Put('config')
  @ApiOperation({ summary: '更新注入开关 / 项目级提示词（物化 AGENTS.md）' })
  @ApiOkResponse({
    type: PromptConfigUpdateResponseDto,
    description:
      '更新后的配置；agentsSync 反映 AGENTS.md 物化结果（未绑定工作区/IO 失败为未同步降级）',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateConfig(
    @Body() dto: UpdatePromptConfigDto,
  ): Promise<PromptConfigUpdateResponseDto> {
    const {
      system,
      project,
      executor,
      team,
      task,
      skills,
      context,
      projectId,
      projectPrompt,
    } = dto;
    const result = await this.promptService.updateConfig({
      toggles: {
        ...(system === undefined ? {} : { system }),
        ...(project === undefined ? {} : { project }),
        ...(executor === undefined ? {} : { executor }),
        ...(team === undefined ? {} : { team }),
        ...(task === undefined ? {} : { task }),
        ...(skills === undefined ? {} : { skills }),
        ...(context === undefined ? {} : { context }),
      },
      projectId,
      projectPrompt,
    });
    return result;
  }

  @Get('usage-stats')
  @ApiOperation({ summary: '注入率统计（最近执行载荷按段头解析）' })
  @ApiOkResponse({
    type: PromptUsageStatsResponseDto,
    description: '各治理段实际注入率与平均字符开销；无样本时 promptCount=0',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getUsageStats(@Query('sampleSize') sampleSize?: string) {
    const parsed = Number.parseInt(sampleSize ?? '', 10);
    return this.promptService.getUsageStats(
      Number.isFinite(parsed) ? parsed : 50,
    );
  }

  @Get('templates')
  @ApiOperation({ summary: '提示词模板库（内置 + 自定义）' })
  @ApiOkResponse({ type: PromptTemplateListResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listTemplates(
    @Query('target') target?: string,
    @Query('scope') scope?: string,
    @Query('projectId') projectId?: string,
  ) {
    const items = await this.promptService.listTemplates(
      target || undefined,
      scope || undefined,
      projectId || undefined,
    );
    return { items };
  }

  @Post('templates')
  @ApiOperation({ summary: '新建提示词模板' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'scope=project 缺 projectId 等' })
  async createTemplate(@Body() dto: CreatePromptTemplateDto) {
    if (dto.scope === 'project' && !dto.projectId) {
      throw new BadRequestException('scope=project 时必须提供 projectId');
    }
    return this.promptService.createTemplate(dto);
  }

  @Post('templates/preview')
  @ApiOperation({ summary: '模板插值干跑（按任务事实）' })
  @ApiOkResponse({ type: PromptTemplatePreviewResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  previewTemplate(@Body() dto: PromptTemplatePreviewRequestDto) {
    return this.promptService.previewTemplate(dto);
  }

  @Put('templates/:id')
  @ApiOperation({ summary: '更新自定义模板' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Prompt template not found' })
  updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdatePromptTemplateDto,
  ) {
    return this.promptService.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: '删除自定义模板（内置模板不在表内不可删）' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Prompt template not found' })
  async deleteTemplate(@Param('id') id: string) {
    await this.promptService.deleteTemplate(id);
    return { ok: true };
  }
}
