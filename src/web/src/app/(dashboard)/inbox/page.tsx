"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { debounce } from "lodash"
import { ThreadList } from "@/components/inbox/ThreadList"
import { useThread } from "@/hooks/useThread"
import { useThreadStore } from "@/store/thread.store"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ComponentSize } from "@/types/ui.types"

// Constants for component configuration
const THREADS_PER_PAGE = 20
const DEBOUNCE_DELAY = 300
const INTERSECTION_THRESHOLD = 0.5

/**
 * InboxPage Component
 * 
 * Implements unified SMS inbox with real-time thread management and virtualization
 * Features:
 * - Real-time thread updates via WebSocket
 * - Virtualized thread list for performance
 * - AI conversation management with human takeover
 * - Progressive loading with intersection observer
 * 
 * @version 1.0.0
 */
export default function InboxPage() {
  // Initialize hooks and state
  const router = useRouter()
  const { activeThreadId, connectionState } = useThreadStore()
  const {
    messages,
    loading,
    error,
    connectionStatus,
    loadMoreMessages
  } = useThread(activeThreadId || '')

  // Intersection observer for infinite loading
  const observerRef = React.useRef<IntersectionObserver | null>(null)
  const loadTriggerRef = React.useRef<HTMLDivElement>(null)

  /**
   * Debounced thread selection handler
   * Prevents rapid thread switching and provides smooth navigation
   */
  const handleThreadSelect = React.useCallback(
    debounce(async (threadId: string) => {
      try {
        // Update active thread in store
        await useThreadStore.getState().setActiveThread(threadId)
        
        // Navigate to thread detail view
        router.push(`/inbox/${threadId}`)
      } catch (error) {
        console.error('Failed to select thread:', error)
      }
    }, DEBOUNCE_DELAY),
    [router]
  )

  /**
   * Setup intersection observer for progressive loading
   */
  React.useEffect(() => {
    if (!loadTriggerRef.current) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (target.isIntersecting && !loading) {
          loadMoreMessages()
        }
      },
      { threshold: INTERSECTION_THRESHOLD }
    )

    observerRef.current.observe(loadTriggerRef.current)

    return () => {
      observerRef.current?.disconnect()
    }
  }, [loading, loadMoreMessages])

  /**
   * Keyboard navigation handler
   */
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        // Implement keyboard navigation logic here
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Error boundary
  if (error) {
    return (
      <Card className="m-4 p-6 text-center">
        <h2 className="text-lg font-semibold text-error mb-2">
          Failed to load inbox
        </h2>
        <p className="text-muted-foreground mb-4">
          {error instanceof Error ? error.message : 'An error occurred'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="text-primary hover:underline"
        >
          Retry
        </button>
      </Card>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Connection status indicator */}
      {connectionState !== 'connected' && (
        <div className="bg-warning/10 p-2 text-center">
          <Badge
            variant="warning"
            size={ComponentSize.SMALL}
          >
            {connectionState === 'reconnecting' ? 'Reconnecting...' : 'Disconnected'}
          </Badge>
        </div>
      )}

      {/* Thread list with virtualization */}
      <div className="flex-1 overflow-hidden">
        <ThreadList
          selectedThreadId={activeThreadId}
          onThreadSelect={handleThreadSelect}
          pageSize={THREADS_PER_PAGE}
          onLoadMore={loadMoreMessages}
          className="h-full"
        />
      </div>

      {/* Progressive loading trigger */}
      <div
        ref={loadTriggerRef}
        className="h-px w-full"
        aria-hidden="true"
      />

      {/* Loading indicator */}
      {loading && (
        <div className="p-4 text-center">
          <Badge
            variant="default"
            size={ComponentSize.SMALL}
          >
            Loading...
          </Badge>
        </div>
      )}
    </div>
  )
}