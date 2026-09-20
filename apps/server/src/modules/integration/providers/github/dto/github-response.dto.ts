// GitHub Integration 响应 DTO（口径：控制器返回的裸数据）
// 形状来源：github.types.ts 接口、GitHubSyncService、IntegrationSyncLog Prisma 模型
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GitHubViewerDto {
  @ApiProperty({ description: 'GitHub 登录名' })
  login: string;

  @ApiProperty({ description: 'GitHub 用户 ID' })
  id: number;

  @ApiProperty({ description: '显示名', nullable: true, type: String })
  name: string | null;

  @ApiProperty({ description: '邮箱', nullable: true, type: String })
  email: string | null;

  @ApiProperty({ description: '头像 URL' })
  avatarUrl: string;
}

export class GitHubSampleRepoDto {
  @ApiProperty({ description: '仓库名' })
  name: string;

  @ApiProperty({ description: '仓库全名（owner/repo）' })
  fullName: string;

  @ApiProperty({ description: '默认分支' })
  defaultBranch: string;
}

/** POST /integrations/github/test-inline（成功与失败两种形态的并集） */
export class GitHubTestInlineResponseDto {
  @ApiProperty({ description: '连接是否成功' })
  ok: boolean;

  @ApiPropertyOptional({
    description: '认证用户信息（成功时返回）',
    type: GitHubViewerDto,
  })
  viewer?: GitHubViewerDto;

  @ApiPropertyOptional({
    description: 'token scopes（成功时返回）',
    type: 'string',
    isArray: true,
  })
  scopes?: string[];

  @ApiPropertyOptional({
    description: '权限抽样仓库（成功且有 repo 读权限时返回，否则 null）',
    type: GitHubSampleRepoDto,
    nullable: true,
  })
  sampleRepo?: GitHubSampleRepoDto | null;

  @ApiPropertyOptional({
    description: '失败原因（ok=false 时返回）',
    type: String,
  })
  error?: string;
}

/** GET /integrations/github/test/:integrationId */
export class GitHubTestConnectionResponseDto {
  @ApiProperty({ description: '连接是否成功' })
  ok: boolean;

  @ApiPropertyOptional({
    description: '认证用户信息（成功时返回）',
    type: GitHubViewerDto,
  })
  viewer?: GitHubViewerDto;

  @ApiPropertyOptional({
    description: '失败原因（ok=false 时返回）',
    type: String,
  })
  error?: string;
}

/** GET /integrations/github/:integrationId/sync-logs 数组项（Prisma IntegrationSyncLog） */
export class GitHubSyncLogDto {
  @ApiProperty({ description: '日志 ID' })
  id: string;

  @ApiProperty({ description: '集成配置 ID' })
  integrationId: string;

  @ApiProperty({ description: '关联项目 ID', nullable: true, type: String })
  projectId: string | null;

  @ApiProperty({ description: '资源类型（如 pull_request）' })
  resourceType: string;

  @ApiProperty({ description: '资源 ID', nullable: true, type: String })
  resourceId: string | null;

  @ApiProperty({
    description: '动作（pull/push/two-way/force-pull/force-push）',
  })
  action: string;

  @ApiProperty({
    description: '方向（inbound/outbound）',
    nullable: true,
    type: String,
  })
  direction: string | null;

  @ApiProperty({ description: '状态（success/failed/conflict）' })
  status: string;

  @ApiProperty({ description: '消息', nullable: true, type: String })
  message: string | null;

  @ApiProperty({
    description: '附加载荷',
    nullable: true,
    type: 'object',
    additionalProperties: true,
  })
  payload?: unknown;

  @ApiProperty({ description: '创建时间（ISO 8601）' })
  createdAt: string;
}

/** GET /integrations/github/:integrationId/pulls 数组项（github.types.ts GitHubPullRequest） */
export class GitHubPullRequestDto {
  @ApiProperty({ description: 'PR ID' })
  id: number;

  @ApiProperty({ description: 'PR 编号' })
  number: number;

  @ApiPropertyOptional({ description: 'GraphQL node ID' })
  nodeId?: string;

