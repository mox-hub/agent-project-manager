// Document Form Component - 文档编辑表单组件
import React from 'react';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import * as Icons from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import type { DocumentCategory, CreateDocumentRequest, UpdateDocumentRequest } from '../api/document-api';

interface DocumentFormProps {
  defaultValues?: Partial<CreateDocumentRequest>;
  onSubmit: (data: CreateDocumentRequest | UpdateDocumentRequest) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

const categories: { value: DocumentCategory; label: string; icon: string }[] = [
  { value: 'requirement', label: '需求', icon: '📋' },
  { value: 'design', label: '设计', icon: '🎨' },
  { value: 'api', label: 'API', icon: '🔌' },
  { value: 'testing', label: '测试', icon: '🧪' },
  { value: 'guide', label: '指南', icon: '📖' },
  { value: 'custom', label: '自定义', icon: '📄' },
];

/**
 * Select 的 label 映射（`SelectItem` 展示内容与 Root 的 `items` 共用同一份）：
 * base-ui 必须经 Root 的 `items` 才能把 value 显示成名称，否则 trigger 显示原始 value。
 */
const CATEGORY_ITEMS = categories.map((cat) => ({
  value: cat.value,
  label: (
    <span className="flex items-center gap-2">
      <span>{cat.icon}</span>
      <span>{cat.label}</span>
    </span>
  ),
}));

export function DocumentForm({
  defaultValues = {},
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create',
}: DocumentFormProps) {
  const form = useForm<CreateDocumentRequest>({
    defaultValues: {
      title: '',
      content: '',
      summary: '',
      category: 'custom',
      folderId: '',
      ...defaultValues,
    },
  });

  const handleSubmit = (data: CreateDocumentRequest) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* 标题 */}
        <FormField
          control={form.control}
          name="title"
          rules={{ required: '请输入文档标题' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>标题</FormLabel>
              <FormControl>
                <Input
                  placeholder="输入文档标题..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 分类 */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>分类</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                items={CATEGORY_ITEMS}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="选择文档分类" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CATEGORY_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 摘要 */}
        <FormField
          control={form.control}
          name="summary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>摘要</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="输入文档摘要（可选）..."
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 内容 */}
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>内容</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="使用 Markdown 编写文档内容..."
                  rows={12}
                  className="font-mono text-sm"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 操作按钮 */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              取消
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner className="mr-2 h-4 w-4 text-inherit" />
                保存中...
              </>
            ) : mode === 'create' ? (
              <>
                <Icons.Plus className="mr-2 h-4 w-4" />
                创建文档
              </>
            ) : (
              <>
                <Icons.Save className="mr-2 h-4 w-4" />
                保存修改
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
