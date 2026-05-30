import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';

@Injectable()
export class ContextService {
  private readonly DEFAULT_TOKEN_BUDGET = 128000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
  ) {}

  async buildContextPack(projectId: string, taskId?: string) {
    const [system, project, session, runtime] = await Promise.all([
      this.buildSystemContext(projectId),
      this.buildProjectContext(projectId, taskId),
      this.buildSessionContext(projectId, taskId),
      this.buildRuntimeContext(projectId),
    ]);

    const tokens = this.calculateTokens(system, project, session, runtime);
    const sources = this.collectSources(runtime);

    return {
      id: `ctx_${Date.now()}`,
      projectId,
      taskId,
      layers: { system, project, session, runtime },
      tokens,
      sources,
      createdAt: new Date().toISOString(),
      freshness: 'realtime',
    };
  }

  async getContextRecipes(projectId: string) {
    const configs = await this.prisma.appConfig.findMany({
      where: { projectId, scope: 'context.recipe' },
    });
    if (configs.length === 0) {
      return this.getDefaultRecipes();
    }
    return configs.map((c) => c.value);
  }

  async autoCurateContext(projectId: string, taskType: string) {
    const recipes = await this.getContextRecipes(projectId);
    const typeMapping: Record<string, string> = {
      'feature': 'feature-dev',
      'bugfix': 'bug-fix',
      'refactor': 'refactor',
      'review': 'code-review',
    };
    const recipeName = typeMapping[taskType] || 'default';
    const recipe = recipes.find((r: any) => r.name === recipeName);
    return recipe || recipes[0] || this.getDefaultRecipes()[0];
  }

  async getAdjustableContext(projectId: string) {
    const sources = await this.discoverAvailableSources(projectId);
    return {
      availableSources: sources,
      currentSelections: sources.filter((s: any) => s.relevance > 0.7).map((s: any) => s.id),
      suggestions: sources.filter((s: any) => s.relevance > 0.5 && s.relevance <= 0.7).map((s: any) => s.id),
    };
  }

  calculateTokenBudget(tokens: any) {
    const total = tokens.system + tokens.project + tokens.session + tokens.runtime;
    return {
      ...tokens,
      total,
      budget: this.DEFAULT_TOKEN_BUDGET,
      remaining: this.DEFAULT_TOKEN_BUDGET - total,
    };
  }

  async scoreFileRelevance(projectId: string, taskId: string, files: string[]) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { taskTags: { include: { tag: true } } },
    });

    if (!task) return {};

    const taskKeywords = this.extractKeywords(`${task.title} ${task.description || ''}`);
    const tagNames = task.taskTags.map((tt) => tt.tag.name.toLowerCase());
    const scores: Record<string, number> = {};

    for (const file of files) {
      const fileName = file.split('/').pop()?.toLowerCase() || '';
      const filePath = file.toLowerCase();
      let score = 0;

      for (const keyword of taskKeywords) {
        if (filePath.includes(keyword)) score += 0.3;
      }
      for (const tag of tagNames) {
        if (filePath.includes(tag)) score += 0.2;
      }
      for (const keyword of taskKeywords.slice(0, 3)) {
        if (fileName.includes(keyword)) score += 0.1;
      }

      scores[file] = Math.min(1, score);
    }

    return scores;
  }

  private async buildSystemContext(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: { include: { user: true } }, aiContext: true },
    });

    if (!project) {
      return { projectName: '', projectType: '', techStack: [] as string[], teamRoles: {} as Record<string, string[]> };
    }

    const teamRoles: Record<string, string[]> = {};
    project.members.forEach((m) => {
      if (!teamRoles[m.role]) teamRoles[m.role] = [];
      teamRoles[m.role].push(m.user.username);
    });

    const techStack = ((project.aiContext as any)?.techStack) || [];
    return {
      projectName: project.name,
      projectType: project.type,
      techStack,
      teamRoles,
    };
  }

  private async buildProjectContext(projectId: string, taskId?: string) {
    const [activeTasks, milestones, recentActivity] = await Promise.all([
      this.prisma.task.findMany({
        where: { projectId },
        select: { id: true, title: true, status: true, assigneeId: true, priority: true },
        take: 20,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.milestone.findMany({
        where: { projectId },
        select: { id: true, name: true, status: true, targetDate: true },
        take: 10,
      }),
      this.prisma.taskActivity.findMany({
        where: { projectId },
        select: { type: true, timestamp: true, summary: true },
        take: 10,
        orderBy: { timestamp: 'desc' },
      }),
    ]);

    return {
      activeTasks: activeTasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        assignee: t.assigneeId,
        priority: t.priority,
      })),
      milestones: milestones.map((m) => ({
        id: m.id,
        name: m.name,
        status: m.status,
        targetDate: m.targetDate?.toISOString(),
      })),
      blockers: [] as any[],
      recentActivity: recentActivity.map((a) => ({
        type: a.type,
        timestamp: a.timestamp.toISOString(),
        summary: a.summary || '',
      })),
    };
  }

  private async buildSessionContext(projectId: string, taskId?: string) {
    if (!taskId) {
      return { conversationHistory: [] as any[], sharedContext: {}, artifacts: [] as any[] };
    }

    const conversations = await this.prisma.aIConversation.findMany({
      where: { taskId },
      include: { messages: { take: 5, orderBy: { createdAt: 'desc' as const } } },
      take: 3,
      orderBy: { updatedAt: 'desc' as const },
    });

    const artifacts = await this.prisma.executionArtifact.findMany({
      where: { executionRun: { taskId } },
      select: { id: true, artifactType: true, name: true },
      take: 10,
    });

    const conversationHistory = conversations.flatMap((c) =>
      c.messages.map((m) => ({
        id: m.id,
        role: m.role,
        preview: m.content.slice(0, 100),
        timestamp: m.createdAt.toISOString(),
      })),
    );

    return {
      conversationHistory,
      sharedContext: {},
      artifacts: artifacts.map((a) => ({ id: a.id, type: a.artifactType, name: a.name })),
    };
  }

  private async buildRuntimeContext(projectId: string) {
    const workspace = await this.prisma.projectWorkspace.findUnique({
      where: { projectId },
    });

    return {
      workspacePath: workspace?.localPath,
      currentFiles: [] as any[],
    };
  }

  private calculateTokens(system: any, project: any, session: any, runtime: any) {
    const estimate = (obj: unknown) => Math.floor(JSON.stringify(obj).length / 4);
    const tokens = {
      system: estimate(system),
      project: estimate(project),
      session: estimate(session),
      runtime: estimate(runtime),
      total: 0,
      budget: this.DEFAULT_TOKEN_BUDGET,
      remaining: 0,
    };
    tokens.total = tokens.system + tokens.project + tokens.session + tokens.runtime;
    tokens.remaining = tokens.budget - tokens.total;
    return tokens;
  }

  private collectSources(runtime: any) {
    return {
      databases: [] as any[],
      documents: [] as any[],
      files: (runtime.currentFiles || []).map((f: any) => ({
        type: 'file',
        id: f.path,
        name: f.path.split('/').pop(),
        relevance: f.relevance || 0,
      })),
      apis: [] as any[],
    };
  }

  private async discoverAvailableSources(projectId: string) {
    const sources: any[] = [];

    const tasks = await this.prisma.task.findMany({
      where: { projectId },
      select: { id: true, title: true, updatedAt: true },
      take: 50,
    });
    sources.push(
      ...tasks.map((t) => ({
        type: 'task',
        id: t.id,
        name: t.title,
        relevance: 0.8,
        lastAccessed: t.updatedAt.toISOString(),
      })),
    );

    const apiLinks = await this.prisma.projectApiDocLink.findMany({
      where: { projectId },
      select: { id: true, label: true },
    });
    sources.push(
      ...apiLinks.map((l) => ({
        type: 'api',
        id: l.id,
        name: l.label,
        relevance: 0.6,
      })),
    );

    return sources;
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word));
  }

  private getDefaultRecipes() {
    return [
      {
        id: 'default',
        name: 'default',
        layers: ['system', 'project', 'session'],
        maxTokens: 50000,
        priorities: { system: 1, project: 1, session: 0.8, runtime: 0 },
      },
      {
        id: 'feature-dev',
        name: 'feature-dev',
        layers: ['system', 'project', 'session', 'runtime'],
        maxTokens: 80000,
        priorities: { system: 1, project: 1, session: 0.9, runtime: 1 },
      },
    ];
  }
}
