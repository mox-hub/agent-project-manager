import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { DocumentStorageService, type StoredFileMeta } from './document-storage.service';

export interface SyncWarning {
  documentId: string;
  lastError: string;
  attempts: number;
  firstFailedAt: string;
  lastAttemptAt: string;
  resolvedPath?: string;
}

interface QueueItem {
  documentId: string;
  content: string;
  title: string;
  attempts: number;
  nextRunAt: number;
  timer?: NodeJS.Timeout;
}

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [2000, 5000, 10000];

@Injectable()
export class AsyncFileSyncService implements OnModuleDestroy {
  private readonly logger = new Logger(AsyncFileSyncService.name);
  private readonly queue = new Map<string, QueueItem>();
  private readonly warnings = new Map<string, SyncWarning>();

  constructor(private readonly storage: DocumentStorageService) {}

  async enqueueSave(args: { documentId: string; content: string; title: string }): Promise<void> {
    const cfg = await this.storage.getConfig();
    if (!cfg.forceFileSync) {
      return;
    }

    // Cancel any in-flight retry for the same doc; fresh content supersedes
    this.cancelPending(args.documentId);

    try {
      await this.storage.saveMarkdown(args.documentId, args.content);
      this.warnings.delete(args.documentId);
      this.queue.delete(args.documentId);
      this.logger.log(`[AsyncFileSync] Saved file for ${args.documentId}`);
      return;
    } catch (firstErr) {
      const message = this.formatError(firstErr);
      this.recordWarning(args.documentId, message, 1, cfg.basePath);
      this.logger.warn(`[AsyncFileSync] Initial save failed for ${args.documentId}: ${message}; queuing retries`);
    }

    this.scheduleRetry(args.documentId, args.content, args.title, 1, RETRY_DELAYS_MS[0]);
  }

  getWarnings(): SyncWarning[] {
    return Array.from(this.warnings.values()).map((w) => ({ ...w }));
  }

  clearWarning(documentId: string): boolean {
    this.cancelPending(documentId);
    return this.warnings.delete(documentId);
  }

  onModuleDestroy(): void {
    for (const item of this.queue.values()) {
      if (item.timer) clearTimeout(item.timer);
    }
    this.queue.clear();
  }

  private scheduleRetry(
    documentId: string,
    content: string,
    title: string,
    attempts: number,
    delayMs: number,
  ): void {
    if (attempts >= MAX_ATTEMPTS) {
      const item = this.queue.get(documentId);
      if (item) item.timer = undefined;
      this.logger.error(`[AsyncFileSync] Giving up on ${documentId} after ${attempts} attempts`);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        await this.storage.saveMarkdown(documentId, content);
        this.warnings.delete(documentId);
        this.queue.delete(documentId);
        this.logger.log(`[AsyncFileSync] Retry succeeded for ${documentId} (attempt ${attempts + 1})`);
      } catch (err) {
        const message = this.formatError(err);
        this.recordWarning(documentId, message, attempts + 1);
        this.logger.warn(
          `[AsyncFileSync] Retry ${attempts + 1} failed for ${documentId}: ${message}`,
        );
        this.scheduleRetry(
          documentId,
          content,
          title,
          attempts + 1,
          RETRY_DELAYS_MS[Math.min(attempts + 1, RETRY_DELAYS_MS.length - 1)],
        );
      }
    }, delayMs);

    this.queue.set(documentId, {
      documentId,
      content,
      title,
      attempts,
      nextRunAt: Date.now() + delayMs,
      timer,
    });
  }

  private cancelPending(documentId: string): void {
    const existing = this.queue.get(documentId);
    if (existing?.timer) {
      clearTimeout(existing.timer);
    }
    this.queue.delete(documentId);
  }

  private recordWarning(
    documentId: string,
    lastError: string,
    attempts: number,
    resolvedPath?: string,
  ): void {
    const existing = this.warnings.get(documentId);
    const now = new Date().toISOString();
    this.warnings.set(documentId, {
      documentId,
      lastError,
      attempts,
      firstFailedAt: existing?.firstFailedAt ?? now,
      lastAttemptAt: now,
      resolvedPath: resolvedPath ?? existing?.resolvedPath,
    });
  }

  private formatError(err: unknown): string {
    if (err && typeof err === 'object') {
      const anyErr = err as { message?: string; code?: string };
      const parts: string[] = [];
      if (anyErr.code) parts.push(`[${anyErr.code}]`);
      if (anyErr.message) parts.push(anyErr.message);
      if (parts.length === 0) {
        try {
          parts.push(JSON.stringify(err));
        } catch {
          parts.push(String(err));
        }
      }
      return parts.join(' ');
    }
    return String(err);
  }
}
