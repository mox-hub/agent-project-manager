/**
 * 备份恢复 e2e 的环境隔离（GAP-T-52）。
 *
 * 必须作为 spec 的第一个 import（ESM 按序求值，先于 ws-app 与 AppModule 执行）：
 * DATABASE_URL / WORKSPACE_REGISTRY_PATH / WORKSPACE_TEMPLATE_PATH /
 * WORKSPACE_BACKUP_DIR 全部落到一次性临时目录，
 * 严禁触碰真实 dev.db、根 workspaces.json 与 .apm-backups。
 * 默认库用模板库副本，保证 admin 账号与种子数据可用。
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export const BACKUP_TMP_ROOT = fs.mkdtempSync(
  path.join(os.tmpdir(), 'apm-backup-e2e-'),
);
export const BACKUP_E2E_DB = path.join(BACKUP_TMP_ROOT, 'dev.db');
export const BACKUP_E2E_DIR = path.join(BACKUP_TMP_ROOT, '.apm-backups');

fs.copyFileSync(
  path.resolve(__dirname, '..', '..', 'prisma', 'template.db'),
  BACKUP_E2E_DB,
);
process.env.DATABASE_URL = 'file:' + BACKUP_E2E_DB.replace(/\\/g, '/');
process.env.WORKSPACE_REGISTRY_PATH = path.join(
  BACKUP_TMP_ROOT,
  'workspaces.json',
);
process.env.WORKSPACE_TEMPLATE_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'prisma',
  'template.db',
);
process.env.WORKSPACE_BACKUP_DIR = BACKUP_E2E_DIR;
