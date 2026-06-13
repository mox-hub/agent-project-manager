// DocumentTree Component - 文档树组件（整合目录和文档）
import React, { memo, useState, useMemo } from 'react';
import * as Icons from 'lucide-react';
import type { DocumentFolder, DocumentListItem } from '../api/document-api';
import { cn } from '@/lib/utils';

interface DocumentTreeProps {
  folders: DocumentFolder[];
  documents: DocumentListItem[];
  selectedDocumentId?: string;
  selectedFolderId?: string;
  onSelectDocument?: (doc: DocumentListItem) => void;
  onSelectFolder?: (folder: DocumentFolder) => void;
  onCreateFolder?: (parentId?: string) => void;
  onRenameFolder?: (folder: DocumentFolder) => void;
  onDeleteFolder?: (folder: DocumentFolder) => void;
  onCreateDocument?: (folderId?: string) => void;
}

interface TreeNodeProps {
  type: 'folder' | 'document';
  item: DocumentFolder | DocumentListItem;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  hasChildren: boolean;
  children?: React.ReactNode;
  onToggle: () => void;
  onSelect: () => void;
  onCreateSubfolder: () => void;
  onRename: () => void;
  onDelete: () => void;
  onCreateDocument: () => void;
}

const TreeNode = memo(function TreeNode({
  type,
  item,
  depth,
  isExpanded,
  isSelected,
  hasChildren,
  children,
  onToggle,
  onSelect,
  onCreateSubfolder,
  onRename,
  onDelete,
  onCreateDocument,
}: TreeNodeProps) {
  const [showActions, setShowActions] = useState(false);
  const isFolder = type === 'folder';
  const folder = item as DocumentFolder;
  const doc = item as DocumentListItem;

  const statusColors: Record<string, string> = {
    draft: 'text-muted-foreground',
    reviewing: 'text-accent-yellow',
    published: 'text-accent-green',
    rejected: 'text-destructive',
  };

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-md px-2 py-1.5 cursor-pointer transition-colors duration-100',
          isSelected
            ? 'bg-accent text-accent-foreground'
            : 'hover:bg-accent/50'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={onSelect}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* 展开/折叠按钮 */}
        <button
          type="button"
          className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle();
          }}
        >
          {hasChildren ? (
            <Icons.ChevronRight
              size={14}
              className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
          ) : isFolder ? (
            <Icons.Folder size={14} className="text-muted-foreground" />
          ) : (
            <span className="w-3.5" />
          )}
        </button>

        {/* 图标 */}
        {isFolder ? (
          <Icons.Folder size={14} className="shrink-0 text-accent-yellow" />
        ) : (
          <Icons.FileText size={14} className="shrink-0 text-muted-foreground" />
        )}

        {/* 名称 */}
        <span className={cn('flex-1 truncate text-sm', isSelected ? 'font-medium' : '')}>
          {isFolder ? folder.name : doc.title}
        </span>

        {/* 状态标签 */}
        {!isFolder && doc.status && (
          <span className={cn('shrink-0 text-[10px] font-medium', statusColors[doc.status])}>
            {doc.status === 'published' ? '已发布' : doc.status === 'draft' ? '草稿' : doc.status === 'reviewing' ? '审核中' : '已拒绝'}
          </span>
        )}

        {/* 文档数量 */}
        {isFolder && folder._count && (
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {folder._count.documents > 0 && folder._count.documents}
          </span>
        )}

        {/* 操作按钮 */}
        {showActions && (
          <div className="shrink-0 flex items-center gap-0.5">
            {isFolder && (
              <>
                <button
                  type="button"
                  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateSubfolder();
                  }}
                  title="新建子文件夹"
                >
                  <Icons.FolderPlus size={12} />
                </button>
                <button
                  type="button"
                  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateDocument();
                  }}
                  title="在文件夹中新建文档"
                >
                  <Icons.FilePlus size={12} />
                </button>
              </>
            )}
            {isFolder && (
              <>
                <button
                  type="button"
                  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRename();
                  }}
                  title="重命名"
                >
                  <Icons.Pencil size={12} />
                </button>
                <button
                  type="button"
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  title="删除"
                >
                  <Icons.Trash2 size={12} />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* 子节点 */}
      {hasChildren && isExpanded && (
        <div role="group">{children}</div>
      )}
    </div>
  );
});

