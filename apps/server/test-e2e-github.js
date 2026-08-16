const crypto = require('node:crypto');

async function rest(method, url, headers = {}, body = undefined) {
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body,
  });
  return { status: res.status, json: await res.json() };
}

(async () => {
  const integrationId = 'cmsnj3yw90000fy2coegupmum';

  // 1. login
  const loginBody = 'username=admin&password=password123';
  const loginRes = await fetch('http://localhost:4300/_api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: loginBody,
  });
  const loginJson = await loginRes.json();
  if (!loginJson.success) {
    console.error('login failed:', loginJson);
    return;
  }
  const token = loginJson.data.accessToken;
  console.log('login: OK');

  // 2. sync-logs
  const slRes = await rest(
    'GET',
    `http://localhost:4300/_api/integrations/github/${integrationId}/sync-logs?limit=5`,
    { Authorization: 'Bearer ' + token },
  );
  console.log('sync-logs:', slRes.status, slRes.json);

  // 3. test connection (fake token, expect GitHub returns 401, service should throw)
  const tcRes = await rest(
    'GET',
    `http://localhost:4300/_api/integrations/github/test/${integrationId}`,
    { Authorization: 'Bearer ' + token },
  );
  console.log('test-connection status:', tcRes.status);
  console.log('test-connection body:', tcRes.json);

  // 4. signed webhook simulation -- PR merged action
  const webhookSecret = 'test_webhook_secret';
  const payload = JSON.stringify({
    action: 'closed',
    number: 1,
    pull_request: {
      id: 9999,
      number: 1,
      title: '[APM Stage2 Test] Demo PR',
      state: 'closed',
      merged: true,
      merged_at: new Date().toISOString(),
      html_url: 'https://github.com/test/apm/pull/1',
      head: { ref: 'feat/test-pr', sha: 'abc123' },
      base: { ref: 'main', sha: 'def456' },
      user: { login: 'test-reviewer', id: 1 },
      updated_at: new Date().toISOString(),
    },
    repository: {
      id: 12345,
      name: 'apm',
      full_name: 'test-org/apm',
      html_url: 'https://github.com/test-org/apm',
      default_branch: 'main',
      owner: { login: 'test-org', id: 1 },
    },
    sender: { login: 'test-reviewer', id: 1 },
  });
  const sig =
    'sha256=' +
    crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');
  const whRes = await rest(
    'POST',
    'http://localhost:4300/_api/integrations/github/webhook',
    {
      'x-github-event': 'pull_request',
      'x-github-delivery': 'test-delivery-001',
      'x-hub-signature-256': sig,
    },
    payload,
  );
  console.log('webhook status:', whRes.status);
  console.log('webhook body:', whRes.json);

  // 5. Verify PR recorded in DB
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const prs = await prisma.remotePullRequest.findMany({
    where: { provider: 'github' },
  });
  console.log('PullRequests in DB:', prs.length);
  prs.forEach((p) => {
    console.log(`  - #${p.number} ${p.title} state=${p.state} repo=${p.repoFullName}`);
  });
  const reviews = await prisma.githubPullRequestReview.findMany();
  console.log('PR reviews in DB:', reviews.length);
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
