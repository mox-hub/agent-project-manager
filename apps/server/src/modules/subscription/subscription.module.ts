import { Module } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { SubscriptionEventSubscriber } from './subscription-event.subscriber';

@Module({
  imports: [NotificationModule],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionEventSubscriber],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
