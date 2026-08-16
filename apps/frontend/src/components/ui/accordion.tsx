"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function Accordion({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {children}
    </div>
  )
}

function AccordionItem({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("border-b", className)} {...props}>
      {children}
    </div>
  )
}

function AccordionTrigger({ className, children, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function AccordionContent({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("overflow-hidden text-sm transition-all", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
