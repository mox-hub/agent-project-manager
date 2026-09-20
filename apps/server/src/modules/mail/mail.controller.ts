import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';
import { MailService } from './mail.service';
import { MailOutboxDto, MailSmtpStatusDto } from './dto/mail-response.dto';

@ApiTags('Mail')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get()
  @ApiOperation({ summary: '邮件发件箱（Outbox）列表' })
  @ApiOkResponse({
    type: [MailOutboxDto],
    description: 'Outbox 记录列表（按创建时间倒序）',
  })
  @ApiStandardErrors()
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
  @ApiOkResponse({
    type: MailSmtpStatusDto,
    description: 'SMTP 状态 { smtpConfigured }',
  })
  @ApiStandardErrors()
  smtpStatus() {
    return this.mailService.getSmtpStatus();
  }
}
