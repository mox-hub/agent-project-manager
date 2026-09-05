import {
  Body,
  Controller,
  Get,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  SubscriptionListQueryDto,
  SubscriptionSetDto,
} from './dto/subscription.dto';
import { SubscriptionService } from './subscription.service';

@ApiTags('Subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  @ApiOperation({ summary: 'List subscribers of an entity/page scope' })
  async list(@Query() query: SubscriptionListQueryDto) {
    return this.subscriptionService.listSubscribers(
      query.entityType,
      query.entityId,
    );
  }

  @Get('my')
  @ApiOperation({ summary: 'My member id + my subscribed scopes' })
  async my(@Request() req: { user: { id: string } }) {
    return this.subscriptionService.mySubscriptions(req.user.id);
  }

  @Put()
  @ApiOperation({
    summary: 'Replace the subscriber set of a scope (Linear-style picker)',
  })
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
