/**
 * cleanup-e2e-users.mjs —— E2E/体验测试残留用户清理（P2-20）
 *
 * ⚠️  本脚本默认 DRY-RUN（只读）：不带 --execute 只打印候选清单与引用统计，
 *     绝不写库。--execute 由用户裁决后手动执行。
 *
 * 背景：共享 default 库存在 20+ 历次 E2E/体验测试残留用户（测试命名含
 * e2e-/exp-/test-/playwright 等模式），另有 GBK 脏字节乱码 displayName 账号
 * （示例 userId cmu8ms7wo00e9fycwjmteqwuw）。这些残留会污染成员列表与演示观感。
 *
 * 用法：
 *   node scripts/cleanup-e2e-users.mjs                     # dry-run（默认，只读）
 *   node scripts/cleanup-e2e-users.mjs --json              # dry-run + 机器可读输出
 *   node scripts/cleanup-e2e-users.mjs --include-weak      # 放宽为弱模式（名称任意位置含 e2e/test）
 *   node scripts/cleanup-e2e-users.mjs --newer-than=30d    # 只看近 30 天创建的账号（时间窗）
 *   node scripts/cleanup-e2e-users.mjs --older-than=90d
 *   node scripts/cleanup-e2e-users.mjs --ids=<id1>,<id2>   # 强制纳入指定 userId（仍受保护规则约束）
 *   node scripts/cleanup-e2e-users.mjs --protect=<id>,<id> # 追加保护名单
 *   node scripts/cleanup-e2e-users.mjs --execute           # 【真实删除】先写备份 JSON 再删（仅 AUTO 集）
 *
 * 候选识别（强模式，默认）：
 *   username / displayName / email / member.handle 命中：
 *     ^e2e([-_.@]|$) | ^exp([-_.]|$) | ^test([-_.@]|$) | [-_.]test\d*$ |
 *     playwright | vitest | ^auto[-_]?test | @e2e\. | @test\. | \.test$
 *   或 displayName 含乱码（C0/C1 控制字符、U+FFFD、零宽字符——与 P2-19 校验同规则）。
 * 弱模式（--include-weak）：名称任意位置含 e2e/test 即命中（误报率升高，仅供人工复核）。
 *
 * 保护规则（永不进入候选）：
 *   - RoleAssignment 含全局 admin 角色的账号
 *   - 作为 Project.ownerId 的账号
 *   - --protect= 显式追加的 id
 *
 * 引用链对账（查 schema.prisma 确定的真实关系，两轴）：
 *   User 轴业务引用（>0 → 需人工裁决，不进自动删除集）：
 *     ProjectMember / Project(ownerId) / Issue(assigneeId|reporterId) / Activity(actorId) /
 *     ActivityReaction / IssueActivity(actorId) / AuditLog(actorId) / Document(authorId) /
 *     AIConversation(createdBy) / AIWorkflowRun(createdBy) / AIUsageLog(userId) /
 *     Execution(subjectId human | createdBy) / DecisionProposal(proposerId|resolvedBy) /
 *     MemoryAtom(createdBy) / Runtime(userId) / GitCommandExecution(userId)
 *   User 轴身份附属（随账号清理，不算业务引用）：
 *     Session / AccessToken / RoleAssignment / OAuth2Account / Notification /
 *     NotificationPreference / AppConfig(userId)
 *   Member 轴业务引用（>0 → 需人工裁决）：
 *     TeamMember / TeamInvite / IssueWatcher / IssueAssignee / MemberProjectBinding /
 *     Subscription / MemberActivity / DocumentAuthor / DocumentReviewer /
 *     DocumentTaskLinkAssignee / Mention / MemberToolGrant /
 *     Execution(subjectId 非 human) / Issue(assigneeId & assigneeType=ai_agent) /
 *     DecisionProposal(proposerId & proposerType=ai_agent)
 *
 * 裁决口径：
 *   AUTO   —— 用户轴+成员轴业务引用全为 0，可自动删除（--execute 只删这一档）
 *   MANUAL —— 存在业务引用，需人工裁决（脚本只标记，不删除）
 *   PROTECTED —— 命中保护规则，完全跳过
 *
 * 备份与回滚：
 *   --execute 在删除前把将删行完整快照 + 计划操作清单写入
 *   scripts/backups/cleanup-e2e-users/cleanup-backup-<时间戳>.json（含 user/member/
 *   roleAssignment 的可回放 INSERT SQL，以及 session/token 等附属行快照）。
 *   回滚方式：
 *     1) 用 sqlite3 <db文件> 回放备份 JSON 内 rollbackSql 中的 INSERT 语句
 *        （顺序：user → member → roleAssignment）；
 *     2) 更彻底：--execute 前停服手动复制 SQLite 文件，异常时整库替换。
 *   Session/AccessToken/Notification 等附属行为登录态/通知缓存，回滚通常无需还原。
 *
 * 范围说明：仅处理 DATABASE_URL 指向的 default 库；每工作区独立库中的残留
 * 不在本脚本范围。决策卡跨项目可见性问题属 P0-3/P0-7 裁决域，本脚本不碰权限逻辑。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');
const SERVER_DIR = join(ROOT, 'apps', 'server');
const PRISMA_DIR = join(SERVER_DIR, 'prisma');
const BACKUP_DIR = join(ROOT, 'scripts', 'backups', 'cleanup-e2e-users');

// ---------- 参数 ----------
const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const kv = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : undefined;
};

const EXECUTE = has('--execute');
const INCLUDE_WEAK = has('--include-weak');
const AS_JSON = has('--json');
// --json 模式下 stdout 只输出纯 JSON，提示信息一律走 stderr
const info = (...parts) => (AS_JSON ? console.error(...parts) : console.log(...parts));
const NEWER_THAN = parseDuration(kv('newer-than'));
const OLDER_THAN = parseDuration(kv('older-than'));
const FORCE_IDS = (kv('ids') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const EXTRA_PROTECT = (kv('protect') ?? '').split(',').map((s) => s.trim()).filter(Boolean);

function parseDuration(raw) {
  if (!raw) return null;
  const m = raw.match(/^(\d+)([dhm])$/i);
  if (!m) {
    console.error(`[cleanup] 无法解析时间窗参数: ${raw}（示例：--newer-than=30d / 12h / 45m）`);
    process.exit(2);
  }
  const unitMs = { d: 86400000, h: 3600000, m: 60000 }[m[2].toLowerCase()];
  return Number(m[1]) * unitMs;
}

// ---------- DATABASE_URL 解析（与 apps/server ConfigModule 优先级一致）----------
function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  // 低优先级在前，高优先级覆盖（apps/server/.env.local > apps/server/.env）
  const files = ['.env', '.env.local'].map((f) => join(SERVER_DIR, f));
  let url;
  for (const file of files) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf-8').split(/\r?\n/)) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/);
      if (m) url = m[1].replace(/^["']|["']$/g, '');
    }
  }
  if (!url) {
    console.error('[cleanup] 未找到 DATABASE_URL（检查 apps/server/.env 或环境变量）');
    process.exit(2);
  }
  return url;
}

function resolveSqlitePath(url) {
  if (!url.startsWith('file:')) return null;
  let p = url.slice('file:'.length);
  const qIdx = p.indexOf('?');
  if (qIdx >= 0) p = p.slice(0, qIdx);
  return isAbsolute(p) ? p : resolve(PRISMA_DIR, p);
}

// ---------- 候选模式 ----------
const STRONG_PATTERNS = [
  /^e2e([-_.@]|$)/i,
  /^exp([-_.]|$)/i,
  /^test([-_.@]|$)/i,
  /[-_.]test\d*$/i,
  /playwright/i,
  /vitest/i,
  /^auto[-_]?test/i,
  /@e2e\./i,
  /@test\./i,
  /\.test$/i,
];
const WEAK_PATTERNS = [/e2e/i, /test/i];

// 与 P2-19 displayName 校验同规则：C0/C1 控制字符、U+FFFD、零宽字符
const ZERO_WIDTH_CHARS = new Set(['\u200B', '\u200C', '\u200D', '\u2060', '\uFEFF', '\u180E']);
function displayNameGarbageReason(name) {
  if (typeof name !== 'string') return null;
  for (const char of name.trim()) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) return '乱码:控制字符';
    if (code === 0xfffd) return '乱码:U+FFFD 替换符';
    if (ZERO_WIDTH_CHARS.has(char)) return '乱码:零宽字符';
  }
  return null;
}

function matchReasons(fields) {
  const reasons = [];
  const patterns = INCLUDE_WEAK ? [...STRONG_PATTERNS, ...WEAK_PATTERNS] : STRONG_PATTERNS;
  for (const value of fields) {
    if (!value) continue;
    for (const re of patterns) {
      if (re.test(value)) {
        reasons.push(`命名模式:${re}@${String(value).slice(0, 40)}`);
        break;
      }
    }
  }
  const garbage = displayNameGarbageReason(fields.find((v) => typeof v === 'string'));
  if (garbage) reasons.push(garbage);
  return reasons;
}

// ---------- 引用链（对齐 prisma/schema.prisma）----------
// User 轴身份附属：随账号清理的从属行（不计入业务引用）
const USER_IDENTITY_REFS = [
  'session', 'accessToken', 'roleAssignment', 'oAuth2Account',
  'notification', 'notificationPreference', 'appConfig',
];
// User 轴业务引用：{ model, where(userId) }；where 为函数，入参 userId
const USER_BUSINESS_REFS = [
  { model: 'projectMember', where: (id) => ({ userId: id }) },
  { model: 'project', label: 'project.ownerId', where: (id) => ({ ownerId: id }) },
  { model: 'issue', label: 'issue.assignee/reporter', where: (id) => ({ OR: [{ assigneeId: id, assigneeType: 'user' }, { reporterId: id }] }) },
  { model: 'activity', label: 'activity.actorId', where: (id) => ({ actorId: id }) },
  { model: 'activityReaction', where: (id) => ({ userId: id }) },
  { model: 'issueActivity', label: 'issueActivity.actorId', where: (id) => ({ actorId: id }) },
  { model: 'auditLog', label: 'auditLog.actorId', where: (id) => ({ actorId: id }) },
  { model: 'document', label: 'document.authorId', where: (id) => ({ authorId: id }) },
  { model: 'aIConversation', label: 'aiConversation.createdBy', where: (id) => ({ createdBy: id }) },
  { model: 'aIWorkflowRun', label: 'aiWorkflowRun.createdBy', where: (id) => ({ createdBy: id }) },
  { model: 'aIUsageLog', where: (id) => ({ userId: id }) },
  { model: 'execution', label: 'execution.subject(human)', where: (id) => ({ subjectType: 'human', subjectId: id }) },
  { model: 'execution', label: 'execution.createdBy', where: (id) => ({ createdBy: id }) },
  { model: 'decisionProposal', label: 'decisionProposal.proposer/resolver', where: (id) => ({ OR: [{ proposerId: id }, { resolvedBy: id }] }) },
  { model: 'memoryAtom', label: 'memoryAtom.createdBy', where: (id) => ({ createdBy: id }) },
  { model: 'runtime', where: (id) => ({ userId: id }) },
  { model: 'gitCommandExecution', where: (id) => ({ userId: id }) },
];
// Member 轴业务引用（memberId 为松散外键，无 Prisma relation）
const MEMBER_BUSINESS_REFS = [
  { model: 'teamMember' }, { model: 'teamInvite' }, { model: 'issueWatcher' },
  { model: 'issueAssignee' }, { model: 'memberProjectBinding' }, { model: 'subscription' },
  { model: 'memberActivity' }, { model: 'documentAuthor' }, { model: 'documentReviewer' },
  { model: 'documentTaskLinkAssignee' }, { model: 'mention' }, { model: 'memberToolGrant' },
  { model: 'execution', label: 'execution.subject(ai/external)', where: (mid) => ({ subjectType: { not: 'human' }, subjectId: mid }) },
  { model: 'issue', label: 'issue.assignee(ai_agent)', where: (mid) => ({ assigneeId: mid, assigneeType: 'ai_agent' }) },
  { model: 'decisionProposal', label: 'decisionProposal.proposer(ai_agent)', where: (mid) => ({ proposerId: mid, proposerType: 'ai_agent' }) },
];

// ---------- Prisma 接入 ----------
function loadPrisma() {
  let serverRequire;
  try {
    serverRequire = createRequire(join(SERVER_DIR, 'package.json'));
  } catch {
    console.error('[cleanup] 无法定位 apps/server/package.json');
    process.exit(2);
  }
  let PrismaClientCtor;
  try {
    ({ PrismaClient: PrismaClientCtor } = serverRequire('@prisma/client'));
  } catch {
    console.error('[cleanup] @prisma/client 未找到，请先在 apps/server 执行 pnpm prisma generate');
    process.exit(2);
  }
  return new PrismaClientCtor({
    datasources: { db: { url: loadDatabaseUrl() } },
  });
}

/** dry-run 只读自证：给所有会写库的入口装上“即炸”保险丝，误触即抛错终止 */
const ALL_DELEGATES = [
  'user', 'member', 'session', 'accessToken', 'roleAssignment', 'oAuth2Account',
  'notification', 'notificationPreference', 'appConfig', 'project', 'projectMember',
  'issue', 'activity', 'activityReaction', 'issueActivity', 'auditLog', 'document',
  'aIConversation', 'aIWorkflowRun', 'aIUsageLog', 'execution', 'decisionProposal',
  'memoryAtom', 'runtime', 'gitCommandExecution', 'teamMember', 'teamInvite',
  'issueWatcher', 'issueAssignee', 'memberProjectBinding', 'subscription',
  'memberActivity', 'documentAuthor', 'documentReviewer', 'documentTaskLinkAssignee',
  'mention', 'memberToolGrant',
];
function enforceReadOnly(prisma) {
  const MUTATIONS = ['create', 'createMany', 'createManyAndReturn', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany'];
  for (const key of ALL_DELEGATES) {
    const delegate = prisma[key];
    if (delegate && typeof delegate === 'object' && typeof delegate.findUnique === 'function') {
      for (const m of MUTATIONS) {
        delegate[m] = () => {
          throw new Error(`READ-ONLY(dry-run): prisma.${key}.${m}() 被拒绝`);
        };
      }
    }
  }
  for (const m of ['$executeRaw', '$executeRawUnsafe']) {
    if (typeof prisma[m] === 'function') {
      prisma[m] = () => {
        throw new Error(`READ-ONLY(dry-run): prisma.${m}() 被拒绝`);
      };
    }
  }
  return prisma;
}

// ---------- 主流程 ----------
async function main() {
  const dbUrl = loadDatabaseUrl();
  const dbPath = resolveSqlitePath(dbUrl);
  if (dbPath && !existsSync(dbPath)) {
    console.error(`[cleanup] SQLite 库不存在，拒绝创建连接: ${dbPath}`);
    process.exit(2);
  }

  const prisma = loadPrisma();
  if (!EXECUTE) enforceReadOnly(prisma);

  info(`[cleanup] 模式: ${EXECUTE ? 'EXECUTE（真实删除）' : 'DRY-RUN（只读）'}`);
  if (dbPath) {
    info(`[cleanup] 数据库: ${dbPath}`);
    const st = statSync(dbPath);
    info(`[cleanup] 库大小: ${(st.size / 1024 / 1024).toFixed(1)} MB`);
  }

  // 1) 拉全量用户 + 按 userId 关联 Member（Member 表无 Prisma relation，需单独查；
  //    default 库规模为个位数十，无分页压力）
  const users = await prisma.user.findMany({
    select: {
      id: true, username: true, displayName: true, email: true,
      authProvider: true, isActive: true, createdAt: true,
      roleAssignments: { select: { role: true, scopeType: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  const membersByUserId = new Map(
    (await prisma.member.findMany({
      where: { userId: { in: users.map((u) => u.id) } },
      select: { id: true, userId: true, handle: true, displayName: true, type: true, status: true },
    })).map((m) => [m.userId, m]),
  );
  for (const u of users) u.member = membersByUserId.get(u.id) ?? null;

  const protectedIds = new Set(EXTRA_PROTECT);
  // 保护：项目 owner（一次查询缓存）
  const ownerIds = new Set((await prisma.project.findMany({ select: { ownerId: true } })).map((p) => p.ownerId));

  // 2) 候选识别
  const now = Date.now();
  const candidates = [];
  for (const u of users) {
    const reasons = [];
    const isAdmin = u.roleAssignments.some((r) => r.role === 'admin');
    if (isAdmin) reasons.push('PROTECTED:admin 角色');
    if (ownerIds.has(u.id)) reasons.push('PROTECTED:项目 Owner');
    if (protectedIds.has(u.id)) reasons.push('PROTECTED:--protect 显式保护');

    const isProtected = reasons.length > 0;
    const matched = matchReasons([u.username, u.displayName, u.email, u.member?.handle]);
    const forced = FORCE_IDS.includes(u.id);
    if (isProtected) {
      if (matched.length || forced) {
        if (forced && !matched.length) reasons.push('强制纳入:--ids');
        reasons.push(...matched);
        candidates.push({ user: u, reasons, verdict: 'PROTECTED' });
      }
      continue;
    }
    if (matched.length || forced) {
      if (forced && !matched.length) reasons.push('强制纳入:--ids');
      reasons.push(...matched);
      candidates.push({ user: u, reasons, verdict: null });
    }
  }

  // 时间窗过滤
  const inWindow = (createdAt) => {
    const t = new Date(createdAt).getTime();
    if (NEWER_THAN !== null && now - t > NEWER_THAN) return false;
    if (OLDER_THAN !== null && now - t < OLDER_THAN) return false;
    return true;
  };

  // 3) 引用链对账
  const results = [];
  for (const c of candidates) {
    if (!inWindow(c.user.createdAt)) continue;
    const record = {
      userId: c.user.id,
      username: c.user.username,
      displayName: c.user.displayName,
      email: c.user.email,
      createdAt: c.user.createdAt,
      authProvider: c.user.authProvider,
      memberId: c.user.member?.id ?? null,
      memberHandle: c.user.member?.handle ?? null,
      memberType: c.user.member?.type ?? null,
      reasons: c.reasons,
      verdict: c.verdict ?? 'PENDING',
      userIdentityRefs: {},
      userBusinessRefs: {},
      memberBusinessRefs: {},
    };
    if (c.verdict === 'PROTECTED') {
      results.push(record);
      continue;
    }

    for (const ref of USER_IDENTITY_REFS) {
      record.userIdentityRefs[ref] = await prisma[ref].count({ where: { userId: c.user.id } });
    }
    let businessTotal = 0;
    for (const ref of USER_BUSINESS_REFS) {
      const n = await prisma[ref.model].count({ where: ref.where(c.user.id) });
      record.userBusinessRefs[ref.label ?? ref.model] = n;
      businessTotal += n;
    }
    if (c.user.member) {
      for (const ref of MEMBER_BUSINESS_REFS) {
        const where = ref.where ? ref.where(c.user.member.id) : { memberId: c.user.member.id };
        const n = await prisma[ref.model].count({ where });
        record.memberBusinessRefs[ref.label ?? ref.model] = n;
        businessTotal += n;
      }
    }
    record.verdict = businessTotal === 0 ? 'AUTO' : 'MANUAL';
    results.push(record);
  }

  const autoSet = results.filter((r) => r.verdict === 'AUTO');
  const manualSet = results.filter((r) => r.verdict === 'MANUAL');
  const protectedSet = results.filter((r) => r.verdict === 'PROTECTED');

  // 4) 输出
  if (AS_JSON) {
    console.log(JSON.stringify({ mode: EXECUTE ? 'execute' : 'dry-run', database: dbPath, results }, null, 2));
  } else {
    printReport(results, { autoSet, manualSet, protectedSet });
  }

  if (!EXECUTE) {
    await prisma.$disconnect();
    info(`\n[cleanup] dry-run 结束，未写入任何数据。确认后由用户裁决执行：node scripts/cleanup-e2e-users.mjs --execute`);
    return;
  }

  // 5) execute：备份 → 删除（仅 AUTO 集）
  if (autoSet.length === 0) {
    console.log('\n[cleanup] AUTO 集为空，无操作。');
    await prisma.$disconnect();
    return;
  }

  mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = join(BACKUP_DIR, `cleanup-backup-${stamp}.json`);
  const backup = { createdAt: new Date().toISOString(), database: dbPath, users: [] };
  const rollbackSql = [];

  for (const r of autoSet) {
    const snap = {
      user: await prisma.user.findUnique({ where: { id: r.userId } }),
      member: r.memberId ? await prisma.member.findUnique({ where: { id: r.memberId } }) : null,
      roleAssignments: await prisma.roleAssignment.findMany({ where: { userId: r.userId } }),
      sessions: await prisma.session.findMany({ where: { userId: r.userId } }),
      accessTokens: await prisma.accessToken.findMany({ where: { userId: r.userId } }),
      oAuth2Accounts: await prisma.oAuth2Account.findMany({ where: { userId: r.userId } }),
      notifications: await prisma.notification.findMany({ where: { userId: r.userId } }),
      notificationPreferences: await prisma.notificationPreference.findMany({ where: { userId: r.userId } }),
      appConfigs: await prisma.appConfig.findMany({ where: { userId: r.userId } }),
    };
    backup.users.push(snap);
    if (snap.user) rollbackSql.push(toInsertSql('User', snap.user));
    if (snap.member) rollbackSql.push(toInsertSql('Member', snap.member));
    for (const ra of snap.roleAssignments) rollbackSql.push(toInsertSql('RoleAssignment', ra));
  }
  backup.rollbackSql = rollbackSql;
  backup.rollbackHint = '用 sqlite3 回放 rollbackSql（顺序 user → member → roleAssignment）；session/token/通知为登录态与缓存，通常无需还原。';
  writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf-8');
  info(`[cleanup] 备份已写入: ${backupPath}`);

  let deleted = { users: 0, members: 0, identityRows: 0 };
  for (const r of autoSet) {
    for (const model of USER_IDENTITY_REFS) {
      const res = await prisma[model].deleteMany({ where: { userId: r.userId } });
      deleted.identityRows += res.count;
    }
    if (r.memberId) {
      await prisma.member.delete({ where: { id: r.memberId } });
      deleted.members += 1;
    }
    await prisma.user.delete({ where: { id: r.userId } });
    deleted.users += 1;
    info(`[cleanup] 已删除 user=${r.userId} (${r.username} / ${r.displayName})`);
  }
  info(`[cleanup] 完成: users=${deleted.users}, members=${deleted.members}, identityRows=${deleted.identityRows}`);
  info(`[cleanup] 回滚: 见 ${backupPath}（rollbackSql 字段）`);
  await prisma.$disconnect();
}

function printReport(results, { autoSet, manualSet, protectedSet }) {
  console.log(`\n=== 候选清单（共 ${results.length}：AUTO ${autoSet.length} / MANUAL ${manualSet.length} / PROTECTED ${protectedSet.length}）===\n`);
  for (const r of results) {
    console.log(
      `[${r.verdict.padEnd(9)}] ${r.userId}  ${r.username}  "${r.displayName}"  ${r.email ?? '-'}  ${new Date(r.createdAt).toISOString().slice(0, 10)}` +
      (r.memberHandle ? `  member=${r.memberHandle}(${r.memberType})` : '') +
      `\n            原因: ${r.reasons.join(' | ')}`
    );
    if (r.verdict === 'MANUAL') {
      const biz = { ...r.userBusinessRefs, ...r.memberBusinessRefs };
      const refs = Object.entries(biz).filter(([, n]) => n > 0);
      console.log(`            业务引用: ${refs.map(([k, n]) => `${k}=${n}`).join(', ')}`);
    }
  }
  console.log(`\n结论: AUTO 集 ${autoSet.length} 个可自动删除；MANUAL 集 ${manualSet.length} 个需人工裁决；PROTECTED ${protectedSet.length} 个已跳过。`);
}

// 备份行 → SQLite INSERT（rollbackSql 用）
function toInsertSql(table, row) {
  const cols = Object.keys(row);
  const vals = cols.map((c) => {
    const v = row[c];
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'boolean') return v ? '1' : '0';
    if (v instanceof Date) return `'${v.toISOString()}'`;
    if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
    return `'${String(v).replace(/'/g, "''")}'`;
  });
  return `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${vals.join(', ')});`;
}

main().catch((err) => {
  console.error('[cleanup] 执行失败:', err?.message ?? err);
  process.exitCode = 1;
});
