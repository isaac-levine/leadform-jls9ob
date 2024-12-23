// react ^18.0.0
import { useEffect, useCallback } from 'react';
// Internal imports
import { useThreadStore } from '../store/thread.store';
import { Message, MessageStatus } from '../types/message.types';
import { SocketEvents } from '../lib/socket';

/**
 * Constants for thread management
 */
const MESSAGES_PER_PAGE = 50;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BACKOFF_BASE = 2000; // Base delay for exponential backoff in ms
const MESSAGE_CLEANUP_THRESHOLD = 1000;

/**
 * Interface for queued messages during offline periods
 */
interface QueuedMessage {
  content: string;
  timestamp: Date;
  retryCount: number;
}

/**
 * Custom hook for managing SMS thread state and real-time updates
 * Implements comprehensive thread management requirements from technical specification
 * @param threadId - Unique identifier of the SMS thread
 */
export function useThread(threadId: string) {
  // Extract required state and actions from thread store
  const {
    messages,
    loading,
    error,
    activeThreadId,
    connectionStatus,
    messageQueue
  } = useThreadStore();

  /**
   * Sends a new message with delivery tracking and offline support
   * @param content - Message content to send
   */
  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!threadId) {
      throw new Error('Thread ID is required to send message');
    }

    try {
      // Create optimistic message update
      const optimisticMessage: Message = {
        _id: new ObjectId(),
        leadId: new ObjectId(threadId),
        content,
        direction: MessageDirection.OUTBOUND,
        type: MessageType.HUMAN,
        status: MessageStatus.QUEUED,
        metadata: {},
        sentAt: new Date(),
        deliveredAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add message to store with optimistic update
      useThreadStore.getState().addMessage(optimisticMessage);

      // Check connection status
      if (connectionStatus === 'connected') {
        // Send message through WebSocket
        const response = await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ threadId, content })
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        // Update message status based on response
        const result = await response.json();
        useThreadStore.getState().updateMessageStatus(
          optimisticMessage._id.toString(),
          result.status
        );
      } else {
        // Queue message for later delivery
        useThreadStore.getState().addToMessageQueue({
          content,
          timestamp: new Date(),
          retryCount: 0
        });
      }
    } catch (error) {
      // Handle send failure
      useThreadStore.getState().updateMessageStatus(
        optimisticMessage._id.toString(),
        MessageStatus.FAILED,
        error instanceof Error ? error : new Error('Failed to send message')
      );
    }
  }, [threadId, connectionStatus]);

  /**
   * Retries sending a failed message with exponential backoff
   * @param messageId - ID of failed message to retry
   */
  const retryMessage = useCallback(async (messageId: string): Promise<void> => {
    const message = messages.find(msg => msg._id.toString() === messageId);
    if (!message || message.status !== MessageStatus.FAILED) return;

    const retryCount = message.metadata?.retryCount || 0;
    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      throw new Error(`Maximum retry attempts (${MAX_RETRY_ATTEMPTS}) exceeded`);
    }

    try {
      // Calculate backoff delay
      const backoffDelay = RETRY_BACKOFF_BASE * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));

      // Update status to queued
      useThreadStore.getState().updateMessageStatus(messageId, MessageStatus.QUEUED);

      // Attempt message resend
      const response = await fetch(`/api/messages/${messageId}/retry`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to retry message');
      }

      // Update status based on response
      const result = await response.json();
      useThreadStore.getState().updateMessageStatus(messageId, result.status);
    } catch (error) {
      useThreadStore.getState().updateMessageStatus(
        messageId,
        MessageStatus.FAILED,
        error instanceof Error ? error : new Error('Retry failed')
      );
    }
  }, [messages]);

  /**
   * Loads additional messages with pagination support
   */
  const loadMoreMessages = useCallback(async (): Promise<void> => {
    if (!threadId || loading) return;

    try {
      const currentPage = Math.ceil(messages.length / MESSAGES_PER_PAGE) + 1;
      
      // Set loading state
      useThreadStore.getState().setLoading(true);

      // Fetch additional messages
      const response = await fetch(
        `/api/threads/${threadId}/messages?page=${currentPage}&limit=${MESSAGES_PER_PAGE}`
      );

      if (!response.ok) {
        throw new Error('Failed to load messages');
      }

      const data = await response.json();
      useThreadStore.getState().addMessages(data.messages);
    } catch (error) {
      useThreadStore.getState().setError(
        error instanceof Error ? error : new Error('Failed to load messages')
      );
    } finally {
      useThreadStore.getState().setLoading(false);
    }
  }, [threadId, loading, messages.length]);

  /**
   * Set up WebSocket event listeners and cleanup
   */
  useEffect(() => {
    if (!threadId) return;

    // Set active thread
    useThreadStore.getState().setActiveThread(threadId);

    // Clean up on unmount
    return () => {
      useThreadStore.getState().setActiveThread(null);
      useThreadStore.getState().clearMessages();
    };
  }, [threadId]);

  return {
    messages,
    loading,
    error,
    connectionStatus,
    sendMessage,
    retryMessage,
    loadMoreMessages
  };
}