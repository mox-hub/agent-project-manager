# 开发指南（Development Guide）

本文件提供 Agent Project Manager 项目的开发环境搭建、代码规范、工作流程与最佳实践，帮助开发者快速上手并保持代码质量。

---

## 1. 开发环境要求

### 1.1 必需环境

- **Node.js**: 20.x LTS 或更高版本
- **包管理器**: pnpm 8.x 或更高（推荐）或 npm 9.x / yarn 1.22+
- **Git**: 2.30+
- **数据库**:
  - SQLite（单机模式，无需额外安装）
  - PostgreSQL 14+（团队/企业模式，可选）

### 1.2 推荐工具

- **IDE**: VS Code（推荐）或 WebStorm
- **VS Code 扩展**:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - Prisma
  - TypeScript and JavaScript Language Features
  - GitLens
- **浏览器**: Chrome/Edge（开发调试）、Firefox（兼容性测试）

### 1.3 环境检查

```bash
# 检查 Node.js 版本
node --version  # 应 >= 20.0.0

# 检查 pnpm 版本
pnpm --version  # 应 >= 8.0.0

# 检查 Git 版本
git --version  # 应 >= 2.30.0
```

---

## 2. 项目结构

### 2.1 Monorepo 结构

```
agent-project-manager/
├── apps/
│   ├── frontend/          # React 前端应用
│   ├── desktop/           # Electron 桌面应用
│   └── server/            # NestJS 后端服务
├── packages/
│   ├── shared/            # 共享类型与工具函数
│   └── plugin-sdk/        # 插件 SDK（前端 + 后端）
├── docs/                  # 项目文档
├── .github/               # GitHub Actions 工作流
├── package.json           # 根 package.json（workspace 配置）
├── pnpm-workspace.yaml    # pnpm workspace 配置
├── .gitignore
└── README.md
```

### 2.2 各应用目录结构

**前端 (apps/frontend):**
```
frontend/
├── src/
│   ├── app/              # 应用入口与路由
│   ├── modules/          # 业务模块
│   ├── shared/           # 共享组件与工具
│   └── infrastructure/   # 基础设施（API Client、Event Client 等）
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

**后端 (apps/server):**
```
server/
├── src/
│   ├── main.ts           # 应用入口
│   ├── app.module.ts     # 根模块
│   ├── core/             # 核心基础设施
│   └── modules/          # 业务模块
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── test/
├── nest-cli.json
├── tsconfig.json
└── package.json
```

---

## 3. 环境搭建

### 3.1 克隆项目

```bash
git clone <repository-url>
cd agent-project-manager
```

### 3.2 安装依赖

```bash
# 安装根依赖与所有 workspace 依赖
pnpm install

# 或使用 npm
npm install
```

### 3.3 环境变量配置

**后端环境变量 (apps/server/.env):**
```bash
# 复制示例文件
cp apps/server/.env.example apps/server/.env

# 编辑 .env 文件
NODE_ENV=development
PORT=4300
APP_MODE=standalone

# 数据库配置
DATABASE_URL="file:./dev.db"  # SQLite
# 或 PostgreSQL: DATABASE_URL="postgresql://user:password@localhost:5432/agent_pm"

# JWT 配置
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# AI 配置（可选）
AI_OPENAI_API_KEY=sk-...
AI_ANTHROPIC_API_KEY=sk-ant-...

# 日志配置
LOG_LEVEL=debug
```

**前端环境变量 (apps/frontend/.env):**
```bash
# 复制示例文件
cp apps/frontend/.env.example apps/frontend/.env

# 编辑 .env 文件
VITE_API_BASE_URL=http://localhost:4300
VITE_WS_URL=ws://localhost:4300
```

### 3.4 数据库初始化

```bash
# 进入后端目录
cd apps/server

# 生成 Prisma Client
pnpm prisma generate

# 运行数据库迁移
pnpm prisma migrate dev

# （可选）填充种子数据
pnpm prisma db seed
```

### 3.5 启动开发服务器

**方式一：分别启动（推荐用于调试）**

```bash
# 终端 1: 启动后端
cd apps/server
pnpm dev

# 终端 2: 启动前端
cd apps/frontend
pnpm dev

