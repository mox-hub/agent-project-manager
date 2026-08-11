import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../core/database/prisma.service';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

export interface StorageConfig {
  basePath: string;
  autoSync: boolean;
  syncOnUpdate: boolean;
  fileExtension: 'md' | 'mdx';
  defaultSubfolder: string;
  forceFileSync: boolean;
}

export interface StoredFileMeta {
  documentId: string;
  fileName: string;
  fullPath: string;
  size: number;
  modifiedAt: Date;
}

const STORAGE_CONFIG_KEY = 'document.storage.config';
const STORAGE_SCOPE = 'global';

function slugify(input: string): string {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'document'
  );
}

function defaultStorageConfig(): StorageConfig {
  const homeDir = os.homedir();
  return {
    basePath: path.join(homeDir, 'agent-project-manager', 'documents'),
    autoSync: false,
    syncOnUpdate: true,
    fileExtension: 'md',
    defaultSubfolder: '',
    forceFileSync: true,
  };
}

@Injectable()
export class DocumentStorageService {
  private readonly logger = new Logger(DocumentStorageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getConfig(): Promise<StorageConfig> {
    const record = await this.prisma.appConfig.findFirst({
      where: { key: STORAGE_CONFIG_KEY, scope: STORAGE_SCOPE },
    });
    if (!record) {
      return defaultStorageConfig();
    }
    const value = (record.value ?? {}) as Partial<StorageConfig>;
    return { ...defaultStorageConfig(), ...value };
  }

  async updateConfig(updates: Partial<StorageConfig>): Promise<StorageConfig> {
    const current = await this.getConfig();
    const next: StorageConfig = { ...current, ...updates };

    if (next.basePath && !path.isAbsolute(next.basePath)) {
      throw new BadRequestException('basePath must be an absolute path');
    }

    await this.prisma.appConfig.upsert({
      where: { id: this.configRecordId() },
      create: {
        id: this.configRecordId(),
        key: STORAGE_CONFIG_KEY,
        scope: STORAGE_SCOPE,
        value: next as any,
        description: 'Document storage configuration',
      },
      update: { value: next as any, updatedAt: new Date() },
    });

    return next;
  }

  async ensureBasePath(): Promise<string> {
    const cfg = await this.getConfig();
    await fs.ensureDir(cfg.basePath);
    return cfg.basePath;
  }

  async detectDefaultPath(): Promise<string> {
    const home = os.homedir();
    const candidates = [
      path.join(home, 'Documents', 'APM-Documents'),
      path.join(home, 'APM-Documents'),
      path.join(home, 'agent-project-manager', 'documents'),
    ];
    for (const candidate of candidates) {
      try {
        if (await fs.pathExists(candidate)) {
          return candidate;
        }
      } catch {
        // ignore
      }
    }
    return defaultStorageConfig().basePath;
  }

  private configRecordId(): string {
    return `appconfig_${STORAGE_SCOPE}_${STORAGE_CONFIG_KEY}`;
  }

  private resolveFilePath(
    documentId: string,
    title: string,
    extension: string,
  ): string {
    const slug = slugify(title);
    return `${documentId}_${slug}.${extension}`;
  }

  async saveMarkdown(
    documentId: string,
    content: string,
  ): Promise<StoredFileMeta> {
    const cfg = await this.getConfig();
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!doc) {
      throw new NotFoundException(`Document not found: ${documentId}`);
    }

    await this.ensureBasePath();
    const fileName = this.resolveFilePath(
      documentId,
      doc.title,
      cfg.fileExtension,
    );
    const targetDir = cfg.defaultSubfolder
      ? path.join(cfg.basePath, cfg.defaultSubfolder)
      : cfg.basePath;
    await fs.ensureDir(targetDir);
    const fullPath = path.join(targetDir, fileName);

    await fs.writeFile(fullPath, content, 'utf8');
    const stats = await fs.stat(fullPath);

    return {
      documentId,
      fileName,
      fullPath,
      size: stats.size,
      modifiedAt: stats.mtime,
    };
  }

  async loadMarkdown(documentId: string): Promise<string> {
    const cfg = await this.getConfig();
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!doc) {
      throw new NotFoundException(`Document not found: ${documentId}`);
    }

    const fileName = this.resolveFilePath(
      documentId,
      doc.title,
      cfg.fileExtension,
    );
    const targetDir = cfg.defaultSubfolder
      ? path.join(cfg.basePath, cfg.defaultSubfolder)
      : cfg.basePath;
    const fullPath = path.join(targetDir, fileName);

    if (!(await fs.pathExists(fullPath))) {
      throw new NotFoundException(`Storage file not found: ${fullPath}`);
    }

    return fs.readFile(fullPath, 'utf8');
  }

  async deleteMarkdown(documentId: string): Promise<boolean> {
    const cfg = await this.getConfig();
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!doc) {
      return false;
    }
    const fileName = this.resolveFilePath(
      documentId,
      doc.title,
      cfg.fileExtension,
    );
    const targetDir = cfg.defaultSubfolder
      ? path.join(cfg.basePath, cfg.defaultSubfolder)
      : cfg.basePath;
    const fullPath = path.join(targetDir, fileName);

    if (await fs.pathExists(fullPath)) {
      await fs.remove(fullPath);
      return true;
    }
    return false;
  }

  async listMarkdownFiles(): Promise<StoredFileMeta[]> {
    const cfg = await this.getConfig();
    if (!(await fs.pathExists(cfg.basePath))) {
      return [];
    }
    const targetDir = cfg.defaultSubfolder
      ? path.join(cfg.basePath, cfg.defaultSubfolder)
      : cfg.basePath;
    if (!(await fs.pathExists(targetDir))) {
      return [];
    }
    const ext = cfg.fileExtension;
    const files = await fs.readdir(targetDir);
    const matched = files.filter((f) => f.endsWith(`.${ext}`));
    const metas: StoredFileMeta[] = [];
    for (const fileName of matched) {
      const fullPath = path.join(targetDir, fileName);
      try {
        const stats = await fs.stat(fullPath);
        const match = fileName.match(/^(.+)_/);
        metas.push({
          documentId: match ? match[1] : fileName,
          fileName,
          fullPath,
          size: stats.size,
          modifiedAt: stats.mtime,
        });
      } catch (err) {
        this.logger.warn(`Failed to stat file: ${fullPath} - ${err}`);
      }
    }
    return metas;
  }
}
