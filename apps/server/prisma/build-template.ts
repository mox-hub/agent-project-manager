/**
 * 构建工作区模板库（prisma/template.db）：
 * schema 全量建表 + 最小可登录种子（admin/password123 + 全局 admin 角色）。
 * 创建工作区时复制该文件为 data/apm.db。
 *
 * 用法: pnpm build:template-db
 */
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prismaDir = __dirname;
const templatePath = path.join(prismaDir, 'template.db');

for (const suffix of ['', '-wal', '-shm']) {
  const file = templatePath + suffix;
  if (fs.existsSync(file)) fs.rmSync(file);
}

console.log('→ prisma db push（schema 全量建表）…');
execSync('pnpm exec prisma db push --skip-generate --accept-data-loss', {
  cwd: path.resolve(prismaDir, '..'),
  stdio: 'inherit',
  env: {
    ...process.env,
    DATABASE_URL: 'file:' + templatePath.replace(/\\/g, '/'),
  },
});

console.log('→ 写入最小种子（admin/password123）…');
const prisma = new PrismaClient({
  datasources: { db: { url: 'file:' + templatePath.replace(/\\/g, '/') } },
});

async function seed() {
  const passwordHash = await bcrypt.hash('password123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      displayName: '管理员',
      email: 'admin@apm.local',
      passwordHash,
      authProvider: 'local',
    },
  });
  const existingRole = await prisma.roleAssignment.findFirst({
    where: { userId: admin.id, scopeType: 'global', role: 'admin' },
  });
  if (!existingRole) {
    await prisma.roleAssignment.create({
      data: { userId: admin.id, scopeType: 'global', role: 'admin' },
    });
  }
}

seed()
  .then(async () => {
    await prisma.$disconnect();
    const size = fs.statSync(templatePath).size;
    console.log(`✓ 模板库已生成: ${templatePath} (${(size / 1024).toFixed(0)} KB)`);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
