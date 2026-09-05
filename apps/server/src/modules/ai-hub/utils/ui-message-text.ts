/**
 * UIMessage JSON 持久化格式的工具函数。
 * assistant 消息 content 以序列化 UIMessage（AI SDK v7）存储，
 * metadata.format = 'ui-message' 标记；旧数据为纯文本，读取时回退。
 */

/** 判断消息行是否为 UIMessage JSON 格式 */
export function isUiMessageRow(row: { metadata?: unknown }): boolean {
  return (
    (row.metadata as Record<string, unknown> | null | undefined)?.['format'] ===
    'ui-message'
  );
}

/** 从消息行提取纯文本（UIMessage 取 text parts 拼接；纯文本原样返回） */
export function extractMessagePlainText(row: {
  content: string;
  metadata?: unknown;
}): string {
  if (!isUiMessageRow(row)) return row.content;
  try {
    const parsed = JSON.parse(row.content) as {
      parts?: Array<{ type: string; text?: string }>;
    };
    if (!Array.isArray(parsed.parts)) return '';
    return parsed.parts
      .filter((p) => p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text as string)
      .join('\n');
  } catch {
    return '';
  }
}

/** 判断 UIMessage 行是否仍在执行中（占位未终态） */
export function isUiMessageRunning(row: { metadata?: unknown }): boolean {
  return (
    (row.metadata as Record<string, unknown> | null | undefined)?.['status'] ===
    'running'
  );
}
