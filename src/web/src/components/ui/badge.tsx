"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "clsx"
import { ComponentSize } from "../../types/ui.types"

// Define badge variants using class-variance-authority
// Version: class-variance-authority ^0.7.0
const badgeVariants = cva(
  // Base styles that apply to all badges
  "inline-flex items-center justify-center rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        success: "bg-success text-success-foreground hover:bg-success/90",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90",
        error: "bg-error text-error-foreground hover:bg-error/90",
      },
      size: {
        [ComponentSize.SMALL]: "text-xs px-2 py-0.5 rounded-sm",
        [ComponentSize.MEDIUM]: "text-sm px-2.5 py-0.5 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: ComponentSize.MEDIUM,
    },
  }
)

// Extract variant props type from badgeVariants
export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  variant?: "default" | "success" | "warning" | "error"
  size?: ComponentSize
  className?: string
  children: React.ReactNode
}

/**
 * Badge Component
 * 
 * A reusable badge component that displays short status text, labels, or counts
 * with different variants and styles. Built with Acetunity UI and ShadCN design systems.
 *
 * @param {BadgeProps} props - The badge component props
 * @param {string} [props.variant="default"] - Visual style variant of the badge
 * @param {ComponentSize} [props.size=ComponentSize.MEDIUM] - Size variant of the badge
 * @param {string} [props.className] - Additional CSS classes to apply
 * @param {React.ReactNode} props.children - Content to display inside the badge
 * 
 * @example
 * ```tsx
 * <Badge variant="success" size={ComponentSize.SMALL}>
 *   Completed
 * </Badge>
 * ```
 */
const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      />
    )
  }
)

Badge.displayName = "Badge"

export { Badge, badgeVariants }