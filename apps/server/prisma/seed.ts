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

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  
  // ====== 默认执行角色模板（垂直切分 pm_to_coder）======
  // 作为"全局模板"（projectId=null），任何新项目创建时按这套模板复制到项目上
  const defaultExecutionRoles = [
    {
      key: 'coder',
      name: 'Coder',
      description: '负责按需求实现代码改动，能读写仓库、执行命令',
      executionRole: 'coder',
      defaultCliProviderId: 'claude-code',
      promptHint: '你是负责编码的 AI 员工。请按任务描述阅读代码、定位问题、修改代码、运行测试，最后用工具回报变更总结。',
    },
    {
      key: 'reviewer',
      name: 'Reviewer',
      description: '负责看 diff / 跑检查 / 给出评审意见',
      executionRole: 'reviewer',
      defaultCliProviderId: 'claude-code',
      promptHint: '你是负责代码评审的 AI 员工。请阅读变更 diff、检查潜在问题、给出可操作的改进建议，并最后输出评审意见。',
    },
    {
      key: 'pm',
      name: 'PM',
      description: '负责拆任务、写需求、跟进度',
      executionRole: 'pm',
      defaultCliProviderId: 'claude-code',
      promptHint: '你是负责产品与项目管理的 AI 员工。请以 PM 视角拆解任务、澄清需求、跟进进度并汇报风险。',
    },
    {
      key: 'qa',
      name: 'QA',
      description: '负责设计并执行测试用例，验证修复',
      executionRole: 'qa',
      defaultCliProviderId: 'claude-code',
      promptHint: '你是负责测试的 AI 员工。请设计覆盖改动点的测试用例、运行测试、汇报失败与回归风险。',
    },
    {
      key: 'general',
      name: 'General',
      description: '通用执行角色，兜底无明确分配的任务',
      executionRole: 'general',
      defaultCliProviderId: 'claude-code',
      promptHint: '你是通用 AI 员工。请按任务要求自主选择最合适的处理方式并汇报结果。',
    },
  ];

  for (const r of defaultExecutionRoles) {
    // SQLite + Prisma nullable 复合 unique 行为：NULL 视为不同值，所以用 findFirst
    const existing = await prisma.projectRoleDefinition.findFirst({
      where: { projectId: null, key: r.key },
    });
    if (existing) {
      await prisma.projectRoleDefinition.update({
        where: { id: existing.id },
        data: {
          name: r.name,
          description: r.description,
          executionRole: r.executionRole,
          defaultCliProviderId: r.defaultCliProviderId,
          promptHint: r.promptHint,
        },
      });
    } else {
      await prisma.projectRoleDefinition.create({
        data: {
          projectId: null,
          key: r.key,
          name: r.name,
          description: r.description,
          executionRole: r.executionRole,
          defaultCliProviderId: r.defaultCliProviderId,
          promptHint: r.promptHint,
        },
      });
    }
  }
  console.log(`Created/updated ${defaultExecutionRoles.length} default execution role templates`);});
