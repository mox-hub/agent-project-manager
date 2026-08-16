/**
 * 测试 Linear API 调用 - 获取 Labels 和 Milestones
 */

const LINEAR_PROJECT_ID = '107efb42-3bcb-4b66-bea1-bc8da0190cbb';
const LINEAR_GRAPHQL_ENDPOINT = 'https://api.linear.app/graphql';

// API Key 存储在环境变量或从数据库读取
const API_KEY = process.env.LINEAR_API_KEY;

async function testLinearAPI() {
  if (!API_KEY) {
    console.log('请设置 LINEAR_API_KEY 环境变量');
    console.log('或者从数据库获取 IntegrationConfig 并解密');
    return;
  }

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

  console.log('=== 测试 Linear API ===');
  console.log('Project ID:', LINEAR_PROJECT_ID);

  console.log('\n--- 获取 Labels ---');
  try {
    const labelsResponse = await fetch(LINEAR_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: API_KEY,
      },
      body: JSON.stringify({
        query: LABELS_QUERY,
        variables: { projectId: LINEAR_PROJECT_ID }
      })
    });
    const labelsData = await labelsResponse.json();
    if (labelsData.errors) {
      console.log('Labels 错误:', JSON.stringify(labelsData.errors, null, 2));
    } else {
      const labels = labelsData.data?.project?.labels?.nodes || [];
      console.log('Labels 数量:', labels.length);
      if (labels.length > 0) {
        labels.forEach(l => console.log(`  - ${l.name} (${l.color || 'no color'})`));
      } else {
        console.log('  (无标签)');
      }
    }
  } catch (err) {
    console.log('Labels 请求失败:', err.message);
  }

  console.log('\n--- 获取 Milestones ---');
  try {
    const milestonesResponse = await fetch(LINEAR_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: API_KEY,
      },
      body: JSON.stringify({
        query: MILESTONES_QUERY,
        variables: { projectId: LINEAR_PROJECT_ID }
      })
    });
    const milestonesData = await milestonesResponse.json();
    if (milestonesData.errors) {
      console.log('Milestones 错误:', JSON.stringify(milestonesData.errors, null, 2));
    } else {
      const milestones = milestonesData.data?.project?.milestones?.nodes || [];
      console.log('Milestones 数量:', milestones.length);
      if (milestones.length > 0) {
        milestones.forEach(m => console.log(`  - ${m.name} (${m.status || 'no status'})`));
      } else {
        console.log('  (无里程碑)');
      }
    }
  } catch (err) {
    console.log('Milestones 请求失败:', err.message);
  }
}

testLinearAPI().catch(console.error);
