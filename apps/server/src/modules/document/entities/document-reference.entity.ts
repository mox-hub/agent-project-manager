// Document Reference Entity - 使用 Prisma
export type ReferenceSourceType = 'ai_conversation' | 'task' | 'project';

export type DocumentReference = {
  id: string;
  sourceType: ReferenceSourceType;
  sourceId: string;
  documentId: string;
  sectionId: string | null;
  anchor: string | null;
  context: string | null;
  createdBy: string;
  createdAt: Date;
};

export type CreateDocumentReference = {
  sourceType: ReferenceSourceType;
  sourceId: string;
  documentId: string;
  sectionId?: string | null;
  anchor?: string | null;
  context?: string | null;
  createdBy: string;
};
