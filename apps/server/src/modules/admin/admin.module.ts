import { Module } from '@nestjs/common';

import { MailModule } from '@/modules/mail/mail.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { AdminController } from './admin.controller';
import { RegisterInviteController } from './register-invite.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [AuthModule, MailModule],
  controllers: [AdminController, RegisterInviteController],
  providers: [AdminService],
})
export class AdminModule {}
