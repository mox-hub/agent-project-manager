# 部署指南（Deployment Guide）

本文件提供 Agent Project Manager 在不同环境下的部署方案，包括单机模式、内网服务模式与云部署。

---

## 1. 部署模式概览

### 1.1 单机模式（Standalone Desktop）

**适用场景：**
- 个人开发者使用
- 本地项目管理
- 无需团队协作

**特点：**
- Electron 应用内置 Node.js 后端
- SQLite 数据库
- 一键安装，开箱即用

### 1.2 内网服务模式（Intranet Server）

**适用场景：**
- 团队协作
- 企业内网部署
- 需要统一管理

**特点：**
- 后端部署在内网服务器
- PostgreSQL 数据库
- 支持多用户并发访问

### 1.3 云部署模式（Cloud Deployment）

**适用场景：**
- SaaS 服务
- 远程团队协作
- 需要公网访问

**特点：**
- 容器化部署（Docker/K8s）
- 高可用架构
- 自动扩缩容

---

## 2. 单机模式部署

### 2.1 构建 Electron 应用

```bash
# 构建所有应用
pnpm build

# 构建 Electron 应用（包含后端）
cd apps/desktop
pnpm build

# 使用 electron-builder 打包
pnpm dist
```

### 2.2 打包配置

**electron-builder 配置示例：**
```json
{
  "build": {
    "appId": "com.agentpm.app",
    "productName": "Agent Project Manager",
    "directories": {
      "output": "dist"
    },
    "files": [
      "dist/**/*",
      "apps/server/dist/**/*",
      "apps/server/prisma/**/*",
      "package.json"
    ],
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    },
    "mac": {
      "target": "dmg",
      "icon": "assets/icon.icns"
    },
    "linux": {
      "target": "AppImage",
      "icon": "assets/icon.png"
    }
  }
}
```

### 2.3 安装包分发

- **Windows**: `.exe` 安装包（NSIS）
- **macOS**: `.dmg` 磁盘映像
- **Linux**: `.AppImage` 或 `.deb`/`.rpm` 包

---

## 3. 内网服务模式部署

### 3.1 服务器要求

**最低配置：**
- CPU: 2 核
- 内存: 4GB
- 存储: 20GB
- 操作系统: Ubuntu 22.04 LTS / CentOS 8+

**推荐配置：**
- CPU: 4 核
- 内存: 8GB
- 存储: 50GB SSD
- 操作系统: Ubuntu 22.04 LTS

### 3.2 环境准备

```bash
# 安装 Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 pnpm
npm install -g pnpm

# 安装 PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# 创建数据库
sudo -u postgres createdb agent_pm
sudo -u postgres createuser agent_pm_user
sudo -u postgres psql -c "ALTER USER agent_pm_user WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE agent_pm TO agent_pm_user;"
```

### 3.3 应用部署

**方式一：直接部署**

```bash
# 克隆项目
git clone <repository-url>
cd agent-project-manager

# 安装依赖
pnpm install

# 构建应用
pnpm build

# 配置环境变量
cp apps/server/.env.example apps/server/.env
# 编辑 .env 文件，设置数据库连接等

# 运行数据库迁移
cd apps/server
pnpm prisma migrate deploy
pnpm prisma generate

# 启动服务（使用 PM2）
pm2 start apps/server/dist/main.js --name agent-pm-server
pm2 save
pm2 startup
```

**方式二：Docker 部署**

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .
RUN pnpm build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/prisma ./prisma
COPY --from=builder /app/apps/frontend/dist ./public
COPY --from=builder /app/package.json ./

EXPOSE 4300

CMD ["node", "dist/main.js"]
```

```bash
# 构建镜像
docker build -t agent-pm:latest .

# 运行容器
docker run -d \
  --name agent-pm \
  -p 4300:4300 \
  -e DATABASE_URL="postgresql://user:password@host:5432/agent_pm" \
  -e JWT_SECRET="your-secret" \
  agent-pm:latest
