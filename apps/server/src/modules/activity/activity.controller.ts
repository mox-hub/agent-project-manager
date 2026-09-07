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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';
import { ActivityService } from './activity.service';
import {
  CreateActivityCommentDto,
  QueryActivityDto,
  ToggleActivityReactionDto,
  UpdateActivityCommentDto,
} from './dto/activity.dto';
import {
  ActivityReactionGroupDto,
  ActivityResponseDto,
} from './dto/activity-response.dto';

@ApiTags('Activities')
@Controller('activities')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  @ApiOperation({ summary: 'List activities of an entity (task/bug/project)' })
  @ApiOkResponse({
    type: [ActivityResponseDto],
    description: '实体动态列表（时间正序，含操作人与回应分组）',
  })
  @ApiStandardErrors()
  list(@Query() query: QueryActivityDto, @CurrentUser() user: any) {
    return this.activityService.listForEntity(
      query.entityType,
      query.entityId,
      user.id,
    );
  }

  @Post('comments')
  @ApiOperation({ summary: 'Add a markdown comment to an entity' })
  @ApiCreatedResponse({
    type: ActivityResponseDto,
    description: '新评论动态（含操作人与空的回应分组）',
  })
  @ApiStandardErrors()
  addComment(@Body() dto: CreateActivityCommentDto, @CurrentUser() user: any) {
    return this.activityService.addComment(
      dto.entityType,
      dto.entityId,
      dto.content,
      user.id,
    );
  }

  @Patch('comments/:id')
  @ApiOperation({ summary: 'Edit own comment' })
  @ApiOkResponse({ type: ActivityResponseDto, description: '编辑后的评论动态' })
  @ApiStandardErrors()
  updateComment(
    @Param('id') id: string,
    @Body() dto: UpdateActivityCommentDto,
    @CurrentUser() user: any,
  ) {
    return this.activityService.updateComment(id, dto.content, user.id);
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: 'Delete own comment (or project owner/maintainer)' })
  deleteComment(@Param('id') id: string, @CurrentUser() user: any) {
    return this.activityService.deleteComment(id, user.id);
  }

  @Post(':id/reactions')
  @ApiOperation({ summary: 'Toggle an emoji reaction on an activity' })
  @ApiOkResponse({
    type: [ActivityReactionGroupDto],
    description: '该活动的最新回应分组',
  })
  @ApiStandardErrors()
  toggleReaction(
    @Param('id') id: string,
    @Body() dto: ToggleActivityReactionDto,
    @CurrentUser() user: any,
  ) {
    return this.activityService.toggleReaction(id, dto.emoji, user.id);
  }
}
