import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { DecisionService } from './decision.service';
import { DecisionListDto, DecisionSummaryDto } from './dto/decision.dto';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';

@ApiTags('Decisions')
@ApiBearerAuth('JWT-auth')
@Controller('decisions')
export class DecisionController {
  constructor(private readonly decisionService: DecisionService) {}

  @Get('pending')
  @ApiOperation({
    summary: '待决决策聚合列表（审批门禁 + 验收判断，blocking 优先）',
  })
  @ApiResponse({
    status: 200,
    description: '返回中性决策投影列表',
    type: DecisionListDto,
  })
  @ApiQuery({ name: 'projectId', required: false, description: '按项目过滤' })
  @ApiQuery({ name: 'kind', required: false, enum: ['approval', 'acceptance'] })
  @ApiQuery({ name: 'limit', required: false, description: '默认 50' })
  @ApiQuery({ name: 'offset', required: false, description: '默认 0' })
  @ApiStandardErrors()
  async listPending(
    @Query('projectId') projectId?: string,
    @Query('kind') kind?: 'approval' | 'acceptance',
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.decisionService.listPending({
      projectId: projectId || undefined,
      kind: kind || undefined,
      limit: limit
        ? Math.max(1, Math.min(parseInt(limit, 10) || 50, 200))
        : undefined,
      offset: offset ? Math.max(0, parseInt(offset, 10) || 0) : undefined,
    });
  }

  @Get('summary')
  @ApiOperation({ summary: '待决决策计数摘要（收件箱徽标/页头胶囊）' })
  @ApiResponse({
    status: 200,
    description: '返回 pending/blocking/advisory 计数',
    type: DecisionSummaryDto,
  })
  @ApiQuery({ name: 'projectId', required: false, description: '按项目过滤' })
  @ApiStandardErrors()
  async summary(@Query('projectId') projectId?: string) {
    return this.decisionService.summary(projectId || undefined);
  }
}
