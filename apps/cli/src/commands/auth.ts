/**
 * auth：login / logout / whoami
 */
import { Command } from 'commander';
import * as readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import {
  ApmClient,
  ApmError,
  ExitCode,
  clearToken,
  getActiveProfileName,
  getBackend,
  getProfile,
  readConfig,
  writeConfig,
} from '@apm/shared';
import { buildContext, out } from '../context';

interface LoginResult {
  accessToken: string;
  session: { id: string; expiresAt: string } | null;
  user: Record<string, unknown> | null;
  subjectClaim?: unknown;
}

export function registerAuthCommands(program: Command): void {
  program
    .command('login')
    .description('登录后端并保存凭据到当前 profile')
    .option('--backend <url>', '后端地址（同时写入配置）')
    .option('--username <name>', '用户名（默认读 APM_USERNAME）')
    .option('--password <pass>', '密码（默认读 APM_PASSWORD，否则交互输入）')
    .option('--token <jwt>', '直接注入 token 而不走登录接口')
    .action(async (opts, cmd) => {
      // --backend 定义在全局（同名时 commander 归到全局），统一走 optsWithGlobals
      const root = cmd.optsWithGlobals() as {
        backend?: string;
        profile?: string;
      };
      const config = readConfig();
      const profileName = root.profile || getActiveProfileName(config);
      const profile = getProfile(config, profileName);

      const backend = getBackend(config, root.backend);
      if (!backend) {
        throw new ApmError(
          '未配置后端地址：请用 --backend <url> 或先执行 apm config set backend <url>',
          ExitCode.BACKEND_UNREACHABLE,
        );
      }
      if (root.backend) profile.backend = root.backend;

      const client = new ApmClient({
        backend,
        getToken: () => profile.accessToken,
      });

      if (opts.token) {
        profile.accessToken = opts.token;
        writeConfig(config);
        console.log(`已注入 token（${backend}，profile=${profileName}）`);
        return;
      }

      const username = opts.username || process.env.APM_USERNAME;
      if (!username) {
        throw new ApmError(
          '需要用户名：--username <name> 或环境变量 APM_USERNAME',
          ExitCode.GENERAL,
        );
      }
      let password = opts.password || process.env.APM_PASSWORD;
      if (!password) {
        const rl = readline.createInterface({ input: stdin, output: stdout });
        password = await rl.question('密码：');
        rl.close();
      }

      const result = await client.post<LoginResult>('/auth/login', {
        username,
        password,
      });
      profile.accessToken = result.accessToken;
      profile.session = result.session ?? null;
      profile.user = result.user ?? null;
      writeConfig(config);

      console.log(`登录成功：${backend}（profile=${profileName}）`);
      const who = (result.user as { username?: string; email?: string } | null);
      if (who?.username) console.log(`用户：${who.username}`);
    });

  program
    .command('logout')
    .description('注销当前会话并清除本地凭据')
    .action(async (_opts, cmd) => {
      const ctx = buildContext(cmd);
      try {
        await ctx.client.post('/auth/logout');
      } catch {
        // token 可能已失效，本地仍清理
      }
      clearToken(ctx.config, ctx.profileName);
      console.log('已退出登录');
    });

  program
    .command('whoami')
    .description('显示当前登录用户')
    .action(async (_opts, cmd) => {
      const ctx = buildContext(cmd);
      const user = await ctx.client.get('/auth/me');
      out(ctx, user);
    });
}
