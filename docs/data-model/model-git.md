# Git 模块数据模型设计（model-git）

本文件描述 Git 集成相关的数据模型，包括 **Repository / Commit / CommitFile / PullRequest / PRReview** 等实体。

---

## 1. 实体概览

- `Repository`：本地或远程仓库的元数据。
- `Commit`：提交记录摘要。
- `CommitFile`：某次提交中受影响的文件。
- `PullRequest`：PR/MR 摘要（从 GitHub/GitLab 等同步）。
- `PullRequestReview`：评审意见与状态（可选）。

> 实际代码 diff 内容可按需缓存（例如最近 N 条），或通过即时计算；此处设计为“结构化索引”，而非完整 Git 存储替代方案。

---

## 2. `repositories` 表

**用途**：记录项目级仓库绑定信息。

**字段建议：**

- `id` (PK, string/uuid)
- `project_id` (FK → projects.id, not null)
- `name` (string, not null)
- `local_path` (string, nullable，单机模式下使用)
- `remote_url` (string, nullable)
- `role` (string, nullable，如 `'frontend' | 'backend' | 'infra'`)
- `default_branch` (string, nullable，如 `'main' | 'master'`)
- `provider` (string, nullable，如 `'github' | 'gitlab' | 'gitea' | 'local'`)
- `metadata` (jsonb/text，扩展字段，如仓库分组信息等)
- `created_at` (timestamp, not null)
- `updated_at` (timestamp, not null)

**索引建议：**

- `idx_repositories_project_id`
- `idx_repositories_provider`

---

## 3. `commits` 与 `commit_files` 表

### 3.1 `commits` 表

**用途**：缓存与项目相关的提交摘要，便于查询与 AI/报表使用。

**字段建议：**

- `id` (PK, string/uuid)
- `repo_id` (FK → repositories.id, not null)
- `hash` (string, not null，Git 提交哈希)
- `author_name` (string, not null)
- `author_email` (string, nullable)
- `author_date` (timestamp, not null)
- `committer_name` (string, nullable)
- `committer_email` (string, nullable)
- `committer_date` (timestamp, nullable)
- `message` (text, not null)
- `parent_hashes` (jsonb/text，父提交哈希列表)
- `metadata` (jsonb/text，例如关联任务 ID 列表、标签等)

**索引建议：**

- 唯一约束：(`repo_id`, `hash`)
- `idx_commits_repo_id_author_date`

---

### 3.2 `commit_files` 表

**用途**：记录单次提交中受影响的文件及变更类型。

**字段建议：**

- `id` (PK, string/uuid)
- `commit_id` (FK → commits.id, not null)
- `path` (string, not null)
- `status` (string，如 `'added' | 'modified' | 'deleted' | 'renamed'`)
- `old_path` (string, nullable，用于 rename)
- `additions` (int, nullable)
- `deletions` (int, nullable)
- `changes` (int, nullable，总修改行数)
- `metadata` (jsonb/text，例如语种/模块识别等)

**索引建议：**

- `idx_commit_files_commit_id`
- `idx_commit_files_path`

---

## 4. Pull Request / Merge Request 相关表

### 4.1 `pull_requests` 表

**用途**：缓存来自远程平台的 PR/MR 摘要，支撑 AI 评审与项目视图。

**字段建议：**

- `id` (PK, string/uuid)
- `repo_id` (FK → repositories.id, not null)
- `external_id` (string, not null，例如 GitHub PR number)
- `title` (string, not null)
- `description` (text, nullable)
- `author` (string, not null)
- `source_branch` (string, not null)
- `target_branch` (string, not null)
- `status` (string，如 `'open' | 'merged' | 'closed'`)
- `labels` (jsonb/text，来自远程的标签)
- `created_at` (timestamp, not null)
- `updated_at` (timestamp, not null)
- `merged_at` (timestamp, nullable)
- `metadata` (jsonb/text，例如关联任务、CI 状态摘要等)

**索引建议：**

- 唯一约束：(`repo_id`, `external_id`)
- `idx_pull_requests_repo_id_status`

---

### 4.2 `pull_request_reviews` 表（可选）

**用途**：记录 PR 评审结果与 AI 评审摘要。

**字段建议：**

- `id` (PK, string/uuid)
- `pr_id` (FK → pull_requests.id, not null)
- `reviewer_id` (FK → users.id, nullable，AI 评审可为空或特殊标识)
- `type` (string，如 `'human' | 'ai'`)
- `state` (string，如 `'approved' | 'changes_requested' | 'commented'`)
- `summary` (text, nullable，评审整体结论)
- `comments` (jsonb/text，结构化评论列表，或存引用外部系统 URL)
- `created_at` (timestamp, not null)
- `metadata` (jsonb/text，插件/集成扩展)

**索引建议：**

- `idx_pr_reviews_pr_id`
- `idx_pr_reviews_reviewer_id`

---

## 5. 与其他模块的数据关系

- **Project**
  - `repositories.project_id` → `projects.id`
  - 通过 `tasks.git_refs` 字段与 `commits` / `pull_requests` 关联。
- **AIHub**
  - AI 代码审查工作流可以引用 `pull_requests`、`commits` 与 `commit_files`。
- **Terminal**
  - 终端运行 Git 命令时，可使用 `repositories.local_path` 与 `default_branch` 作为上下文。
- **Notification**
  - PR 状态变化、CI 状态变化可映射为通知事件，引用 `pull_requests.id`。

---

## 6. Prisma 风格 Schema 参考

```ts
model Repository {
  id           String   @id @default(cuid())
  projectId    String
  name         String
  localPath    String?
  remoteUrl    String?
  role         String?
  defaultBranch String?
  provider     String?
  metadata     Json?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  commits      Commit[]
  pullRequests PullRequest[]
}

model Commit {
  id           String   @id @default(cuid())
  repoId       String
  hash         String
  authorName   String
  authorEmail  String?
  authorDate   DateTime
  committerName  String?
  committerEmail String?
  committerDate  DateTime?
  message      String
  parentHashes Json?
  metadata     Json?

  repo         Repository @relation(fields: [repoId], references: [id])
  files        CommitFile[]

  @@unique([repoId, hash])
}

model CommitFile {
  id         String   @id @default(cuid())
  commitId   String
  path       String
  status     String
  oldPath    String?
  additions  Int?
  deletions  Int?
  changes    Int?
  metadata   Json?

  commit     Commit  @relation(fields: [commitId], references: [id])
}

model PullRequest {
  id           String   @id @default(cuid())
  repoId       String
  externalId   String
  title        String
  description  String?
  author       String
  sourceBranch String
  targetBranch String
  status       String
  labels       Json?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  mergedAt     DateTime?
  metadata     Json?

  repo         Repository       @relation(fields: [repoId], references: [id])
  reviews      PullRequestReview[]

  @@unique([repoId, externalId])
}

model PullRequestReview {
  id          String   @id @default(cuid())
  prId        String
  reviewerId  String?
  type        String
  state       String
  summary     String?
  comments    Json?
  createdAt   DateTime @default(now())
  metadata    Json?

  pr          PullRequest @relation(fields: [prId], references: [id])
}
```

---

未来如需更详细的 diff/patch 级数据，可以新增单独的 diff 缓存表或采用外部存储，不必直接落在核心表中。***