  @ApiProperty({ description: 'PR 标题' })
  title: string;

  @ApiProperty({ description: 'PR 描述', nullable: true, type: String })
  body: string | null;

  @ApiProperty({ description: '状态', enum: ['open', 'closed'] })
  state: string;

  @ApiProperty({ description: '是否已合并' })
  merged: boolean;

  @ApiProperty({
    description: '合并时间（ISO 8601）',
    nullable: true,
    type: String,
  })
  mergedAt: string | null;

  @ApiProperty({ description: '合并 commit SHA', nullable: true, type: String })
  mergeCommitSha: string | null;

  @ApiProperty({ description: 'PR 页面 URL' })
  htmlUrl: string;

  @ApiProperty({ description: 'diff URL' })
  diffUrl: string;

  @ApiProperty({ description: 'patch URL' })
  patchUrl: string;

  @ApiProperty({
    description: '源分支',
    type: 'object',
    properties: {
      ref: { type: 'string' },
      sha: { type: 'string' },
      repo: {
        type: 'object',
        properties: {
          fullName: { type: 'string' },
          defaultBranch: { type: 'string' },
        },
      },
    },
  })
  head: {
    ref: string;
    sha: string;
    repo: { fullName: string; defaultBranch?: string };
  };

  @ApiProperty({
    description: '目标分支',
    type: 'object',
    properties: {
      ref: { type: 'string' },
      sha: { type: 'string' },
      repo: {
        type: 'object',
        properties: {
          fullName: { type: 'string' },
          defaultBranch: { type: 'string' },
        },
      },
    },
  })
  base: {
    ref: string;
    sha: string;
    repo: { fullName: string; defaultBranch?: string };
  };

  @ApiProperty({
    description: '作者',
    type: 'object',
    properties: {
      login: { type: 'string' },
      id: { type: 'number' },
      avatarUrl: { type: 'string' },
    },
  })
  user: { login: string; id: number; avatarUrl?: string };

  @ApiProperty({ description: '创建时间（ISO 8601）' })
  createdAt: string;

  @ApiProperty({ description: '更新时间（ISO 8601）' })
  updatedAt: string;

  @ApiProperty({
    description: '关闭时间（ISO 8601）',
    nullable: true,
    type: String,
  })
  closedAt: string | null;

  @ApiPropertyOptional({ description: '新增行数' })
  additions?: number;

  @ApiPropertyOptional({ description: '删除行数' })
  deletions?: number;

  @ApiPropertyOptional({ description: '变更文件数' })
  changedFiles?: number;

  @ApiPropertyOptional({ description: 'APM 映射后的最终状态' })
  apmState?: string;
}

/** POST /integrations/github/:integrationId/pulls */
export class GitHubCreatePrResponseDto {
  @ApiProperty({ description: '是否成功' })
  ok: boolean;

  @ApiProperty({
    description: '创建的 PR 摘要',
    type: 'object',
    properties: {
      number: { type: 'number', description: 'PR 编号' },
      htmlUrl: { type: 'string', description: 'PR 页面 URL' },
      state: { type: 'string', enum: ['open', 'closed'], description: '状态' },
      merged: { type: 'boolean', description: '是否已合并' },
      title: { type: 'string', description: 'PR 标题' },
    },
  })
  pr: {
    number: number;
    htmlUrl: string;
    state: string;
    merged: boolean;
    title: string;
  };
}

/** POST /integrations/github/:integrationId/sync/pull（github.types.ts SyncSummary） */
export class GitHubSyncSummaryDto {
  @ApiProperty({ description: '同步是否成功' })
  ok: boolean;

  @ApiPropertyOptional({ description: '新建记录数' })
  created?: number;

  @ApiPropertyOptional({ description: '更新记录数' })
  updated?: number;

  @ApiPropertyOptional({ description: '冲突数' })
  conflicts?: number;

  @ApiProperty({ description: '错误信息列表', type: 'string', isArray: true })
  errors: string[];

  @ApiProperty({ description: '开始时间（ISO 8601）' })
  startedAt: string;

  @ApiProperty({ description: '结束时间（ISO 8601）' })
  finishedAt: string;
}