# 终端 3: （可选）启动 Electron
cd apps/desktop
pnpm dev
```

**方式二：使用根脚本（并行启动）**

```bash
# 在项目根目录
pnpm dev              # 启动所有应用
pnpm dev:server       # 仅启动后端
pnpm dev:frontend      # 仅启动前端
pnpm dev:desktop       # 仅启动 Electron
```

### 3.6 验证安装

1. **后端健康检查**: 访问 `http://localhost:4300/_api/health`，应返回 `{ "status": "ok" }`
2. **前端访问**: 打开 `http://localhost:5173`（Vite 默认端口），应看到登录页或应用界面
3. **数据库连接**: 检查 `apps/server/dev.db`（SQLite）或 PostgreSQL 连接是否正常

---

## 4. 代码规范

### 4.1 TypeScript 配置

项目使用 TypeScript 严格模式，配置文件：
- `tsconfig.json`（根配置）
- `apps/*/tsconfig.json`（各应用特定配置）

**关键配置：**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### 4.2 ESLint 配置

使用 ESLint 进行代码检查，配置文件：`.eslintrc.js` 或 `eslint.config.js`

**关键规则：**
- 使用 `@typescript-eslint/recommended`
- React Hooks 规则：`react-hooks/rules-of-hooks`
- 导入顺序：`import/order`

**运行检查：**
```bash
# 检查所有文件
pnpm lint

# 自动修复
pnpm lint:fix

# 检查特定目录
pnpm lint apps/frontend
```

### 4.3 Prettier 配置

使用 Prettier 统一代码格式，配置文件：`.prettierrc`

**关键配置：**
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "avoid"
}
```

**运行格式化：**
```bash
# 格式化所有文件
pnpm format

# 检查格式
pnpm format:check
```

### 4.4 命名规范

**文件命名：**
- 组件文件：`PascalCase.tsx`（如 `TaskCard.tsx`）
- 工具文件：`kebab-case.ts`（如 `date-utils.ts`）
- Hook 文件：`use-kebab-case.ts`（如 `use-project-list.ts`）

**变量命名：**
- 变量/函数：`camelCase`
- 常量：`UPPER_SNAKE_CASE`
- 类型/接口：`PascalCase`
- 组件：`PascalCase`

**示例：**
```typescript
// ✅ 正确
const taskList = useTaskList();
const MAX_RETRY_COUNT = 3;
interface ProjectData { }
export function TaskCard() { }

// ❌ 错误
const TaskList = useTaskList();
const maxRetryCount = 3;
interface projectData { }
export function taskCard() { }
```

### 4.5 导入顺序

```typescript
// 1. React 相关
import { useState, useEffect } from 'react';

// 2. 第三方库
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';

// 3. 内部模块（按层级）
import { useProjectList } from '@/modules/project/hooks/use-project-list';
import { TaskCard } from '@/modules/project/components/task-card';

// 4. 类型导入（单独分组）
import type { Project } from '@/shared/types';

// 5. 样式导入（最后）
import './styles.css';
```

### 4.6 注释规范

```typescript
/**
 * 获取项目列表
 * @param filters - 过滤条件
 * @returns 项目列表与分页信息
 */
export function useProjectList(filters?: ProjectFilters) {
  // ...
}

// 单行注释用于解释复杂逻辑
// 注意：这里需要处理边界情况，因为 API 可能返回 null
const project = data?.project ?? defaultProject;
```

---

## 5. Git 工作流

### 5.1 分支策略

采用 **Git Flow** 变体：

- **main**: 生产环境代码，仅通过 PR 合并
- **develop**: 开发主分支，功能分支合并到此
- **feature/***: 功能开发分支（如 `feature/project-dashboard`）
- **bugfix/***: 缺陷修复分支（如 `bugfix/task-filter-issue`）
- **hotfix/***: 紧急修复分支（如 `hotfix/auth-bug`）

**分支命名示例：**
```bash
feature/project-dashboard
feature/ai-chat-integration
bugfix/task-dependency-calculation
hotfix/oauth2-redirect-loop
```

### 5.2 提交信息规范

采用 **Conventional Commits** 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型（type）：**
- `feat`: 新功能
- `fix`: 缺陷修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建/工具链更新

**示例：**
```bash
feat(project): 添加项目仪表盘页面

- 实现项目概览卡片
- 添加进度图表组件
- 集成 AI 洞察面板

Closes #123

fix(task): 修复任务依赖计算错误

修复了当任务有循环依赖时的计算逻辑问题。