export const DocumentTree = memo(function DocumentTree({
  folders,
  documents,
  selectedDocumentId,
  selectedFolderId,
  onSelectDocument,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onCreateDocument,
}: DocumentTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 构建树形结构
  const treeData = useMemo(() => {
    // 收集所有文档到对应的文件夹
    const docsByFolder = new Map<string, DocumentListItem[]>();
    const rootDocs: DocumentListItem[] = [];

    documents.forEach((doc) => {
      if (doc.folderId) {
        const existing = docsByFolder.get(doc.folderId) || [];
        existing.push(doc);
        docsByFolder.set(doc.folderId, existing);
      } else {
        rootDocs.push(doc);
      }
    });

    // 收集子文件夹
    const childrenByFolder = new Map<string, DocumentFolder[]>();
    const rootFolders: DocumentFolder[] = [];

    folders.forEach((folder) => {
      if (folder.parentId) {
        const existing = childrenByFolder.get(folder.parentId) || [];
        existing.push(folder);
        childrenByFolder.set(folder.parentId, existing);
      } else {
        rootFolders.push(folder);
      }
    });

    return { rootFolders, rootDocs, childrenByFolder, docsByFolder };
  }, [folders, documents]);

  const renderFolder = (folder: DocumentFolder, depth: number): React.ReactNode => {
    const children = treeData.childrenByFolder.get(folder.id) || [];
    const docs = treeData.docsByFolder.get(folder.id) || [];
    const hasChildren = children.length > 0 || docs.length > 0;

    return (
      <TreeNode
        key={folder.id}
        type="folder"
        item={folder}
        depth={depth}
        isExpanded={expandedIds.has(folder.id)}
        isSelected={folder.id === selectedFolderId}
        hasChildren={hasChildren}
        onToggle={() => toggleExpanded(folder.id)}
        onSelect={() => onSelectFolder?.(folder)}
        onCreateSubfolder={() => onCreateFolder?.(folder.id)}
        onRename={() => onRenameFolder?.(folder)}
        onDelete={() => onDeleteFolder?.(folder)}
        onCreateDocument={() => onCreateDocument?.(folder.id)}
      >
        {hasChildren && expandedIds.has(folder.id) && (
          <>
            {children.map((child) => renderFolder(child, depth + 1))}
            {docs.map((doc) => (
              <TreeNode
                key={doc.id}
                type="document"
                item={doc}
                depth={depth + 1}
                isExpanded={false}
                isSelected={doc.id === selectedDocumentId}
                hasChildren={false}
                onToggle={() => {}}
                onSelect={() => onSelectDocument?.(doc)}
                onCreateSubfolder={() => {}}
                onRename={() => {}}
                onDelete={() => {}}
                onCreateDocument={() => {}}
              />
            ))}
          </>
        )}
      </TreeNode>
    );
  };

  return (
    <div className="space-y-1 py-2">
      {/* 根级别文件夹 */}
      {treeData.rootFolders.map((folder) => renderFolder(folder, 0))}

      {/* 根级别文档 */}
      {treeData.rootDocs.map((doc) => (
        <TreeNode
          key={doc.id}
          type="document"
          item={doc}
          depth={0}
          isExpanded={false}
          isSelected={doc.id === selectedDocumentId}
          hasChildren={false}
          onToggle={() => {}}
          onSelect={() => onSelectDocument?.(doc)}
          onCreateSubfolder={() => {}}
          onRename={() => {}}
          onDelete={() => {}}
          onCreateDocument={() => {}}
        />
      ))}

      {/* 根级别操作按钮 */}
      <div className="flex items-center gap-1 pt-2 border-t mt-2">
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          onClick={() => onCreateFolder?.()}
        >
          <Icons.FolderPlus size={14} />
          <span>新建文件夹</span>
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          onClick={() => onCreateDocument?.()}
        >
          <Icons.FilePlus size={14} />
          <span>新建文档</span>
        </button>
      </div>
    </div>
  );
});
