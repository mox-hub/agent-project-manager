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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ActivityService } from './activity.service';
import {
  CreateActivityCommentDto,
  QueryActivityDto,
  ToggleActivityReactionDto,
  UpdateActivityCommentDto,
} from './dto/activity.dto';

@ApiTags('Activities')
@Controller('activities')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  @ApiOperation({ summary: 'List activities of an entity (task/bug/project)' })
  list(@Query() query: QueryActivityDto, @CurrentUser() user: any) {
    return this.activityService.listForEntity(
      query.entityType,
      query.entityId,
      user.id,
    );
  }

  @Post('comments')
  @ApiOperation({ summary: 'Add a markdown comment to an entity' })
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
  toggleReaction(
    @Param('id') id: string,
    @Body() dto: ToggleActivityReactionDto,
    @CurrentUser() user: any,
  ) {
    return this.activityService.toggleReaction(id, dto.emoji, user.id);
  }
}
