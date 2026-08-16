"use client"

import * as React from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

import { cn } from "@/lib/utils"

function AlertDialog({
  children,
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, "children"> & { children?: React.ReactNode }) {
  return <Dialog {...props}>{children}</Dialog>
}

function AlertDialogTrigger({ children, ...props }: React.ComponentProps<"button">) {
  return <button {...props}>{children}</button>
}

function AlertDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent className={cn("sm:max-w-md", className)} {...props}>
      {children}
    </DialogContent>
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

function AlertDialogAction({
  children,
  variant = "default",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "variant"> & {
  variant?: "default" | "destructive"
}) {
  return (
    <Button variant={variant === "destructive" ? "destructive" : "default"} {...props}>
      {children}
    </Button>
  )
}

function AlertDialogCancel({ children, ...props }: React.ComponentProps<"button">) {
  return (
    <Button variant="secondary" {...props}>
      {children}
    </Button>
  )
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
