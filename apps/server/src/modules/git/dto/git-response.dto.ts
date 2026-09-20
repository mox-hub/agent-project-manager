import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Git 模块响应契约（裸数据口径，不含 TransformInterceptor 信封）。
 */

/** 仓库所属项目摘要 */
export class GitProjectSummaryDto {
  @ApiProperty({ type: String, description: '项目 ID' })
  id: string;

  @ApiProperty({ type: String, description: '项目名' })
  name: string;
}

/** 仓库（Repository，含 project 摘要） */
export class GitRepositoryResponseDto {
  @ApiProperty({ type: String, description: '仓库 ID' })
  id: string;

  @ApiProperty({ type: String, description: '项目 ID' })
  projectId: string;

  @ApiProperty({ type: String, description: '仓库名' })
  name: string;

  @ApiPropertyOptional({
    type: String,
    description: '本地路径',
    nullable: true,
  })
  localPath?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '远程地址',
    nullable: true,
  })
  remoteUrl?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '角色（主仓/子仓等）',
    nullable: true,
  })
  role?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '默认分支',
    nullable: true,
  })
  defaultBranch?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'provider',
    nullable: true,
  })
  provider?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '工作区路径',
    nullable: true,
  })
  workspacePath?: string | null;

  @ApiPropertyOptional({
    description: 'Git 配置（.git/config 解析结果，任意 JSON）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  gitConfig?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    type: String,
    description: "'valid' | 'invalid' | 'unknown'",
    nullable: true,
  })
  validationStatus?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '校验错误信息',
    nullable: true,
  })
  validationError?: string | null;

  @ApiPropertyOptional({
    description: '最近校验时间（ISO）',
    type: String,
    nullable: true,
  })
  lastValidatedAt?: string | null;

  @ApiPropertyOptional({
    description: '元数据（任意 JSON）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;

  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;

  @ApiProperty({ type: String, description: '更新时间（ISO）' })
  updatedAt: string;

  @ApiProperty({ type: GitProjectSummaryDto, description: '项目摘要' })
  project: GitProjectSummaryDto;
}

/** 仓库状态变更文件 */
export class RepositoryChangedFileDto {
  @ApiProperty({ type: String, description: '文件路径' })
  path: string;

  @ApiProperty({
    type: String,
    description: "变更状态（'untracked' / git status 字母码）",
  })
  status: string;
}

/** 仓库工作区状态（getRepositoryStatus） */
export class RepositoryStatusResponseDto {
  @ApiProperty({ type: Boolean, description: '工作区是否干净' })
  clean: boolean;

  @ApiProperty({ type: Number, description: '领先远程提交数' })
  ahead: number;

  @ApiProperty({ type: Number, description: '落后远程提交数' })
  behind: number;

  @ApiProperty({
    type: [RepositoryChangedFileDto],
    description: '变更文件列表',
  })
  changedFiles: RepositoryChangedFileDto[];

  @ApiPropertyOptional({
    type: String,
    description: '当前分支（不可用时缺失）',
    nullable: true,
  })
  currentBranch?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '错误信息（本地路径不可用时返回）',
  })
  error?: string;
}

/** 提交变更文件（CommitFile） */
export class CommitFileResponseDto {
  @ApiProperty({ type: String, description: '文件记录 ID' })
  id: string;

  @ApiProperty({ type: String, description: '提交 ID' })
  commitId: string;

  @ApiProperty({ type: String, description: '文件路径' })
  path: string;

  @ApiProperty({ type: String, description: "'modified' | 'binary'" })
  status: string;

  @ApiPropertyOptional({
    type: String,
    description: '重命名前路径',
    nullable: true,
  })
  oldPath?: string | null;

  @ApiPropertyOptional({
    type: Number,
    description: '新增行数',
    nullable: true,
  })
  additions?: number | null;

  @ApiPropertyOptional({
    type: Number,
    description: '删除行数',
    nullable: true,
  })
  deletions?: number | null;

  @ApiPropertyOptional({
    type: Number,
    description: '变更行数',
    nullable: true,
  })
  changes?: number | null;

