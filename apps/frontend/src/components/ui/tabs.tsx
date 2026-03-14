"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error("Tabs components must be used within a Tabs")
  }
  return context
}

function Tabs({ value, onValueChange, defaultValue, orientation = "horizontal", className, children, ...props }: React.ComponentProps<"div"> & {
  value?: string
  onValueChange?: (value: string) => void
  defaultValue?: string
  orientation?: "horizontal" | "vertical"
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")
  const isControlled = value !== undefined
  const currentValue = isControlled ? value : internalValue

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (!isControlled) {
        setInternalValue(newValue)
      }
      onValueChange?.(newValue)
    },
    [isControlled, onValueChange]
  )

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <div
        data-slot="tabs"
        data-orientation={orientation}
        className={cn("group/tabs flex gap-2", orientation === "horizontal" ? "flex-col" : "flex-row", className)}
        {...props}
      >
        {children}
      </div>
    </TabsContext.Provider>
  )
}

const tabsListVariants = cva(
  "inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({ className, variant = "default", children, ...props }: React.ComponentProps<"div"> & VariantProps<typeof tabsListVariants>) {
  const { onValueChange } = useTabsContext()

  const childrenWithState = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      const childProps = child.props as { value?: string; onClick?: () => void }
      return React.cloneElement(child as React.ReactElement<{ value?: string; onClick?: () => void }>, {
        onClick: () => {
          if (childProps.value) {
            onValueChange(childProps.value)
          }
          childProps.onClick?.()
        },
      })
    }
    return child
  })

  return (
    <div
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      {childrenWithState}
    </div>
  )
}

function TabsTrigger({ className, value, children, onClick, ...props }: React.ComponentProps<"button"> & { value?: string }) {
  const { value: activeValue, onValueChange } = useTabsContext()
  const isActive = value === activeValue

  return (
    <button
      data-slot="tabs-trigger"
      data-active={isActive}
      className={cn(
        "relative inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all",
        "hover:text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-50",
        isActive && "bg-background text-foreground shadow-sm",
        className
      )}
      onClick={(e) => {
        if (value) {
          onValueChange(value)
        }
        onClick?.(e)
      }}
      {...props}
    >
      {children}
    </button>
  )
}

function TabsContent({ className, value, children, ...props }: React.ComponentProps<"div"> & { value?: string }) {
  const { value: activeValue } = useTabsContext()
  const isActive = value === activeValue

  if (!isActive) return null

  return (
    <div
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
