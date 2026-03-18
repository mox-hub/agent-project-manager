"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type LegacyCheckboxChangeEvent = React.ChangeEvent<HTMLInputElement> & {
  target: { checked: boolean }
  currentTarget: { checked: boolean }
}

type CheckboxProps = Omit<CheckboxPrimitive.Root.Props, "onCheckedChange" | "onChange"> & {
  onCheckedChange?: (checked: boolean) => void
  onChange?: (event: LegacyCheckboxChangeEvent) => void
}

function Checkbox({ className, onChange, onCheckedChange, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input shadow-xs transition-shadow outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary",
        className
      )}
      onCheckedChange={(value) => {
        const checked = value === true
        onCheckedChange?.(checked)
        if (onChange) {
          onChange({
            target: { checked },
            currentTarget: { checked },
          } as LegacyCheckboxChangeEvent)
        }
      }}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
