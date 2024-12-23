// react v18.0.0
// @radix-ui/react-tabs v1.0.0
// clsx v2.0.0
// tailwind-merge v3.0.0

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { ComponentSize } from '../../types/ui.types'

// Root component props interface
interface TabsRootProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  children: React.ReactNode
}

// List component props interface
interface TabsListProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  size?: ComponentSize
  className?: string
  children: React.ReactNode
}

// Trigger component props interface
interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  value: string
  disabled?: boolean
  className?: string
  children: React.ReactNode
}

// Content component props interface
interface TabsContentProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> {
  value: string
  forceMount?: boolean
  className?: string
  children: React.ReactNode
}

/**
 * Root tabs container component
 * Provides context and state management for the tabs interface
 */
const TabsRoot = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  TabsRootProps
>(({ className, defaultValue, value, onValueChange, ...props }, ref) => (
  <TabsPrimitive.Root
    ref={ref}
    defaultValue={defaultValue}
    value={value}
    onValueChange={onValueChange}
    className={twMerge('w-full', className)}
    {...props}
  />
))
TabsRoot.displayName = 'TabsRoot'

/**
 * Container for tab triggers
 * Implements size variants and responsive styling
 */
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, size = ComponentSize.MEDIUM, ...props }, ref) => {
  // Size-specific styles
  const sizeStyles = {
    [ComponentSize.SMALL]: 'h-8 text-sm',
    [ComponentSize.MEDIUM]: 'h-10 text-base',
    [ComponentSize.LARGE]: 'h-12 text-lg'
  }

  return (
    <TabsPrimitive.List
      ref={ref}
      className={twMerge(
        'inline-flex items-center justify-center rounded-lg bg-muted p-1',
        'w-full sm:w-auto',
        sizeStyles[size],
        className
      )}
      {...props}
    />
  )
})
TabsList.displayName = 'TabsList'

/**
 * Individual tab trigger button
 * Handles active states and accessibility
 */
const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, disabled, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    disabled={disabled}
    className={twMerge(
      // Base styles
      'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1',
      'ring-offset-background transition-all focus-visible:outline-none',
      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      // State styles
      'data-[state=active]:bg-background data-[state=active]:text-foreground',
      'data-[state=active]:shadow-sm',
      // Disabled styles
      'disabled:pointer-events-none disabled:opacity-50',
      // Hover styles
      'hover:bg-background/50',
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = 'TabsTrigger'

/**
 * Container for tab content
 * Implements content transitions and mounting behavior
 */
const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  TabsContentProps
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={twMerge(
      // Base styles
      'mt-2 ring-offset-background',
      // Focus styles
      'focus-visible:outline-none focus-visible:ring-2',
      'focus-visible:ring-ring focus-visible:ring-offset-2',
      // Animation styles
      'data-[state=inactive]:animate-out data-[state=active]:animate-in',
      'data-[state=inactive]:fade-out-0 data-[state=active]:fade-in-0',
      'data-[state=inactive]:zoom-out-95 data-[state=active]:zoom-in-95',
      className
    )}
    {...props}
  />
))
TabsContent.displayName = 'TabsContent'

// Export all components
export {
  TabsRoot,
  TabsList,
  TabsTrigger,
  TabsContent
}
```

This implementation provides a fully-featured tabs component that:

1. Uses Radix UI's tabs primitive for core functionality and accessibility
2. Implements Acetunity UI and ShadCN design systems through carefully crafted styles
3. Supports multiple size variants (small, medium, large) through the ComponentSize enum
4. Provides both controlled and uncontrolled state management
5. Includes proper ARIA attributes and keyboard navigation support
6. Features smooth transitions and animations
7. Implements responsive design considerations
8. Includes comprehensive TypeScript types and interfaces
9. Follows enterprise-grade coding practices with detailed comments

The component can be used in both controlled and uncontrolled modes:

Uncontrolled usage:
```tsx
<TabsRoot defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</TabsRoot>
```

Controlled usage:
```tsx
<TabsRoot value={activeTab} onValueChange={setActiveTab}>
  <TabsList size={ComponentSize.LARGE}>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2" disabled>Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</TabsRoot>