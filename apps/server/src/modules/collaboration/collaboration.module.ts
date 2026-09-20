import { Module } from '@nestjs/common';
import { CollaborationController } from './collaboration.controller';
import { CollaborationService } from './collaboration.service';
import { CollaborationEventSubscriber } from './collaboration-event.subscriber';
import { DecisionModule } from '../decision/decision.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [DecisionModule, NotificationModule],
  controllers: [CollaborationController],
  providers: [CollaborationService, CollaborationEventSubscriber],
  exports: [CollaborationService],
})
export class CollaborationModule {}
