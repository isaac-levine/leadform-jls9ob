/**
 * @file Custom React hook for WebSocket connection management
 * @version 1.0.0
 * @description Implements real-time messaging functionality with enhanced reconnection logic,
 * token refresh handling, and message queuing for the frontend application
 */

import { useEffect, useRef, useCallback, useState } from 'react'; // v18.0.0
import { createSocketConnection, SocketEvents, ConnectionStatus } from '../lib/socket';
import { useThreadStore } from '../store/thread.store';
import { useAuth } from '../hooks/useAuth';

// Constants for WebSocket connection management
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds
const MAX_RECONNECT_ATTEMPTS = 10;
const BACKOFF_MULTIPLIER = 1.5;

/**
 * Custom hook for managing WebSocket connections with enhanced features
 * Implements real-time messaging requirements from technical specifications
 */
export function useWebSocket() {
  // State and store management
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const { user, token, refreshToken } = useAuth();
  const { addMessage, updateMessageStatus, queueMessage, processMessageQueue } = useThreadStore();

  // Refs for connection management
  const socketRef = useRef<ReturnType<typeof createSocketConnection> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  /**
   * Calculates reconnection delay with exponential backoff
   */
  const getReconnectDelay = useCallback((): number => {
    const delay = INITIAL_RECONNECT_DELAY * Math.pow(BACKOFF_MULTIPLIER, reconnectAttemptsRef.current);
    return Math.min(delay, MAX_RECONNECT_DELAY);
  }, []);

  /**
   * Handles WebSocket connection with token refresh and retry logic
   */
  const connect = useCallback(async () => {
    if (!token || connecting || connected) return;

    try {
      setConnecting(true);
      setConnectionStatus(ConnectionStatus.CONNECTING);

      // Create new socket connection
      socketRef.current = createSocketConnection(token, {
        reconnectDelay: getReconnectDelay(),
        maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS
      });

      // Set up event listeners
      socketRef.current.on(SocketEvents.CONNECTED, () => {
        setConnected(true);
        setConnecting(false);
        setConnectionStatus(ConnectionStatus.CONNECTED);
        reconnectAttemptsRef.current = 0;
        processMessageQueue(); // Process any queued messages
      });

      socketRef.current.on(SocketEvents.DISCONNECTED, () => {
        setConnected(false);
        setConnectionStatus(ConnectionStatus.DISCONNECTED);
      });

      socketRef.current.on(SocketEvents.RECONNECTING, (attempt: number) => {
        setConnectionStatus(ConnectionStatus.RECONNECTING);
        reconnectAttemptsRef.current = attempt;
      });

      socketRef.current.on(SocketEvents.ERROR, async (error: Error) => {
        console.error('WebSocket error:', error);
        
        if (error.message.includes('Authentication failed') && refreshToken) {
          try {
            await refreshToken(); // Attempt token refresh
            await connect(); // Retry connection with new token
          } catch (refreshError) {
            setConnectionStatus(ConnectionStatus.FAILED);
          }
        }
      });

      // Set up message handlers
      socketRef.current.on(SocketEvents.MESSAGE_RECEIVED, (message) => {
        addMessage(message);
      });

      socketRef.current.on(SocketEvents.MESSAGE_DELIVERED, ({ messageId, status }) => {
        updateMessageStatus(messageId, status);
      });

      socketRef.current.on(SocketEvents.MESSAGE_FAILED, ({ messageId, error }) => {
        updateMessageStatus(messageId, 'FAILED', error);
      });

    } catch (error) {
      console.error('WebSocket connection error:', error);
      setConnecting(false);
      setConnectionStatus(ConnectionStatus.FAILED);

      // Handle reconnection
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, getReconnectDelay());
      }
    }
  }, [token, connecting, connected, refreshToken, getReconnectDelay, addMessage, updateMessageStatus, processMessageQueue]);

  /**
   * Handles graceful WebSocket disconnection
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    setConnected(false);
    setConnecting(false);
    setConnectionStatus(ConnectionStatus.DISCONNECTED);
    reconnectAttemptsRef.current = 0;
  }, []);

  /**
   * Sends message through WebSocket with queuing support
   */
  const sendMessage = useCallback(async (event: SocketEvents, data: any): Promise<void> => {
    if (!socketRef.current || !connected) {
      // Queue message for later delivery
      queueMessage({ event, data });
      return;
    }

    try {
      await socketRef.current.send({ event, data });
    } catch (error) {
      console.error('Failed to send message:', error);
      queueMessage({ event, data });
      
      if (!connected) {
        await connect(); // Attempt reconnection
      }
    }
  }, [connected, connect, queueMessage]);

  // Connect WebSocket when authenticated
  useEffect(() => {
    if (user && token && !connected && !connecting) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [user, token, connected, connecting, connect, disconnect]);

  return {
    connected,
    connecting,
    connectionStatus,
    connect,
    disconnect,
    sendMessage
  };
}