"use client"

import * as React from "react"
import { toast as sonnerToast } from "sonner"

type ToastVariant = "default" | "destructive"

type ToastOptions = {
  id?: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  variant?: ToastVariant
}

function toast({ id, title, description, action, variant = "default" }: ToastOptions) {
  const tone = variant === "destructive" ? "error" : "success"

  const toastId = sonnerToast[tone](title ? String(title) : "", {
    id,
    description,
    action,
  })

  return {
    id: String(toastId),
    dismiss: () => sonnerToast.dismiss(toastId),
    update: (next: Partial<ToastOptions>) => {
      sonnerToast[tone](next.title ? String(next.title) : title ? String(title) : "", {
        id: toastId,
        description: next.description ?? description,
        action: next.action ?? action,
      })
    },
  }
}

function useToast() {
  return {
    toasts: [],
    toast,
    dismiss: (toastId?: string) => sonnerToast.dismiss(toastId),
  }
}

export { useToast, toast }
