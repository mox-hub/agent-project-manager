import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { GitService } from './git.service';
import { CreateRepositoryDto } from './dto/create-repository.dto';
import {
  RepositoryQueryDto,
  CommitQueryDto,
  DiffQueryDto,
  PullRequestQueryDto,
} from './dto/git-query.dto';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('_api/git')
@UseGuards(JwtAuthGuard)
export class GitController {
  constructor(private readonly gitService: GitService) {}

  @Get('repos')
  async getRepositories(
    @Query() query: RepositoryQueryDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getRepositories(query, user.sub);
  }

  @Post('repos')
  async createRepository(
    @Body() dto: CreateRepositoryDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.createRepository(dto, user.sub);
  }

  @Get('repos/:repoId')
  async getRepositoryById(
    @Param('repoId') repoId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getRepositoryById(repoId, user.sub);
  }

  @Get('repos/:repoId/status')
  async getRepositoryStatus(
    @Param('repoId') repoId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getRepositoryStatus(repoId, user.sub);
  }

  @Get('repos/:repoId/commits')
  async getCommits(
    @Param('repoId') repoId: string,
    @Query() query: CommitQueryDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getCommits(repoId, query, user.sub);
  }

  @Get('commits/:commitId')
  async getCommitById(
    @Param('commitId') commitId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getCommitById(commitId, user.sub);
  }

  @Post('diff')
  async generateDiff(
    @Body() dto: DiffQueryDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.generateDiff(dto, user.sub);
  }

  @Get('repos/:repoId/pull-requests')
  async getPullRequests(
    @Param('repoId') repoId: string,
    @Query() query: PullRequestQueryDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getPullRequests(repoId, query, user.sub);
  }

  @Get('pull-requests/:prId')
  async getPullRequestById(
    @Param('prId') prId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.getPullRequestById(prId, user.sub);
  }

  @Post('pull-requests/:prId/reviews')
  async createPullRequestReview(
    @Param('prId') prId: string,
    @Body() dto: {
      type: string;
      state: string;
      summary?: string;
      comments?: any[];
    },
    @CurrentUser() user: { sub: string },
  ) {
    return this.gitService.createPullRequestReview(prId, dto, user.sub);
  }
}
