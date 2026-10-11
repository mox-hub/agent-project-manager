/**
 * 浏览器端文件下载工具（交付出口切片 2026-10-11）。
 *
 * Blob + createObjectURL + a[download] 模式此前散落在 global-task-export-dialog
 * 与 task-import-export 两处本地实现，本次提取共享供「文档导出 Markdown /
 * 验收审计报告导出」等交付出口消费——零新依赖，导出形态统一走纯文本下载。
 * （剪贴板走既有 hooks/use-copy-to-clipboard，不在本文件重复。）
 */

export function downloadFile(filename: string, content: string, mime = 'text/markdown'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
