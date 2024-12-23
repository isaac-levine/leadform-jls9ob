// @jest/globals ^29.0.0
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
// @testing-library/react-hooks ^8.0.0
import { renderHook, act } from '@testing-library/react-hooks';
// @testing-library/react ^14.0.0
import { cleanup } from '@testing-library/react';

// Internal imports
import { useThread } from '../../src/hooks/useThread';
import { useThreadStore } from '../../src/store/thread.store';
import { SocketEvents } from '../../src/lib/socket';
import { Message, MessageStatus, MessageType, MessageDirection } from '../../src/types/message.types';
import { ObjectId } from 'mongodb';

describe('useThread Hook', () => {
  // Test constants
  const TEST_THREAD_ID = new ObjectId().toString();
  const MOCK_MESSAGE: Message = {
    _id: new ObjectId(),
    leadId: new ObjectId(),
    content: 'Test message',
    direction: MessageDirection.OUTBOUND,
    type: MessageType.HUMAN,
    status: MessageStatus.QUEUED,
    metadata: {},
    sentAt: new Date(),
    deliveredAt: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Mock setup
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock fetch for API calls
    global.fetch = jest.fn();
    
    // Mock thread store
    jest.spyOn(useThreadStore, 'getState').mockImplementation(() => ({
      messages: [],
      loading: false,
      error: null,
      activeThreadId: null,
      setActiveThread: jest.fn(),
      addMessage: jest.fn(),
      updateMessageStatus: jest.fn(),
      loadMessages: jest.fn(),
      retryFailedMessage: jest.fn(),
      clearError: jest.fn()
    }));

    // Setup fake timers
    jest.useFakeTimers();
  });

  // Cleanup after each test
  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useThread(TEST_THREAD_ID));

      expect(result.current.messages).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(useThreadStore.getState().setActiveThread).toHaveBeenCalledWith(TEST_THREAD_ID);
    });

    it('should handle empty thread ID', () => {
      const { result } = renderHook(() => useThread(''));
      
      expect(result.current.error).toBeTruthy();
      expect(useThreadStore.getState().setActiveThread).not.toHaveBeenCalled();
    });
  });

  describe('Message Operations', () => {
    it('should send message successfully', async () => {
      // Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: MessageStatus.SENT })
      });

      const { result } = renderHook(() => useThread(TEST_THREAD_ID));

      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/messages/send', expect.any(Object));
      expect(useThreadStore.getState().addMessage).toHaveBeenCalled();
    });

    it('should handle message send failure', async () => {
      // Mock failed API response
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useThread(TEST_THREAD_ID));

      await act(async () => {
        await result.current.sendMessage('Test message');
      });

      expect(useThreadStore.getState().updateMessageStatus).toHaveBeenCalledWith(
        expect.any(String),
        MessageStatus.FAILED,
        expect.any(Error)
      );
    });

    it('should retry failed message successfully', async () => {
      // Mock successful retry API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: MessageStatus.SENT })
      });

      const { result } = renderHook(() => useThread(TEST_THREAD_ID));

      await act(async () => {
        await result.current.retryFailedMessage(MOCK_MESSAGE._id.toString());
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `/api/messages/${MOCK_MESSAGE._id.toString()}/retry`,
        expect.any(Object)
      );
    });
  });

  describe('Message Loading', () => {
    it('should load more messages successfully', async () => {
      // Mock successful messages API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ messages: [MOCK_MESSAGE] })
      });

      const { result } = renderHook(() => useThread(TEST_THREAD_ID));

      await act(async () => {
        await result.current.loadMoreMessages();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/threads/${TEST_THREAD_ID}/messages`),
        expect.any(Object)
      );
      expect(useThreadStore.getState().addMessages).toHaveBeenCalled();
    });

    it('should handle message loading failure', async () => {
      // Mock failed messages API response
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to load'));

      const { result } = renderHook(() => useThread(TEST_THREAD_ID));

      await act(async () => {
        await result.current.loadMoreMessages();
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('WebSocket Events', () => {
    it('should handle message received event', async () => {
      const { result } = renderHook(() => useThread(TEST_THREAD_ID));

      await act(async () => {
        // Simulate WebSocket message received event
        window.dispatchEvent(new MessageEvent(SocketEvents.MESSAGE_RECEIVED, {
          data: JSON.stringify(MOCK_MESSAGE)
        }));
      });

      expect(useThreadStore.getState().addMessage).toHaveBeenCalledWith(MOCK_MESSAGE);
    });

    it('should handle message delivery status update', async () => {
      const { result } = renderHook(() => useThread(TEST_THREAD_ID));

      await act(async () => {
        // Simulate WebSocket delivery status event
        window.dispatchEvent(new MessageEvent(SocketEvents.MESSAGE_DELIVERED, {
          data: JSON.stringify({
            messageId: MOCK_MESSAGE._id.toString(),
            status: MessageStatus.DELIVERED
          })
        }));
      });

      expect(useThreadStore.getState().updateMessageStatus).toHaveBeenCalledWith(
        MOCK_MESSAGE._id.toString(),
        MessageStatus.DELIVERED
      );
    });

    it('should handle socket reconnection', async () => {
      const { result } = renderHook(() => useThread(TEST_THREAD_ID));

      await act(async () => {
        // Simulate WebSocket reconnection event
        window.dispatchEvent(new Event(SocketEvents.CONNECTED));
      });

      expect(useThreadStore.getState().loadMessages).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useThread(TEST_THREAD_ID));

      unmount();

      expect(useThreadStore.getState().setActiveThread).toHaveBeenCalledWith(null);
      expect(useThreadStore.getState().clearMessages).toHaveBeenCalled();
    });
  });
});