import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test users
  const passwordHash = await bcrypt.hash('password123', 10);

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      displayName: 'Admin User',
      email: 'admin@example.com',
      passwordHash,
      authProvider: 'local',
      isActive: true,
    },
  });

  const testUser = await prisma.user.upsert({
    where: { username: 'testuser' },
    update: {},
    create: {
      username: 'testuser',
      displayName: 'Test User',
      email: 'test@example.com',
      passwordHash,
      authProvider: 'local',
      isActive: true,
    },
  });

  console.log('✅ Created users:', { adminUser: adminUser.username, testUser: testUser.username });

  // Create global role assignments
  const existingAdminRole = await prisma.roleAssignment.findFirst({
    where: {
      userId: adminUser.id,
      scopeType: 'global',
      projectId: null,
      role: 'admin',
    },
  });

  if (!existingAdminRole) {
    await prisma.roleAssignment.create({
      data: {
        userId: adminUser.id,
        scopeType: 'global',
        projectId: null,
        role: 'admin',
      },
    });
  }

  const existingUserRole = await prisma.roleAssignment.findFirst({
    where: {
      userId: testUser.id,
      scopeType: 'global',
      projectId: null,
      role: 'user',
    },
  });

  if (!existingUserRole) {
    await prisma.roleAssignment.create({
      data: {
        userId: testUser.id,
        scopeType: 'global',
        projectId: null,
        role: 'user',
      },
    });
  }

  console.log('✅ Created role assignments');

  // Create default tags
  const tags = [
    { name: 'backend', color: '#FF5733', description: '后端相关' },
    { name: 'frontend', color: '#33FF57', description: '前端相关' },
    { name: 'bug', color: '#FF3333', description: 'Bug' },
    { name: 'feature', color: '#3333FF', description: '新功能' },
  ];

  for (const tag of tags) {
    const existing = await prisma.tag.findFirst({
      where: {
        name: tag.name,
        projectId: null,
      },
    });

    if (!existing) {
      await prisma.tag.create({
        data: {
          ...tag,
          resourceTypes: ['task', 'project'],
          createdBy: adminUser.id,
        },
      });
    }
  }

  console.log('✅ Created default tags');

  // Create default status definitions
  const statuses = [
    { type: 'task', key: 'todo', name: '待办', order: 10, isFinal: false },
    { type: 'task', key: 'in_progress', name: '进行中', order: 20, isFinal: false },
    { type: 'task', key: 'in_review', name: '待评审', order: 30, isFinal: false },
    { type: 'task', key: 'done', name: '已完成', order: 40, isFinal: true },
  ];

  for (const status of statuses) {
    const existing = await prisma.statusDefinition.findFirst({
      where: {
        projectId: null,
        type: status.type,
        key: status.key,
      },
    });

    if (!existing) {
      await prisma.statusDefinition.create({
        data: status,
      });
    }
  }

  console.log('✅ Created default status definitions');

  // Create a sample project template
  const existingTemplate = await prisma.projectTemplate.findUnique({
    where: { id: 'template-nodejs' },
  });

  if (!existingTemplate) {
    await prisma.projectTemplate.create({
      data: {
        id: 'template-nodejs',
        name: 'Node.js 服务端项目模板',
        description: '适用于典型 Node.js REST API 项目',
        baseProjectType: 'backend',
        defaultTags: ['backend', 'api'],
        defaultStatuses: statuses,
        createdBy: adminUser.id,
      },
    });
  }

  console.log('✅ Created project template');

  // Create a sample project with tasks
  const sampleProject = await prisma.project.upsert({
    where: { id: 'sample-project-1' },
    update: {},
    create: {
      id: 'sample-project-1',
      name: '示例项目：Agent Project Manager',
      description: '这是一个示例项目，用于演示系统功能',
      type: 'team',
      visibility: 'internal',
      status: 'active',
      createdBy: adminUser.id,
      members: {
        create: [
          {
            userId: adminUser.id,
            role: 'owner',
          },
          {
            userId: testUser.id,
            role: 'developer',
          },
        ],
      },
    },
    include: {
      members: true,
    },
  });

  console.log('✅ Created sample project');

  // 确保全局 inbox 项目存在, 用于承载未绑定项目的任务/Bug/文档
  const inboxProject = await prisma.project.upsert({
    where: { id: 'project-inbox' },
    update: {},
    create: {
      id: 'project-inbox',
      name: 'Inbox',
      description: '未绑定项目的临时存放区, 后续可将任务迁移到正式项目',
      projectCode: 'INBOX',
      type: 'team',
      visibility: 'private',
      status: 'active',
      createdBy: adminUser.id,
      members: {
        create: [{ userId: adminUser.id, role: 'owner' }],
      },
    },
  });

  // 创建 INBX 模块代码
  await prisma.projectModule.upsert({
    where: {
      projectId_code: { projectId: inboxProject.id, code: 'INBX' },
    },
    create: {
      projectId: inboxProject.id,
      code: 'INBX',
      name: 'Inbox',
      description: '未绑定项目的默认模块',
    },
    update: {},
  });

  console.log('✅ Created inbox project + INBX module');

  // Create sample tasks for the project
  const todoStatus = await prisma.statusDefinition.findFirst({
    where: { key: 'todo', type: 'task', projectId: null },
  });

  const inProgressStatus = await prisma.statusDefinition.findFirst({
    where: { key: 'in_progress', type: 'task', projectId: null },
  });

  const doneStatus = await prisma.statusDefinition.findFirst({
    where: { key: 'done', type: 'task', projectId: null },
  });

  const backendTag = await prisma.tag.findFirst({
    where: { name: 'backend', projectId: null },
  });

  const frontendTag = await prisma.tag.findFirst({
    where: { name: 'frontend', projectId: null },
  });

  const featureTag = await prisma.tag.findFirst({
    where: { name: 'feature', projectId: null },
  });

  const sampleTasks = [
    {
      title: '实现用户认证模块',
      description: '完成用户登录、注册和 JWT 认证功能',
      status: doneStatus?.key || 'done',
      priority: 'high',
      assigneeId: adminUser.id,
      projectId: sampleProject.id,
      tagIds: backendTag ? [backendTag.id] : [],
    },
    {
      title: '实现项目管理 CRUD',
      description: '完成项目的创建、读取、更新和删除功能',
      status: doneStatus?.key || 'done',
      priority: 'high',
      assigneeId: adminUser.id,
      projectId: sampleProject.id,
      tagIds: backendTag ? [backendTag.id] : [],
    },
    {
      title: '实现任务看板视图',
      description: '完成任务的看板展示和拖拽功能',
      status: inProgressStatus?.key || 'in_progress',
      priority: 'medium',
      assigneeId: testUser.id,
      projectId: sampleProject.id,
      tagIds: frontendTag ? [frontendTag.id] : [],
    },
    {
      title: '集成 AI Hub 模块',
      description: '实现 AI 对话和上下文管理功能',
      status: todoStatus?.key || 'todo',
      priority: 'high',
      assigneeId: null,
      projectId: sampleProject.id,
      tagIds: featureTag ? [featureTag.id] : [],
    },
  ];

  for (const taskData of sampleTasks) {
    const existing = await prisma.task.findFirst({
      where: {
        title: taskData.title,
        projectId: taskData.projectId,
      },
    });

    if (!existing) {
      const task = await prisma.task.create({
        data: {
          title: taskData.title,
          description: taskData.description,
          status: taskData.status,
          priority: taskData.priority,
          assigneeId: taskData.assigneeId,
          projectId: taskData.projectId,
        },
      });

      // Attach tags
      if (taskData.tagIds.length > 0) {
        await prisma.taskTag.createMany({
          data: taskData.tagIds.map((tagId) => ({
            taskId: task.id,
            tagId,
            projectId: taskData.projectId,
          })),
        });
      }
    }
  }

  console.log('✅ Created sample tasks');

  // ============================================
  // V3: Acceptance 系统预置清单
  // ============================================
  const systemChecklists = [
    {
      name: 'Java/Spring 后端完备性清单',
      description: 'Java Spring Boot 后端服务的工程完备性标准',
      projectType: 'backend',
      techStack: 'java-spring',
      checklist: [
        { category: '日志', content: '结构化日志配置（logback/Log4j2）', severity: 'high' },
        { category: '错误追踪', content: 'Sentry/错误上报集成', severity: 'high' },
        { category: '健康检查', content: '/actuator/health 端点配置', severity: 'high' },
        { category: '数据库', content: 'Flyway/Liquibase 迁移脚本管理', severity: 'medium' },
        { category: 'API文档', content: 'OpenAPI/Springdoc 文档', severity: 'medium' },
        { category: '测试', content: '单元测试覆盖率 >= 70%', severity: 'high' },
        { category: '安全性', content: '输入校验与 SQL 注入防护', severity: 'critical' },
        { category: '性能', content: '关键接口响应时间 < 200ms', severity: 'medium' },
      ],
    },
    {
      name: 'TypeScript/Node 后端完备性清单',
      description: 'TypeScript Node.js 后端服务的工程完备性标准',
      projectType: 'backend',
      techStack: 'ts-node',
      checklist: [
        { category: '日志', content: 'pino/结构化日志配置', severity: 'high' },
        { category: '错误处理', content: '全局错误中间件与异常处理', severity: 'high' },
        { category: '健康检查', content: '/health 端点配置', severity: 'high' },
        { category: 'API文档', content: 'OpenAPI/Swagger 文档', severity: 'medium' },
        { category: '测试', content: 'Jest 测试覆盖率 >= 70%', severity: 'high' },
        { category: '类型安全', content: 'TypeScript strict 模式', severity: 'high' },
        { category: '安全性', content: '输入校验与安全头配置', severity: 'critical' },
        { category: '性能', content: '关键接口响应时间 < 200ms', severity: 'medium' },
      ],
    },
    {
      name: 'React 前端完备性清单',
      description: 'React SPA 的工程完备性标准',
      projectType: 'frontend',
      techStack: 'react',
      checklist: [
        { category: '错误边界', content: 'Error Boundary 组件实现', severity: 'high' },
        { category: '性能', content: 'Web Vitals 监控（LCP < 2.5s）', severity: 'medium' },
        { category: '可访问性', content: '基础 a11y 合规（aria-label）', severity: 'medium' },
        { category: '测试', content: 'Vitest 组件测试覆盖率 >= 60%', severity: 'medium' },
        { category: '类型安全', content: 'TypeScript strict 模式', severity: 'high' },
        { category: '错误处理', content: 'API 错误状态处理', severity: 'high' },
        { category: '安全性', content: 'XSS 防护与 CSP 配置', severity: 'critical' },
      ],
    },
    {
      name: 'Python/Django 后端完备性清单',
      description: 'Python Django 后端服务的工程完备性标准',
      projectType: 'backend',
      techStack: 'python-django',
      checklist: [
        { category: '日志', content: '结构化日志配置（structlog）', severity: 'high' },
        { category: '错误追踪', content: 'Sentry/Django 错误上报集成', severity: 'high' },
        { category: '健康检查', content: '/health/ 端点配置', severity: 'high' },
        { category: '数据库', content: 'Django migrations 迁移管理', severity: 'high' },
        { category: 'API文档', content: 'DRF Spectacular/OpenAPI 文档', severity: 'medium' },
        { category: '测试', content: 'pytest 测试覆盖率 >= 70%', severity: 'high' },
        { category: '安全性', content: 'Django 安全中间件配置', severity: 'critical' },
        { category: '类型安全', content: 'pyright/mypy 类型检查', severity: 'medium' },
      ],
    },
    {
      name: 'Go/Gin 后端完备性清单',
      description: 'Go Gin 后端服务的工程完备性标准',
      projectType: 'backend',
      techStack: 'go-gin',
      checklist: [
        { category: '日志', content: 'zap/结构化日志配置', severity: 'high' },
        { category: '错误处理', content: '错误封装与传播规范', severity: 'high' },
        { category: '健康检查', content: '/health 端点配置', severity: 'high' },
        { category: 'API文档', content: 'Swagger/OpenAPI 文档', severity: 'medium' },
        { category: '测试', content: 'go test 覆盖率 >= 70%', severity: 'high' },
        { category: '安全性', content: '输入校验与安全头配置', severity: 'critical' },
        { category: '性能', content: 'pprof 性能分析配置', severity: 'medium' },
        { category: '代码质量', content: 'golangci-lint 代码检查', severity: 'high' },
      ],
    },
  ];

  for (const cl of systemChecklists) {
    const existing = await prisma.completenessChecklist.findFirst({
      where: { name: cl.name, isSystem: true },
    });

    if (!existing) {
      await prisma.completenessChecklist.create({
        data: {
          name: cl.name,
          description: cl.description,
          projectType: cl.projectType,
          techStack: cl.techStack,
          checklist: cl.checklist as any,
          isSystem: true,
        },
      });
      console.log(`✅ Created system checklist: ${cl.name}`);
    }
  }

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
