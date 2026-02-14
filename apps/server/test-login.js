const http = require('http');

const testLogin = () => {
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
        
        if (res.statusCode === 201 && json.data && json.data.accessToken) {
          console.log('\n✅ 登录成功！');
          console.log(`Token: ${json.data.accessToken.substring(0, 50)}...`);
        } else {
          console.log('\n❌ 登录失败');
        }
      } catch (e) {
        console.log(data);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`请求错误: ${e.message}`);
    console.error('\n❌ 无法连接到服务器，请确保服务器正在运行在 http://localhost:4300');
  });

  req.write(postData);
  req.end();
};

console.log('正在测试登录接口...\n');
testLogin();
