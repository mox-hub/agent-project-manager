const http = require('http');

// 工具函数：发送 HTTP 请求
function httpRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ statusCode: res.statusCode, body: json });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body: body });
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(data);
    }
    req.end();
  });
}

// 登录获取 token
async function login() {
  const postData = JSON.stringify({
    username: 'admin',
    password: 'password123',
  });

  const options = {
    hostname: 'localhost',
    port: 4300,
    path: '/_api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  const response = await httpRequest(options, postData);
  if (response.statusCode === 201 && response.body.data && response.body.data.accessToken) {
    return response.body.data.accessToken;
  }
  throw new Error(`登录失败: ${response.statusCode}`);
}

// 创建测试项目
async function createProject(token) {
  const postData = JSON.stringify({
    name: 'Test Project for Phase 5',
    description: '测试项目',
    type: 'software',
    visibility: 'private',
  });

  const options = {
    hostname: 'localhost',
    port: 4300,
    path: '/_api/projects',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  const response = await httpRequest(options, postData);
  if (response.statusCode === 201 && response.body.data) {
    return response.body.data.id;
  }
  throw new Error(`创建项目失败: ${response.statusCode} - ${JSON.stringify(response.body)}`);
}

// 测试通知功能
async function testNotifications(token, projectId) {
  console.log('\n📬 测试通知功能...');
  
  // 1. 获取通知列表
  console.log('  1. 获取通知列表...');
  const listOptions = {
    hostname: 'localhost',
    port: 4300,
    path: '/_api/notifications?limit=10',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };
  const listResponse = await httpRequest(listOptions);
  console.log(`    状态码: ${listResponse.statusCode}`);
  if (listResponse.statusCode === 200) {
    console.log(`    ✅ 获取通知列表成功，共 ${listResponse.body.data?.length || 0} 条通知`);
  } else {
    console.log(`    ❌ 获取通知列表失败: ${JSON.stringify(listResponse.body)}`);
  }

  // 2. 获取未读通知数量
  console.log('  2. 获取未读通知数量...');
  const unreadOptions = {
    hostname: 'localhost',
    port: 4300,
    path: '/_api/notifications/unread-count',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };
  const unreadResponse = await httpRequest(unreadOptions);
  console.log(`    状态码: ${unreadResponse.statusCode}`);
  if (unreadResponse.statusCode === 200) {
    console.log(`    ✅ 未读通知数量: ${unreadResponse.body.data?.count || 0}`);
  } else {
    console.log(`    ❌ 获取未读数量失败: ${JSON.stringify(unreadResponse.body)}`);
  }

  // 3. 获取通知偏好设置
  console.log('  3. 获取通知偏好设置...');
  const prefOptions = {
    hostname: 'localhost',
    port: 4300,
    path: '/_api/notifications/preferences',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };
  const prefResponse = await httpRequest(prefOptions);
  console.log(`    状态码: ${prefResponse.statusCode}`);
  if (prefResponse.statusCode === 200) {
    console.log(`    ✅ 获取通知偏好成功`);
  } else {
    console.log(`    ❌ 获取通知偏好失败: ${JSON.stringify(prefResponse.body)}`);
  }
}

// 测试集成功能
async function testIntegrations(token, projectId) {
  console.log('\n🔗 测试集成功能...');
  
  // 1. 获取集成列表（项目级）
  console.log('  1. 获取项目集成列表...');
  const listOptions = {
    hostname: 'localhost',
    port: 4300,
    path: `/_api/integrations?projectId=${projectId}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };
  const listResponse = await httpRequest(listOptions);
  console.log(`    状态码: ${listResponse.statusCode}`);
  if (listResponse.statusCode === 200) {
    console.log(`    ✅ 获取集成列表成功，共 ${listResponse.body.data?.length || 0} 个集成`);
  } else {
    console.log(`    ❌ 获取集成列表失败: ${JSON.stringify(listResponse.body)}`);
  }

  // 2. 创建集成配置
  console.log('  2. 创建集成配置...');
  const createData = JSON.stringify({
    provider: 'github',
    name: 'Test GitHub Integration',
    projectId: projectId,
    config: {
      repository: 'test/repo',
      webhookSecret: 'test-secret',
    },
  });
  const createOptions = {
    hostname: 'localhost',
    port: 4300,
    path: '/_api/integrations',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
  const createResponse = await httpRequest(createOptions, createData);
  console.log(`    状态码: ${createResponse.statusCode}`);
  if (createResponse.statusCode === 201) {
    const integrationId = createResponse.body.data?.id;
    console.log(`    ✅ 创建集成成功，ID: ${integrationId}`);
    
    // 3. 获取集成详情
    console.log('  3. 获取集成详情...');
    const detailOptions = {
      hostname: 'localhost',
      port: 4300,
      path: `/_api/integrations/${integrationId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    };
    const detailResponse = await httpRequest(detailOptions);
    console.log(`    状态码: ${detailResponse.statusCode}`);
    if (detailResponse.statusCode === 200) {
      console.log(`    ✅ 获取集成详情成功`);
      console.log(`    集成名称: ${detailResponse.body.data?.name}`);
      console.log(`    提供商: ${detailResponse.body.data?.provider}`);
    } else {
      console.log(`    ❌ 获取集成详情失败: ${JSON.stringify(detailResponse.body)}`);
    }

    // 4. 更新集成配置
    console.log('  4. 更新集成配置...');
    const updateData = JSON.stringify({
      name: 'Updated GitHub Integration',
      config: {
        repository: 'test/updated-repo',
        webhookSecret: 'updated-secret',
      },
    });
    const updateOptions = {
      hostname: 'localhost',
      port: 4300,
      path: `/_api/integrations/${integrationId}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    };
    const updateResponse = await httpRequest(updateOptions, updateData);
    console.log(`    状态码: ${updateResponse.statusCode}`);
    if (updateResponse.statusCode === 200) {
      console.log(`    ✅ 更新集成成功`);
    } else {
      console.log(`    ❌ 更新集成失败: ${JSON.stringify(updateResponse.body)}`);
    }

    // 5. 删除集成配置
    console.log('  5. 删除集成配置...');
    const deleteOptions = {
      hostname: 'localhost',
      port: 4300,
      path: `/_api/integrations/${integrationId}`,
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    };
    const deleteResponse = await httpRequest(deleteOptions);
    console.log(`    状态码: ${deleteResponse.statusCode}`);
    if (deleteResponse.statusCode === 200 || deleteResponse.statusCode === 204) {
      console.log(`    ✅ 删除集成成功`);
    } else {
      console.log(`    ❌ 删除集成失败: ${JSON.stringify(deleteResponse.body)}`);
    }
  } else {
    console.log(`    ❌ 创建集成失败: ${JSON.stringify(createResponse.body)}`);
  }
}

// 主测试流程
(async () => {
  try {
    console.log('🚀 开始 Phase 5 功能测试...\n');
    
    // 1. 登录
    console.log('1. 登录获取 Token...');
    const token = await login();
    console.log(`   ✅ Token 获取成功: ${token.substring(0, 50)}...\n`);
    
    // 2. 创建测试项目
    console.log('2. 创建测试项目...');
    const projectId = await createProject(token);
    console.log(`   ✅ 项目创建成功，ID: ${projectId}\n`);
    
    // 3. 测试通知功能
    await testNotifications(token, projectId);
    
    // 4. 测试集成功能
    await testIntegrations(token, projectId);
    
    console.log('\n✅ Phase 5 功能测试完成！');
    console.log('\n💡 提示：');
    console.log('  - 前端地址: http://localhost:5173');
    console.log('  - 后端地址: http://localhost:4300');
    console.log('  - 可以在前端界面中测试通知中心和集成管理功能');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
