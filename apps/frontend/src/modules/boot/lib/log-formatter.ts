import type { BootErrorEntry } from '../types';

export function formatBootLog(errors: BootErrorEntry[], extra?: { note?: string }): string {
  const headerLines = [
    `APM Boot Log — ${new Date().toISOString()}`,
    `Total errors: ${errors.length}`,
    '',
  ];

  if (extra?.note) {
    headerLines.push(`Note: ${extra.note}`);
    headerLines.push('');
  }

  const body = errors
    .map((entry) => {
      const ctx = entry.context;
      const lines = [
        `[${entry.timestamp}] [${entry.stepId}] ${entry.stepTitle}`,
        `  Message: ${entry.message}`,
      ];
      if (entry.stack) {
        lines.push(`  Stack:`);
        for (const stackLine of entry.stack.split('\n')) {
          lines.push(`    ${stackLine}`);
        }
      }
      lines.push(
        `  Context: platform=${ctx.platform} mode=${ctx.mode} url=${ctx.url} apiBaseUrl=${ctx.apiBaseUrl} tauri=${ctx.isTauri}`,
      );
      return lines.join('\n');
    })
    .join('\n\n');

  return [...headerLines, body, ''].join('\n');
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  if (navigator.clipboard && window.isSecureContext !== false) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to legacy path
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}