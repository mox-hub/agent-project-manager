import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { OfficeService } from './office.service';

@ApiTags('Office')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('office')
export class OfficeController {
  constructor(private readonly officeService: OfficeService) {}

  @Get('summary')
  @ApiOperation({
    summary: '办公室聚合：按 AI 成员的员工卡（忙闲/待决/可接活度）',
  })
  getSummary(@Query('projectId') projectId?: string) {
    return this.officeService.getSummary(projectId || undefined);
  }
}
