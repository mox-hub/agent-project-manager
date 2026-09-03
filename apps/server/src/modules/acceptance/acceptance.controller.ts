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
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
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

@ApiTags('Acceptance')
@ApiBearerAuth('JWT-auth')
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
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  async create(
    @Body() dto: CreateAcceptanceDto,
    @Query('userId') userId?: string,
  ) {
    return this.acceptanceService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: '查询验收契约列表' })
  @ApiResponse({ status: 200, description: '返回契约列表' })
  async findAll(
    @Query('taskId') taskId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.acceptanceService.findAll({
      taskId,
      projectId,
      status,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '获取验收契约详情' })
  @ApiParam({ name: 'id', description: '契约 ID' })
  @ApiResponse({ status: 200, description: '返回契约详情' })
  @ApiResponse({ status: 404, description: '契约不存在' })
  async findOne(@Param('id') id: string) {
    return this.acceptanceService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新验收契约' })
  @ApiParam({ name: 'id', description: '契约 ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
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
  @ApiResponse({ status: 201, description: '标准已添加' })
  async addCriteria(@Param('id') id: string, @Body() dto: CreateCriteriaDto) {
    return this.criteriaService.create(id, dto);
  }

  @Post(':id/criteria/batch')
  @ApiOperation({ summary: '批量添加验收标准' })
  @ApiParam({ name: 'id', description: '契约 ID' })
  @ApiResponse({ status: 201, description: '批量添加成功' })
  async addCriteriaBatch(
    @Param('id') id: string,
    @Body() criteria: CreateCriteriaDto[],
  ) {
    return this.criteriaService.createMany(id, criteria);
  }

  @Get(':id/criteria')
  @ApiOperation({ summary: '获取验收标准列表' })
  @ApiParam({ name: 'id', description: '契约 ID' })
  @ApiResponse({ status: 200, description: '返回标准列表' })
  async getCriteria(@Param('id') id: string) {
    return this.criteriaService.findByAcceptance(id);
  }

  @Patch('criteria/:criteriaId')
  @ApiOperation({
    summary: '更新验收标准（状态判定自动落 human_approval 证据）',
  })
  @ApiParam({ name: 'criteriaId', description: '标准 ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
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
  @ApiResponse({ status: 201, description: '证据已追加' })
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
  @ApiResponse({ status: 201, description: '审计已触发' })
  async audit(@Param('id') id: string, @Body() dto: AuditRequestDto) {
    return this.auditService.auditAcceptance(id, dto.checklistId);
  }

  @Get(':id/audit-report')
  @ApiOperation({ summary: '获取审计报告' })
  @ApiParam({ name: 'id', description: '契约 ID' })
  @ApiResponse({ status: 200, description: '返回审计报告' })
  async getAuditReport(@Param('id') id: string) {
    return this.auditService.getAuditReport(id);
  }

  @Post(':id/apply-suggestions')
  @ApiOperation({ summary: '采纳审计提议' })
  @ApiParam({ name: 'id', description: '契约 ID' })
  @ApiResponse({ status: 200, description: '已采纳' })
  async applySuggestions(
    @Param('id') id: string,
    @Body() body: { itemIds: string[] },
  ) {
    return this.auditService.applySuggestions(id, body.itemIds);
  }

  // ─── Checklists ────────────────────────────────────────────────

  @Get('checklists/all')
  @ApiOperation({ summary: '获取所有可用清单' })
  @ApiResponse({ status: 200, description: '返回清单列表' })
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
  @ApiResponse({ status: 200, description: '返回系统清单' })
  async getSystemChecklists() {
    return this.checklistService.getSystemChecklists();
  }

  @Get('checklists/:id')
  @ApiOperation({ summary: '获取清单详情' })
  @ApiParam({ name: 'id', description: '清单 ID' })
  @ApiResponse({ status: 200, description: '返回清单详情' })
  async getChecklist(@Param('id') id: string) {
    return this.checklistService.findOne(id);
  }

  @Post('checklists/:id/apply')
  @ApiOperation({ summary: '将清单应用到验收契约' })
  @ApiParam({ name: 'id', description: '清单 ID' })
  @ApiResponse({ status: 201, description: '已应用' })
  async applyChecklist(
    @Param('id') checklistId: string,
    @Query('acceptanceId') acceptanceId: string,
  ) {
    return this.checklistService.applyToAcceptance(acceptanceId, checklistId);
  }

  // ─── Task ─────────────────────────────────────────────────────

  @Get('task/:taskId')
  @ApiOperation({ summary: '获取任务的所有验收契约' })
  @ApiParam({ name: 'taskId', description: '任务 ID' })
  @ApiResponse({ status: 200, description: '返回契约列表' })
  async getByTask(@Param('taskId') taskId: string) {
    return this.acceptanceService.findByTask(taskId);
  }

  // ─── V3 阶段1：完成契约 + 接收驳回 ──────────────────────────

  @Post(':id/validate-completion')
  @ApiOperation({ summary: '校验完成证据（按契约类型）' })
  @ApiParam({ name: 'id', description: '契约 ID' })
  @ApiResponse({ status: 200, description: '返回校验结果' })
  async validateCompletion(
    @Param('id') id: string,
    @Body() body: { evidence: Record<string, unknown> },
  ) {
    return this.acceptanceService.validateCompletion(id, body.evidence || {});
  }

  @Post(':id/accept-completion')
  @ApiOperation({ summary: '接收完成（聚合校验后标为 passed）' })
  @ApiParam({ name: 'id', description: '契约 ID' })
  @ApiResponse({ status: 200, description: '已接收' })
  @ApiResponse({
    status: 400,
    description: '接收校验未通过（返回 failures 清单）',
  })
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
  @ApiResponse({ status: 200, description: '已驳回' })
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
  @ApiResponse({ status: 200, description: '已豁免' })
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

  @Get('task/:taskId/audit-gate')
  @ApiOperation({ summary: '执行前审计门禁检查' })
  @ApiParam({ name: 'taskId', description: '任务 ID' })
  @ApiResponse({ status: 200, description: '返回门禁检查结果' })
  async auditGate(@Param('taskId') taskId: string) {
    return this.auditService.enforceAuditBeforeExecution(taskId);
  }
}
