/**
 * Skills Controller
 *
 * REST 端点：
 *   GET    /_api/skills         技能列表（轻量，不含指令正文）
 *   POST   /_api/skills         新建自定义技能（key 冲突 409；带 sourcePath 时读文件物化）
 *   GET    /_api/skills/:key    技能详情（含 content / sourcePath）
 *   PUT    /_api/skills/:key    更新技能（开关 / 名称 / 描述 / 分类 / 指令 / 路径）
 *   DELETE /_api/skills/:key    删除自定义技能（builtin 禁删 403）
 *   POST   /_api/skills/import  从本地 SKILL.md 路径导入
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { SkillsService, SkillDetail } from './skills.service';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { CreateSkillDto } from './dto/create-skill.dto';
import { ImportSkillDto } from './dto/import-skill.dto';
import {
  SkillDeleteResponseDto,
  SkillDetailResponseDto,
  SkillListResponseDto,
  SkillStatusResponseDto,
} from './dto/skill-response.dto';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';

@ApiTags('Skills')
@ApiBearerAuth('JWT-auth')
@Controller('skills')
@UseGuards(JwtAuthGuard)
export class SkillsController {
  constructor(private readonly service: SkillsService) {}

  @Get()
  @ApiOperation({ summary: 'List all registered AI skills' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: SkillListResponseDto,
    description: 'Skill list',
  })
  async listSkills(): Promise<{ skills: SkillStatusResponseDto[] }> {
    return { skills: await this.service.listSkills() };
  }

  @Post()
  @ApiOperation({ summary: 'Create a custom skill' })
  @ApiStandardErrors()
  @ApiCreatedResponse({
    type: SkillDetailResponseDto,
    description: 'Created skill',
  })
  @ApiResponse({ status: 409, description: 'Skill key already exists' })
  async createSkill(@Body() dto: CreateSkillDto): Promise<SkillDetail> {
    return this.service.createSkill(dto);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import a skill from a local SKILL.md path' })
  @ApiStandardErrors()
  @ApiCreatedResponse({
    type: SkillDetailResponseDto,
    description: 'Imported skill',
  })
  @ApiResponse({ status: 400, description: 'Cannot read source file' })
  @ApiResponse({ status: 409, description: 'Skill key already exists' })
  async importSkill(@Body() dto: ImportSkillDto): Promise<SkillDetail> {
    return this.service.importSkill(dto);
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get a skill with full instruction content' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: SkillDetailResponseDto,
    description: 'Skill detail',
  })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  async getSkill(@Param('key') key: string): Promise<SkillDetail> {
    return this.service.getSkill(key);
  }

  @Put(':key')
  @ApiOperation({
    summary: 'Update a skill (toggle / rename / recategorize / content)',
  })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: SkillStatusResponseDto,
    description: 'Updated skill',
  })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  async updateSkill(
    @Param('key') key: string,
    @Body() dto: UpdateSkillDto,
  ): Promise<SkillStatusResponseDto> {
    return this.service.updateSkill(key, dto);
  }

  @Delete(':key')
  @ApiOperation({
    summary: 'Delete a custom skill (builtin skills cannot be deleted)',
  })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: SkillDeleteResponseDto,
    description: 'Deleted',
  })
  @ApiResponse({ status: 403, description: 'Builtin skill' })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  async removeSkill(
    @Param('key') key: string,
  ): Promise<SkillDeleteResponseDto> {
    return this.service.removeSkill(key);
  }
}
