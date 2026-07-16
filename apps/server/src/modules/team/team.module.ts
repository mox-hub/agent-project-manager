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

@Module({
  controllers: [
    TeamController,
    MemberController,
    TaskAssigneeController,
    MentionController,
  ],
  providers: [
    TeamService,
    MemberService,
    TaskAssigneeService,
    MentionService,
    MemberCardService,
    MemberSearchService,
  ],
  exports: [MemberService, TeamService, TaskAssigneeService, MemberCardService],
})
export class TeamModule {}
