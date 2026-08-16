"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      data-ai-component={props["data-ai-component"] ?? "ui.input"}
      data-ai-role={props["data-ai-role"] ?? "input"}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-input-background px-3 py-1 text-base transition-[color,background-color,border-color,box-shadow] [transition-duration:var(--motion-fast)] [transition-timing-function:var(--motion-ease-standard)] file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

function PasswordInput({ className, placeholder = "••••••••", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const [showPassword, setShowPassword] = React.useState(false)

  return (
    <div className="relative">
      <Input
        type={showPassword ? "text" : "password"}
        className={cn("pr-10", className)}
        placeholder={placeholder}
        data-ai-component={props["data-ai-component"] ?? "ui.password-input"}
        data-ai-role={props["data-ai-role"] ?? "password-input"}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors z-10"
        tabIndex={-1}
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  )
}

export { Input, PasswordInput }
