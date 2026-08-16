const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('=== 查询 agent-project-manager 项目 ===\n');

  // 1. 查询项目
  const projects = await prisma.project.findMany({
    where: {
      name: {
        contains: 'agent'
      }
    },
    include: {
      milestones: true,
      taskProviderLinks: true,
    }
  });

  for (const p of projects) {
    console.log('项目:', JSON.stringify({
      id: p.id,
      name: p.name,
      externalProjectId: p.externalProjectId,
      externalProvider: p.externalProvider,
      milestones: p.milestones.map(m => ({ id: m.id, name: m.name, status: m.status })),
      integrations: p.taskProviderLinks.map(tpl => ({ 
        integrationId: tpl.integrationId, 
        externalProjectId: tpl.externalProjectId,
        externalWorkspaceId: tpl.externalWorkspaceId
      }))
    }, null, 2));
  }

  // 2. 查询所有标签（按项目分组）
  console.log('\n=== 标签统计 ===');
  const tags = await prisma.tag.groupBy({
    by: ['projectId'],
    _count: true,
  });
  console.log('按项目的标签数量:', tags);

  // 3. 查询所有里程碑
  console.log('\n=== 里程碑统计 ===');
  const milestones = await prisma.milestone.groupBy({
    by: ['projectId'],
    _count: true,
  });
  console.log('按项目的里程碑数量:', milestones);

  // 4. 单独查询 agent-project-manager 的标签
  if (projects.length > 0) {
    const agentProject = projects.find(p => p.name.toLowerCase().includes('agent-project-manager')) || projects[0];
    console.log('\n=== agent-project-manager 标签详情 ===');
    const agentTags = await prisma.tag.findMany({
      where: { projectId: agentProject.id }
    });
    console.log('标签数量:', agentTags.length);
    agentTags.forEach(t => console.log(`  - ${t.name} (${t.color || 'no color'})`));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
