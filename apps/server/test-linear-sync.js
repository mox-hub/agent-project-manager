const { PrismaClient } = require('@prisma/client');
const { EncryptionService } = require('./dist/src/core/crypto/encryption.service');

const prisma = new PrismaClient();

async function main() {
  console.log('=== 测试 Linear API 并同步项目数据 ===\n');

  // 1. 查询 agent-project-manager 项目及其集成配置
  const project = await prisma.project.findFirst({
    where: {
      name: {
        contains: 'agent-project-manager'
      }
    },
    include: {
      taskProviderLinks: true,
    }
  });

  if (!project) {
    console.log('未找到 agent-project-manager 项目');
    return;
  }

  console.log('项目信息:');
  console.log('  ID:', project.id);
  console.log('  名称:', project.name);
  console.log('  Linear Project ID:', project.externalProjectId);
  console.log('  集成配置数量:', project.taskProviderLinks.length);

  if (project.taskProviderLinks.length === 0) {
    console.log('\n该项目没有 Linear 集成配置');
    return;
  }

  const link = project.taskProviderLinks[0];
  console.log('  Integration ID:', link.integrationId);

  // 2. 获取 IntegrationConfig
  const integration = await prisma.integrationConfig.findUnique({
    where: { id: link.integrationId }
  });

  if (!integration) {
    console.log('\n未找到集成配置');
    return;
  }

  console.log('\n集成配置:');
  console.log('  Provider:', integration.provider);
  console.log('  Config:', JSON.parse(integration.configJson || '{}'));

  // 3. 获取 Linear API Key 并解密
  const encryption = new EncryptionService();
  try {
    const config = encryption.decryptJson(integration.configJson);
    console.log('\n解密后的配置:');
    console.log('  API Key:', config.apiKey ? config.apiKey.substring(0, 10) + '...' : 'N/A');
    
    // 4. 调用 Linear API 获取 Labels 和 Milestones
    const linearProjectId = project.externalProjectId;
    console.log('\n=== 调用 Linear API ===');
    console.log('  Project ID:', linearProjectId);

    // Labels 查询
    const LABELS_QUERY = `
      query ProjectLabels($projectId: String!) {
        project(id: $projectId) {
          id
          name
          labels {
            nodes {
              id
              name
              color
            }
          }
        }
      }
    `;

    // Milestones 查询
    const MILESTONES_QUERY = `
      query ProjectMilestones($projectId: String!) {
        project(id: $projectId) {
          id
          name
          milestones {
            nodes {
              id
              name
              identifier
              description
              targetDate
              status
              progress
              url
            }
          }
        }
      }
    `;

    console.log('\n获取 Labels...');
    const labelsResponse = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: config.apiKey,
      },
      body: JSON.stringify({
        query: LABELS_QUERY,
        variables: { projectId: linearProjectId }
      })
    });
    const labelsData = await labelsResponse.json();
    console.log('Labels 响应:', JSON.stringify(labelsData, null, 2));

    console.log('\n获取 Milestones...');
    const milestonesResponse = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: config.apiKey,
      },
      body: JSON.stringify({
        query: MILESTONES_QUERY,
        variables: { projectId: linearProjectId }
      })
    });
    const milestonesData = await milestonesResponse.json();
    console.log('Milestones 响应:', JSON.stringify(milestonesData, null, 2));

  } catch (err) {
    console.log('\n解密配置失败:', err.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
