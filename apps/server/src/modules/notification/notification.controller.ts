import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { MarkNotificationsReadDto } from './dto/mark-notifications-read.dto';
import { UpdateNotificationPreferencesDto } from './dto/notification-preference.dto';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getNotifications(
    @Query() query: NotificationQueryDto,
    @CurrentUser() user: { id: string },
  ) {
    return await this.notificationService.getNotifications(query, user.id);
  }

  @Get('unread-count')
  async getUnreadCount(
    @Query('projectId') projectId: string | undefined,
    @CurrentUser() user: { id: string },
  ) {
    return await this.notificationService.getUnreadCount(user.id, projectId);
  }

  @Post('read')
  async markNotificationsRead(
    @Body() dto: MarkNotificationsReadDto,
    @CurrentUser() user: { id: string },
  ) {
    await this.notificationService.markNotificationsRead(dto, user.id);
    return { data: null };
  }

  @Get('preferences')
  async getNotificationPreferences(@CurrentUser() user: { id: string }) {
    return await this.notificationService.getNotificationPreferences(user.id);
  }

  @Put('preferences')
  async updateNotificationPreferences(
    @Body() dto: UpdateNotificationPreferencesDto,
    @CurrentUser() user: { id: string },
  ) {
    return await this.notificationService.updateNotificationPreferences(dto, user.id);
  }
}
