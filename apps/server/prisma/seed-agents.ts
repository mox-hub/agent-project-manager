/**
 * Seed 一组 AI 员工（Member）并绑到 sample-project-1，
 * 同时为它们建立 AgentIdentityBinding + 占位 Runtime。
 *
 * 用法: npx tsx prisma/seed-agents.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_PROJECT_ID = 'sample-project-1';

interface AiWorkerSeed {
  handle: string;
  displayName: string;
  type: 'ai_agent';
  defaultCliProviderId: string;
  defaultExecutionRole: string;
  metadata: Record<string, unknown>;
}

const AI_WORKERS: AiWorkerSeed[] = [
  {
    handle: 'claude-coder',
    displayName: 'Claude Coder',
    type: 'ai_agent',
    defaultCliProviderId: 'claude-code',
    defaultExecutionRole: 'coder',
    metadata: {
      model: 'claude-sonnet-4-20250514',
      description: '负责按需求实现代码改动，能读写仓库、执行命令',
    },
  },
  {
    handle: 'claude-reviewer',
    displayName: 'Claude Reviewer',
    type: 'ai_agent',
    defaultCliProviderId: 'claude-code',
    defaultExecutionRole: 'reviewer',
    metadata: {
      model: 'claude-sonnet-4-20250514',
      description: '负责读 diff / 跑检查 / 给出评审意见',
    },
  },
  {
    handle: 'claude-qa',
    displayName: 'Claude QA',
    type: 'ai_agent',
    defaultCliProviderId: 'claude-code',
    defaultExecutionRole: 'qa',
    metadata: {
      model: 'claude-sonnet-4-20250514',
      description: '负责设计并执行测试用例，验证修复',
    },
  },
];

async function ensureAdminUserId(): Promise<string> {
  const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!admin) throw new Error('Admin user not found; run base seed first');
  return admin.id;
}

async function ensureRuntime(deviceId: string, displayName: string): Promise<string> {
  const adminUserId = await ensureAdminUserId();
  const existing = await prisma.runtime.findUnique({
    where: { userId_deviceId: { userId: adminUserId, deviceId } },
  });
  if (existing) {
    console.log(`  ↻ Runtime exists: ${existing.id} (${displayName})`);
    return existing.id;
  }
  const runtime = await prisma.runtime.create({
    data: {
      userId: adminUserId,
      deviceId,
      displayName,
      hostPlatform: 'win32',
      runtimeVersion: '0.1.0',
      protocolVersion: '1.0.0',
      status: 'offline',
    },
  });
  console.log(`  + Runtime created: ${runtime.id} (${displayName})`);
  return runtime.id;
}

async function ensureMember(seed: AiWorkerSeed): Promise<string> {
  const existing = await prisma.member.findUnique({ where: { handle: seed.handle } });
  if (existing) {
    console.log(`  ↻ Member exists: ${existing.id} (${seed.displayName})`);
    return existing.id;
  }
  const member = await prisma.member.create({
    data: {
      handle: seed.handle,
      displayName: seed.displayName,
      type: seed.type,
      status: 'active',
      defaultCliProviderId: seed.defaultCliProviderId,
      defaultExecutionRole: seed.defaultExecutionRole,
      metadata: seed.metadata as any,
    },
  });
  console.log(`  + Member created: ${member.id} (${seed.displayName})`);
  return member.id;
}

async function ensureProjectBinding(memberId: string): Promise<void> {
  const existing = await prisma.memberProjectBinding.findFirst({
    where: { memberId, projectId: TARGET_PROJECT_ID },
  });
  if (existing) {
    console.log(`  ↻ ProjectBinding exists: member=${memberId} project=${TARGET_PROJECT_ID}`);
    return;
  }
  await prisma.memberProjectBinding.create({
    data: { memberId, projectId: TARGET_PROJECT_ID, role: 'ai_agent' },
  });
  console.log(`  + ProjectBinding created: member=${memberId} project=${TARGET_PROJECT_ID}`);
}

async function ensureAgentIdentity(
  memberId: string,
  runtimeId: string,
  executionRole: string,
): Promise<void> {
  const existing = await prisma.agentIdentityBinding.findFirst({
    where: {
      projectId: TARGET_PROJECT_ID,
      subjectType: 'ai_member',
      subjectId: memberId,
    },
  });
  if (existing) {
    console.log(`  ↻ AgentIdentityBinding exists: subject=${memberId} provider=${runtimeId}`);
    return;
  }
  const adminUserId = await ensureAdminUserId();
  await prisma.agentIdentityBinding.create({
    data: {
      projectId: TARGET_PROJECT_ID,
      subjectType: 'ai_member',
      subjectId: memberId,
      providerId: runtimeId,
      identitySource: 'local_seed',
      mappedRole: executionRole,
      mappedLevel: 'standard',
      status: 'active',
      createdBy: adminUserId,
    },
  });
  console.log(`  + AgentIdentityBinding created: subject=${memberId} provider=${runtimeId}`);
}

async function main(): Promise<void> {
  console.log('🌱 Seeding AI workers...');

  const project = await prisma.project.findUnique({ where: { id: TARGET_PROJECT_ID } });
  if (!project) throw new Error(`Target project ${TARGET_PROJECT_ID} not found`);

  for (const seed of AI_WORKERS) {
    console.log(`\n[${seed.handle}]`);
    const memberId = await ensureMember(seed);
    await ensureProjectBinding(memberId);
    const runtimeId = await ensureRuntime(
      `seed-${seed.handle}`,
      `${seed.displayName} Runtime`,
    );
    await ensureAgentIdentity(memberId, runtimeId, seed.defaultExecutionRole);
  }

  const memberCount = await prisma.member.count({ where: { type: 'ai_agent' } });
  const bindingCount = await prisma.memberProjectBinding.count({
    where: { projectId: TARGET_PROJECT_ID },
  });
  const agentCount = await prisma.agentIdentityBinding.count({
    where: { projectId: TARGET_PROJECT_ID, status: 'active' },
  });
  console.log(`\n📊 Summary: members=${memberCount} projectBindings=${bindingCount} agentBindings=${agentCount}`);
  console.log('🎉 AI worker seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });