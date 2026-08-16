// Document Version Entity - 使用 Prisma
export type DocumentVersion = {
  id: string;
  documentId: string;
  version: string;
  content: string;
  sectionsJson: string | null;
  summary: string | null;
  wordCount: number;
  createdBy: string;
  createdAt: Date;
};

export type CreateDocumentVersion = {
  documentId: string;
  version: string;
  content: string;
  sectionsJson?: string | null;
  summary?: string | null;
  wordCount?: number;
  createdBy: string;
};