```

### 3.4 Nginx 反向代理

```nginx
# /etc/nginx/sites-available/agent-pm
server {
    listen 80;
    server_name agent-pm.example.com;

    # 前端静态文件
    location / {
        root /var/www/agent-pm/public;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /_api {
        proxy_pass http://localhost:4300;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket 代理
    location /events {
        proxy_pass http://localhost:4300;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/agent-pm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3.5 SSL/TLS 配置

```bash
# 使用 Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d agent-pm.example.com
```

---

## 4. 云部署（Docker Compose）

### 4.1 Docker Compose 配置

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: agent_pm
      POSTGRES_USER: agent_pm_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U agent_pm_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  server:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://agent_pm_user:${POSTGRES_PASSWORD}@postgres:5432/agent_pm
      JWT_SECRET: ${JWT_SECRET}
      PORT: 4300
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "4300:4300"
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - server
    restart: unless-stopped

volumes:
  postgres_data:
```

### 4.2 部署命令

```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 更新服务
docker-compose pull
docker-compose up -d
```

---

## 5. Kubernetes 部署

### 5.1 部署清单

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent-pm-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: agent-pm-server
  template:
    metadata:
      labels:
        app: agent-pm-server
    spec:
      containers:
      - name: server
        image: agent-pm:latest
        ports:
        - containerPort: 4300
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: agent-pm-secrets
              key: database-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: agent-pm-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
---
apiVersion: v1
kind: Service
metadata:
  name: agent-pm-service
spec:
  selector:
    app: agent-pm-server
  ports:
  - port: 80
    targetPort: 4300
  type: LoadBalancer
```

### 5.2 部署步骤

```bash
# 创建命名空间
kubectl create namespace agent-pm

# 创建 Secret
kubectl create secret generic agent-pm-secrets \
  --from-literal=database-url="postgresql://..." \
  --from-literal=jwt-secret="..." \
  -n agent-pm

# 部署应用
kubectl apply -f k8s/deployment.yaml -n agent-pm

# 检查状态
kubectl get pods -n agent-pm
kubectl get services -n agent-pm
```

---

## 6. 数据库迁移

### 6.1 生产环境迁移

```bash
# 进入服务器目录
cd apps/server

# 运行迁移（生产环境）
pnpm prisma migrate deploy

# 或使用 Prisma CLI
npx prisma migrate deploy
```

### 6.2 迁移回滚

```bash
# 查看迁移历史
npx prisma migrate status

# 手动回滚（需要谨慎操作）
# 1. 在数据库中删除对应的迁移记录
# 2. 手动执行回滚 SQL
```

---

## 7. 备份与恢复

### 7.1 数据库备份

**PostgreSQL 备份：**
```bash
# 创建备份
pg_dump -U agent_pm_user -d agent_pm > backup_$(date +%Y%m%d).sql

# 压缩备份
pg_dump -U agent_pm_user -d agent_pm | gzip > backup_$(date +%Y%m%d).sql.gz

# 定时备份（crontab）
0 2 * * * pg_dump -U agent_pm_user -d agent_pm | gzip > /backups/agent_pm_$(date +\%Y\%m\%d).sql.gz
```

**SQLite 备份：**
```bash
# 直接复制数据库文件
cp dev.db backup_$(date +%Y%m%d).db
```

### 7.2 数据恢复

```bash
# PostgreSQL 恢复
psql -U agent_pm_user -d agent_pm < backup_20240101.sql

# SQLite 恢复
cp backup_20240101.db dev.db
```

---

## 8. 监控与日志

### 8.1 应用监控

**使用 PM2 监控：**
```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start apps/server/dist/main.js --name agent-pm

# 监控
pm2 monit

# 查看日志
pm2 logs agent-pm

# 设置开机自启
pm2 startup
pm2 save
```

**使用 Prometheus + Grafana：**
```yaml
# 添加监控端点
# apps/server/src/main.ts
app.get('/metrics', (req, res) => {
  // 暴露 Prometheus 指标
});
```

### 8.2 日志管理

```bash
# 日志轮转（logrotate）
# /etc/logrotate.d/agent-pm
/var/log/agent-pm/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
```

---

## 9. 安全配置

### 9.1 环境变量安全

- 使用 Secret 管理工具（如 HashiCorp Vault）
- 不在代码中硬编码敏感信息
- 使用 `.env` 文件（不提交到 Git）

### 9.2 防火墙配置

```bash
# 只开放必要端口
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 9.3 数据库安全

- 使用强密码
- 限制数据库访问 IP
- 启用 SSL 连接
- 定期更新数据库版本

---

## 10. 性能优化

### 10.1 应用优化

- 启用 Gzip 压缩
- 使用 CDN 加速静态资源
- 启用 HTTP/2
- 配置缓存策略

### 10.2 数据库优化

- 创建必要的索引
- 定期执行 `VACUUM`（PostgreSQL）
- 监控慢查询
- 调整连接池大小

---

## 11. 故障排查

### 11.1 常见问题

**问题：服务无法启动**
```bash
# 检查端口占用
lsof -i :4300
netstat -tulpn | grep 4300

# 检查日志
pm2 logs agent-pm
journalctl -u agent-pm -f
```

**问题：数据库连接失败**
```bash
# 测试数据库连接
psql -U agent_pm_user -d agent_pm -h localhost

# 检查防火墙
sudo ufw status
```

**问题：内存不足**
```bash
# 检查内存使用
free -h
top

# 增加 Node.js 内存限制
NODE_OPTIONS="--max-old-space-size=4096" pm2 restart agent-pm
```

---

## 12. 更新与升级

### 12.1 应用更新

```bash
# 拉取最新代码
git pull origin main

# 安装新依赖
pnpm install

# 运行数据库迁移
cd apps/server
pnpm prisma migrate deploy

# 重新构建
pnpm build

# 重启服务
pm2 restart agent-pm
```

### 12.2 数据库升级

```bash
# 备份数据库
pg_dump -U agent_pm_user -d agent_pm > backup_before_upgrade.sql

# 运行迁移
pnpm prisma migrate deploy

# 验证数据完整性
pnpm prisma studio
```

---

## 13. 总结

本部署指南提供了：

1. ✅ **单机模式部署**：Electron 应用打包与分发
2. ✅ **内网服务模式**：服务器部署、Nginx 配置、SSL 设置
3. ✅ **云部署方案**：Docker Compose、Kubernetes
4. ✅ **数据库管理**：迁移、备份、恢复
5. ✅ **监控与日志**：PM2、Prometheus、日志轮转
6. ✅ **安全配置**：环境变量、防火墙、数据库安全
7. ✅ **性能优化**：应用优化、数据库优化
8. ✅ **故障排查**：常见问题与解决方案
9. ✅ **更新升级**：应用更新与数据库升级流程

根据实际需求选择合适的部署模式，遵循本指南确保部署的稳定性和安全性。