refactor(api): 重构 API Client 错误处理

统一错误响应格式，改进错误提示。
```

### 5.3 Pull Request 流程

1. **创建功能分支**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/my-feature
   ```

2. **开发与提交**
   ```bash
   # 开发代码...
   git add .
   git commit -m "feat: 添加新功能"
   git push origin feature/my-feature
   ```

3. **创建 Pull Request**
   - 在 GitHub/GitLab 创建 PR
   - 标题：`feat(scope): 简短描述`
   - 描述：包含变更说明、测试情况、截图（如适用）
   - 关联 Issue：`Closes #123`

4. **代码审查**
   - 至少需要 1 位审查者批准
   - 解决审查意见后，标记为 "Ready for review"
   - 通过 CI 检查（lint、test、build）

5. **合并**
   - 使用 "Squash and merge" 或 "Rebase and merge"
   - 删除功能分支

### 5.4 提交前检查（Husky + lint-staged）

项目配置了 Git Hooks，提交前自动运行：

```bash
# .husky/pre-commit
pnpm lint-staged  # 运行 ESLint 和 Prettier
pnpm test:unit    # 运行单元测试（快速）
```

**lint-staged 配置：**
```json
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md}": ["prettier --write"]
}
```

---

## 6. 测试策略

### 6.1 测试类型

**单元测试（Unit Tests）**
- 测试工具：Vitest（前端）、Jest（后端）
- 覆盖范围：工具函数、Hook、Service 方法
- 目标覆盖率：> 80%

**集成测试（Integration Tests）**
- 测试工具：Vitest + Supertest（API 测试）
- 覆盖范围：API 端点、数据库操作
- 目标覆盖率：> 70%

**E2E 测试（End-to-End Tests）**
- 测试工具：Playwright
- 覆盖范围：关键用户流程（登录、创建项目、创建任务等）
- 目标覆盖率：核心流程 100%

### 6.2 运行测试

```bash
# 运行所有测试
pnpm test

# 运行单元测试
pnpm test:unit

# 运行集成测试
pnpm test:integration

# 运行 E2E 测试
pnpm test:e2e

# 运行测试并生成覆盖率报告
pnpm test:coverage

# 监听模式（开发时）
pnpm test:watch
```

### 6.3 测试示例

**前端单元测试（Vitest）：**
```typescript
// modules/project/hooks/__tests__/use-project-list.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProjectList } from '../use-project-list';

describe('useProjectList', () => {
  it('should fetch project list', async () => {
    const { result } = renderHook(() => useProjectList());
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    
    expect(result.current.data).toBeDefined();
  });
});
```

**后端单元测试（Jest）：**
```typescript
// modules/project/project.service.spec.ts
import { Test } from '@nestjs/testing';
import { ProjectService } from './project.service';

describe('ProjectService', () => {
  let service: ProjectService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ProjectService],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

---

## 7. 开发工具与配置

### 7.1 VS Code 配置

**推荐设置 (.vscode/settings.json):**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

**推荐扩展 (.vscode/extensions.json):**
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

### 7.2 调试配置

**前端调试 (.vscode/launch.json):**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/apps/frontend"
    }
  ]
}
```

**后端调试 (.vscode/launch.json):**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug NestJS",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["dev:server"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### 7.3 常用命令

```bash
# 开发
pnpm dev              # 启动所有应用
pnpm dev:server       # 仅后端
pnpm dev:frontend     # 仅前端

# 构建
pnpm build            # 构建所有应用
pnpm build:server     # 构建后端
pnpm build:frontend   # 构建前端

# 代码质量
pnpm lint             # 运行 ESLint
pnpm lint:fix         # 自动修复
pnpm format           # 格式化代码
pnpm type-check       # 类型检查

# 测试
pnpm test             # 运行所有测试
pnpm test:watch       # 监听模式
pnpm test:coverage    # 覆盖率报告

# 数据库
pnpm db:migrate       # 运行迁移
pnpm db:generate      # 生成 Prisma Client
pnpm db:seed          # 填充种子数据
pnpm db:studio        # 打开 Prisma Studio

# 清理
pnpm clean            # 清理构建产物
pnpm clean:all        # 清理所有（包括 node_modules）
```

---

## 8. 常见问题与故障排查

### 8.1 依赖安装问题

