import {
  Body,
  Controller,
  Get,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';
import {
  SubscriptionListQueryDto,
  SubscriptionSetDto,
} from './dto/subscription.dto';
import {
  MySubscriptionsResponseDto,
  SubscriptionListResponseDto,
} from './dto/subscription-response.dto';
import { SubscriptionService } from './subscription.service';

@ApiTags('Subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  @ApiOperation({ summary: 'List subscribers of an entity/page scope' })
  @ApiOkResponse({
    type: SubscriptionListResponseDto,
    description: '订阅者列表 { items: Subscriber[] }',
  })
  @ApiStandardErrors()
  async list(@Query() query: SubscriptionListQueryDto) {
    return this.subscriptionService.listSubscribers(
      query.entityType,
      query.entityId,
    );
  }

  @Get('my')
  @ApiOperation({ summary: 'My member id + my subscribed scopes' })
  @ApiOkResponse({
    type: MySubscriptionsResponseDto,
    description: '我的 Member ID + 已订阅页面集合',
  })
  @ApiStandardErrors()
  async my(@Request() req: { user: { id: string } }) {
    return this.subscriptionService.mySubscriptions(req.user.id);
  }

  @Put()
  @ApiOperation({
    summary: 'Replace the subscriber set of a scope (Linear-style picker)',
  })
  @ApiOkResponse({
    type: SubscriptionListResponseDto,
    description: '全量替换后的订阅者列表',
  })
  @ApiStandardErrors()
  async set(
    @Body() dto: SubscriptionSetDto,
    @Request() _req: { user: { id: string } },
  ) {
    return this.subscriptionService.setSubscribers(
      dto.entityType,
      dto.entityId,
      dto.memberIds ?? [],
    );
  }
}
