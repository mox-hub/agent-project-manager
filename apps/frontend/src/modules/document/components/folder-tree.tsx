// FolderTree Component - 文档目录树组件
import React, { memo, useState } from 'react';
import * as Icons from 'lucide-react';
import type { DocumentFolder } from '../api/document-api';
import { cn } from '@/lib/utils';

interface FolderTreeProps {
  folders: DocumentFolder[];
  selectedFolderId?: string;
  onSelectFolder?: (folder: DocumentFolder) => void;
  onCreateFolder?: (parentId?: string) => void;
  onRenameFolder?: (folder: DocumentFolder) => void;
  onDeleteFolder?: (folder: DocumentFolder) => void;
}

interface FolderItemProps {
  folder: DocumentFolder;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onCreateSubfolder: () => void;
  onRename: () => void;
  onDelete: () => void;
}

const FolderItemComponent = memo(function FolderItemComponent({
  folder,
  depth,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  onCreateSubfolder,
  onRename,
  onDelete,
}: FolderItemProps) {
  const [showActions, setShowActions] = useState(false);
  const hasChildren = folder.children && folder.children.length > 0;
  const docCount = folder._count?.documents || 0;

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-md px-2 py-1.5 cursor-pointer transition-colors duration-100',
          isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
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
            onToggle();
          }}
        >
          {hasChildren || (folder.documents && folder.documents.length > 0) ? (
            <Icons.ChevronRight
              size={14}
              className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
          ) : (
            <Icons.Folder size={14} className="text-muted-foreground" />
          )}
        </button>

        {/* 文件夹图标 */}
        <Icons.Folder size={14} className="shrink-0 text-accent-yellow" />

        {/* 文件夹名称 */}
        <span className={cn('flex-1 truncate text-sm', isSelected ? 'font-medium' : '')}>
          {folder.name}
        </span>

        {/* 文档数量 */}
        {docCount > 0 && (
          <span className="shrink-0 text-10 text-muted-foreground">
            {docCount}
          </span>
        )}

        {/* 操作按钮 */}
        {showActions && (
          <div className="shrink-0 flex items-center gap-0.5">
            <button
              type="button"
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onCreateSubfolder();
              }}
              title="新建子文件夹"
            >
              <Icons.Plus size={12} />
            </button>
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
          </div>
        )}
      </div>

      {/* 子文件夹和文档 */}
      {isExpanded && hasChildren && (
        <div role="group">
          {folder.children!.map((child) => (
            <FolderItemComponent
              key={child.id}
              folder={child}
              depth={depth + 1}
              isExpanded={isExpanded}
              isSelected={false}
              onToggle={onToggle}
              onSelect={() => onSelect()}
              onCreateSubfolder={onCreateSubfolder}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {/* 文档列表 */}
      {isExpanded && folder.documents && folder.documents.length > 0 && (
        <div role="group" style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}>
          {folder.documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer hover:bg-accent/50"
              onClick={() => onSelect()}
            >
              <Icons.FileText size={14} className="shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-sm">{doc.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export const FolderTree = memo(function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: FolderTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (folderId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const isSelected = (folder: DocumentFolder) => folder.id === selectedFolderId;

  return (
    <div className="space-y-1 py-2">
      {/* 根级别文件夹 */}
      {folders.map((folder) => (
        <FolderItemComponent
          key={folder.id}
          folder={folder}
          depth={0}
          isExpanded={expandedIds.has(folder.id)}
          isSelected={isSelected(folder)}
          onToggle={() => toggleExpanded(folder.id)}
          onSelect={() => onSelectFolder?.(folder)}
          onCreateSubfolder={() => onCreateFolder?.(folder.id)}
          onRename={() => onRenameFolder?.(folder)}
          onDelete={() => onDeleteFolder?.(folder)}
        />
      ))}

      {/* 新建文件夹按钮 */}
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        onClick={() => onCreateFolder?.()}
      >
        <Icons.Plus size={14} />
        <span>新建文件夹</span>
      </button>
    </div>
  );
});
