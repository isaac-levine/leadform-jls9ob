// react ^18.0.0
import React, { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { useThread } from '../../hooks/useThread';
import { MessageType, MessageStatus } from '../../types/message.types';
import { UserRole } from '../../types/auth.types';
import { ButtonVariant, ComponentSize } from '../../types/ui.types';

/**
 * Interface for QuickActions component props
 */
interface QuickActionsProps {
  threadId: string;                    // ID of current thread
  isAIActive: boolean;                 // Whether AI is currently managing thread
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting'; // Real-time connection status
  userRole: UserRole;                  // Current user's role
  onTakeOver: () => void;             // Callback when human takes over
  onResolve: () => void;              // Callback when thread is resolved
}

/**
 * QuickActions component providing thread management actions
 * Implements human takeover capabilities and thread resolution
 * 
 * @version 1.0.0
 */
const QuickActions: React.FC<QuickActionsProps> = ({
  threadId,
  isAIActive,
  connectionStatus,
  userRole,
  onTakeOver,
  onResolve
}) => {
  // Local state for loading states
  const [takeOverLoading, setTakeOverLoading] = useState(false);
  const [resolveLoading, setResolveLoading] = useState(false);

  // Thread management hooks
  const { sendMessage, updateThreadState, trackMessageDelivery } = useThread(threadId);

  /**
   * Handles taking over conversation from AI
   */
  const handleTakeOver = useCallback(async () => {
    if (!threadId || takeOverLoading || !isAIActive) return;

    try {
      setTakeOverLoading(true);

      // Send system message indicating human takeover
      const takeoverMessage = {
        content: '👋 A human agent has taken over the conversation.',
        type: MessageType.SYSTEM,
      };

      // Send message and track delivery
      const messageId = await sendMessage(takeoverMessage.content);
      await trackMessageDelivery(messageId, MessageStatus.DELIVERED);

      // Update thread state to reflect human control
      await updateThreadState({
        isAIActive: false,
        lastHumanTakeover: new Date(),
        assignedTo: 'current-user-id' // This would come from auth context
      });

      onTakeOver();
    } catch (error) {
      console.error('Failed to take over conversation:', error);
      // Here you would typically show a toast notification
    } finally {
      setTakeOverLoading(false);
    }
  }, [threadId, isAIActive, sendMessage, trackMessageDelivery, updateThreadState, onTakeOver]);

  /**
   * Handles marking thread as resolved
   */
  const handleResolve = useCallback(async () => {
    if (!threadId || resolveLoading) return;

    try {
      setResolveLoading(true);

      // Send resolution confirmation message
      const resolutionMessage = {
        content: '✅ This conversation has been marked as resolved.',
        type: MessageType.SYSTEM,
      };

      // Send message and track delivery
      const messageId = await sendMessage(resolutionMessage.content);
      await trackMessageDelivery(messageId, MessageStatus.DELIVERED);

      // Update thread status
      await updateThreadState({
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: 'current-user-id' // This would come from auth context
      });

      onResolve();
    } catch (error) {
      console.error('Failed to resolve conversation:', error);
      // Here you would typically show a toast notification
    } finally {
      setResolveLoading(false);
    }
  }, [threadId, sendMessage, trackMessageDelivery, updateThreadState, onResolve]);

  // Check if user has permission to perform actions
  const canTakeOver = [UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN, UserRole.AGENT].includes(userRole);
  const canResolve = [UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN, UserRole.AGENT].includes(userRole);

  // Disable actions when offline
  const isOffline = connectionStatus === 'disconnected';

  return (
    <div className="flex items-center gap-2">
      {/* Take Over Button */}
      {isAIActive && canTakeOver && (
        <Button
          variant={ButtonVariant.PRIMARY}
          size={ComponentSize.MEDIUM}
          onClick={handleTakeOver}
          loading={takeOverLoading}
          disabled={isOffline || takeOverLoading}
          aria-label="Take over conversation from AI"
        >
          Take Over
        </Button>
      )}

      {/* Resolve Button */}
      {canResolve && (
        <Button
          variant={ButtonVariant.SECONDARY}
          size={ComponentSize.MEDIUM}
          onClick={handleResolve}
          loading={resolveLoading}
          disabled={isOffline || resolveLoading}
          aria-label="Mark conversation as resolved"
        >
          Resolve
        </Button>
      )}

      {/* Connection Status Indicator */}
      {isOffline && (
        <span className="text-sm text-red-500">
          ⚠️ Offline - Actions disabled
        </span>
      )}
    </div>
  );
};

export default QuickActions;