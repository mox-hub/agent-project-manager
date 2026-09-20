import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';
import { PlaybookService } from './playbook.service';
import {
  MountPlaybookDto,
  PlaybookStatusResponseDto,
  PlaybookTemplatesResponseDto,
  SkipStageDto,
  SkipStageResponseDto,
  SubmitInterviewDto,
  SubmitInterviewResponseDto,
} from './dto/playbook.dto';

/**
 * 剧本 HTTP 面（v2 纪要 §4.2）：模板只读注册表 + 项目运行态
 * （挂载 / 阶段访谈 → 工件 + 闸门 / 跳过阶段）。
 * 闸门拍板不在本控制器——去决策收件箱（不开第二个拍板入口）。
 */
@ApiTags('Playbook')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller()
export class PlaybookController {
  constructor(private readonly playbookService: PlaybookService) {}

  @Get('playbooks/templates')
  @ApiOperation({ summary: '内置剧本模板注册表（只读）' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: PlaybookTemplatesResponseDto,
    description: '模板清单（阶段/访谈问题/闸门定义）',
  })
  getTemplates() {
    return this.playbookService.getTemplates();
  }

  @Get('projects/:projectId/playbook')
  @ApiOperation({ summary: '项目剧本运行态（游标 + 阶段时间线 + 闸门状态）' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: PlaybookStatusResponseDto,
    description: '未挂载剧本时 stages 为空、playbookRef 为 null',
  })
  getStatus(@Param('projectId') projectId: string) {
    return this.playbookService.getStatus(projectId);
  }

  @Post('projects/:projectId/playbook/mount')
  @ApiOperation({ summary: '挂载剧本（游标拨到首阶段；重挂 = 换模板）' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: PlaybookStatusResponseDto,
    description: '挂载后的运行态',
  })
  mount(
    @Param('projectId') projectId: string,
    @Body() dto: MountPlaybookDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.playbookService.mount(projectId, dto, user.id);
  }

  @Post('projects/:projectId/playbook/stages/:stageKey/interview')
  @ApiOperation({
    summary: '提交阶段访谈：转写为正式工件（对照翻译）+ 生成闸门决策卡',
  })
  @ApiStandardErrors()
  @ApiCreatedResponse({
    type: SubmitInterviewResponseDto,
    description: '工件文档 + 闸门提案（去决策收件箱拍板）+ 人话术语对照',
  })
  submitInterview(
    @Param('projectId') projectId: string,
    @Param('stageKey') stageKey: string,
    @Body() dto: SubmitInterviewDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.playbookService.submitInterview(
      projectId,
      stageKey,
      dto,
      user.id,
    );
  }

  @Post('projects/:projectId/playbook/stages/:stageKey/skip')
  @ApiOperation({ summary: '跳过阶段（放行但记事件，验收可查）' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: SkipStageResponseDto,
    description: '跳过的阶段与推进后的游标',
  })
  skipStage(
    @Param('projectId') projectId: string,
    @Param('stageKey') stageKey: string,
    @Body() dto: SkipStageDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.playbookService.skipStage(projectId, stageKey, dto, user.id);
  }
}
