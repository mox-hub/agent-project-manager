import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { MarkNotificationsReadDto } from './dto/mark-notifications-read.dto';
import { UpdateNotificationPreferencesDto } from './dto/notification-preference.dto';
import {
  NotificationListResponseDto,
  NotificationPreferenceResponseDto,
  NotificationUnreadCountResponseDto,
} from './dto/notification-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notification')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications' })
  @ApiOkResponse({
    type: NotificationListResponseDto,
    description: 'Returns list of notifications ({ data, meta })',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNotifications(
    @Query() query: NotificationQueryDto,
    @CurrentUser() user: { id: string },
  ) {
    return await this.notificationService.getNotifications(query, user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiQuery({
    name: 'projectId',
    required: false,
    description: 'Filter by project ID',
  })
  @ApiOkResponse({
    type: NotificationUnreadCountResponseDto,
    description: 'Returns unread count',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUnreadCount(
    @Query('projectId') projectId: string | undefined,
    @CurrentUser() user: { id: string },
  ) {
    return await this.notificationService.getUnreadCount(user.id, projectId);
  }

  @Post('read')
  @ApiOperation({ summary: 'Mark notifications as read' })
  @ApiResponse({ status: 200, description: 'Notifications marked as read' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markNotificationsRead(
    @Body() dto: MarkNotificationsReadDto,
    @CurrentUser() user: { id: string },
  ) {
    await this.notificationService.markNotificationsRead(dto, user.id);
    return null;
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiOkResponse({
    type: NotificationPreferenceResponseDto,
    isArray: true,
    description: 'Returns notification preferences (channels 已解析为数组)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNotificationPreferences(@CurrentUser() user: { id: string }) {
    return await this.notificationService.getNotificationPreferences(user.id);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiOkResponse({
    type: NotificationPreferenceResponseDto,
    isArray: true,
    description:
      'Notification preferences updated successfully（返回写入后的偏好行；channels 为库内原始 JSON 串）',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateNotificationPreferences(
    @Body() dto: UpdateNotificationPreferencesDto,
    @CurrentUser() user: { id: string },
  ) {
    return await this.notificationService.updateNotificationPreferences(
      dto,
      user.id,
    );
  }
}
