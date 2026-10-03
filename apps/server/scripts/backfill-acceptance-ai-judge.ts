/**
 * 存量验收卡 JEV 选项倾向补判脚本（CAP-A-27 扩展批三一次性工具）。
 *
 * 背景：judgeDecisionOptions 只在验收「进入待决队列」时 fire-and-forget 触发，
 * 存量已躺在队列里（pending/in_review）的卡不会补判。本脚本把这部分卡补完。
 *
 * 设计：**复用真实服务零复刻**——AcceptanceService.judgeDecisionOptions 按测试
 * harness 同款手工组装（judge 只依赖 prisma/quickJudge/logger），QuickJudge 通道
 * 解析、key 解密、AIUsageLog 记账、metadata 合并写回全部走生产同一路径，杜绝
 * 脚本副本与主逻辑漂移。
 *
 * 用法（cwd=apps/server，DATABASE_URL=file:./dev.db 指向 dev 库）：
 *   pnpm exec tsx scripts/backfill-acceptance-ai-judge.ts --dry-run  # 只盘点不写
 *   pnpm exec tsx scripts/backfill-acceptance-ai-judge.ts            # 补判
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ── 1. 手动加载 apps/server/.env（脚本无 Nest bootstrap，dotenv 未直装）──
const envPath = resolve(__dirname, '../.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const value = (m[2] ?? '').replace(/^"(.*)"$/, '$1');
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL 未设置（须在 apps/server/.env）');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');

// ── 2. 按测试 harness 同款组装真实服务 ──
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../src/core/logger/logger.service';
import { PrismaService } from '../src/core/database/prisma.service';
import { EncryptionService } from '../src/core/crypto/encryption.service';
import { QuickJudgeService } from '../src/modules/ai-hub/quick-judge/quick-judge.service';
import { QuickJudgeSettingsService } from '../src/modules/ai-hub/quick-judge/quick-judge-settings.service';
import { AcceptanceService } from '../src/modules/acceptance/acceptance.service';

async function main() {
  const logger = new LoggerService(new ConfigService());
  logger.setContext('backfill-ai-judge');
  const prisma = new PrismaService(logger);
  await prisma.$connect();

  const settingsService = new QuickJudgeSettingsService(prisma);
  const quickJudge = new QuickJudgeService(
    prisma,
    logger,
    new EncryptionService(),
    settingsService,
  );
  // judgeDecisionOptions 只触 prisma/quickJudge/logger，其余构造参按 spec 桩掉
  const acceptanceService = new AcceptanceService(
    prisma,
    null as never,
    null as never,
    { publish: async () => undefined } as never,
    quickJudge,
  );

  const settings = await settingsService.getSettings();
  if (!settings.enabled) {
    console.log(
      'quick-judge 通道未启用（ai.quickJudge.enabled=false）——先在设置里启用再补判',
    );
    await prisma.$disconnect();
    return;
  }
  if (settings.scenarios['decision_option'] === false) {
    console.log(
      'decision_option 场景已被用户禁用——先在「判断介入」矩阵恢复再补判',
    );
    await prisma.$disconnect();
    return;
  }

  // ── 3. 盘点：待决队列里缺 aiJudge 的验收卡 ──
  const queue = await prisma.acceptance.findMany({
    where: { status: { in: ['pending', 'in_review'] } },
    select: {
      id: true,
      status: true,
      updatedAt: true,
      metadata: true,
      issue: { select: { title: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
  const missing = queue.filter(
    (a) => !(a.metadata as Record<string, unknown> | null)?.aiJudge,
  );
  console.log(
    `待决验收卡 ${queue.length} 张，其中缺 aiJudge ${missing.length} 张${DRY_RUN ? '（dry-run 不写）' : ''}`,
  );
  for (const a of missing) {
    console.log(`  - ${a.id} [${a.status}] ${a.issue?.title ?? '(无标题)'}`);
  }
  if (DRY_RUN || missing.length === 0) {
    await prisma.$disconnect();
    return;
  }

  // ── 4. 逐卡补判（顺序执行；judge 通道自带降级，失败只记不中断）──
  let judged = 0;
  let skipped = 0;
  let failed = 0;
  for (const a of missing) {
    const label = `${a.id} [${a.status}] ${a.issue?.title ?? ''}`;
    try {
      await acceptanceService.judgeDecisionOptions(a.id);
      const fresh = await prisma.acceptance.findUnique({
        where: { id: a.id },
        select: { metadata: true },
      });
      const ai = (fresh?.metadata as Record<string, any> | null)?.aiJudge;
      if (ai?.options) {
        judged += 1;
        console.log(
          `  ✓ ${label} → ${ai.optionsChoice ?? '?'}（置信 ${ai.confidence ?? '—'}）`,
        );
      } else {
        skipped += 1;
        console.log(
          `  ○ ${label} → 通道无结果（null/答案缺 probabilities），跳过`,
        );
      }
    } catch (err) {
      failed += 1;
      console.log(
        `  ✗ ${label} → ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  console.log(
    `补判完成：成功 ${judged} / 无结果跳过 ${skipped} / 失败 ${failed}`,
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
