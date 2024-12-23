// zustand v4.4.0
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Message, MessageStatus } from '../types/message.types';
import { SocketEvents } from '../lib/socket';

/**
 * Constants for thread store configuration
 */
const MESSAGES_PER_PAGE = 50;
const MAX_RETRY_ATTEMPTS = 3;
const MESSAGE_CLEANUP_THRESHOLD = 1000;
const STORE_NAME = 'thread-store';
const STORE_VERSION = 1;

/**
 * Interface for thread store error state
 */
interface ThreadError {
  code: string;
  message: string;
  timestamp: Date;
}

/**
 * Interface defining the thread store state
 */
export interface ThreadStore {
  // State
  messages: Message[];
  activeThreadId: string | null;
  loading: boolean;
  error: ThreadError | null;
  hasMore: boolean;
  currentPage: number;

  // Actions
  setActiveThread: (threadId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  updateMessageStatus: (messageId: string, status: MessageStatus, error?: Error) => void;
  loadMessages: (page: number) => Promise<void>;
  retryFailedMessage: (messageId: string) => Promise<void>;
  clearError: () => void;
}

/**
 * Create thread store with middleware
 */
export const useThreadStore = create<ThreadStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        messages: [],
        activeThreadId: null,
        loading: false,
        error: null,
        hasMore: true,
        currentPage: 1,

        /**
         * Sets active thread and loads initial messages
         */
        setActiveThread: async (threadId: string) => {
          try {
            set({ 
              loading: true, 
              error: null,
              activeThreadId: threadId,
              messages: [],
              currentPage: 1,
              hasMore: true
            });

            await get().loadMessages(1);
          } catch (error) {
            set({
              error: {
                code: 'THREAD_ACTIVATION_ERROR',
                message: error instanceof Error ? error.message : 'Failed to activate thread',
                timestamp: new Date()
              }
            });
          } finally {
            set({ loading: false });
          }
        },

        /**
         * Adds new message to thread with optimistic updates
         */
        addMessage: (message: Message) => {
          set((state) => {
            // Validate message belongs to active thread
            if (message.leadId.toString() !== state.activeThreadId) {
              return state;
            }

            // Add message and sort by timestamp
            const updatedMessages = [...state.messages, message].sort(
              (a, b) => b.sentAt.getTime() - a.sentAt.getTime()
            );

            // Cleanup old messages if threshold exceeded
            if (updatedMessages.length > MESSAGE_CLEANUP_THRESHOLD) {
              updatedMessages.splice(MESSAGE_CLEANUP_THRESHOLD);
            }

            return { messages: updatedMessages };
          });
        },

        /**
         * Updates message delivery status
         */
        updateMessageStatus: (messageId: string, status: MessageStatus, error?: Error) => {
          set((state) => {
            const messageIndex = state.messages.findIndex(
              (msg) => msg._id.toString() === messageId
            );

            if (messageIndex === -1) return state;

            const updatedMessages = [...state.messages];
            const message = { ...updatedMessages[messageIndex] };

            message.status = status;
            if (status === MessageStatus.DELIVERED) {
              message.deliveredAt = new Date();
            }

            if (error && status === MessageStatus.FAILED) {
              message.metadata = {
                ...message.metadata,
                error: error.message,
                retryCount: (message.metadata?.retryCount || 0) + 1
              };
            }

            updatedMessages[messageIndex] = message;
            return { messages: updatedMessages };
          });
        },

        /**
         * Loads paginated messages for active thread
         */
        loadMessages: async (page: number) => {
          const state = get();
          if (!state.activeThreadId || state.loading) return;

          try {
            set({ loading: true, error: null });

            // API call would go here
            const response = await fetch(
              `/api/threads/${state.activeThreadId}/messages?page=${page}&limit=${MESSAGES_PER_PAGE}`
            );

            if (!response.ok) {
              throw new Error('Failed to load messages');
            }

            const data = await response.json();
            const newMessages = data.messages as Message[];

            set((state) => ({
              messages: page === 1 
                ? newMessages 
                : [...state.messages, ...newMessages],
              hasMore: newMessages.length === MESSAGES_PER_PAGE,
              currentPage: page,
              error: null
            }));
          } catch (error) {
            set({
              error: {
                code: 'MESSAGE_LOAD_ERROR',
                message: error instanceof Error ? error.message : 'Failed to load messages',
                timestamp: new Date()
              }
            });
          } finally {
            set({ loading: false });
          }
        },

        /**
         * Retries sending a failed message
         */
        retryFailedMessage: async (messageId: string) => {
          const state = get();
          const message = state.messages.find(msg => msg._id.toString() === messageId);

          if (!message || message.status !== MessageStatus.FAILED) return;

          const retryCount = message.metadata?.retryCount || 0;
          if (retryCount >= MAX_RETRY_ATTEMPTS) {
            set({
              error: {
                code: 'MAX_RETRY_EXCEEDED',
                message: `Maximum retry attempts (${MAX_RETRY_ATTEMPTS}) exceeded`,
                timestamp: new Date()
              }
            });
            return;
          }

          try {
            // Update status to queued
            get().updateMessageStatus(messageId, MessageStatus.QUEUED);

            // API call would go here
            const response = await fetch(`/api/messages/${messageId}/retry`, {
              method: 'POST'
            });

            if (!response.ok) {
              throw new Error('Failed to retry message');
            }

            // Update status based on response
            const result = await response.json();
            get().updateMessageStatus(messageId, result.status);
          } catch (error) {
            get().updateMessageStatus(
              messageId, 
              MessageStatus.FAILED, 
              error instanceof Error ? error : new Error('Retry failed')
            );
          }
        },

        /**
         * Clears current error state
         */
        clearError: () => set({ error: null })
      }),
      {
        name: STORE_NAME,
        version: STORE_VERSION,
        partialize: (state) => ({
          activeThreadId: state.activeThreadId,
          currentPage: state.currentPage
        })
      }
    )
  )
);

/**
 * Subscribe to socket events for real-time updates
 */
export const subscribeToThreadUpdates = (socket: any) => {
  socket.on(SocketEvents.MESSAGE_RECEIVED, (message: Message) => {
    useThreadStore.getState().addMessage(message);
  });

  socket.on(SocketEvents.MESSAGE_DELIVERED, ({ messageId, status }: { messageId: string, status: MessageStatus }) => {
    useThreadStore.getState().updateMessageStatus(messageId, status);
  });

  socket.on(SocketEvents.MESSAGE_FAILED, ({ messageId, error }: { messageId: string, error: Error }) => {
    useThreadStore.getState().updateMessageStatus(messageId, MessageStatus.FAILED, error);
  });

  socket.on(SocketEvents.THREAD_UPDATED, () => {
    const { activeThreadId, currentPage } = useThreadStore.getState();
    if (activeThreadId) {
      useThreadStore.getState().loadMessages(currentPage);
    }
  });
};