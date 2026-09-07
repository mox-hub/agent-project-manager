/**
 * Skills Controller
 *
 * REST 端点：
 *   GET /_api/skills        技能列表
 *   PUT /_api/skills/:key   更新技能（开关 / 名称 / 描述 / 分类）
 */

import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { SkillsService, SkillStatus } from './skills.service';
import { UpdateSkillDto } from './dto/update-skill.dto';
import {
  SkillListResponseDto,
  SkillStatusResponseDto,
} from './dto/skill-response.dto';

@ApiTags('Skills')
@ApiBearerAuth('JWT-auth')
@Controller('skills')
@UseGuards(JwtAuthGuard)
export class SkillsController {
  constructor(private readonly service: SkillsService) {}

  @Get()
  @ApiOperation({ summary: 'List all registered AI skills' })
  @ApiOkResponse({
    type: SkillListResponseDto,
    description: 'Skill list',
  })
  async listSkills(): Promise<{ skills: SkillStatus[] }> {
    return { skills: await this.service.listSkills() };
  }

  @Put(':key')
  @ApiOperation({ summary: 'Update a skill (toggle / rename / recategorize)' })
  @ApiOkResponse({
    type: SkillStatusResponseDto,
    description: 'Updated skill',
  })
  @ApiResponse({ status: 404, description: 'Skill not found' })
  async updateSkill(
    @Param('key') key: string,
    @Body() dto: UpdateSkillDto,
  ): Promise<SkillStatus> {
    return this.service.updateSkill(key, dto);
  }
}
