import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap shadow-xs transition-[color,background-color,border-color,box-shadow,transform,opacity] [transition-duration:var(--motion-fast)] [transition-timing-function:var(--motion-ease-standard)] outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/45 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-none hover:bg-primary/88",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-none hover:bg-secondary/85 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "shadow-none hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive shadow-none hover:bg-destructive/18 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
        primary:
          "bg-primary text-primary-foreground shadow-none hover:bg-primary/90",
        danger:
          "bg-destructive text-white shadow-none hover:bg-destructive/90",
      },
      size: {
        default:
          "h-9 gap-1.5 px-2.5 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-[min(var(--radius-control),8px)] px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-[min(var(--radius-control),10px)] px-2.5",
        lg: "h-10 gap-1.5 px-4",
        icon: "size-9",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-control),8px)] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8 rounded-[min(var(--radius-control),10px)]",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
    }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={ref}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
});

Button.displayName = "Button";

const pillButtonVariants = cva(
  "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-[color,background-color,border-color,box-shadow] [transition-duration:var(--motion-fast)] [transition-timing-function:var(--motion-ease-standard)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        danger:
          "bg-destructive text-white hover:bg-destructive/90",
      },
      size: {
        default: "",
        sm: "text-xs px-3 py-1",
        lg: "text-base px-6 py-3",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

const PillButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof pillButtonVariants>
>(({ className, variant, size, ...props }, ref) => {
  return (
    <button
      className={cn(pillButtonVariants({ variant, size, className }))}
      ref={ref}
      data-slot="pill-button"
      {...props}
    />
  );
});

PillButton.displayName = "PillButton";

export { Button, buttonVariants, PillButton, pillButtonVariants };
