/**
 * @file AIStatus component for displaying real-time AI conversation management status
 * @version 1.0.0
 * @description Displays visual indicators and status text for AI/human conversation 
 * management with WebSocket-based real-time updates
 */

import React, { useMemo, useCallback } from 'react';
import { Badge } from '../ui/badge';
import { MessageType } from '../../types/message.types';
import { useThread } from '../../hooks/useThread';
import { useWebSocket } from '../../hooks/useWebSocket';
import { ComponentSize } from '../../types/ui.types';

// Status variant mappings for different states
const STATUS_VARIANTS = {
  [MessageType.AI]: 'success',
  [MessageType.HUMAN]: 'warning',
  'ERROR': 'destructive',
  'TRANSITIONING': 'secondary'
} as const;

// Status text mappings for different states
const STATUS_TEXT = {
  [MessageType.AI]: 'AI Managing',
  [MessageType.HUMAN]: 'Agent Active',
  'ERROR': 'Connection Error',
  'TRANSITIONING': 'Switching Mode'
} as const;

// ARIA labels for accessibility
const ARIA_LABELS = {
  [MessageType.AI]: 'Conversation managed by AI',
  [MessageType.HUMAN]: 'Conversation managed by human agent',
  'ERROR': 'Error in conversation management',
  'TRANSITIONING': 'Switching conversation management mode'
} as const;

interface AIStatusProps {
  className?: string;
}

/**
 * Determines status details based on current state
 */
const getStatusDetails = (
  messageType: MessageType | null,
  connectionStatus: string,
  error: Error | null
) => {
  // Handle connection issues
  if (connectionStatus !== 'connected') {
    return {
      text: 'Connection Error',
      variant: STATUS_VARIANTS.ERROR,
      ariaLabel: ARIA_LABELS.ERROR
    };
  }

  // Handle error states
  if (error) {
    return {
      text: 'Error',
      variant: STATUS_VARIANTS.ERROR,
      ariaLabel: ARIA_LABELS.ERROR
    };
  }

  // Handle transitioning state
  if (!messageType) {
    return {
      text: STATUS_TEXT.TRANSITIONING,
      variant: STATUS_VARIANTS.TRANSITIONING,
      ariaLabel: ARIA_LABELS.TRANSITIONING
    };
  }

  // Return status for current message type
  return {
    text: STATUS_TEXT[messageType],
    variant: STATUS_VARIANTS[messageType],
    ariaLabel: ARIA_LABELS[messageType]
  };
};

/**
 * AIStatus Component
 * 
 * Displays real-time AI conversation management status with visual indicators
 * and WebSocket-based updates. Implements status tracking requirements from
 * technical specifications.
 */
export const AIStatus: React.FC<AIStatusProps> = ({ className }) => {
  // Get current thread state and WebSocket status
  const { messages, error } = useThread();
  const { connectionStatus } = useWebSocket();

  // Determine current message type
  const currentMessageType = useMemo(() => {
    if (!messages.length) return null;
    return messages[0].type;
  }, [messages]);

  // Calculate status details
  const statusDetails = useMemo(() => 
    getStatusDetails(currentMessageType, connectionStatus, error),
    [currentMessageType, connectionStatus, error]
  );

  // Handle retry on error
  const handleRetry = useCallback(() => {
    if (error) {
      window.location.reload();
    }
  }, [error]);

  return (
    <div className={className}>
      <Badge
        variant={statusDetails.variant}
        size={ComponentSize.MEDIUM}
        className="cursor-default transition-all duration-200"
        role="status"
        aria-label={statusDetails.ariaLabel}
      >
        {statusDetails.text}
      </Badge>

      {/* Error state with retry option */}
      {error && (
        <button
          onClick={handleRetry}
          className="ml-2 text-sm text-destructive hover:text-destructive/90 underline"
          aria-label="Retry connection"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export default AIStatus;