**问题：pnpm install 失败**
```bash
# 解决方案 1: 清理缓存
pnpm store prune

# 解决方案 2: 删除 lock 文件重新安装
rm pnpm-lock.yaml
pnpm install

# 解决方案 3: 使用 npm
rm -rf node_modules pnpm-lock.yaml
npm install
```

### 8.2 数据库连接问题

**问题：Prisma 连接失败**
```bash
# 检查 DATABASE_URL 环境变量
echo $DATABASE_URL

# 重新生成 Prisma Client
cd apps/server
pnpm prisma generate

# 检查数据库文件权限（SQLite）
ls -la apps/server/dev.db
```

### 8.3 端口占用问题

**问题：端口 4300 已被占用**
```bash
# 查找占用进程
lsof -i :4300  # macOS/Linux
netstat -ano | findstr :4300  # Windows

# 修改端口（在 .env 中）
PORT=4301
```

### 8.4 类型错误问题

**问题：TypeScript 类型错误**
```bash
# 重新生成类型
pnpm type-check

# 清理 TypeScript 缓存
rm -rf node_modules/.cache
pnpm install

# 检查 tsconfig.json 配置
```

### 8.5 构建失败问题

**问题：构建时内存不足**
```bash
# 增加 Node.js 内存限制
NODE_OPTIONS="--max-old-space-size=4096" pnpm build
```

---

## 9. 开发最佳实践

### 9.1 组件开发

**原则：**
- 单一职责：每个组件只做一件事
- 可复用性：提取通用逻辑到 Hook
- 可测试性：组件逻辑与 UI 分离

**示例：**
```tsx
// ✅ 好的组件设计
export function TaskCard({ task, onSelect }: TaskCardProps) {
  const { statusColor, statusLabel } = useTaskStatus(task.status);
  
  return (
    <Card onClick={() => onSelect(task.id)}>
      <CardHeader>
        <CardTitle>{task.title}</CardTitle>
        <Badge color={statusColor}>{statusLabel}</Badge>
      </CardHeader>
      <CardContent>{task.description}</CardContent>
    </Card>
  );
}

// ❌ 不好的设计：组件职责过多
export function TaskCard({ task }: TaskCardProps) {
  // 不应该在这里处理 API 调用、状态管理等
  const [data, setData] = useState();
  useEffect(() => {
    fetch('/api/tasks').then(...);
  }, []);
  // ...
}
```

### 9.2 API 调用

**原则：**
- 使用 React Query 管理服务端状态
- 统一错误处理
- 使用乐观更新提升体验

**示例：**
```tsx
// ✅ 使用 React Query
const { data, isLoading, error } = useQuery({
  queryKey: ['projects', filters],
  queryFn: () => projectApi.getList(filters),
});

// ✅ 使用 Mutation 与乐观更新
const mutation = useMutation({
  mutationFn: projectApi.create,
  onMutate: async (newProject) => {
    await queryClient.cancelQueries({ queryKey: ['projects'] });
    const previous = queryClient.getQueryData(['projects']);
    queryClient.setQueryData(['projects'], (old) => [...old, newProject]);
    return { previous };
  },
  onError: (err, newProject, context) => {
    queryClient.setQueryData(['projects'], context.previous);
  },
});
```

### 9.3 状态管理

**原则：**
- 服务端状态：使用 React Query
- 全局 UI 状态：使用 Zustand
- 组件本地状态：使用 useState

**示例：**
```tsx
// ✅ 全局状态（Zustand）
const useAppStore = create((set) => ({
  currentProjectId: null,
  setCurrentProjectId: (id) => set({ currentProjectId: id }),
}));

// ✅ 组件状态
const [isOpen, setIsOpen] = useState(false);
```

### 9.4 性能优化

**原则：**
- 使用 React.memo 避免不必要的重渲染
- 使用 useMemo/useCallback 缓存计算结果
- 代码分割与懒加载

**示例：**
```tsx
// ✅ 使用 React.memo
export const TaskCard = React.memo(({ task }: TaskCardProps) => {
  // ...
});

// ✅ 使用 useMemo
const filteredTasks = useMemo(() => {
  return tasks.filter(task => task.status === 'active');
}, [tasks]);

// ✅ 懒加载路由
const ProjectPage = lazy(() => import('./pages/ProjectPage'));
```

---

## 10. 贡献指南

