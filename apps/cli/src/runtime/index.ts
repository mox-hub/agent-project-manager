#!/usr/bin/env node
/**
 * apm-runtime 守护进程入口
 */
import { runRuntimeDaemon } from './lifecycle';

runRuntimeDaemon().catch((err: unknown) => {
  console.error(
    '[apm-runtime] 启动失败：',
    err instanceof Error ? err.message : String(err),
  );
  process.exit(1);
});
