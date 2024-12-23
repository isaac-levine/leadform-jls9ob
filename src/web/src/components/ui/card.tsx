"use client"

import * as React from "react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Interface for Card component props
interface CardProps {
  children: React.ReactNode
  className?: string
  role?: string
  "aria-label"?: string
}

/**
 * Card component - A reusable container with consistent styling for content grouping
 * Built with Acetunity UI and ShadCN design systems
 * 
 * @version 1.0.0
 */
const Card = React.forwardRef<HTMLDivElement, CardProps & React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, role = "region", "aria-label": ariaLabel, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role={role}
        aria-label={ariaLabel}
        className={twMerge(
          clsx(
            "rounded-lg border bg-card text-card-foreground shadow-sm",
            "transition-all duration-200",
            "hover:shadow-md",
            "dark:border-gray-700 dark:bg-gray-800",
            className
          )
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Card.displayName = "Card"

/**
 * CardHeader component - Container for card title and description
 */
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={twMerge(
          clsx(
            "flex flex-col space-y-1.5 p-6",
            "border-b border-gray-200",
            "dark:border-gray-700",
            className
          )
        )}
        {...props}
      />
    )
  }
)
CardHeader.displayName = "CardHeader"

/**
 * CardContent component - Main content area of the card
 */
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={twMerge(
          clsx(
            "p-6",
            "overflow-auto",
            className
          )
        )}
        {...props}
      />
    )
  }
)
CardContent.displayName = "CardContent"

/**
 * CardFooter component - Container for card actions and secondary content
 */
const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={twMerge(
          clsx(
            "flex items-center p-6 pt-0",
            "border-t border-gray-200",
            "dark:border-gray-700",
            className
          )
        )}
        {...props}
      />
    )
  }
)
CardFooter.displayName = "CardFooter"

// Export all card components as named exports
export {
  Card,
  CardHeader,
  CardContent,
  CardFooter
}