### 10.1 如何参与开发

1. **Fork 项目**（如果是外部贡献者）
2. **创建功能分支**
   ```bash
   git checkout -b feature/my-contribution
   ```
3. **开发与测试**
   - 编写代码
   - 添加测试
   - 运行 `pnpm lint` 和 `pnpm test`
4. **提交代码**
   ```bash
   git commit -m "feat: 添加新功能"
   ```
5. **创建 Pull Request**
   - 描述变更内容
   - 关联相关 Issue
   - 等待代码审查

### 10.2 代码审查标准

**审查者应检查：**
- 代码符合项目规范
- 功能实现正确
- 测试覆盖充分
- 文档更新完整
- 性能影响可接受
- 安全性考虑

**被审查者应：**
- 及时响应审查意见
- 解释设计决策
- 更新代码与文档

### 10.3 文档更新

**需要更新文档的情况：**
- 新增功能（更新 `docs/feature-design/`）
- API 变更（更新 `docs/api/`）
- 架构变更（更新 `docs/architecture-*.md`）
- 配置变更（更新本文件）

---

## 11. 发布流程

### 11.1 版本号规范

采用 **语义化版本（SemVer）**：
- `MAJOR.MINOR.PATCH`（如 `1.2.3`）
- `MAJOR`: 不兼容的 API 变更
- `MINOR`: 向后兼容的功能新增
- `PATCH`: 向后兼容的缺陷修复

### 11.2 发布步骤

1. **更新版本号**
   ```bash
   # 使用 npm version 或手动更新 package.json
   npm version patch  # 或 minor, major
   ```

2. **更新 CHANGELOG.md**
   - 记录本次发布的变更
   - 分类：Added、Changed、Fixed、Removed

3. **创建 Release Tag**
   ```bash
   git tag -a v1.2.3 -m "Release v1.2.3"
   git push origin v1.2.3
   ```

4. **构建与测试**
   ```bash
   pnpm build
   pnpm test
   ```

5. **发布到 GitHub Releases**
   - 上传构建产物
   - 添加发布说明

---

## 12. 资源与参考

### 12.1 项目文档

- [架构设计](./architecture-design.md)
- [前端架构](./architecture-frontend.md)
- [后端架构](./architecture-backend.md)
- [设计规范](./design-system.md)
- [API 文档](./api/README.md)

### 12.2 外部资源

- [NestJS 文档](https://docs.nestjs.com/)
- [React 文档](https://react.dev/)
- [TailwindCSS 文档](https://tailwindcss.com/docs)
- [shadcn/ui 文档](https://ui.shadcn.com/)
- [anime.js 文档](https://animejs.com/)
- [Prisma 文档](https://www.prisma.io/docs)
- [TanStack Query 文档](https://tanstack.com/query/latest)

### 12.3 社区支持

- GitHub Issues: 报告问题与建议
- GitHub Discussions: 讨论与问答
- 项目 Wiki: 更多详细文档

---

## 13. 快速开始检查清单

在开始开发前，确保完成以下步骤：

- [ ] 安装 Node.js 20+ 和 pnpm
- [ ] 克隆项目仓库
- [ ] 运行 `pnpm install` 安装依赖
- [ ] 配置环境变量（`.env` 文件）
- [ ] 初始化数据库（`pnpm db:migrate`）
- [ ] 启动开发服务器（`pnpm dev`）
- [ ] 验证安装（访问健康检查端点）
- [ ] 配置 VS Code（安装推荐扩展）
- [ ] 阅读代码规范与 Git 工作流
- [ ] 创建第一个功能分支

---

## 14. 总结

本开发指南提供了：

1. ✅ **环境搭建**：完整的开发环境配置步骤
2. ✅ **代码规范**：TypeScript、ESLint、Prettier、命名规范
3. ✅ **Git 工作流**：分支策略、提交规范、PR 流程
4. ✅ **测试策略**：单元测试、集成测试、E2E 测试
5. ✅ **开发工具**：VS Code 配置、调试技巧、常用命令
6. ✅ **故障排查**：常见问题与解决方案
7. ✅ **最佳实践**：组件开发、API 调用、性能优化
8. ✅ **贡献指南**：如何参与项目开发
9. ✅ **发布流程**：版本管理与发布步骤

遵循本指南，可以确保代码质量、提高开发效率，并保持团队协作顺畅。
