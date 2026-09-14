import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiPropertyOptional,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';
import { ReleasePublishService } from './release-publish.service';
import { ReleaseService } from './release.service';
import {
  CreateReleaseDto,
  GateResultDto,
  RejectReleaseDto,
  ReleaseDto,
  UpdateReleaseDto,
  VersionRecommendRequestDto,
} from './dto/release.dto';

class PublishResultDto extends ReleaseDto {
  @ApiPropertyOptional({ description: '发布失败的失败原因' })
  failureReason?: string | null;
}

class ApprovalProposalRequestDto {
  @ApiPropertyOptional({ description: '预留：附言' })
  @IsOptional()
  @IsString()
  comment?: string;
}

/**
 * 发版 REST 面（CAP-K-03 驱动型发版）。
 * 链路：创建草案 → 圈定范围 → submitGate 门禁 → approval-request 决策卡
 * → （人 accept）approve 自动发布 → released；gated 可 reject 打回。
 */
@ApiTags('Releases')
@ApiBearerAuth('JWT-auth')
@Controller('releases')
export class ReleaseController {
  constructor(
    private readonly releases: ReleaseService,
    private readonly publishService: ReleasePublishService,
  ) {}

  @Post()
  @ApiOperation({
    summary: '创建发版草案（版本号须合法 semver、项目内唯一、大于基线）',
  })
  @ApiStandardErrors()
  async create(
    @Body() dto: CreateReleaseDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.releases.createRelease({
      projectId: dto.projectId,
      version: dto.version,
      name: dto.name,
      notes: dto.notes,
      scopeIssueIds: dto.scopeIssueIds,
      createdBy: req.user.id,
    });
  }

  @Get()
  @ApiOperation({ summary: '发版列表（按项目过滤）' })
  @ApiQuery({ name: 'projectId', required: true, description: '项目 ID' })
  @ApiStandardErrors()
  async list(@Query('projectId') projectId?: string) {
    if (!projectId) throw new BadRequestException('projectId 必填');
    return this.releases.listReleases(projectId);
  }

  @Get('version-recommend')
  @ApiOperation({
    summary: '版本推荐（conventional commits 机械推断 + semver 递增）',
  })
  @ApiQuery({ name: 'projectId', required: true, description: '项目 ID' })
  @ApiStandardErrors()
  async recommend(
    @Query('projectId') projectId?: string,
    @Query('excludeReleaseId') excludeReleaseId?: string,
  ) {
    if (!projectId) throw new BadRequestException('projectId 必填');
    return this.releases.recommendVersion(
      projectId,
      excludeReleaseId || undefined,
    );
  }

  @Post('version-recommend')
  @ApiOperation({ summary: '版本推荐（POST 形态，body 传 projectId）' })
  @ApiStandardErrors()
  async recommendPost(@Body() dto: VersionRecommendRequestDto) {
    return this.releases.recommendVersion(dto.projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: '发版详情（含门禁快照与发布执行日志）' })
  @ApiStandardErrors()
  async detail(@Param('id') id: string) {
    return this.releases.getRelease(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '编辑草案（仅 draft：名称/说明/版本/范围）' })
  @ApiStandardErrors()
  async update(@Param('id') id: string, @Body() dto: UpdateReleaseDto) {
    return this.releases.updateDraft(id, dto);
  }

  @Post(':id/gate')
  @ApiOperation({
    summary:
      '提交门禁（draft → 跑四证据源检查 + CHANGELOG 一致性；全过转 gated）',
  })
  @ApiStandardErrors()
  async gate(@Param('id') id: string): Promise<GateResultDto> {
    return this.releases.submitGate(id);
  }

  @Post(':id/approval-request')
  @ApiOperation({
    summary: '发起发布审批（gated → 创建 kind=release 决策卡待人确认）',
  })
  @ApiStandardErrors()
  async approvalRequest(
    @Param('id') id: string,
    @Body() _dto: ApprovalProposalRequestDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.releases.createApprovalProposal(id, req.user.id);
  }

  @Post(':id/publish')
  @ApiOperation({
    summary: '执行发布（approved → publishing → released/failed）',
  })
  @ApiStandardErrors()
  async publish(@Param('id') id: string) {
    return this.publishService.publish(id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: '打回草案（gated/approved → draft）' })
  @ApiStandardErrors()
  async reject(@Param('id') id: string, @Body() dto: RejectReleaseDto) {
    return this.releases.rejectToDraft(id, dto.reason);
  }

  @Post(':id/reopen')
  @ApiOperation({ summary: '失败重开（failed → draft，重走门禁）' })
  @ApiStandardErrors()
  async reopen(@Param('id') id: string) {
    return this.releases.reopenDraft(id);
  }
}
