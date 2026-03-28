import type { ApiResponse } from '@/infrastructure/api-client';

export type DocumentStatus = 'draft' | 'reviewing' | 'published';

export type DocumentCategory = 'requirement' | 'design' | 'api' | 'testing' | 'guide' | 'custom';

export type DocumentItem = {
  id: string;
  title: string;
  path: string;
  module: string;
  category?: DocumentCategory;
  status: DocumentStatus;
  updatedAt: string;
  updatedBy: string;
  summary: string;
  content: string;
  tags?: string[];
  currentVersion?: string;
  linkCount?: number;
  isAIGenerated?: boolean;
};

export type DocumentVersion = {
  id: string;
  documentId: string;
  version: string;
  summary: string;
  createdAt: string;
  author: string;
};

const DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-architecture-overview',
    title: 'Architecture Overview',
    path: 'docs/architecture/overview.md',
    module: 'core',
    category: 'design',
    status: 'published',
    updatedAt: '2026-03-24T09:00:00.000Z',
    updatedBy: 'arch-lead',
    summary: '系统架构总览与边界定义。',
    content: '# Architecture Overview\n\n当前版本覆盖前后端边界、模块职责和发布策略。',
    tags: ['架构', '核心模块'],
    currentVersion: 'v1.2',
    linkCount: 4,
    isAIGenerated: false,
  },
  {
    id: 'doc-ui-unification-v1',
    title: 'UI Unification V1',
    path: 'docs/guides/ui-style-unification-v1.md',
    module: 'frontend',
    category: 'guide',
    status: 'published',
    updatedAt: '2026-03-24T08:00:00.000Z',
    updatedBy: 'design-system',
    summary: '前端统一风格规范与治理规则。',
    content: '# UI Unification V1\n\n统一页面骨架、动效策略与 AI 标识规范。',
    tags: ['UI', '设计系统', '规范'],
    currentVersion: 'v1.1',
    linkCount: 7,
    isAIGenerated: true,
  },
  {
    id: 'doc-figma-rollout',
    title: 'Figma Rollout Checklist',
    path: 'docs/reports/figma-remediation-guide-2026-03-20.md',
    module: 'frontend',
    category: 'requirement',
    status: 'reviewing',
    updatedAt: '2026-03-24T07:30:00.000Z',
    updatedBy: 'product-manager',
    summary: 'Figma 对齐执行节奏与验收清单。',
    content: '# Figma Rollout Checklist\n\n用于核对路由、组件映射和主题 token 对齐。',
    tags: ['Figma', '验收'],
    currentVersion: 'v0.3',
    linkCount: 2,
    isAIGenerated: false,
  },
];

const VERSIONS: DocumentVersion[] = [
  {
    id: 'v-1',
    documentId: 'doc-ui-unification-v1',
    version: '1.0.0',
    summary: '建立统一骨架与动效规范。',
    createdAt: '2026-03-17T10:00:00.000Z',
    author: 'design-system',
  },
  {
    id: 'v-2',
    documentId: 'doc-ui-unification-v1',
    version: '1.1.0',
    summary: '补充 AI 标识与治理脚本要求。',
    createdAt: '2026-03-24T08:00:00.000Z',
    author: 'frontend-lead',
  },
];

export type DocumentListQuery = {
  q?: string;
  module?: string;
  category?: DocumentCategory | 'all';
  status?: DocumentStatus | 'all';
};

export const documentApi = {
  getList: async (query?: DocumentListQuery): Promise<ApiResponse<DocumentItem[]>> => {
    const q = query?.q?.toLowerCase().trim();
    const module = query?.module;
    const category = query?.category;
    const status = query?.status;
    const list = DOCUMENTS.filter((item) => {
      if (q && !`${item.title} ${item.summary} ${item.path}`.toLowerCase().includes(q)) {
        return false;
      }
      if (module && module !== 'all' && item.module !== module) {
        return false;
      }
      if (category && category !== 'all' && item.category !== category) {
        return false;
      }
      if (status && status !== 'all' && item.status !== status) {
        return false;
      }
      return true;
    });
    return { data: list };
  },

  getDetail: async (documentId: string): Promise<ApiResponse<DocumentItem>> => {
    const target = DOCUMENTS.find((item) => item.id === documentId) ?? DOCUMENTS[0];
    return { data: target };
  },

  getVersions: async (documentId: string): Promise<ApiResponse<DocumentVersion[]>> => {
    return {
      data: VERSIONS.filter((item) => item.documentId === documentId),
    };
  },
};

