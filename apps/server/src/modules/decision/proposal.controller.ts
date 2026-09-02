import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProposalService } from './proposal.service';
import {
  CreateProposalDto,
  GenerateAssignmentDto,
  ResolveProposalDto,
  ResolveProposalResponseDto,
} from './dto/proposal.dto';

@ApiTags('Decisions')
@ApiBearerAuth('JWT-auth')
@Controller('decisions/proposals')
export class ProposalController {
  constructor(private readonly proposalService: ProposalService) {}

  @Post()
  @ApiOperation({
    summary: '创建建议类提案（AI 工具 / MCP / PAT / 内置生成器共用入口）',
  })
  @ApiResponse({ status: 201, description: '创建成功' })
  async create(
    @Body() dto: CreateProposalDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.proposalService.create(dto, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '提案详情（提案方轮询决议状态与 clarify 答案）' })
  @ApiParam({ name: 'id' })
  async get(@Param('id') id: string) {
    return this.proposalService.get(id);
  }

  @Post(':id/resolve')
  @ApiOperation({
    summary:
      '决议提案（accept=执行 applier；reject=留痕；clarify 携带 answer）',
  })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
    description: '已决议',
    type: ResolveProposalResponseDto,
  })
  async resolve(
    @Param('id') id: string,
    @Body() dto: ResolveProposalDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.proposalService.resolve(id, dto, req.user.id);
  }

  @Post('generate/assignment')
  @ApiOperation({
    summary: '规则版分派提案生成：未分配任务 → 信任分最高的活跃 AI 成员',
  })
  @ApiResponse({
    status: 201,
    description: '生成成功（已存在待处理同类提案时报 400）',
  })
  async generateAssignment(
    @Body() dto: GenerateAssignmentDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.proposalService.generateAssignment(dto.projectId, req.user.id);
  }

  @Post('watch/spend')
  @ApiOperation({
    summary: '手动触发一次项目周花费阈值检查（正常由执行完成钩子自动触发）',
  })
  @ApiQuery({ name: 'projectId', required: true })
  async watchSpend(@Query('projectId') projectId: string) {
    await this.proposalService.checkSpendOnRunComplete(projectId);
    return { ok: true };
  }
}
