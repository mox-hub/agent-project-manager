// Command Palette API - 与后端通信（如需要）
import { api } from '@/infrastructure/api-client';

/**
 * 获取用户最近使用的命令
 */
export async function fetchRecentCommands(limit = 10) {
  return api.get('/commands/recent', { limit });
}

/**
 * 获取用户可用的命令列表
 */
export async function fetchAvailableCommands(scope?: string) {
  return api.get('/commands/available', scope ? { scope } : undefined);
}

/**
 * 执行命令并记录
 */
export async function executeCommand(commandId: string, context?: Record<string, unknown>) {
  return api.post('/commands/execute', { commandId, context });
}

/**
 * 保存用户自定义命令
 */
export async function saveCustomCommand(command: Record<string, unknown>) {
  return api.post('/commands/custom', command);
}

/**
 * 删除自定义命令
 */
export async function deleteCustomCommand(commandId: string) {
  return api.delete(`/commands/custom/${commandId}`);
}

/**
 * 获取命令执行历史
 */
export async function fetchCommandHistory(limit = 50) {
  return api.get('/commands/history', { limit });
}
