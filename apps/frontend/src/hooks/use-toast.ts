"use client"

import * as React from "react"
import { toast as baseToast } from '@/components/ui/toast';

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

  const toastId = baseToast[tone](title ?? "", {
    id,
    description,
    action: action ? { label: action } : undefined,
  })

  return {
    id: String(toastId),
    dismiss: () => baseToast.dismiss(toastId),
    update: (next: Partial<ToastOptions>) => {
      baseToast[tone](next.title ?? title ?? "", {
        id: toastId,
        description: next.description ?? description,
        action: next.action ? { label: next.action } : undefined,
      })
    },
  }
}

function useToast() {
  return {
    toasts: [],
    toast,
    dismiss: (toastId?: string) => baseToast.dismiss(toastId),
  }
}

export { useToast, toast }
