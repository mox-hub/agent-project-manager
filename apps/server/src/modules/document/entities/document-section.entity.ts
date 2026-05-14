// Document Section Entity - 使用 Prisma
export type DocumentSection = {
  id: string;
  documentId: string;
  title: string;
  level: number;
  anchor: string;
  content: string | null;
  order: number;
  parentId: string | null;
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateDocumentSection = {
  documentId: string;
  title: string;
  level: number;
  anchor: string;
  content?: string | null;
  order?: number;
  parentId?: string | null;
  wordCount?: number;
};
