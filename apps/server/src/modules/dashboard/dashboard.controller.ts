import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';
import { DashboardService } from './dashboard.service';
import { DashboardOverviewResponseDto } from './dto/dashboard-response.dto';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: '全局仪表盘聚合数据（workspace 级）' })
  @ApiOkResponse({
    description: '返回团队 / AI / 成本 / 交付 / 健康 / 风险 / 趋势七段聚合',
    type: DashboardOverviewResponseDto,
  })
  @ApiStandardErrors()
  getOverview() {
    return this.dashboardService.getOverview();
  }
}
