import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { MailService } from './mail.service';

@ApiTags('Mail')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get()
  @ApiOperation({ summary: '邮件发件箱（Outbox）列表' })
  list(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.mailService.listOutbox({
      status,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('status')
  @ApiOperation({ summary: 'SMTP 配置状态' })
  smtpStatus() {
    return this.mailService.getSmtpStatus();
  }
}
