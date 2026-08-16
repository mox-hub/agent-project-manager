/**
 * 测试 GitHub pull_request_review webhook → GithubPullRequestReview 落库 + TrustService.applyPrOutcome 触发
 */
const crypto = require('node:crypto');
const { PrismaClient } = require('@prisma/client');

const BASE = 'http://localhost:4300';
const prisma = new PrismaClient();

async function login() {
  const formBody = 'username=admin&password=password123';
  const resp = await fetch(`${BASE}/_api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody,
  });
  const json = await resp.json();
  if (!json.data?.accessToken) throw new Error('login failed: ' + JSON.stringify(json));
  return json.data.accessToken;
}

async function main() {
  console.log('--- Login ---');
  const jwt = await login();
  console.log('jwt:', jwt.slice(0, 16) + '...');

  console.log('\n--- Find github integration ---');
  const cfg = await prisma.integrationConfig.findFirst({ where: { provider: 'github' } });
  if (!cfg) throw new Error('no github integration');
  console.log('integrationId:', cfg.id);

  // decrypt webhook secret
  let webhookSecret = '';
  const ENC_KEY_B64 = process.env.APM_ENCRYPTION_KEY || '';
  if (ENC_KEY_B64) {
    try {
      const ENC_KEY = Buffer.from(ENC_KEY_B64, 'base64');
      if (ENC_KEY.length === 32) {
        const parsed = JSON.parse(cfg.configJson);
        if (parsed.iv && parsed.tag && parsed.encrypted) {
          const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, Buffer.from(parsed.iv, 'base64'));
          decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));
          let decrypted = decipher.update(parsed.encrypted, 'base64', 'utf8');
          decrypted += decipher.final('utf8');
          const inner = JSON.parse(decrypted);
          webhookSecret = inner.webhookSecret || '';
          console.log('decrypted webhookSecret prefix:', webhookSecret.slice(0, 6));
        }
      }
    } catch (e) {
      console.warn('decrypt failed (maybe plain JSON?):', e.message);
    }
  }
  if (!webhookSecret) {
    console.log('No decrypted secret; webhook signature will not match. Continuing anyway for event log testing.');
  }

  console.log('\n--- Trigger pull_request_review webhook ---');
  const prPayload = {
    action: 'submitted',
    review: {
      id: 999001,
      state: 'CHANGES_REQUESTED',
      user: { login: 'alice-reviewer', id: 7 },
      body: 'Please address the feedback',
      submitted_at: new Date().toISOString(),
    },
    pull_request: {
      id: 188001,
      number: 2,
      title: 'APM Stage2 Review Test',
      state: 'open',
      user: { login: 'test-agent', id: 5 },
      html_url: 'https://github.com/test-org/apm/pull/2',
      head: { ref: 'feat/review-test', sha: 'newsha2' },
      base: { ref: 'main', sha: 'basesha2' },
    },
    repository: { full_name: 'test-org/apm' },
    installation: { id: 123 },
  };

  const rawBody = JSON.stringify(prPayload);
  const sig = webhookSecret
    ? 'sha256=' + crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex')
    : 'sha256=invalid';

  const resp = await fetch(`${BASE}/_api/integrations/github/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-github-event': 'pull_request_review',
      'x-github-delivery': 'review-test-' + Date.now(),
      'x-hub-signature-256': sig,
    },
    body: rawBody,
  });
  console.log('webhook status:', resp.status);
  const reviewJson = await resp.json();
  console.log('webhook body:', JSON.stringify(reviewJson));

  await new Promise((r) => setTimeout(r, 1500));

  console.log('\n--- DB state ---');
  const prs = await prisma.remotePullRequest.findMany({ orderBy: { updatedAt: 'desc' } });
  console.log('PullRequests in DB:', prs.length);
  prs.forEach((p) => {
    console.log(`  - #${p.number} [${p.title}] state=${p.state} repo=${p.repoFullName}`);
  });
  const reviews = await prisma.githubPullRequestReview.findMany();
  console.log('PR reviews in DB:', reviews.length);
  reviews.forEach((r) => {
    console.log(`  - review #${r.externalReviewId} state=${r.state} reviewer=${r.reviewerLogin}`);
  });

  // trigger another review with APPROVED to test merged_with_comments delta
  console.log('\n--- Second webhook (approved) ---');
  const ap = JSON.parse(JSON.stringify(prPayload));
  ap.action = 'submitted';
  ap.review = {
    id: 999002,
    state: 'APPROVED',
    user: { login: 'bob-reviewer', id: 8 },
    body: 'LGTM',
    submitted_at: new Date().toISOString(),
  };
  ap.pull_request.number = 3;
  ap.pull_request.id = 188002;
  ap.pull_request.title = 'APM Stage2 Approved';
  ap.pull_request.html_url = 'https://github.com/test-org/apm/pull/3';
  const rawBody2 = JSON.stringify(ap);
  const sig2 = 'sha256=' + crypto.createHmac('sha256', webhookSecret || 'noop').update(rawBody2).digest('hex');
  const r2 = await fetch(`${BASE}/_api/integrations/github/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-github-event': 'pull_request_review',
      'x-github-delivery': 'review-test-approved-' + Date.now(),
      'x-hub-signature-256': sig2,
    },
    body: rawBody2,
  });
  console.log('approved webhook status:', r2.status);
  await new Promise((r) => setTimeout(r, 1500));
  const reviews2 = await prisma.githubPullRequestReview.findMany();
  console.log('PR reviews in DB after 2nd:', reviews2.length);

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});