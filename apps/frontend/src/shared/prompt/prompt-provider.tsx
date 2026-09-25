import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type PromptOptions = {
  title: string
  description?: string
  placeholder?: string
  initialValue?: string
  confirmText?: string
  cancelText?: string
}

type PromptContextValue = {
  /** 命令式输入对话框：确认解析为输入值（原样返回，由调用方裁剪），取消解析为 null */
  prompt: (options: PromptOptions) => Promise<string | null>
}

const PromptContext = createContext<PromptContextValue | null>(null)

type PendingPrompt = {
  options: PromptOptions
  resolve: (result: string | null) => void
}

export function PromptProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const queueRef = useRef<PendingPrompt[]>([])
  const [pending, setPending] = useState<PendingPrompt | null>(null)
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const dequeue = useCallback(() => {
    const next = queueRef.current.shift() ?? null
    setPending(next)
    setValue(next?.options.initialValue ?? "")
  }, [])

  const submit = useCallback(() => {
    if (!pending) return
    pending.resolve(value)
    dequeue()
  }, [dequeue, pending, value])

  const dismiss = useCallback(() => {
    if (pending) {
      pending.resolve(null)
    }
    dequeue()
  }, [dequeue, pending])

  const prompt = useCallback(
    (options: PromptOptions) => {
      return new Promise<string | null>((resolve) => {
        queueRef.current.push({ options, resolve })
        if (!pending) {
          dequeue()
        }
      })
    },
    [dequeue, pending],
  )

  // 打开时聚焦并全选输入框，便于直接覆盖输入
  useEffect(() => {
    if (!pending) return
    const timer = setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 50)
    return () => clearTimeout(timer)
  }, [pending])

  const contextValue = useMemo(() => ({ prompt }), [prompt])

  return (
    <PromptContext.Provider value={contextValue}>
      {children}
      <Dialog open={!!pending} onOpenChange={(open) => !open && dismiss()}>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <DialogHeader>
              <DialogTitle>{pending?.options.title}</DialogTitle>
              {pending?.options.description ? (
                <DialogDescription>{pending.options.description}</DialogDescription>
              ) : null}
            </DialogHeader>
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={pending?.options.placeholder}
              className="my-2"
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={dismiss}>
                {pending?.options.cancelText ?? t("common.cancel")}
              </Button>
              <Button type="submit">{pending?.options.confirmText ?? t("common.confirm")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PromptContext.Provider>
  )
}

export function usePrompt() {
  const context = useContext(PromptContext)
  if (!context) {
    throw new Error("usePrompt must be used within PromptProvider")
  }
  return context.prompt
}

export type { PromptOptions }
