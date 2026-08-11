/**
 * 把一个 PR 关联到 agent + project，触发 TrustService.applyPrOutcome
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  // 取一个 project 和 agent
  const project = await p.project.findFirst();
  const binding = await p.agentIdentityBinding.findFirst({
    include: { project: true },
  });
  const agent = binding
    ? { id: binding.subjectId, projectId: binding.projectId }
    : await p.user.findFirst().then((u) => (u ? { id: u.id } : null));
  if (!project || !agent) {
    console.error('missing project or agent');
    return;
  }
  console.log('project:', project.id, 'agent:', agent.id);

  // 取最近一个 PR
  const pr = await p.remotePullRequest.findFirst({
    where: { repoFullName: 'test-org/apm' },
    orderBy: { updatedAt: 'desc' },
  });
  if (!pr) {
    console.error('no PR found');
    return;
  }
  console.log('PR:', pr.number, 'state:', pr.state);

  await p.remotePullRequest.update({
    where: { id: pr.id },
    data: { agentId: agent.id, projectId: project.id },
  });
  console.log('PR bound to agent+project');

  // fetch trust service
  const trustMod = require('./dist/src/modules/trust/trust.module.js');
  const prismaMod = require('./dist/src/core/database/prisma.service.js');
  const busMod = require('./dist/src/core/message-bus/message-bus.service.js');
  const trustSvc = require('./dist/src/modules/trust/trust.service.js');
  console.log('trust service loaded');

  // 直接调 applyPrOutcome
  const { TrustService } = trustSvc;
  const { PrismaService } = prismaMod;
  const { MessageBusService } = busMod;
  const prisma = new PrismaService();
  const bus = new MessageBusService();
  const svc = new TrustService(prisma, bus);
  svc.onModuleInit && svc.onModuleInit();

  const result = await svc.applyPrOutcome({
    agentId: agent.id,
    projectId: project.id,
    prState: pr.state === 'merged' ? 'merged' : 'changes_requested',
    repoFullName: pr.repoFullName,
    prNumber: pr.number,
    source: 'manual',
  });
  console.log('applyPrOutcome result:', JSON.stringify(result, null, 2));

  // read trust profile
  const profile = await p.appConfig.findFirst({
    where: { scope: 'trust.profile', key: `trust.profile.${agent.id}` },
  });
  console.log('trust profile:', JSON.stringify(profile?.value, null, 2));

  await p.$disconnect();
})();