  @ApiPropertyOptional({
    description: '元数据（任意 JSON）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;
}

/** 提交（Commit，含变更文件） */
export class CommitResponseDto {
  @ApiProperty({ type: String, description: '提交记录 ID' })
  id: string;

  @ApiProperty({ type: String, description: '仓库 ID' })
  repoId: string;

  @ApiProperty({ type: String, description: '提交 hash' })
  hash: string;

  @ApiProperty({ type: String, description: '作者名' })
  authorName: string;

  @ApiPropertyOptional({
    type: String,
    description: '作者邮箱',
    nullable: true,
  })
  authorEmail?: string | null;

  @ApiProperty({ type: String, description: '作者时间（ISO）' })
  authorDate: string;

  @ApiPropertyOptional({
    type: String,
    description: '提交者名',
    nullable: true,
  })
  committerName?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '提交者邮箱',
    nullable: true,
  })
  committerEmail?: string | null;

  @ApiPropertyOptional({
    description: '提交者时间（ISO）',
    type: String,
    nullable: true,
  })
  committerDate?: string | null;

  @ApiProperty({ type: String, description: '提交信息（首行）' })
  message: string;

  @ApiPropertyOptional({
    description: '父提交 hash 列表（任意 JSON）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  parentHashes?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    description: '元数据（任意 JSON）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;

  @ApiProperty({ type: [CommitFileResponseDto], description: '变更文件' })
  files: CommitFileResponseDto[];
}

/** 提交分页（getCommits：{ items, total, page, pageSize }） */
export class CommitPageResponseDto {
  @ApiProperty({ type: [CommitResponseDto], description: '当前页提交' })
  items: CommitResponseDto[];

  @ApiProperty({ type: Number, description: '提交总数' })
  total: number;

  @ApiProperty({ type: Number, description: '当前页码' })
  page: number;

  @ApiProperty({ type: Number, description: '每页条数' })
  pageSize: number;
}

/** 提交详情（getCommitById：Commit + repo[project.members] + files） */
export class CommitDetailResponseDto extends CommitResponseDto {
  @ApiProperty({
    description:
      '所属仓库（Repository 全字段 + project{id, name, members: ProjectMember[]}）',
    type: Object,
    additionalProperties: true,
  })
  repo: Record<string, unknown>;
}

/** Diff 变更文件 */
export class DiffFileDto {
  @ApiProperty({ type: String, description: '文件路径' })
  path: string;

  @ApiProperty({
    type: String,
    description: "'added' | 'deleted' | 'modified' | 'binary'",
  })
  status: string;

  @ApiProperty({ type: Number, description: '新增行数' })
  additions: number;

  @ApiProperty({ type: Number, description: '删除行数' })
  deletions: number;

  @ApiProperty({ type: Number, description: '变更行数' })
  changes: number;
}

/** Diff 汇总（generateDiff / getWorkingDiff / getStagedDiff） */
export class DiffSummaryResponseDto {
  @ApiProperty({ type: [DiffFileDto], description: '变更文件列表' })
  files: DiffFileDto[];

  @ApiProperty({ type: Number, description: '总新增行数' })
  totalAdditions: number;

  @ApiProperty({ type: Number, description: '总删除行数' })
  totalDeletions: number;

  @ApiProperty({ type: Number, description: '总变更文件数' })
  totalChanges: number;
}

/** PR 审查（PullRequestReview） */
export class PullRequestReviewResponseDto {
  @ApiProperty({ type: String, description: '审查 ID' })
  id: string;

  @ApiProperty({ type: String, description: 'PR ID' })
  prId: string;

  @ApiPropertyOptional({
    type: String,
    description: '审查人 User ID',
    nullable: true,
  })
  reviewerId?: string | null;

  @ApiProperty({ type: String, description: '审查类型' })
  type: string;

  @ApiProperty({
    type: String,
    description: '审查结论（approve/request_changes 等）',
  })
  state: string;

  @ApiPropertyOptional({ type: String, description: '摘要', nullable: true })
  summary?: string | null;

  @ApiPropertyOptional({
    description: '评论列表（任意 JSON，通常为数组）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  comments?: Record<string, unknown> | null;

  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;

  @ApiPropertyOptional({
    description: '元数据（任意 JSON）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;
}

/** PR（PullRequest，含 reviews） */
export class PullRequestResponseDto {
  @ApiProperty({ type: String, description: 'PR ID' })
  id: string;

  @ApiProperty({ type: String, description: '仓库 ID' })
  repoId: string;

  @ApiProperty({ type: String, description: '外部系统 PR 标识' })
  externalId: string;

  @ApiProperty({ type: String, description: 'PR 标题' })
  title: string;

  @ApiPropertyOptional({ type: String, description: 'PR 描述', nullable: true })
  description?: string | null;

  @ApiProperty({ type: String, description: '作者' })
  author: string;

  @ApiProperty({ type: String, description: '源分支' })
  sourceBranch: string;

  @ApiProperty({ type: String, description: '目标分支' })
  targetBranch: string;

  @ApiProperty({ type: String, description: 'PR 状态' })
  status: string;

  @ApiPropertyOptional({
    description: '标签（任意 JSON，通常为 string[]）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  labels?: Record<string, unknown> | null;

  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;

  @ApiProperty({ type: String, description: '更新时间（ISO）' })
  updatedAt: string;

  @ApiPropertyOptional({
    description: '合并时间（ISO）',
    type: String,
    nullable: true,
  })
  mergedAt?: string | null;

  @ApiPropertyOptional({
    description: '元数据（任意 JSON）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;

  @ApiProperty({
    type: [PullRequestReviewResponseDto],
    description: '审查列表（按创建时间倒序）',
  })
  reviews: PullRequestReviewResponseDto[];
}

/** PR 详情（getPullRequestById：PR + repo[project.members] + reviews） */
export class PullRequestDetailResponseDto extends PullRequestResponseDto {
  @ApiProperty({
    description:
      '所属仓库（Repository 全字段 + project{id, name, members: ProjectMember[]}）',
    type: Object,
    additionalProperties: true,
  })
  repo: Record<string, unknown>;
}

/** Git 工具可用性（GitToolInfo） */
export class GitToolInfoResponseDto {
  @ApiProperty({ type: Boolean, description: 'Git 是否可用' })
  available: boolean;

  @ApiPropertyOptional({
    type: String,
    description: 'Git 版本',
    nullable: true,
  })
  version?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: 'Git 可执行文件路径',
    nullable: true,
  })
  path?: string | null;

  @ApiPropertyOptional({
    description: 'Git 配置键值对',
    type: Object,
    additionalProperties: { type: 'string' },
    nullable: true,
  })
  config?: Record<string, string> | null;

  @ApiPropertyOptional({
    type: String,
    description: '错误信息',
    nullable: true,
  })
  error?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '修复建议',
    nullable: true,
  })
  suggestion?: string | null;
}

/** 项目工作空间（ProjectWorkspace） */
export class ProjectWorkspaceResponseDto {
  @ApiProperty({ type: String, description: '记录 ID' })
  id: string;

  @ApiProperty({ type: String, description: '项目 ID' })
  projectId: string;

  @ApiPropertyOptional({
    type: String,
    description: '本地路径',
    nullable: true,
  })
  localPath?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '远程地址',
    nullable: true,
  })
  remoteUrl?: string | null;

  @ApiProperty({ type: Boolean, description: '是否自动克隆' })
  autoClone: boolean;

  @ApiPropertyOptional({
    description: '最近校验时间（ISO）',
    type: String,
    nullable: true,
  })
  validatedAt?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: "'valid' | 'invalid' | 'unknown'",
    nullable: true,
  })
  validationStatus?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '校验错误信息',
    nullable: true,
  })
  validationError?: string | null;

  @ApiProperty({ type: String, description: '创建时间（ISO）' })
  createdAt: string;

  @ApiProperty({ type: String, description: '更新时间（ISO）' })
  updatedAt: string;

  @ApiPropertyOptional({
    description: '元数据（任意 JSON）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;
}

/** 工作空间校验结果（WorkspaceValidationResult） */
export class WorkspaceValidationResponseDto {
  @ApiProperty({ type: Boolean, description: '是否有效' })
  valid: boolean;

  @ApiProperty({ type: String, description: "'valid' | 'invalid' | 'unknown'" })
  status: string;

  @ApiPropertyOptional({ type: String, description: '错误信息' })
  error?: string;

  @ApiPropertyOptional({ type: String, description: '修复建议' })
  suggestion?: string;

  @ApiPropertyOptional({ type: Boolean, description: '是否检测到 .git 目录' })
  gitRepoDetected?: boolean;
}

/** 克隆结果（cloneRepository） */
export class CloneRepositoryResponseDto {
  @ApiProperty({ type: Boolean, description: '是否成功' })
  success: boolean;

  @ApiProperty({ type: String, description: '结果消息' })
  message: string;

  @ApiProperty({ type: String, description: 'git clone stdout' })
  stdout: string;

  @ApiProperty({ type: String, description: 'git clone stderr' })
  stderr: string;
}

/** Git 命令执行结果（GitCommandResult） */
export class GitCommandResultResponseDto {
  @ApiProperty({ type: Boolean, description: '是否成功' })
  success: boolean;

  @ApiProperty({ type: Number, description: '退出码（失败前置校验为 -1）' })
  exitCode: number;

  @ApiProperty({ type: String, description: '标准输出' })
  stdout: string;

  @ApiProperty({ type: String, description: '标准错误' })
  stderr: string;

  @ApiProperty({ type: Number, description: '耗时（毫秒）' })
  duration: number;

  @ApiPropertyOptional({
    type: String,
    description: '错误码（如 WORKSPACE_NOT_FOUND / GIT_DANGEROUS_COMMAND）',
  })
  error?: string;

  @ApiPropertyOptional({ type: String, description: '内部错误码' })
  errorCode?: string;

  @ApiPropertyOptional({ type: String, description: '错误信息' })
  errorMessage?: string;

  @ApiPropertyOptional({ type: String, description: '修复建议' })
  suggestion?: string;
}

/** Git 命令执行历史行（GitCommandExecution） */
export class GitCommandExecutionResponseDto {
  @ApiProperty({ type: String, description: '记录 ID' })
  id: string;

  @ApiProperty({ type: String, description: '仓库 ID' })
  repoId: string;

  @ApiProperty({ type: String, description: '用户 ID' })
  userId: string;

  @ApiProperty({ type: String, description: '执行的 git 子命令' })
  command: string;

  @ApiPropertyOptional({
    description: '命令参数（任意 JSON，通常为 string[]）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  args?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: Number, description: '退出码', nullable: true })
  exitCode?: number | null;

  @ApiPropertyOptional({
    type: String,
    description: '标准输出（截断）',
    nullable: true,
  })
  stdout?: string | null;

  @ApiPropertyOptional({
    type: String,
    description: '标准错误（截断）',
    nullable: true,
  })
  stderr?: string | null;

  @ApiPropertyOptional({
    type: Number,
    description: '耗时（毫秒）',
    nullable: true,
  })
  duration?: number | null;

  @ApiProperty({ type: String, description: '执行时间（ISO）' })
  executedAt: string;

  @ApiPropertyOptional({
    description: '元数据（任意 JSON）',
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  metadata?: Record<string, unknown> | null;
}

/** 本地分支（含 tracking 信息） */
export class BranchInfoDto {
  @ApiProperty({ type: String, description: '分支名' })
  name: string;

  @ApiProperty({ type: Boolean, description: '是否当前分支' })
  current: boolean;

  @ApiProperty({
    type: String,
    description: '上游跟踪信息（如 origin/main...ahead 1）',
    nullable: true,
  })
  tracking: string | null;
}

/** 远程分支 */
export class RemoteBranchInfoDto {
  @ApiProperty({ type: String, description: '分支名（不含 origin/ 前缀）' })
  name: string;

  @ApiProperty({ type: String, description: '远程名（origin）' })
  remote: string;

  @ApiProperty({ type: String, description: '完整分支名（含 origin/ 前缀）' })
  fullName: string;
}

/** 分支列表（getBranches） */
export class BranchListResponseDto {
  @ApiProperty({ type: [BranchInfoDto], description: '本地分支' })
  local: BranchInfoDto[];

  @ApiProperty({
    type: [RemoteBranchInfoDto],
    description: '远程分支（includeRemote=true 时返回）',
  })
  remote: RemoteBranchInfoDto[];

  @ApiProperty({
    type: String,
    description: '当前分支（不可用时为 null）',
    nullable: true,
  })
  current: string | null;
}

/** 分支操作结果（createBranch / deleteBranch / checkoutBranch） */
export class BranchMutationResultResponseDto {
  @ApiProperty({ type: Boolean, description: '是否成功' })
  success: boolean;

  @ApiProperty({ type: String, description: '目标分支名' })
  branch: string;
}
