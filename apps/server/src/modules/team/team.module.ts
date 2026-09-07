import { Module } from '@nestjs/common';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';
import { IssueAssigneeController } from './issue-assignee.controller';
import { IssueAssigneeService } from './issue-assignee.service';
import { MentionController } from './mention.controller';
import { MentionService } from './mention.service';
import { MentionEventSubscriber } from './mention-event.subscriber';
import { MemberCardService } from './member-card.service';
import { MemberSearchService } from './member-search.service';
import { MemberToolGrantService } from './member-tool-grant.service';
import { InviteService } from './invite.service';
import { InviteController } from './invite.controller';
import { TeamStatsService } from './team-stats.service';
import { ProjectMembershipSyncService } from './project-membership-sync.service';
import { CliDispatchModule } from '@/modules/cli-dispatch/cli-dispatch.module';
import { MailModule } from '@/modules/mail/mail.module';
import { AuthModule } from '@/modules/auth/auth.module';

@Module({
  imports: [CliDispatchModule, MailModule, AuthModule],
  controllers: [
    TeamController,
    MemberController,
    IssueAssigneeController,
    MentionController,
    InviteController,
  ],
  providers: [
    TeamService,
    MemberService,
    IssueAssigneeService,
    MentionService,
    MentionEventSubscriber,
    MemberCardService,
    MemberSearchService,
    MemberToolGrantService,
    InviteService,
    TeamStatsService,
    ProjectMembershipSyncService,
  ],
  exports: [
    MentionService,
    MemberService,
    TeamService,
    IssueAssigneeService,
    MemberCardService,
    MemberToolGrantService,
    TeamStatsService,
    ProjectMembershipSyncService,
  ],
})
export class TeamModule {}
