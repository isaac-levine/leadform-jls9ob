// ws ^8.0.0 - WebSocket client implementation
import WebSocket from 'ws';
// events ^3.0.0 - Event handling
import { EventEmitter } from 'events';

/**
 * Socket event types for message and connection states
 */
export enum SocketEvents {
  MESSAGE_RECEIVED = 'message:received',
  MESSAGE_SENT = 'message:sent',
  MESSAGE_DELIVERED = 'message:delivered',
  MESSAGE_FAILED = 'message:failed',
  THREAD_UPDATED = 'thread:updated',
  CONNECTED = 'connection:connected',
  DISCONNECTED = 'connection:disconnected',
  RECONNECTING = 'connection:reconnecting',
  ERROR = 'connection:error'
}

/**
 * Connection states for socket management
 */
enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

/**
 * Message interface for queue management
 */
interface Message {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retryCount: number;
}

/**
 * Socket connection options
 */
interface SocketOptions {
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  pingInterval?: number;
  connectionTimeout?: number;
}

// Environment configuration
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;
const PING_INTERVAL = 30000;
const CONNECTION_TIMEOUT = 5000;

/**
 * Enhanced EventEmitter for WebSocket management
 */
class SocketEventEmitter extends EventEmitter {
  private socket: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private messageQueue: Message[] = [];
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private pingTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private options: SocketOptions;

  constructor(options: SocketOptions = {}) {
    super();
    this.options = {
      reconnectDelay: RECONNECT_DELAY,
      maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
      pingInterval: PING_INTERVAL,
      connectionTimeout: CONNECTION_TIMEOUT,
      ...options
    };
  }

  /**
   * Establishes WebSocket connection with authentication
   */
  public connect(authToken: string): void {
    if (!SOCKET_URL) {
      throw new Error('Socket URL not configured');
    }

    try {
      this.connectionState = ConnectionState.CONNECTING;
      this.socket = new WebSocket(SOCKET_URL, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      this.setupSocketHandlers();
      this.setupPingPong();
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Gracefully disconnects the WebSocket
   */
  public disconnect(): void {
    this.clearTimers();
    if (this.socket) {
      this.socket.close(1000, 'Client disconnected');
      this.socket = null;
    }
    this.connectionState = ConnectionState.DISCONNECTED;
    this.emit(SocketEvents.DISCONNECTED);
  }

  /**
   * Sends message through WebSocket with queuing support
   */
  public send(message: Message): void {
    if (this.connectionState === ConnectionState.CONNECTED && this.socket) {
      try {
        this.socket.send(JSON.stringify(message));
        this.emit(SocketEvents.MESSAGE_SENT, message);
      } catch (error) {
        this.queueMessage(message);
        this.handleError(error);
      }
    } else {
      this.queueMessage(message);
    }
  }

  /**
   * Returns current connection state
   */
  public getState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Sets up WebSocket event handlers
   */
  private setupSocketHandlers(): void {
    if (!this.socket) return;

    this.socket.onopen = () => {
      this.connectionState = ConnectionState.CONNECTED;
      this.reconnectAttempts = 0;
      this.emit(SocketEvents.CONNECTED);
      this.processMessageQueue();
    };

    this.socket.onclose = (event) => {
      if (event.code !== 1000) {
        this.handleReconnection();
      } else {
        this.connectionState = ConnectionState.DISCONNECTED;
        this.emit(SocketEvents.DISCONNECTED);
      }
    };

    this.socket.onerror = (error) => {
      this.handleError(error);
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data.toString());
        this.handleIncomingMessage(message);
      } catch (error) {
        this.handleError(error);
      }
    };
  }

  /**
   * Handles incoming WebSocket messages
   */
  private handleIncomingMessage(message: any): void {
    switch (message.type) {
      case 'message':
        this.emit(SocketEvents.MESSAGE_RECEIVED, message);
        break;
      case 'thread_update':
        this.emit(SocketEvents.THREAD_UPDATED, message);
        break;
      case 'delivery_status':
        this.handleDeliveryStatus(message);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  /**
   * Handles message delivery status updates
   */
  private handleDeliveryStatus(status: any): void {
    if (status.delivered) {
      this.emit(SocketEvents.MESSAGE_DELIVERED, status);
    } else {
      this.emit(SocketEvents.MESSAGE_FAILED, status);
    }
  }

  /**
   * Sets up ping/pong health checks
   */
  private setupPingPong(): void {
    this.pingTimer = setInterval(() => {
      if (this.connectionState === ConnectionState.CONNECTED && this.socket) {
        try {
          this.socket.ping();
        } catch (error) {
          this.handleError(error);
        }
      }
    }, this.options.pingInterval);
  }

  /**
   * Handles reconnection logic with exponential backoff
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts!) {
      this.connectionState = ConnectionState.FAILED;
      this.emit(SocketEvents.ERROR, new Error('Max reconnection attempts reached'));
      return;
    }

    this.connectionState = ConnectionState.RECONNECTING;
    this.emit(SocketEvents.RECONNECTING, this.reconnectAttempts + 1);

    const delay = this.options.reconnectDelay! * Math.pow(2, this.reconnectAttempts);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(this.socket?.url || '');
    }, delay);
  }

  /**
   * Queues message for later delivery
   */
  private queueMessage(message: Message): void {
    this.messageQueue.push({
      ...message,
      retryCount: (message.retryCount || 0) + 1
    });
  }

  /**
   * Processes queued messages
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  /**
   * Handles WebSocket errors
   */
  private handleError(error: any): void {
    this.emit(SocketEvents.ERROR, error);
    console.error('WebSocket error:', error);
  }

  /**
   * Clears all timers
   */
  private clearTimers(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

/**
 * Creates and returns a WebSocket connection instance
 */
export function createSocketConnection(
  authToken: string,
  options: SocketOptions = {}
): SocketEventEmitter {
  const socket = new SocketEventEmitter(options);
  socket.connect(authToken);
  return socket;
}