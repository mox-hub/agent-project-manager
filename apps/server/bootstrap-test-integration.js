const path = require('path');
process.chdir(__dirname);
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { EncryptionService } = require('./src/core/crypto/encryption.service');
const { PrismaClient } = require('@prisma/client');

(async () => {
  const enc = new EncryptionService();
  const prisma = new PrismaClient();

  let existing = await prisma.integrationConfig.findFirst({
    where: { provider: 'github' },
  });
  if (existing) {
    console.log('Deleting existing:', existing.id);
    await prisma.integrationConfig.delete({ where: { id: existing.id } });
  }

  const encrypted = enc.encryptJson({
    token: 'ghp_FAKE_TEST_TOKEN_xxxxxxxxxxxxxxxxxxx',
    webhookSecret: 'test_webhook_secret',
  });

  const ic = await prisma.integrationConfig.create({
    data: {
      provider: 'github',
      scope: 'global',
      name: 'Test GitHub E2E',
      enabled: true,
      configJson: encrypted,
      status: 'connected',
      createdBy: 'system',
    },
  });
  console.log('Created integration:', ic.id);
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
