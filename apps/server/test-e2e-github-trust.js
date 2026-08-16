/**
 * 完整绑定版 E2E：
 * - 绑定 PR 到真实 project + agent
 * - 触发 PR 状态变更 webhook → TrustService.applyPrOutcome
 * - 验证 trust profile 更新
 */
const crypto = require('node:crypto');
const { PrismaClient } = require('@prisma/client');

const BASE = 'http://localhost:4300';
const prisma = new PrismaClient();

async function login() {
  const resp = await fetch(`${BASE}/_api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'username=admin&password=password123',
  });
  const json = await resp.json();
  if (!json.data?.accessToken) throw new Error('login failed: ' + JSON.stringify(json));
  return json.data.accessToken;
}

async function decryptSecret(cfg) {
  try {
    const obj = typeof cfg.configJson === 'string'
      ? JSON.parse(cfg.configJson)
      : cfg.configJson;
    return obj.webhookSecret || 'fallback';
  } catch {
    return 'fallback';
  }
}

async function sendWebhook(event, payload, secret) {
  const raw = JSON.stringify(payload);
  const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const resp = await fetch(`${BASE}/_api/integrations/github/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-github-event': event,
      'x-github-delivery': `${event}-${Date.now()}`,
      'x-hub-signature-256': sig,
    },
    body: raw,
  });
  return { status: resp.status, body: await resp.json() };
}

async function main() {
  console.log('--- Login ---');
  await login();
  console.log('OK');

  // 1. 取一个真实 project + agent binding
  const project = await prisma.project.findFirst();
  const binding = await prisma.agentIdentityBinding.findFirst();
  if (!project || !binding) {
    throw new Error('No project or agent identity binding in DB');
  }
  const agentId = binding.subjectId;
  const projectId = project.id;
  console.log('using projectId=', projectId, 'agentId=', agentId);

  // 2. 取 github integration
  const cfg = await prisma.integrationConfig.findFirst({ where: { provider: 'github' } });
  if (!cfg) throw new Error('no github integration');
  const secret = await decryptSecret(cfg);
  console.log('integrationId:', cfg.id);

  // 3. 清掉之前的 trust profile 以便观察 delta
  await prisma.appConfig.deleteMany({ where: { scope: 'trust.profile' } });
  console.log('cleaned old trust profiles');

  // 4. PR A: opened → merged (merged → +8)
  console.log('\n--- PR A: opened ---');
  const prA = {
    action: 'opened',
    number: 1100,
    pull_request: {
      id: 400100,
      number: 1100,
      title: 'APM Stage2 E2E Trust - PR A',
      state: 'open',
      html_url: 'https://github.com/test-org/apm/pull/1100',
      head: { ref: 'feat/pr-a-trust', sha: 'shaA1t' },
      base: { ref: 'main', sha: 'shaBaseA' },
      user: { login: 'agentA', id: 1 },
    },
    repository: { full_name: 'test-org/apm' },
  };
  const r1 = await sendWebhook('pull_request', prA, secret);
  console.log('opened:', r1.status);

  // 5. 把 PR 绑定到 agent + project
  await prisma.remotePullRequest.updateMany({
    where: { provider: 'github', externalId: '400100' },
    data: { agentId, projectId },
  });
  console.log('PR A bound to agent+project');

  // 6. PR A merged
  console.log('\n--- PR A: merged ---');
  const prAMerged = JSON.parse(JSON.stringify(prA));
  prAMerged.action = 'closed';
  prAMerged.pull_request.state = 'closed';
  prAMerged.pull_request.merged = true;
  prAMerged.pull_request.merged_at = new Date().toISOString();
  const r2 = await sendWebhook('pull_request', prAMerged, secret);
  console.log('merged:', r2.status);

  await new Promise((r) => setTimeout(r, 2000));

  // 7. PR B: opened + review CHANGES_REQUESTED
  console.log('\n--- PR B: opened ---');
  const prB = {
    action: 'opened',
    number: 1200,
    pull_request: {
      id: 400200,
      number: 1200,
      title: 'APM Stage2 E2E Trust - PR B',
      state: 'open',
      html_url: 'https://github.com/test-org/apm/pull/1200',
      head: { ref: 'feat/pr-b-trust', sha: 'shaB1t' },
      base: { ref: 'main', sha: 'shaBaseB' },
      user: { login: 'agentB', id: 2 },
    },
    repository: { full_name: 'test-org/apm' },
  };
  const r3 = await sendWebhook('pull_request', prB, secret);
  console.log('opened PR B:', r3.status);

  await prisma.remotePullRequest.updateMany({
    where: { provider: 'github', externalId: '400200' },
    data: { agentId, projectId },
  });

  console.log('\n--- PR B: review CHANGES_REQUESTED ---');
  const revB = {
    action: 'submitted',
    review: {
      id: 700200,
      state: 'CHANGES_REQUESTED',
      user: { login: 'alice-reviewer', id: 11 },
      body: 'Please address the feedback',
      submitted_at: new Date().toISOString(),
    },
    pull_request: {
      id: 400200,
      number: 1200,
      title: 'APM Stage2 E2E Trust - PR B',
      state: 'open',
      html_url: 'https://github.com/test-org/apm/pull/1200',
      head: { ref: 'feat/pr-b-trust', sha: 'shaB1t' },
      base: { ref: 'main', sha: 'shaBaseB' },
      user: { login: 'agentB', id: 2 },
    },
    repository: { full_name: 'test-org/apm' },
  };
  const r4 = await sendWebhook('pull_request_review', revB, secret);
  console.log('review PR B:', r4.status);

  await new Promise((r) => setTimeout(r, 2000));

  // 8. read trust profile
  const profiles = await prisma.appConfig.findMany({
    where: { scope: 'trust.profile', key: `trust.profile.${agentId}` },
  });
  console.log('\n--- Trust profile for', agentId, '---');
  if (profiles.length === 0) {
    console.log('NO TRUST PROFILE FOUND - applyPrOutcome probably skipped due to no-binding');
  } else {
    profiles.forEach((p) => {
      const v = p.value;
      console.log(`  scope=${p.scope} projectId=${p.projectId}`);
      console.log(`  trustScore=${v.trustScore} trustLevel=${v.trustLevel}`);
      console.log(`  averageScores=${JSON.stringify(v.averageScores)}`);
      console.log(`  recentEvaluations (top 3):`);
      (v.recentEvaluations || []).slice(0, 3).forEach((e) => {
        console.log(`    ${JSON.stringify(e)}`);
      });
    });
  }

  // 9. read PR reviews
  const reviews = await prisma.githubPullRequestReview.findMany({ orderBy: { submittedAt: 'asc' } });
  console.log('\nPR reviews in DB:', reviews.length);
  reviews.forEach((r) => {
    console.log(`  - state=${r.state} reviewer=${r.reviewerLogin} pr=${r.pullRequestId.slice(-6)}`);
  });

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});