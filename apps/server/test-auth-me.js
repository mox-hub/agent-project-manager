const http = require('http');

// 先登录获取token
const login = () => {
  return new Promise((resolve, reject) => {
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

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode === 201 && json.data && json.data.accessToken) {
            resolve(json.data.accessToken);
          } else {
            console.error('登录响应:', JSON.stringify(json, null, 2));
            reject(new Error(`登录失败: ${res.statusCode}`));
          }
        } catch (e) {
          console.error('解析响应失败:', data);
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
};

// 测试获取当前用户信息
const testGetMe = (token) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 4300,
      path: '/_api/auth/me',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    };

    const req = http.request(options, (res) => {
      console.log(`状态码: ${res.statusCode}`);
      console.log(`响应头: ${JSON.stringify(res.headers, null, 2)}`);

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log('\n响应体:');
        try {
          const json = JSON.parse(data);
          console.log(JSON.stringify(json, null, 2));
          
          if (res.statusCode === 200 && json.data) {
            console.log('\n✅ 获取用户信息成功！');
            const user = json.data.user || json.data;
            console.log(`用户: ${user.username} (${user.displayName})`);
            if (json.data.roles && json.data.roles.length > 0) {
              console.log(`角色: ${json.data.roles.map(r => r.role).join(', ')}`);
            }
          } else {
            console.log('\n❌ 获取用户信息失败');
          }
          resolve();
        } catch (e) {
          console.log(data);
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`请求错误: ${e.message}`);
      console.error('\n❌ 无法连接到服务器，请确保服务器正在运行在 http://localhost:4300');
      reject(e);
    });

    req.end();
  });
};

// 执行测试
(async () => {
  try {
    console.log('正在测试认证流程...\n');
    console.log('1. 登录获取Token...');
    const token = await login();
    console.log(`✅ Token获取成功: ${token.substring(0, 50)}...\n`);
    
    console.log('2. 使用Token获取当前用户信息...');
    await testGetMe(token);
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
})();
