// Import Export Component - 文档导入导出组件
import React, { useState, useCallback } from 'react';
import * as Icons from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

interface ImportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'import' | 'export';
  documentTitle?: string;
  onImport?: (file: File) => void;
  onExport?: (format: 'md' | 'html') => void;
  isLoading?: boolean;
}

export function ImportExportDialog({
  open,
  onOpenChange,
  mode,
  documentTitle,
  onImport,
  onExport,
  isLoading = false,
}: ImportExportDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [exportFormat, setExportFormat] = useState<'md' | 'html'>('md');
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
        setSelectedFile(file);
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleImport = () => {
    if (selectedFile && onImport) {
      onImport(selectedFile);
      setSelectedFile(null);
    }
  };

  const handleExport = () => {
    if (onExport) {
      onExport(exportFormat);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedFile(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'import' ? (
              <>
                <Icons.Upload className="h-5 w-5" />
                导入文档
              </>
            ) : (
              <>
                <Icons.Download className="h-5 w-5" />
                导出文档
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'import'
              ? '从 Markdown 文件导入文档内容'
              : `导出「${documentTitle}」为指定格式`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {mode === 'import' ? (
            <div className="space-y-4">
              <div
                className={cn(
                  'relative rounded-lg border-2 border-dashed p-8 text-center transition-colors',
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50',
                  selectedFile && 'border-accent-green bg-accent-green/5'
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".md,.markdown"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <Icons.FileCheck className="h-10 w-10 text-accent-green" />
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Icons.FileUp className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      拖拽文件到此处，或点击选择文件
                    </p>
                    <p className="text-xs text-muted-foreground">
                      支持 .md 和 .markdown 格式
                    </p>
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                <p>导入说明：</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>文件第一行的标题 (# 标题) 将作为文档标题</li>
                  <li>首段内容将自动生成为文档摘要</li>
                  <li>文档将创建为草稿状态</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>导出格式</Label>
                <RadioGroup
                  value={exportFormat}
                  onValueChange={(value) => setExportFormat(value as 'md' | 'html')}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2 rounded-md border p-3 cursor-pointer hover:bg-accent/50">
                    <RadioGroupItem value="md" id="format-md" />
                    <Label htmlFor="format-md" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Icons.FileText className="h-4 w-4" />
                        <span className="font-medium">Markdown (.md)</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        纯文本格式，便于编辑和版本控制
                      </p>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-md border p-3 cursor-pointer hover:bg-accent/50">
                    <RadioGroupItem value="html" id="format-html" />
                    <Label htmlFor="format-html" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Icons.Globe className="h-4 w-4" />
                        <span className="font-medium">HTML (.html)</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        带样式，适合在线查看和分享
                      </p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            取消
          </Button>
          {mode === 'import' ? (
            <Button
              type="button"
              onClick={handleImport}
              disabled={!selectedFile || isLoading}
            >
              {isLoading ? '导入中...' : '导入'}
            </Button>
          ) : (
            <Button type="button" onClick={handleExport} disabled={isLoading}>
              {isLoading ? '导出中...' : '导出'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
