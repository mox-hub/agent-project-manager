import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';
import { AcceptanceService } from './acceptance.service';
import { AcceptanceCriteriaService } from './acceptance-criteria.service';
import { CompletenessChecklistService } from './completeness-checklist.service';
import { CompletenessAuditService } from './completeness-audit.service';
import {
  CreateAcceptanceDto,
  UpdateAcceptanceDto,
  CreateCriteriaDto,
  AuditRequestDto,
} from './dto/acceptance.dto';
import {
  AcceptanceCriteriaDto,
  AcceptanceCriteriaWithEvidenceDto,
  AcceptanceEvidenceDto,
  AcceptanceResponseDto,
  ApplyChecklistResponseDto,
  AuditGateResponseDto,
  AuditReportDetailDto,
  AuditRunResponseDto,
  ChecklistDto,
  ValidateCompletionResponseDto,
} from './dto/acceptance-response.dto';

@ApiTags('Acceptance')
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(AcceptanceResponseDto)
@Controller('acceptance')
export class AcceptanceController {
  constructor(
    private readonly acceptanceService: AcceptanceService,
    private readonly criteriaService: AcceptanceCriteriaService,
    private readonly checklistService: CompletenessChecklistService,
    private readonly auditService: CompletenessAuditService,
  ) {}

