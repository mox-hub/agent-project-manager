import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

interface DialogContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

function useDialogContext() {
  const context = React.useContext(DialogContext)
  if (!context) {
    throw new Error("Dialog components must be used within a Dialog")
  }
  return context
}

function Dialog({ open, onOpenChange, ...props }: React.ComponentProps<"div"> & { open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen

  const handleOpenChange = React.useCallback(
    (value: boolean) => {
      if (!isControlled) {
        setInternalOpen(value)
      }
      onOpenChange?.(value)
    },
    [isControlled, onOpenChange]
  )

  return (
    <DialogContext.Provider value={{ open: isOpen, onOpenChange: handleOpenChange }}>
      <div data-slot="dialog" {...props} />
    </DialogContext.Provider>
  )
}

function DialogTrigger({ children, onClick, ...props }: React.ComponentProps<"button">) {
  const { onOpenChange } = useDialogContext()

  return (
    <button
      data-slot="dialog-trigger"
      onClick={(e) => {
        onOpenChange(true)
        onClick?.(e)
      }}
      {...props}
    >
      {children}
    </button>
  )
}

function DialogPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function DialogClose({ children, onClick, ...props }: React.ComponentProps<"button">) {
  const { onOpenChange } = useDialogContext()

  return (
    <button
      data-slot="dialog-close"
      onClick={(e) => {
        onOpenChange(false)
        onClick?.(e)
      }}
      {...props}
    >
      {children}
    </button>
  )
}

function DialogOverlay({ className, open, onOpenChange, ...props }: React.ComponentProps<"div"> & { open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const { open: contextOpen, onOpenChange: contextOnOpenChange } = useDialogContext()
  const isOpen = open !== undefined ? open : contextOpen

  if (!isOpen) return null

  return (
    <div
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs",
        className
      )}
      onClick={() => (onOpenChange || contextOnOpenChange)(false)}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  open,
  onOpenChange,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const { open: contextOpen, onOpenChange: contextOnOpenChange } = useDialogContext()
  const isOpen = open !== undefined ? open : contextOpen
  const handleOpenChange = onOpenChange || contextOnOpenChange

  if (!isOpen) return null

  return (
    <DialogPortal>
      <DialogOverlay open={isOpen} onOpenChange={handleOpenChange} />
      <div
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-6 rounded-xl bg-background p-6 text-sm ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-md",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogClose className="absolute top-4 right-4">
            <Button variant="ghost" size="icon-sm">
              <XIcon />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>
        )}
      </div>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="dialog-header" className={cn("flex flex-col gap-2", className)} {...props} />
  )
}

function DialogFooter({ className, children, showCloseButton = false, ...props }: React.ComponentProps<"div"> & { showCloseButton?: boolean }) {
  const { onOpenChange } = useDialogContext()

  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    >
      {children}
      {showCloseButton && (
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2 data-slot="dialog-title" className={cn("leading-none font-medium", className)} {...props} />
  )
}

function DialogDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
