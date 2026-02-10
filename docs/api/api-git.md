# Git 模块 API 设计（api-git）

前缀统一为：`/_api`。

---

## 1. 接口清单概览

| 领域        | 方法 | 路径                                   | 描述                   |
|-------------|------|----------------------------------------|------------------------|
| Repo        | GET  | `/git/repos`                           | 获取仓库列表           |
| Repo        | POST | `/git/repos`                           | 绑定新仓库             |
| Repo        | GET  | `/git/repos/{repoId}`                  | 获取仓库详情           |
| Repo        | GET  | `/git/repos/{repoId}/status`           | 获取仓库状态           |
| Commit      | GET  | `/git/repos/{repoId}/commits`          | 获取提交列表           |
| Commit      | GET  | `/git/commits/{commitId}`              | 获取提交详情           |
| Diff        | POST | `/git/diff`                            | 生成 diff              |
| PR          | GET  | `/git/repos/{repoId}/pull-requests`    | 获取 PR 列表           |
| PR          | GET  | `/git/pull-requests/{prId}`            | 获取 PR 详情           |
| PR Review   | POST | `/git/pull-requests/{prId}/reviews`    | 创建/记录评审（含 AI） |

---

## 2. 仓库 API

### 2.1 获取仓库列表 `GET /_api/git/repos`

**查询参数：**

- `projectId` (string, optional)
- `provider` (string, optional)

**响应示例：**

```json
{
  "data": [
    {
      "id": "repo_1",
      "projectId": "proj_1",
      "name": "main-repo",
      "localPath": "E:/code/app",
      "remoteUrl": "git@github.com:xxx/app.git",
      "role": "backend",
      "defaultBranch": "main",
      "provider": "github"
    }
  ]
}
```

---

### 2.2 绑定新仓库 `POST /_api/git/repos`

**请求体：**

```json
{
  "projectId": "proj_1",
  "name": "core-repo",
  "localPath": "E:/code/core",
  "remoteUrl": "git@github.com:xxx/core.git",
  "role": "backend",
  "provider": "github"
}
```

---

### 2.3 获取仓库状态 `GET /_api/git/repos/{repoId}/status`

**响应示例：**

```json
{
  "data": {
    "clean": false,
    "ahead": 1,
    "behind": 0,
    "changedFiles": [
      { "path": "src/main.ts", "status": "modified" }
    ]
  }
}
```

---

## 3. 提交与 diff API

### 3.1 获取提交列表 `GET /_api/git/repos/{repoId}/commits`

**查询参数：**

- `from`, `to` (timestamp, optional)
- `author` (string, optional)
- `path` (string, optional)
- 分页参数。

### 3.2 获取提交详情 `GET /_api/git/commits/{commitId}`

包括提交元数据与 `commit_files` 概要。

---

### 3.3 生成 diff `POST /_api/git/diff`

**请求体：**

```json
{
  "repoId": "repo_1",
  "baseRef": "main",
  "targetRef": "feature/xyz",
  "pathFilter": ["src/"]
}
```

**响应示例（高层摘要）：**

```json
{
  "data": {
    "files": [
      {
        "path": "src/main.ts",
        "status": "modified",
        "additions": 10,
        "deletions": 2
      }
    ]
  }
}
```

---

## 4. Pull Request API

### 4.1 获取 PR 列表 `GET /_api/git/repos/{repoId}/pull-requests`

**查询参数：**

- `status` (string, optional)：`open` / `merged` / `closed`
- `author` (string, optional)

---

### 4.2 获取 PR 详情 `GET /_api/git/pull-requests/{prId}`

**响应示例：**

```json
{
  "data": {
    "id": "pr_1",
    "repoId": "repo_1",
    "externalId": "123",
    "title": "Add AIHub APIs",
    "description": "实现 AIHub 相关接口……",
    "author": "alice",
    "sourceBranch": "feature/aihub",
    "targetBranch": "main",
    "status": "open",
    "labels": ["ai","backend"],
    "createdAt": "2026-02-08T10:00:00Z",
    "updatedAt": "2026-02-09T08:00:00Z"
  }
}
```

---

### 4.3 创建/记录评审 `POST /_api/git/pull-requests/{prId}/reviews`

**用途：**

- 记录人工评审结果，或保存 AI 评审摘要，便于后续展示和统计。

**请求体示例（AI 评审）：**

```json
{
  "type": "ai",
  "state": "commented",
  "summary": "AI 审查发现 2 个潜在风险……",
  "comments": [
    {
      "file": "src/main.ts",
      "line": 42,
      "comment": "这里可能存在空指针风险。"
    }
  ]
}
```

---

## 5. 错误码示例

- `REPO_NOT_FOUND`：仓库不存在或无访问权限。
- `PR_NOT_FOUND`：PR 不存在或未同步。***
