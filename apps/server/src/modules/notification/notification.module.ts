import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationEventSubscriber } from './notification-event-subscriber';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, NotificationEventSubscriber],
  exports: [NotificationService],
})
export class NotificationModule {}
