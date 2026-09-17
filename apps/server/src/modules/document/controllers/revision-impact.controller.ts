// 需求修订影响 Controller（CAP-P-01 批一 P0 最小闭环）
import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RevisionImpactService } from '../services/revision-impact.service';
import {
  RevisionImpactStatusResponseDto,
  RevisionImpactAnalyzeResponseDto,
} from '../dto/revision-impact.dto';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';

@ApiTags('Documents')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('documents/:documentId/revision-impact')
export class RevisionImpactController {
  constructor(private readonly revisionImpactService: RevisionImpactService) {}

  @Get()
  @ApiOperation({
    summary:
      '需求修订影响状态（卡待决则返回 pending_decision；已确认则幂等应用待复核标记后返回 applied）',
  })
  @ApiParam({ name: 'documentId', description: '文档 ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: RevisionImpactStatusResponseDto,
    description: '修订影响状态',
  })
  @ApiResponse({ status: 404, description: '文档不存在' })
  async getStatus(@Param('documentId') documentId: string) {
    return this.revisionImpactService.getStatus(documentId);
  }

  @Post('analyze')
  @ApiOperation({
    summary:
      '手动触发一次需求修订影响分析（正常由文档更新事件自动触发；已有待决卡时跳过）',
  })
  @ApiParam({ name: 'documentId', description: '文档 ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: RevisionImpactAnalyzeResponseDto,
    description: '分析结果（是否生成决策卡）',
  })
  @ApiResponse({ status: 404, description: '文档不存在' })
  async analyze(@Param('documentId') documentId: string) {
    return this.revisionImpactService.analyze(documentId);
  }
}
