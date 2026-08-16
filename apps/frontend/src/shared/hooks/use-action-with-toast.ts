import { useCallback, useState } from 'react';
import { useMutation, type UseMutationOptions, type UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface ActionWithToastOptions {
  successMessage: string;
  errorPrefix?: string;
  onSuccess?: () => void | Promise<void>;
}

export interface UseActionWithToastReturn {
  run: <T>(action: () => Promise<T>) => Promise<T | undefined>;
  isPending: boolean;
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return '未知错误';
}

/**
 * 统一的「带反馈的异步动作」封装。
 *
 * 用法：
 *   const { run, isPending } = useActionWithToast({
 *     successMessage: '文档已保存',
 *     errorPrefix: '保存文档',
 *   });
 *   await run(() => api.save(...));
 */
export function useActionWithToast(
  options: ActionWithToastOptions,
): UseActionWithToastReturn {
  const [isPending, setIsPending] = useState(false);
  const { successMessage, errorPrefix, onSuccess } = options;

  const run = useCallback(
    async <T>(action: () => Promise<T>): Promise<T | undefined> => {
      setIsPending(true);
      try {
        const result = await action();
        toast.success(successMessage);
        if (onSuccess) {
          await onSuccess();
        }
        return result;
      } catch (err) {
        const prefix = errorPrefix || '操作';
        toast.error(`${prefix}失败: ${describeError(err)}`);
        return undefined;
      } finally {
        setIsPending(false);
      }
    },
    [successMessage, errorPrefix, onSuccess],
  );

  return { run, isPending };
}

/**
 * 用 successMessage 包装 useMutation,统一处理成功/失败 toast。
 *
 * 用法:
 *   export function useCreateDocument() {
 *     const qc = useQueryClient();
 *     return useToastMutation<Document, Error, CreateDocumentRequest>({
 *       successMessage: '文档已创建',
 *       errorPrefix: '创建文档',
 *       mutationFn: (data) => documentApi.create(data).then(unwrap),
 *       onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
 *     });
 *   }
 */
export function useToastMutation<TData, TError, TVariables, TContext = unknown>(
  options: UseMutationOptions<TData, TError, TVariables, TContext> & {
    successMessage: string;
    errorPrefix?: string;
  },
): UseMutationResult<TData, TError, TVariables, TContext> {
  const { successMessage, errorPrefix, onSuccess, ...rest } = options;
  return useMutation<TData, TError, TVariables, TContext>({
    ...rest,
    onSuccess: async (data, variables, context) => {
      toast.success(successMessage);
      if (onSuccess) {
        await (onSuccess as (d: TData, v: TVariables, c: TContext) => unknown)(data, variables, context);
      }
    },
    onError: (err) => {
      const prefix = errorPrefix || '操作';
      toast.error(`${prefix}失败: ${describeError(err)}`);
    },
  });
}
