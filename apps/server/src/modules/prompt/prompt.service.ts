/**
 * Prompt Service（CAP-A-24）
 *
 * 提示词治理 REST 面：系统提示词只读查看 + 注入开关 + 项目级提示词。
 * 派发面（CliDispatchService）直接复用 prompt-shared 纯函数层，不经本服务。
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import type { SystemPromptDetail, SystemPromptMeta } from './prompt-templates';
import type { PromptInjectionToggles } from './prompt-shared';
import {
  getSystemPromptDetail,
  listSystemPromptMetas,
  readProjectPrompt,
  readPromptInjectionToggles,
  writeProjectPrompt,
  writePromptInjectionToggles,
} from './prompt-shared';

@Injectable()
export class PromptService {
  constructor(private readonly prisma: PrismaService) {}

  listSystemPrompts(): SystemPromptMeta[] {
    return listSystemPromptMetas();
  }

  getSystemPrompt(key: string): SystemPromptDetail {
    const detail = getSystemPromptDetail(key);
    if (!detail) {
      throw new NotFoundException(`System prompt ${key} not found`);
    }
    return detail;
  }

  async getConfig(projectId?: string): Promise<{
    toggles: PromptInjectionToggles;
    projectPrompt: string | null;
  }> {
    const toggles = await readPromptInjectionToggles(this.prisma);
    const projectPrompt = projectId
      ? await readProjectPrompt(this.prisma, projectId)
      : null;
    return { toggles, projectPrompt };
  }

  async updateConfig(partial: {
    toggles: Partial<PromptInjectionToggles>;
    projectId?: string;
    projectPrompt?: string;
  }): Promise<{
    toggles: PromptInjectionToggles;
    projectPrompt: string | null;
  }> {
    const toggles = await writePromptInjectionToggles(
      this.prisma,
      partial.toggles,
    );
    let projectPrompt: string | null = null;
    if (partial.projectId) {
      if (typeof partial.projectPrompt === 'string') {
        projectPrompt = await writeProjectPrompt(
          this.prisma,
          partial.projectId,
          partial.projectPrompt,
        );
      } else {
        projectPrompt = await readProjectPrompt(this.prisma, partial.projectId);
      }
    }
    return { toggles, projectPrompt };
  }
}
