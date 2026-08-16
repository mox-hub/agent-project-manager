const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  await p.githubPullRequestReview.deleteMany();
  await p.remotePullRequest.deleteMany();
  await p.webhookEventLog.deleteMany();
  console.log('cleaned');
  await p.$disconnect();
})();