const http = require('http');

const BASE_URL = 'localhost';
const PORT = 4300;
const API_PREFIX = '/_api';

// 工具函数：发送HTTP请求
const httpRequest = (method, path, options = {}) => {
  return new Promise((resolve, reject) => {
    const { body, token, query } = options;
    let fullPath = path;
    if (query) {
      const queryString = new URLSearchParams(query).toString();
      fullPath += `?${queryString}`;
    }

    const requestOptions = {
      hostname: BASE_URL,
      port: PORT,
      path: fullPath,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      requestOptions.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
      const bodyString = JSON.stringify(body);
      requestOptions.headers['Content-Length'] = Buffer.byteLength(bodyString);
      requestOptions.body = bodyString;
    }

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : null;
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: json || data,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(requestOptions.body);
    }
    req.end();
  });
};

// 登录获取Token
const login = async () => {
  console.log('\n📝 步骤 1: 登录获取Token...');
  const response = await httpRequest('POST', `${API_PREFIX}/auth/login`, {
    body: {
      username: 'admin',
      password: 'password123',
    },
  });

  if (response.statusCode === 201 && response.body.data?.accessToken) {
    const token = response.body.data.accessToken;
    console.log(`✅ 登录成功! Token: ${token.substring(0, 50)}...`);
    return token;
  } else {
    throw new Error(`登录失败: ${JSON.stringify(response.body)}`);
  }
};

// 获取当前用户信息
const getCurrentUser = async (token) => {
  console.log('\n📝 步骤 2: 获取当前用户信息...');
  const response = await httpRequest('GET', `${API_PREFIX}/auth/me`, {
    token,
  });

  if (response.statusCode === 200 && response.body.data) {
    const user = response.body.data.user || response.body.data;
    console.log(`✅ 用户信息: ${user.username} (${user.displayName})`);
    if (response.body.data.roles) {
      console.log(`   角色: ${response.body.data.roles.map(r => r.role).join(', ')}`);
    }
    return user;
  } else {
    throw new Error(`获取用户信息失败: ${JSON.stringify(response.body)}`);
  }
};

// 获取项目列表
const getProjects = async (token) => {
  console.log('\n📝 步骤 3: 获取项目列表...');
  const response = await httpRequest('GET', `${API_PREFIX}/projects`, {
    token,
  });

  if (response.statusCode === 200) {
    const projects = response.body.data || [];
    console.log(`✅ 找到 ${projects.length} 个项目`);
    projects.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.name} (${p.id})`);
    });
    return projects;
  } else {
    throw new Error(`获取项目列表失败: ${JSON.stringify(response.body)}`);
  }
};

// 创建项目
const createProject = async (token) => {
  console.log('\n📝 步骤 4: 创建测试项目...');
  const projectData = {
    name: `测试项目-${Date.now()}`,
    description: '这是一个通过API测试创建的项目',
    type: 'team',
    visibility: 'internal',
  };

  const response = await httpRequest('POST', `${API_PREFIX}/projects`, {
    token,
    body: projectData,
  });

  if (response.statusCode === 201 || response.statusCode === 200) {
    const project = response.body.data || response.body;
    console.log(`✅ 项目创建成功: ${project.name} (${project.id})`);
    return project;
  } else {
    throw new Error(`创建项目失败: ${JSON.stringify(response.body)}`);
  }
};

// 获取项目详情
const getProjectDetails = async (token, projectId) => {
  console.log('\n📝 步骤 5: 获取项目详情...');
  const response = await httpRequest('GET', `${API_PREFIX}/projects/${projectId}`, {
    token,
  });

  if (response.statusCode === 200) {
    const project = response.body.data || response.body;
    console.log(`✅ 项目详情:`);
    console.log(`   名称: ${project.name}`);
    console.log(`   描述: ${project.description || '(无)'}`);
    console.log(`   状态: ${project.status}`);
    return project;
  } else {
    throw new Error(`获取项目详情失败: ${JSON.stringify(response.body)}`);
  }
};

// 获取项目任务列表
const getProjectTasks = async (token, projectId) => {
  console.log('\n📝 步骤 6: 获取项目任务列表...');
  const response = await httpRequest('GET', `${API_PREFIX}/projects/${projectId}/tasks`, {
    token,
  });

  if (response.statusCode === 200) {
    const tasks = response.body.data || [];
    console.log(`✅ 找到 ${tasks.length} 个任务`);
    tasks.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.title} (${t.id}) - ${t.status || '未设置状态'}`);
    });
    return tasks;
  } else {
    throw new Error(`获取任务列表失败: ${JSON.stringify(response.body)}`);
  }
};

// 创建任务
const createTask = async (token, projectId) => {
  console.log('\n📝 步骤 7: 创建测试任务...');
  const taskData = {
    projectId: projectId,
    title: `测试任务-${Date.now()}`,
    description: '这是一个通过API测试创建的任务',
    type: 'task',
  };

  const response = await httpRequest('POST', `${API_PREFIX}/tasks`, {
    token,
    body: taskData,
  });

  if (response.statusCode === 201 || response.statusCode === 200) {
    const task = response.body.data || response.body;
    console.log(`✅ 任务创建成功: ${task.title} (${task.id})`);
    return task;
  } else {
    throw new Error(`创建任务失败: ${JSON.stringify(response.body)}`);
  }
};

// 主测试流程
const runTests = async () => {
  try {
    console.log('🚀 开始API完整测试流程...\n');
    console.log('='.repeat(60));

    // 1. 登录
    const token = await login();

    // 2. 获取用户信息
    const user = await getCurrentUser(token);

    // 3. 获取项目列表
    const projects = await getProjects(token);

    // 4. 创建新项目
    const newProject = await createProject(token);

    // 5. 获取项目详情
    await getProjectDetails(token, newProject.id);

    // 6. 获取项目任务
    await getProjectTasks(token, newProject.id);

    // 7. 创建任务
    const newTask = await createTask(token, newProject.id);

    console.log('\n' + '='.repeat(60));
    console.log('✅ 所有测试通过！');
    console.log(`\n测试总结:`);
    console.log(`  - 用户: ${user.username}`);
    console.log(`  - 现有项目数: ${projects.length}`);
    console.log(`  - 新建项目: ${newProject.name}`);
    console.log(`  - 新建任务: ${newTask.title}`);

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应:', JSON.stringify(error.response, null, 2));
    }
    process.exit(1);
  }
};

// 执行测试
runTests();
