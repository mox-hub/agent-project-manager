import { Module } from '@nestjs/common';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';
import { TaskAssigneeController } from './task-assignee.controller';
import { TaskAssigneeService } from './task-assignee.service';
import { MentionController } from './mention.controller';
import { MentionService } from './mention.service';
import { MemberCardService } from './member-card.service';
import { MemberSearchService } from './member-search.service';
import { MemberToolGrantService } from './member-tool-grant.service';
import { InviteService } from './invite.service';
import { InviteController } from './invite.controller';
import { CliDispatchModule } from '@/modules/cli-dispatch/cli-dispatch.module';
import { MailModule } from '@/modules/mail/mail.module';
import { AuthModule } from '@/modules/auth/auth.module';

@Module({
  imports: [CliDispatchModule, MailModule, AuthModule],
  controllers: [
    TeamController,
    MemberController,
    TaskAssigneeController,
    MentionController,
    InviteController,
  ],
  providers: [
    TeamService,
    MemberService,
    TaskAssigneeService,
    MentionService,
    MemberCardService,
    MemberSearchService,
    MemberToolGrantService,
    InviteService,
  ],
  exports: [
    MemberService,
    TeamService,
    TaskAssigneeService,
    MemberCardService,
    MemberToolGrantService,
  ],
})
export class TeamModule {}
