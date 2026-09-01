/**
 * config：本地 ~/.apm/config.json 管理
 */
import { Command } from 'commander';
import { getProfile, readConfig, writeConfig } from '@apm/shared';

export function registerConfigCommands(program: Command): void {
  const config = program
    .command('config')
    .description('本地配置管理（~/.apm/config.json）');

  config
    .command('get <key>')
    .description('读取配置项（backend / workspace / profile）')
    .action((key: string) => {
      const cfg = readConfig();
      const profile = getProfile(cfg);
      if (key === 'profile') {
        console.log(cfg.currentProfile || 'default');
        return;
      }
      const value = (profile as Record<string, unknown>)[key];
      console.log(value === undefined ? '(未设置)' : String(value));
    });

  config
    .command('set <key> <value>')
    .description('写入配置项（backend / workspace / profile）')
    .action((key: string, value: string) => {
      const cfg = readConfig();
      const profile = getProfile(cfg);
      if (key === 'profile') {
        cfg.currentProfile = value;
        writeConfig(cfg);
        console.log(`已切换当前 profile：${value}`);
        return;
      }
      if (key === 'workspace') {
        profile.workspaceId = value;
        writeConfig(cfg);
        console.log(`已设置工作区：${value}`);
        return;
      }
      if (key === 'backend') {
        profile.backend = value;
        writeConfig(cfg);
        console.log(`已设置后端：${value}`);
        return;
      }
      (profile as Record<string, unknown>)[key] = value;
      writeConfig(cfg);
      console.log(`已设置 ${key}=${value}`);
    });

  config
    .command('list')
    .description('列出当前 profile 配置（隐藏 token）')
    .action(() => {
      const cfg = readConfig();
      const profile = getProfile(cfg);
      console.log(`profile: ${cfg.currentProfile || 'default'}`);
      console.log(`backend: ${profile.backend ?? '(未设置)'}`);
      console.log(`workspace: ${profile.workspaceId ?? '(未设置)'}`);
      console.log(`已登录: ${profile.accessToken ? '是' : '否'}`);
    });
}
