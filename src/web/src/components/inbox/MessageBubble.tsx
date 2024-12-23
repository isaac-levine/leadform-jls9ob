"use client";

import React from 'react';
import { format } from 'date-fns';
import clsx from 'clsx';
import { Message, MessageDirection, MessageStatus, MessageType } from '../../types/message.types';
import Badge from '../ui/badge';
import Tooltip from '../ui/tooltip';
import { ComponentSize } from '../../types/ui.types';

// Message style configurations based on type and direction
// Version: tailwindcss ^3.0.0
const MESSAGE_STYLES = {
  [MessageType.AI]: {
    container: 'bg-primary-50 text-primary-900 border border-primary-200',
    hover: 'hover:bg-primary-100',
    focus: 'focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
  },
  [MessageType.HUMAN]: {
    container: 'bg-secondary-50 text-secondary-900 border border-secondary-200',
    hover: 'hover:bg-secondary-100',
    focus: 'focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2',
  },
  [MessageType.SYSTEM]: {
    container: 'bg-gray-50 text-gray-900 border border-gray-200',
    hover: 'hover:bg-gray-100',
    focus: 'focus:ring-2 focus:ring-gray-500 focus:ring-offset-2',
  },
};

// Direction-specific styles
const DIRECTION_STYLES = {
  [MessageDirection.INBOUND]: 'ml-4 rounded-tl-none rtl:ml-auto rtl:mr-4',
  [MessageDirection.OUTBOUND]: 'mr-4 ml-auto rounded-tr-none rtl:mr-auto rtl:ml-4',
};

// Status badge variants mapping
const STATUS_BADGE_VARIANTS = {
  [MessageStatus.QUEUED]: 'warning',
  [MessageStatus.SENT]: 'default',
  [MessageStatus.DELIVERED]: 'success',
  [MessageStatus.FAILED]: 'error',
} as const;

interface MessageBubbleProps {
  message: Message;
  className?: string;
}

/**
 * MessageBubble Component
 * 
 * Renders a message bubble in the SMS inbox with appropriate styling based on message type,
 * direction, and status. Includes enhanced accessibility features and interactive elements.
 *
 * @version 1.0.0
 */
const MessageBubble: React.FC<MessageBubbleProps> = ({ message, className }) => {
  const { content, type, direction, status, sentAt } = message;

  // Get combined styles based on message type and direction
  const getMessageStyles = () => {
    const typeStyles = MESSAGE_STYLES[type];
    const directionStyle = DIRECTION_STYLES[direction];

    return clsx(
      // Base styles
      'relative p-3 rounded-lg max-w-[80%] transition-all duration-200',
      'focus:outline-none cursor-default',
      // Type-specific styles
      typeStyles.container,
      typeStyles.hover,
      typeStyles.focus,
      // Direction-specific styles
      directionStyle,
      // Additional custom styles
      className
    );
  };

  // Format message timestamp with timezone consideration
  const formatMessageTime = (date: Date): string => {
    try {
      return format(date, 'h:mm a (zzz)');
    } catch (error) {
      console.error('Error formatting message time:', error);
      return 'Invalid date';
    }
  };

  // Get status badge variant
  const getBadgeVariant = () => STATUS_BADGE_VARIANTS[status];

  return (
    <div
      className={getMessageStyles()}
      role="article"
      aria-label={`${type.toLowerCase()} message`}
      tabIndex={0}
    >
      {/* Message content with proper text wrapping */}
      <div className="break-words whitespace-pre-wrap">{content}</div>

      {/* Message metadata footer */}
      <div className="flex items-center justify-end gap-2 mt-1">
        {/* Status badge with tooltip */}
        <Tooltip
          content={`Message ${status.toLowerCase()}`}
          position="top"
          size={ComponentSize.SMALL}
        >
          <Badge
            variant={getBadgeVariant()}
            size={ComponentSize.SMALL}
            className="uppercase"
          >
            {status}
          </Badge>
        </Tooltip>

        {/* Timestamp with tooltip */}
        <Tooltip
          content={formatMessageTime(sentAt)}
          position="top"
          size={ComponentSize.SMALL}
        >
          <span className="text-xs text-gray-500">
            {format(sentAt, 'h:mm a')}
          </span>
        </Tooltip>

        {/* Message type indicator for screen readers */}
        <span className="sr-only">
          {type === MessageType.AI ? 'AI response' : 'Human message'}
        </span>
      </div>
    </div>
  );
};

export default MessageBubble;