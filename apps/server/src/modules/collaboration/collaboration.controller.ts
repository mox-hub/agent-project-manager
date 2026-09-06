import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import {
  CreateCollaborationDto,
  RespondCollaborationDto,
  VerifyCollaborationDto,
} from './dto/collaboration.dto';
import { CollaborationService } from './collaboration.service';

/**
 * 协作卡 REST 面：agent-facing 工具四件套（request/checkFeasibility/
 * respond/verify）经 AssistantTools 落到同一 service；HTTP 面供
 * 人闸口（验证/驳回/取消）与办公室页协作分区消费。
 */
@ApiTags('Collaboration')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('collaboration')
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  @Get()
  @ApiOperation({ summary: '协作卡列表（可按项目/状态过滤）' })
  list(
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.collaborationService.list({
      projectId: projectId || undefined,
      status: status || undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '协作卡详情（含流转日志）' })
  get(@Param('id') id: string) {
    return this.collaborationService.get(id);
  }

  @Post()
  @ApiOperation({ summary: '发起接口协作卡（requested）' })
  create(@Body() dto: CreateCollaborationDto) {
    return this.collaborationService.create(dto);
  }

  @Patch(':id/respond')
  @ApiOperation({
    summary: '提供方答复：承诺 / 拒绝 / 需澄清（超轮次自动升级）',
  })
  respond(@Param('id') id: string, @Body() dto: RespondCollaborationDto) {
    return this.collaborationService.respond(id, dto);
  }

  @Patch(':id/deliver')
  @ApiOperation({ summary: '提供方交付（spec+实现+契约测试绿）' })
  deliver(
    @Param('id') id: string,
    @Body() dto: { note?: string; byMemberId?: string },
  ) {
    return this.collaborationService.deliver(id, dto);
  }

  @Patch(':id/verify')
  @ApiOperation({
    summary: '请求方验证：verified 关闭 / changes_requested 打回',
  })
  verify(@Param('id') id: string, @Body() dto: VerifyCollaborationDto) {
    return this.collaborationService.verify(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '取消协作卡（终态不可取消）' })
  cancel(
    @Param('id') id: string,
    @Body() dto: { note?: string; byMemberId?: string },
  ) {
    return this.collaborationService.cancel(id, dto);
  }
}
