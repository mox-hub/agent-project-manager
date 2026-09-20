import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';
import { OfficeService } from './office.service';
import { OfficeSummaryDto } from './dto/office.dto';

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
  @ApiOkResponse({
    type: OfficeSummaryDto,
    description: '员工卡聚合 { projectId?, colleagues[], totals }',
  })
  @ApiStandardErrors()
  getSummary(@Query('projectId') projectId?: string) {
    return this.officeService.getSummary(projectId || undefined);
  }
}
