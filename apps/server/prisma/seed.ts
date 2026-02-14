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
  });
