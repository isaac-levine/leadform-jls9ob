/**
 * @file ThreadView component for displaying SMS conversation threads
 * @version 1.0.0
 * @description Implements real-time message thread display with infinite scrolling,
 * AI/human mode switching, and message input capabilities
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useIntersectionObserver } from 'react-intersection-observer';
import { ErrorBoundary } from 'react-error-boundary';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import AIStatus from './AIStatus';
import { useThread } from '../../hooks/useThread';
import { Message, MessageType } from '../../types/message.types';

// Constants for thread management
const SCROLL_THRESHOLD = 200; // Pixels from top to trigger load more
const SCROLL_BEHAVIOR: ScrollBehavior = 'smooth';
const MESSAGE_BATCH_SIZE = 20;
const TRANSITION_DELAY = 300;
const SCROLL_DEBOUNCE_DELAY = 150;

interface ThreadViewProps {
  threadId: string;
  className?: string;
  initialMessages?: Message[];
  onModeChange?: (mode: MessageType) => void;
}

/**
 * ThreadView Component
 * 
 * Displays SMS conversation thread with real-time updates, infinite scrolling,
 * and AI/human mode management. Implements thread management requirements from
 * technical specifications.
 */
const ThreadView: React.FC<ThreadViewProps> = ({
  threadId,
  className,
  initialMessages,
  onModeChange
}) => {
  // Thread state management
  const {
    messages,
    loading,
    error,
    connectionStatus,
    sendMessage,
    loadMoreMessages
  } = useThread(threadId);

  // Local state management
  const [isAIMode, setIsAIMode] = useState(true);
  const [transitionState, setTransitionState] = useState<'idle' | 'starting' | 'complete'>('idle');
  const [scrollPosition, setScrollPosition] = useState(0);

  // Refs for DOM manipulation
  const threadContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  // Intersection observer for infinite scrolling
  const { ref: topObserverRef, inView: isTopVisible } = useIntersectionObserver({
    threshold: 0,
    rootMargin: `${SCROLL_THRESHOLD}px 0px 0px 0px`
  });

  /**
   * Handles smooth scrolling to latest message
   */
  const scrollToBottom = useCallback((instant: boolean = false) => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({
        behavior: instant ? 'auto' : SCROLL_BEHAVIOR,
        block: 'end'
      });
    }
  }, []);

  /**
   * Handles thread scrolling and infinite loading
   */
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const { scrollTop } = container;

    // Update scroll position
    setScrollPosition(scrollTop);

    // Load more messages when near top
    if (scrollTop < SCROLL_THRESHOLD && !loading) {
      loadMoreMessages();
    }
  }, [loading, loadMoreMessages]);

  /**
   * Toggles between AI and human conversation management modes
   */
  const toggleAIMode = useCallback(() => {
    setTransitionState('starting');
    setIsAIMode(prev => !prev);
    
    // Notify parent component
    onModeChange?.(isAIMode ? MessageType.HUMAN : MessageType.AI);

    // Complete transition after delay
    setTimeout(() => {
      setTransitionState('complete');
    }, TRANSITION_DELAY);
  }, [isAIMode, onModeChange]);

  // Scroll to bottom on initial load and new messages
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(true);
    }
  }, [messages.length, scrollToBottom]);

  // Load more messages when top is visible
  useEffect(() => {
    if (isTopVisible && !loading) {
      loadMoreMessages();
    }
  }, [isTopVisible, loading, loadMoreMessages]);

  // Memoized message list with proper ordering
  const messageList = useMemo(() => {
    return [...messages].sort((a, b) => 
      new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
    );
  }, [messages]);

  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 text-error-500">
          Error loading messages. Please try refreshing the page.
        </div>
      }
    >
      <div className={`flex flex-col h-full ${className}`}>
        {/* Thread header with AI status */}
        <div className="flex items-center justify-between p-4 border-b">
          <AIStatus
            className="flex items-center space-x-2"
            mode={isAIMode ? MessageType.AI : MessageType.HUMAN}
            transitionState={transitionState}
          />
        </div>

        {/* Message thread container */}
        <div
          ref={threadContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
          onScroll={handleScroll}
          role="log"
          aria-live="polite"
          aria-label="Message thread"
        >
          {/* Load more trigger */}
          <div ref={topObserverRef} className="h-1" />

          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-center py-2">
              <span className="text-gray-500">Loading messages...</span>
            </div>
          )}

          {/* Message list */}
          {messageList.map((message, index) => (
            <div
              key={message._id.toString()}
              ref={index === messageList.length - 1 ? lastMessageRef : undefined}
            >
              <MessageBubble
                message={message}
                isLastMessage={index === messageList.length - 1}
              />
            </div>
          ))}

          {/* Empty state */}
          {!loading && messageList.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No messages yet. Start the conversation!
            </div>
          )}
        </div>

        {/* Message input */}
        <div className="p-4 border-t">
          <MessageInput
            threadId={threadId}
            isAIMode={isAIMode}
            onModeToggle={toggleAIMode}
            onMessageSent={() => scrollToBottom()}
          />
        </div>

        {/* Connection status */}
        {connectionStatus !== 'connected' && (
          <div className="p-2 bg-warning-50 text-warning-700 text-center">
            Connection lost. Attempting to reconnect...
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default ThreadView;