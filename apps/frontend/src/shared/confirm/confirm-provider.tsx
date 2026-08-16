import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type ConfirmOptions = {
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
}

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

type PendingConfirm = {
  options: Required<ConfirmOptions>
  resolve: (result: boolean) => void
}

const defaultOptions: Required<ConfirmOptions> = {
  title: "请确认",
  description: "该操作可能会影响现有数据，是否继续？",
  confirmText: "确认",
  cancelText: "取消",
  variant: "default",
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const queueRef = useRef<PendingConfirm[]>([])
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  const dequeue = useCallback(() => {
    const next = queueRef.current.shift() ?? null
    setPending(next)
  }, [])

  const resolvePending = useCallback(
    (result: boolean) => {
      if (pending) {
        pending.resolve(result)
      }
      dequeue()
    },
    [dequeue, pending]
  )

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      queueRef.current.push({
        options: {
          ...defaultOptions,
          ...options,
        },
        resolve,
      })

      if (!pending) {
        dequeue()
      }
    })
  }, [dequeue, pending])

  const value = useMemo(() => ({ confirm }), [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <AlertDialog open={!!pending} onOpenChange={(open) => !open && resolvePending(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.options.title}</AlertDialogTitle>
            <AlertDialogDescription>{pending?.options.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => resolvePending(false)}>
              {pending?.options.cancelText}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resolvePending(true)}
              variant={pending?.options.variant === "destructive" ? "destructive" : "default"}
            >
              {pending?.options.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error("useConfirm must be used within ConfirmProvider")
  }
  return context.confirm
}

export type { ConfirmOptions }
