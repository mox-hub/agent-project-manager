"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function AlertDialog({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

function AlertDialogTrigger({ children, ...props }: React.ComponentProps<"button">) {
  return <button {...props}>{children}</button>
}

function AlertDialogContent({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black/50", className)} {...props}>
      {children}
    </div>
  )
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
}

function AlertDialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 className={cn("text-lg font-semibold", className)} {...props} />
}

function AlertDialogDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />
}

function AlertDialogAction({ children, ...props }: React.ComponentProps<"button">) {
  return <button {...props}>{children}</button>
}

function AlertDialogCancel({ children, ...props }: React.ComponentProps<"button">) {
  return <button {...props}>{children}</button>
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
