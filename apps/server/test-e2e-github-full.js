/**
 * 完整 GitHub 集成 E2E：PR lifecycle + reviews
 * 1. login
 * 2. PR 1: pull_request (open) → 落库 → merged via second event → 状态合并 → applyPrOutcome (merged=+8)
 * 3. PR 2: pull_request (open) → pull_request_review (CHANGES_REQUESTED) → 落库 review → applyPrOutcome (changes_requested=-4)
 * 4. PR 3: pull_request (open) → pull_request_review (APPROVED) → 落库 review
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
  const ENC_KEY_B64 = process.env.APM_ENCRYPTION_KEY || '';
  if (!ENC_KEY_B64) return 'fallback';
  try {
    const ENC_KEY = Buffer.from(ENC_KEY_B64, 'base64');
    if (ENC_KEY.length !== 32) return 'fallback';
    const parsed = JSON.parse(cfg.configJson);
    if (parsed.iv && parsed.tag && parsed.encrypted) {
      const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, Buffer.from(parsed.iv, 'base64'));
      decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));
      let decrypted = decipher.update(parsed.encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      const inner = JSON.parse(decrypted);
      return inner.webhookSecret || 'fallback';
    }
  } catch {}
  // plain JSON
  try {
    const obj = JSON.parse(cfg.configJson);
    return obj.webhookSecret || 'fallback';
  } catch {}
  return 'fallback';
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

  console.log('\n--- Find github integration ---');
  const cfg = await prisma.integrationConfig.findFirst({ where: { provider: 'github' } });
  if (!cfg) throw new Error('no github integration');
  console.log('integrationId:', cfg.id);
  const secret = await decryptSecret(cfg);
  console.log('webhookSecret length:', secret.length, 'prefix:', secret.slice(0, 6));

  // === PR A: opened → merged (merged=+8) ===
  console.log('\n--- PR A: opened ---');
  const prA = {
    action: 'opened',
    number: 100,
    pull_request: {
      id: 300100,
      number: 100,
      title: 'APM Stage2 E2E - PR A',
      state: 'open',
      html_url: 'https://github.com/test-org/apm/pull/100',
      head: { ref: 'feat/pr-a', sha: 'shaA1' },
      base: { ref: 'main', sha: 'shaBaseA' },
      user: { login: 'agentA', id: 1 },
    },
    repository: { full_name: 'test-org/apm' },
  };
  const r1 = await sendWebhook('pull_request', prA, secret);
  console.log('opened:', r1.status, JSON.stringify(r1.body));

  console.log('\n--- PR A: merged ---');
  const prAMerged = JSON.parse(JSON.stringify(prA));
  prAMerged.action = 'closed';
  prAMerged.pull_request.state = 'closed';
  prAMerged.pull_request.merged = true;
  prAMerged.pull_request.merged_at = new Date().toISOString();
  const r2 = await sendWebhook('pull_request', prAMerged, secret);
  console.log('merged:', r2.status, JSON.stringify(r2.body));

  // === PR B: opened → review CHANGES_REQUESTED ===
  console.log('\n--- PR B: opened ---');
  const prB = {
    action: 'opened',
    number: 200,
    pull_request: {
      id: 300200,
      number: 200,
      title: 'APM Stage2 E2E - PR B',
      state: 'open',
      html_url: 'https://github.com/test-org/apm/pull/200',
      head: { ref: 'feat/pr-b', sha: 'shaB1' },
      base: { ref: 'main', sha: 'shaBaseB' },
      user: { login: 'agentB', id: 2 },
    },
    repository: { full_name: 'test-org/apm' },
  };
  const r3 = await sendWebhook('pull_request', prB, secret);
  console.log('opened PR B:', r3.status, JSON.stringify(r3.body));

  console.log('\n--- PR B: review CHANGES_REQUESTED ---');
  const revB = {
    action: 'submitted',
    review: {
      id: 500200,
      state: 'CHANGES_REQUESTED',
      user: { login: 'alice-reviewer', id: 11 },
      body: 'Please address the feedback',
      submitted_at: new Date().toISOString(),
    },
    pull_request: {
      id: 300200,
      number: 200,
      title: 'APM Stage2 E2E - PR B',
      state: 'open',
      html_url: 'https://github.com/test-org/apm/pull/200',
      head: { ref: 'feat/pr-b', sha: 'shaB1' },
      base: { ref: 'main', sha: 'shaBaseB' },
      user: { login: 'agentB', id: 2 },
    },
    repository: { full_name: 'test-org/apm' },
  };
  const r4 = await sendWebhook('pull_request_review', revB, secret);
  console.log('review PR B:', r4.status, JSON.stringify(r4.body));

  // === PR C: opened → review APPROVED ===
  console.log('\n--- PR C: opened ---');
  const prC = {
    action: 'opened',
    number: 300,
    pull_request: {
      id: 300300,
      number: 300,
      title: 'APM Stage2 E2E - PR C',
      state: 'open',
      html_url: 'https://github.com/test-org/apm/pull/300',
      head: { ref: 'feat/pr-c', sha: 'shaC1' },
      base: { ref: 'main', sha: 'shaBaseC' },
      user: { login: 'agentC', id: 3 },
    },
    repository: { full_name: 'test-org/apm' },
  };
  const r5 = await sendWebhook('pull_request', prC, secret);
  console.log('opened PR C:', r5.status, JSON.stringify(r5.body));

  console.log('\n--- PR C: review APPROVED ---');
  const revC = JSON.parse(JSON.stringify(revB));
  revC.review = {
    id: 500300,
    state: 'APPROVED',
    user: { login: 'bob-reviewer', id: 12 },
    body: 'LGTM',
    submitted_at: new Date().toISOString(),
  };
  revC.pull_request.number = 300;
  revC.pull_request.id = 300300;
  revC.pull_request.title = 'APM Stage2 E2E - PR C';
  revC.pull_request.html_url = 'https://github.com/test-org/apm/pull/300';
  const r6 = await sendWebhook('pull_request_review', revC, secret);
  console.log('review PR C:', r6.status, JSON.stringify(r6.body));

  await new Promise((r) => setTimeout(r, 2000));

  console.log('\n--- DB state ---');
  const prs = await prisma.remotePullRequest.findMany({ orderBy: { number: 'asc' } });
  console.log('PullRequests:', prs.length);
  prs.forEach((p) => {
    console.log(`  #${p.number} [${p.title.slice(0, 30)}] state=${p.state} merged=${p.isMerged} repo=${p.repoFullName}`);
  });

  const reviews = await prisma.githubPullRequestReview.findMany({ orderBy: { submittedAt: 'asc' } });
  console.log('\nPR reviews:', reviews.length);
  reviews.forEach((r) => {
    console.log(`  - PR=${r.pullRequestId.slice(-6)} state=${r.state} reviewer=${r.reviewerLogin}`);
  });

  console.log('\nTrust profiles:');
  const profiles = await prisma.appConfig.findMany({ where: { scope: 'trust.profile' } });
  profiles.forEach((p) => {
    console.log(`  ${p.key} trustScore=${p.value?.trustScore} recentEval=${JSON.stringify(p.value?.recentEvaluations?.[0])}`);
  });

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});