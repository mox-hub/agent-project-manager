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
import {
  DashboardOverviewResponseDto,
  PlaybookHealthResponseDto,
  ProfileHealthResponseDto,
} from './dto/dashboard-response.dto';

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

  @Get('profile-health')
  @ApiOperation({ summary: '档案健康卡（完备度/置信度/新鲜度，全派生）' })
  @ApiOkResponse({
    description: '按项目的档案完备度分布',
    type: ProfileHealthResponseDto,
  })
  @ApiStandardErrors()
  getProfileHealth() {
    return this.dashboardService.getProfileHealth();
  }

  @Get('playbook-health')
  @ApiOperation({ summary: '剧本健康卡（阶段通过/跳过率/退回率，全派生）' })
  @ApiOkResponse({
    description: '按阶段聚合的剧本效果指标',
    type: PlaybookHealthResponseDto,
  })
  @ApiStandardErrors()
  getPlaybookHealth() {
    return this.dashboardService.getPlaybookHealth();
  }
}
