#!/usr/bin/env node
/**
 * ordo-runtime 守护进程入口
 */
import { runRuntimeDaemon } from './lifecycle';

runRuntimeDaemon().catch((err: unknown) => {
  console.error(
    '[ordo-runtime] 启动失败：',
    err instanceof Error ? err.message : String(err),
  );
  process.exit(1);
});