  @Post()
  @ApiOperation({ summary: '创建验收契约' })
  @ApiCreatedResponse({
    type: AcceptanceResponseDto,
    description: '创建成功（返回含任务摘要与标准列表的契约）',
  })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiStandardErrors()
  async create(
    @Body() dto: CreateAcceptanceDto,
    @Query('userId') userId?: string,
  ) {
    return this.acceptanceService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: '查询验收契约列表' })
  // 分页口径为 { data, meta: { page, pageSize, total, totalPages } }，用 inline schema 描述
  @ApiOkResponse({
    description: '返回契约分页列表（data + meta）',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/AcceptanceResponseDto' },
          description: '契约列表（含任务摘要、最小标准集、风险级别与执行计数）',
        },
        meta: {
          type: 'object',
          properties: {
            page: { type: 'number', description: '页码' },
            pageSize: { type: 'number', description: '每页数量' },
            total: { type: 'number', description: '总数' },
            totalPages: { type: 'number', description: '总页数' },
          },
          required: ['page', 'pageSize', 'total', 'totalPages'],
        },
      },
      required: ['data', 'meta'],
    },
  })
  @ApiStandardErrors()
  async findAll(
    @Query('issueId') issueId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.acceptanceService.findAll({
      issueId,
      projectId,
      status,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '获取验收契约详情' })
  @ApiParam({ name: 'id', description: '契约 ID' })
  @ApiOkResponse({
    type: AcceptanceResponseDto,
    description: '返回契约详情（含任务摘要与标准列表）',
  })
  @ApiResponse({ status: 404, description: '契约不存在' })
  @ApiStandardErrors()
  async findOne(@Param('id') id: string) {
    return this.acceptanceService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新验收契约' })
  @ApiParam({ name: 'id', description: '契约 ID' })
  @ApiOkResponse({ type: AcceptanceResponseDto, description: '更新后的契约' })
  @ApiStandardErrors()
  async update(@Param('id') id: string, @Body() dto: UpdateAcceptanceDto) {
    return this.acceptanceService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除验收契约' })
  @ApiParam({ name: 'id', description: '契约 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async delete(@Param('id') id: string) {
    return this.acceptanceService.delete(id);
  }

  // ─── Criteria ───────────────────────────────────────────────────

  @Post(':id/criteria')
  @ApiOperation({ summary: '添加验收标准' })
  @ApiParam({ name: 'id', description: '契约 ID' })
  @ApiCreatedResponse({
    type: AcceptanceCriteriaDto,
    description: '新添加的验收标准',
  })
  @ApiStandardErrors()
  async addCriteria(@Param('id') id: string, @Body() dto: CreateCriteriaDto) {
    return this.criteriaService.create(id, dto);
  }

  @Post(':id/criteria/batch')
  @ApiOperation({ summary: '批量添加验收标准' })
  @ApiParam({ name: 'id', description: '契约 ID' })
  @ApiCreatedResponse({
    type: [AcceptanceCriteriaDto],
    description: '批量创建的验收标准',
  })
  @ApiStandardErrors()
  async addCriteriaBatch(
    @Param('id') id: string,
    @Body() criteria: CreateCriteriaDto[],
  ) {
    return this.criteriaService.createMany(id, criteria);
  }

  @Get(':id/criteria')
  @ApiOperation({ summary: '获取验收标准列表' })
  @ApiParam({ name: 'id', description: '契约 ID' })
  @ApiOkResponse({
    type: [AcceptanceCriteriaWithEvidenceDto],
    description: '标准列表（按 order 正序，含证据）',
  })
  @ApiStandardErrors()
  async getCriteria(@Param('id') id: string) {
    return this.criteriaService.findByAcceptance(id);
  }

  @Patch('criteria/:criteriaId')
  @ApiOperation({
    summary: '更新验收标准（状态判定自动落 human_approval 证据）',
  })
  @ApiParam({ name: 'criteriaId', description: '标准 ID' })
  @ApiOkResponse({
    type: AcceptanceCriteriaDto,
    description: '更新后的标准（状态判定自动落 human_approval 证据）',
  })
  @ApiStandardErrors()
  async updateCriteria(
    @Param('criteriaId') criteriaId: string,
    @Body()
    data: {
      content?: string;
      status?: string;
      severity?: string;
      order?: number;
    },
    @Query('userId') userId?: string,
  ) {
    return this.criteriaService.update(criteriaId, data, userId);
  }

  @Post('criteria/:criteriaId/evidence')
  @ApiOperation({ summary: '为验收标准追加证据（CI/PR/模型/人工）' })
  @ApiParam({ name: 'criteriaId', description: '标准 ID' })
  @ApiCreatedResponse({
    type: AcceptanceEvidenceDto,
    description: '新追加的证据记录',
  })
  @ApiStandardErrors()
  async addCriteriaEvidence(
    @Param('criteriaId') criteriaId: string,
    @Body()
    body: {
      evidenceType: string;
      content?: string;
      storageRef?: string;
      metadata?: Record<string, unknown>;
    },
    @Query('userId') userId?: string,
  ) {
    if (!body.evidenceType) {
      throw new BadRequestException('evidenceType is required');
    }
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.criteriaService.addEvidence(criteriaId, body, userId);
  }

  @Delete('criteria/:criteriaId')
  @ApiOperation({ summary: '删除验收标准' })
  @ApiParam({ name: 'criteriaId', description: '标准 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async deleteCriteria(@Param('criteriaId') criteriaId: string) {
    return this.criteriaService.delete(criteriaId);
  }

  // ─── Audit ────────────────────────────────────────────────────

  @Post(':id/audit')
  @ApiOperation({ summary: '触发完整性审计' })
  @ApiParam({ name: 'id', description: '契约 ID' })
  @ApiCreatedResponse({
    type: AuditRunResponseDto,
    description: '审计结果（result）+ 持久化报告（report）',
  })
  @ApiStandardErrors()
  async audit(@Param('id') id: string, @Body() dto: AuditRequestDto) {
    return this.auditService.auditAcceptance(id, dto.checklistId);
  }

  @Get(':id/audit-report')
  @ApiOperation({ summary: '获取审计报告' })
  @ApiParam({ name: 'id', description: '契约 ID' })
  @ApiOkResponse({
    type: AuditReportDetailDto,
    description: '审计报告（含 acceptance/checklist 摘要；无报告时为 null）',
  })
  @ApiStandardErrors()
  async getAuditReport(@Param('id') id: string) {
    return this.auditService.getAuditReport(id);
  }

  @Post(':id/apply-suggestions')
  @ApiOperation({ summary: '采纳审计提议' })
  @ApiParam({ name: 'id', description: '契约 ID' })
  @ApiOkResponse({
    type: AuditRunResponseDto,
    description: '已采纳（返回重新审计的 result + report）',
  })
  @ApiStandardErrors()
  async applySuggestions(
    @Param('id') id: string,
    @Body() body: { itemIds: string[] },
  ) {
    return this.auditService.applySuggestions(id, body.itemIds);
  }

  // ─── Checklists ────────────────────────────────────────────────

  @Get('checklists/all')
  @ApiOperation({ summary: '获取所有可用清单' })
  @ApiOkResponse({
    type: [ChecklistDto],
    description: '清单列表（可按项目类型/技术栈/系统预置过滤）',
  })
  @ApiStandardErrors()
  async getAllChecklists(
    @Query('projectType') projectType?: string,
    @Query('techStack') techStack?: string,
    @Query('isSystem') isSystem?: string,
  ) {
    return this.checklistService.findAll({
      projectType,
      techStack,
      isSystem:
        isSystem === 'true' ? true : isSystem === 'false' ? false : undefined,
    });
  }

  @Get('checklists/system')
  @ApiOperation({ summary: '获取系统预置清单' })
  @ApiOkResponse({ type: [ChecklistDto], description: '系统预置清单列表' })
  @ApiStandardErrors()
  async getSystemChecklists() {
    return this.checklistService.getSystemChecklists();
  }

  @Get('checklists/:id')
  @ApiOperation({ summary: '获取清单详情' })
  @ApiParam({ name: 'id', description: '清单 ID' })
  @ApiOkResponse({ type: ChecklistDto, description: '清单详情' })
  @ApiStandardErrors()
  async getChecklist(@Param('id') id: string) {
    return this.checklistService.findOne(id);
  }

  @Post('checklists/:id/apply')
  @ApiOperation({ summary: '将清单应用到验收契约' })
  @ApiParam({ name: 'id', description: '清单 ID' })
  @ApiCreatedResponse({
    type: ApplyChecklistResponseDto,
    description: '被应用的清单 + 新建标准',
  })
  @ApiStandardErrors()
  async applyChecklist(
    @Param('id') checklistId: string,
    @Query('acceptanceId') acceptanceId: string,
  ) {
    return this.checklistService.applyToAcceptance(acceptanceId, checklistId);
  }

  // ─── Task ─────────────────────────────────────────────────────

  @Get('issue/:issueId')
  @ApiOperation({ summary: '获取任务的所有验收契约' })
  @ApiParam({ name: 'issueId', description: '任务 ID' })
  @ApiOkResponse({
    type: [AcceptanceResponseDto],
    description: '该任务的所有验收契约',
  })
  @ApiStandardErrors()
  async getByTask(@Param('issueId') issueId: string) {
    return this.acceptanceService.findByTask(issueId);
  }

  // ─── V3 阶段1：完成契约 + 接收驳回 ──────────────────────────

  @Post(':id/validate-completion')
  @ApiOperation({ summary: '校验完成证据（按契约类型）' })
  @ApiParam({ name: 'id', description: '契约 ID' })
  @ApiOkResponse({
    type: ValidateCompletionResponseDto,
    description: '逐项校验结果 { valid, checks[] }',
  })
  @ApiStandardErrors()
  async validateCompletion(
    @Param('id') id: string,
    @Body() body: { evidence: Record<string, unknown> },
  ) {
    return this.acceptanceService.validateCompletion(id, body.evidence || {});
  }

  @Post(':id/accept-completion')
  @ApiOperation({ summary: '接收完成（聚合校验后标为 passed）' })
  @ApiParam({ name: 'id', description: '契约 ID' })
  @ApiOkResponse({
    type: AcceptanceResponseDto,
    description: '接收后的契约（status=passed）',
  })
  @ApiResponse({
    status: 400,
    description: '接收校验未通过（返回 failures 清单）',
  })
  @ApiStandardErrors()
  async acceptCompletion(
    @Param('id') id: string,
    @Body() body: { evidence?: Record<string, unknown> },
    @Query('userId') userId?: string,
  ) {
    return this.acceptanceService.acceptCompletion(id, body.evidence, userId);
  }

  @Post(':id/reject-completion')
  @ApiOperation({ summary: '驳回完成（标 failed + 记录原因）' })
  @ApiParam({ name: 'id', description: '契约 ID' })
  @ApiOkResponse({
    type: AcceptanceResponseDto,
    description: '驳回后的契约（status=failed）',
  })
  @ApiStandardErrors()
  async rejectCompletion(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Query('userId') userId?: string,
  ) {
    if (!body.reason || !body.reason.trim()) {
      throw new BadRequestException('reject reason is required');
    }
    return this.acceptanceService.rejectCompletion(
      id,
      body.reason.trim(),
      userId,
    );
  }

  @Post(':id/waive')
  @ApiOperation({ summary: '豁免验收（跳过接收直接放行，reason 必填）' })
  @ApiParam({ name: 'id', description: '契约 ID' })
  @ApiOkResponse({
    type: AcceptanceResponseDto,
    description: '豁免后的契约（status=waived）',
  })
  @ApiStandardErrors()
  async waiveCompletion(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Query('userId') userId?: string,
  ) {
    if (!body.reason || !body.reason.trim()) {
      throw new BadRequestException('waive reason is required');
    }
    return this.acceptanceService.waiveCompletion(
      id,
      body.reason.trim(),
      userId,
    );
  }

  // ─── Execution Gate ────────────────────────────────────────────

  @Get('issue/:issueId/audit-gate')
  @ApiOperation({ summary: '执行前审计门禁检查' })
  @ApiParam({ name: 'issueId', description: '任务 ID' })
  @ApiOkResponse({
    type: AuditGateResponseDto,
    description: '门禁检查结果 { allowed, report?, message? }',
  })
  @ApiStandardErrors()
  async auditGate(@Param('issueId') issueId: string) {
    return this.auditService.enforceAuditBeforeExecution(issueId);
  }
}
