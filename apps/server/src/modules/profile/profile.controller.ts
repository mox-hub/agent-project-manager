import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
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
import { ProfileService } from './profile.service';
import { ArchaeologyService } from './archaeology.service';
import {
  ArchaeologyIngestResponseDto,
  ArchaeologyStartResponseDto,
  CreateProfileAtomDto,
  ProfileAtomDto,
  ProfileBriefingDto,
  ProfileResponseDto,
  ProfileSchemaResponseDto,
  RejectProfileAtomDto,
  StartArchaeologyDto,
  UpdateProfileAtomDto,
} from './dto/profile.dto';

/**
 * 项目档案 HTTP 面（v2 纪要切片 1）：
 * 内置槽位 schema（只读）、槽位聚合与完备度、原子 CRUD（AI 草稿→人批准）、
 * 考古触发与产物 ingest（拉取式，前端轮询执行完成后显式调用）、简报最小装配。
 */
@ApiTags('Profile')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly archaeologyService: ArchaeologyService,
  ) {}

  @Get(':projectId/profile/schema')
  @ApiOperation({ summary: '内置档案槽位注册表（只读）' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ProfileSchemaResponseDto,
    description: '内置槽位定义（version + slots）',
  })
  getSchema() {
    return this.profileService.getSchema();
  }

  @Get(':projectId/profile')
  @ApiOperation({ summary: '项目档案聚合（槽位分组 + 完备度 + 待审草稿）' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ProfileResponseDto,
    description: '按槽位分组的档案（生效原子 + 草稿 + 完备度派生）',
  })
  getProfile(@Param('projectId') projectId: string) {
    return this.profileService.getProfile(projectId);
  }

  @Post(':projectId/profile/atoms')
  @ApiOperation({
    summary: '新增档案原子（人写直接生效，同内容去重提升置信度）',
  })
  @ApiStandardErrors()
  @ApiCreatedResponse({
    type: ProfileAtomDto,
    description: '写入/合并后的档案原子（lifecycle=consolidated）',
  })
  createAtom(
    @Param('projectId') projectId: string,
    @Body() dto: CreateProfileAtomDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.profileService.createAtom({ ...dto, projectId }, user.id);
  }

  @Patch(':projectId/profile/atoms/:atomId')
  @ApiOperation({ summary: '编辑档案原子（生效侧新建替换，旧值留痕可溯源）' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ProfileAtomDto,
    description: '替换后的新原子（旧原子 archived + supersededById 指向新值）',
  })
  editAtom(
    @Param('atomId') atomId: string,
    @Body() dto: UpdateProfileAtomDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.profileService.editAtom(atomId, dto, user.id);
  }

  @Post(':projectId/profile/atoms/:atomId/approve')
  @ApiOperation({ summary: '批准 AI 草稿（working → consolidated）' })
  @ApiStandardErrors()
  @ApiOkResponse({ type: ProfileAtomDto, description: '生效后的档案原子' })
  approveAtom(
    @Param('atomId') atomId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.profileService.approveAtom(atomId, user.id);
  }

  @Post(':projectId/profile/atoms/:atomId/reject')
  @ApiOperation({ summary: '驳回 AI 草稿（working → archived，证据可查）' })
  @ApiStandardErrors()
  @ApiOkResponse({ type: ProfileAtomDto, description: '驳回后的档案原子' })
  rejectAtom(
    @Param('atomId') atomId: string,
    @Body() dto: RejectProfileAtomDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.profileService.rejectAtom(atomId, dto, user.id);
  }

  @Post(':projectId/profile/archaeology')
  @ApiOperation({
    summary: '触发项目考古（建内部 issue + 派 CLI Agent 只读扫描仓库）',
  })
  @ApiStandardErrors()
  @ApiCreatedResponse({
    type: ArchaeologyStartResponseDto,
    description:
      '考古任务句柄：轮询 GET /execution/runs/{executionId}/events 看进度',
  })
  startArchaeology(
    @Param('projectId') projectId: string,
    @Body() dto: StartArchaeologyDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.archaeologyService.start(projectId, user.id, dto);
  }

  @Post(':projectId/profile/archaeology/:executionId/ingest')
  @ApiOperation({
    summary:
      '考古产物入库（拉取式：执行完成后调用，产物落 working 草稿待人批准）',
  })
  @ApiStandardErrors()
  @ApiCreatedResponse({
    type: ArchaeologyIngestResponseDto,
    description: '{ created, skipped, atoms }（草稿在档案页草稿区审批）',
  })
  ingestArchaeology(
    @Param('projectId') projectId: string,
    @Param('executionId') executionId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.profileService.ingestArchaeology(
      projectId,
      executionId,
      user.id,
    );
  }

  @Get(':projectId/briefing')
  @ApiOperation({
    summary: '项目简报（事实现查 + 生效档案原子，管家装配基底）',
  })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: ProfileBriefingDto,
    description: 'facts（issue/执行/活动派生）+ atoms（生效档案原子）',
  })
  getBriefing(@Param('projectId') projectId: string) {
    return this.profileService.getBriefing(projectId);
  }
}
