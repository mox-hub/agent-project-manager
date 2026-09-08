import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ContractBindingService,
  ContractFileType,
  ContractSyncMode,
  CONTRACT_FILE_TYPES,
} from './contract-binding.service';
import { ContractSeedService } from './contract-seed.service';
import { ContractWorkspaceResolver } from './contract-workspace-fs';
import {
  CheckAlignmentDto,
  ContractAlignmentReportDto,
  ContractBindingResponseDto,
  ContractBindingsResponseDto,
  SeedContractFilesDto,
  SeedContractResultDto,
  UpdateContractBindingDto,
} from './dto/contract.dto';

/**
 * 契约绑定 REST 面（v2 纪要三期：种生实机入口 + 绑定状态面板）。
 * 种生/对齐检查既有事件驱动节拍（project.created / runtime.execution.result），
 * 这里提供人工显式触发口；对齐检查有副作用（升级冲突提案），故为 POST。
 */
@ApiTags('Contract')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/contract')
export class ContractController {
  constructor(
    private readonly bindings: ContractBindingService,
    private readonly seeds: ContractSeedService,
    private readonly resolver: ContractWorkspaceResolver,
  ) {}

  @Get('bindings')
  @ApiOperation({ summary: '列出契约文件绑定与工作区根（纯只读）' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiOkResponse({ type: ContractBindingsResponseDto })
  async listBindings(
    @Param('projectId') projectId: string,
  ): Promise<ContractBindingsResponseDto> {
    const [bindings, workspaceRoot] = await Promise.all([
      this.bindings.listBindings(projectId),
      this.resolver.resolveRoot(projectId),
    ]);
    return { workspaceRoot, bindings };
  }

  @Post('seed')
  @HttpCode(200)
  @ApiOperation({
    summary:
      '种生契约标准文件（幂等；fileTypes 过滤即单文件补种；formatOnly 为格式化纳管）',
  })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiOkResponse({ type: SeedContractResultDto })
  seed(
    @Param('projectId') projectId: string,
    @Body() dto: SeedContractFilesDto,
  ): Promise<SeedContractResultDto> {
    return this.seeds.seedProjectContractFiles(projectId, {
      fileTypes: dto.fileTypes as ContractFileType[] | undefined,
      adoptOnly: dto.formatOnly === true,
    });
  }

  @Post('check')
  @HttpCode(200)
  @ApiOperation({ summary: '对齐检查（managed 漂移将升级冲突提案）' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiOkResponse({ type: [ContractAlignmentReportDto] })
  async check(
    @Param('projectId') projectId: string,
    @Body() dto: CheckAlignmentDto,
  ): Promise<ContractAlignmentReportDto[]> {
    const types = dto.fileType
      ? [dto.fileType as ContractFileType]
      : [...CONTRACT_FILE_TYPES];
    const reports: ContractAlignmentReportDto[] = [];
    for (const fileType of types) {
      const binding = await this.bindings.getBinding(projectId, fileType);
      if (!binding) continue;
      const report = await this.bindings.checkAlignment(projectId, fileType);
      reports.push({ fileType, ...report });
    }
    return reports;
  }

  @Patch('bindings/:fileType')
  @ApiOperation({ summary: '切换绑定同步模式（managed/synced/detached）' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiParam({ name: 'fileType', enum: [...CONTRACT_FILE_TYPES] })
  @ApiOkResponse({ type: ContractBindingResponseDto })
  async setSyncMode(
    @Param('projectId') projectId: string,
    @Param('fileType') fileType: string,
    @Body() dto: UpdateContractBindingDto,
  ) {
    await this.bindings.setSyncMode(
      projectId,
      fileType as ContractFileType,
      dto.syncMode as ContractSyncMode,
    );
    return this.bindings.getBinding(projectId, fileType as ContractFileType);
  }
}
