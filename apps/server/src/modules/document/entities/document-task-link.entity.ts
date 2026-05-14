// Document Task Link Entity - 使用 Prisma
export type LinkType = 'references' | 'blocks' | 'relates' | 'implements';

export type DocumentTaskLink = {
  id: string;
  documentId: string | null;
  sectionId: string | null;
  taskId: string;
  projectId: string;
  linkType: LinkType;
  note: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateDocumentTaskLink = {
  documentId?: string | null;
  sectionId?: string | null;
  taskId: string;
  projectId: string;
  linkType?: LinkType;
  note?: string | null;
  createdBy: string;
};
