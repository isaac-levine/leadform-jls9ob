/**
 * @file Advanced message input component for SMS inbox
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react'; // react v18.0.0
import Input from '../ui/input';
import { useThread } from '../../hooks/useThread';
import { MessageType } from '../../types/message.types';
import { ComponentSize } from '../../types/ui.types';

/**
 * Props interface for MessageInput component
 */
interface MessageInputProps {
  threadId: string;
  isAIMode: boolean;
  onModeToggle: () => void;
  disabled?: boolean;
  maxLength?: number;
  placeholder?: string;
  onSendSuccess?: (messageId: string) => void;
  onSendError?: (error: Error) => void;
}

/**
 * Advanced message input component for composing and sending SMS messages
 */
export const MessageInput: React.FC<MessageInputProps> = ({
  threadId,
  isAIMode,
  onModeToggle,
  disabled = false,
  maxLength = 1000,
  placeholder = 'Type your message...',
  onSendSuccess,
  onSendError
}) => {
  // Local state management
  const [message, setMessage] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [charCount, setCharCount] = useState<number>(0);

  // Thread management hook
  const { sendMessage, connectionStatus } = useThread(threadId);

  /**
   * Validates message content against rules
   */
  const validateMessage = useCallback((content: string): { isValid: boolean; error?: string } => {
    if (!content.trim()) {
      return { isValid: false, error: 'Message cannot be empty' };
    }

    if (content.length > maxLength) {
      return { isValid: false, error: `Message exceeds maximum length of ${maxLength} characters` };
    }

    // Check for invalid characters or patterns
    const invalidPattern = /^\s*$/; // Prevents messages with only whitespace
    if (invalidPattern.test(content)) {
      return { isValid: false, error: 'Message cannot contain only whitespace' };
    }

    return { isValid: true };
  }, [maxLength]);

  /**
   * Handles message submission with validation and error handling
   */
  const handleSubmit = useCallback(async (event?: React.FormEvent) => {
    if (event) {
      event.preventDefault();
    }

    // Validate message content
    const validation = validateMessage(message);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    // Check connection status
    if (connectionStatus !== 'connected') {
      setError('Unable to send message. Please check your connection.');
      return;
    }

    try {
      setSending(true);
      setError(null);

      // Send message with appropriate type
      await sendMessage({
        content: message.trim(),
        type: isAIMode ? MessageType.AI : MessageType.HUMAN
      });

      // Clear input and update state on success
      setMessage('');
      setCharCount(0);
      onSendSuccess?.(threadId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send message');
      setError(error.message);
      onSendError?.(error);
    } finally {
      setSending(false);
    }
  }, [message, isAIMode, threadId, sendMessage, connectionStatus, validateMessage, onSendSuccess, onSendError]);

  /**
   * Handles keyboard events for message submission
   */
  const handleKeyPress = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  /**
   * Updates character count when message changes
   */
  useEffect(() => {
    setCharCount(message.length);
  }, [message]);

  return (
    <div className="relative flex flex-col w-full">
      <div className="flex items-center space-x-2 mb-1">
        {/* AI/Human mode toggle */}
        <button
          type="button"
          onClick={onModeToggle}
          className={`px-2 py-1 text-sm rounded-md transition-colors ${
            isAIMode ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
          }`}
          aria-pressed={isAIMode}
          disabled={disabled || sending}
        >
          {isAIMode ? '🤖 AI Mode' : '👤 Human Mode'}
        </button>

        {/* Character counter */}
        <span className={`text-sm ${
          charCount > maxLength ? 'text-red-500' : 'text-gray-500'
        }`}>
          {charCount}/{maxLength}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled || sending}
          error={error}
          maxLength={maxLength}
          size={ComponentSize.MEDIUM}
          className="flex-1"
          aria-label="Message input"
          data-testid="message-input"
        />

        <button
          type="submit"
          disabled={disabled || sending || !message.trim()}
          className={`px-4 py-2 rounded-md transition-colors ${
            disabled || sending || !message.trim()
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-primary-500 text-white hover:bg-primary-600'
          }`}
          aria-label="Send message"
          data-testid="send-button"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>

      {/* Connection status indicator */}
      {connectionStatus !== 'connected' && (
        <div className="absolute -bottom-6 left-0 text-sm text-yellow-500">
          ⚠️ Connection lost. Attempting to reconnect...
        </div>
      )}
    </div>
  );
};

export default MessageInput;