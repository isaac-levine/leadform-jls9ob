"use client"

import * as React from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { clsx } from "clsx"
import { useThread } from "../../hooks/useThread"
import { Message, MessageStatus, MessageType } from "../../types/message.types"
import { Card, CardContent } from "../ui/card"
import { Badge } from "../ui/badge"
import { ComponentSize } from "../../types/ui.types"

// Constants for component configuration
const THREAD_ITEM_HEIGHT = 72
const THREADS_PER_PAGE = 20
const MESSAGE_PREVIEW_LENGTH = 100
const SELECTION_DEBOUNCE_MS = 150
const ERROR_RETRY_LIMIT = 3

// Props interface for ThreadList component
interface ThreadListProps {
  selectedThreadId: string | null
  onThreadSelect: (threadId: string) => void
  pageSize?: number
  onLoadMore?: () => void
  className?: string
}

// Props interface for ThreadItem component
interface ThreadItemProps {
  thread: Message
  isSelected: boolean
  onClick: () => void
  style?: React.CSSProperties
  className?: string
}

/**
 * ThreadItem component - Renders individual thread preview with status
 */
const ThreadItem: React.FC<ThreadItemProps> = React.memo(({
  thread,
  isSelected,
  onClick,
  style,
  className
}) => {
  // Format timestamp for display
  const formattedTime = React.useMemo(() => {
    const date = new Date(thread.sentAt)
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date)
  }, [thread.sentAt])

  // Truncate message preview
  const messagePreview = React.useMemo(() => {
    return thread.content.length > MESSAGE_PREVIEW_LENGTH
      ? `${thread.content.substring(0, MESSAGE_PREVIEW_LENGTH)}...`
      : thread.content
  }, [thread.content])

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyPress={(e) => e.key === 'Enter' && onClick()}
      className={clsx(
        "cursor-pointer transition-colors",
        "hover:bg-gray-50 dark:hover:bg-gray-700",
        isSelected && "bg-primary/5 border-primary",
        className
      )}
      style={style}
    >
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {thread.isAI && (
              <Badge 
                variant="default" 
                size={ComponentSize.SMALL}
              >
                AI
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {formattedTime}
            </span>
          </div>
          <p className="text-sm mt-1 truncate">
            {messagePreview}
          </p>
        </div>
        <div className="ml-4">
          <Badge
            variant={getStatusVariant(thread.status)}
            size={ComponentSize.SMALL}
          >
            {formatStatus(thread.status)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
})
ThreadItem.displayName = "ThreadItem"

/**
 * ThreadList component - Renders virtualized list of conversation threads
 */
const ThreadList: React.FC<ThreadListProps> = ({
  selectedThreadId,
  onThreadSelect,
  pageSize = THREADS_PER_PAGE,
  onLoadMore,
  className
}) => {
  // Get thread data and state from hook
  const {
    messages,
    loading,
    error,
    connectionStatus,
    loadMoreMessages
  } = useThread(selectedThreadId || '')

  // Setup virtualizer for performance
  const parentRef = React.useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => THREAD_ITEM_HEIGHT,
    overscan: 5
  })

  // Handle thread selection with debounce
  const handleThreadSelect = React.useCallback((threadId: string) => {
    const timeoutId = setTimeout(() => {
      onThreadSelect(threadId)
    }, SELECTION_DEBOUNCE_MS)
    return () => clearTimeout(timeoutId)
  }, [onThreadSelect])

  // Handle infinite scroll
  React.useEffect(() => {
    const scrollElement = parentRef.current
    if (!scrollElement) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement
      if (scrollHeight - scrollTop - clientHeight < 100) {
        onLoadMore?.()
        loadMoreMessages()
      }
    }

    scrollElement.addEventListener('scroll', handleScroll)
    return () => scrollElement.removeEventListener('scroll', handleScroll)
  }, [onLoadMore, loadMoreMessages])

  // Render loading state
  if (loading && !messages.length) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-[72px] bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg"
          />
        ))}
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-error mb-2">Failed to load threads</p>
        <button
          onClick={() => loadMoreMessages()}
          className="text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  // Render empty state
  if (!messages.length) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No messages yet
      </div>
    )
  }

  return (
    <div
      ref={parentRef}
      className={clsx(
        "relative overflow-auto",
        connectionStatus !== 'connected' && "opacity-70",
        className
      )}
      style={{
        height: `${messages.length * THREAD_ITEM_HEIGHT}px`,
        maxHeight: "100vh"
      }}
    >
      {connectionStatus !== 'connected' && (
        <div className="sticky top-0 z-10 bg-warning/10 p-2 text-center text-sm">
          Reconnecting...
        </div>
      )}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const thread = messages[virtualItem.index]
          return (
            <ThreadItem
              key={thread._id.toString()}
              thread={thread}
              isSelected={selectedThreadId === thread._id.toString()}
              onClick={() => handleThreadSelect(thread._id.toString())}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

// Helper functions for status display
const getStatusVariant = (status: MessageStatus): "default" | "success" | "warning" | "error" => {
  switch (status) {
    case MessageStatus.DELIVERED:
      return "success"
    case MessageStatus.QUEUED:
      return "warning"
    case MessageStatus.FAILED:
      return "error"
    default:
      return "default"
  }
}

const formatStatus = (status: MessageStatus): string => {
  return status.charAt(0) + status.slice(1).toLowerCase()
}

export default ThreadList