/**
 * @file Thread page component for displaying individual SMS conversation threads
 * @version 1.0.0
 * @description Implements real-time messaging, AI/human mode toggle, and lead information
 * display with proper loading states and error handling
 */

"use client";

import React, { useEffect, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import ThreadView from '../../../../components/inbox/ThreadView';
import LeadInfo from '../../../../components/inbox/LeadInfo';
import { useThread } from '../../../../hooks/useThread';
import { MessageType } from '../../../../types/message.types';
import { Lead } from '../../../../types/lead.types';

// Constants for metadata and error messages
const PAGE_TITLE = 'SMS Thread | Lead Capture Platform';
const ERROR_MESSAGE = 'Error loading conversation thread';
const LOADING_MESSAGE = 'Loading conversation...';

/**
 * Generates dynamic metadata for the thread page
 * @param params - Route parameters containing threadId
 */
export async function generateMetadata({ params }: { params: { threadId: string } }) {
  return {
    title: PAGE_TITLE,
    description: `SMS conversation thread ${params.threadId}`,
    openGraph: {
      title: PAGE_TITLE,
      type: 'website',
      url: `/inbox/${params.threadId}`,
    },
  };
}

/**
 * Error fallback component for thread loading failures
 */
const ErrorFallback = ({ error, resetErrorBoundary }: { 
  error: Error; 
  resetErrorBoundary: () => void;
}) => (
  <div className="flex flex-col items-center justify-center h-full p-4">
    <h2 className="text-xl font-semibold text-error-500 mb-4">
      {ERROR_MESSAGE}
    </h2>
    <p className="text-gray-600 mb-4">{error.message}</p>
    <button
      onClick={resetErrorBoundary}
      className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
      aria-label="Retry loading thread"
    >
      Retry
    </button>
  </div>
);

/**
 * Loading component for thread initialization
 */
const LoadingState = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-pulse text-gray-500">
      {LOADING_MESSAGE}
    </div>
  </div>
);

/**
 * Thread page component interface
 */
interface ThreadPageProps {
  params: {
    threadId: string;
  };
}

/**
 * Thread page component for displaying SMS conversations
 * Implements real-time messaging requirements from technical specifications
 */
const ThreadPage: React.FC<ThreadPageProps> = ({ params }) => {
  // Thread state management
  const { messages, loading, error, sendMessage, toggleMode } = useThread(params.threadId);
  const [lead, setLead] = useState<Lead | null>(null);
  const [isAIMode, setIsAIMode] = useState(true);

  // Fetch lead information when thread loads
  useEffect(() => {
    const fetchLead = async () => {
      try {
        // Lead would be fetched from API here
        // For now using first message's lead data
        if (messages.length > 0) {
          const leadId = messages[0].leadId;
          // Fetch lead details using leadId
          // setLead(leadData);
        }
      } catch (error) {
        console.error('Failed to fetch lead:', error);
      }
    };

    if (messages.length > 0) {
      fetchLead();
    }
  }, [messages]);

  /**
   * Handles AI/Human mode toggle
   */
  const handleModeToggle = async () => {
    try {
      await toggleMode();
      setIsAIMode(!isAIMode);
    } catch (error) {
      console.error('Failed to toggle mode:', error);
    }
  };

  /**
   * Handles message sending with proper error handling
   */
  const handleMessageSend = async (content: string) => {
    try {
      await sendMessage({
        content,
        type: isAIMode ? MessageType.AI : MessageType.HUMAN
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error; // Let ThreadView handle the error display
    }
  };

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="flex h-full overflow-hidden">
        {/* Main conversation area */}
        <div className="flex-1 flex flex-col min-w-0">
          {loading ? (
            <LoadingState />
          ) : (
            <ThreadView
              threadId={params.threadId}
              onModeToggle={handleModeToggle}
              onMessageSend={handleMessageSend}
            />
          )}
        </div>

        {/* Lead information sidebar */}
        {lead && (
          <div className="w-96 border-l border-gray-200 overflow-y-auto">
            <LeadInfo
              lead={lead}
              className="h-full"
            />
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default ThreadPage;