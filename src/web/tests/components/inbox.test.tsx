import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import { axe } from '@axe-core/react';
import ThreadList from '../../src/components/inbox/ThreadList';
import ThreadView from '../../src/components/inbox/ThreadView';
import MessageBubble from '../../src/components/inbox/MessageBubble';
import { useThread } from '../../src/hooks/useThread';
import { Message, MessageDirection, MessageStatus, MessageType } from '../../types/message.types';
import { ObjectId } from 'mongodb';

// Mock useThread hook
vi.mock('../../src/hooks/useThread', () => ({
  useThread: vi.fn()
}));

// Mock WebSocket
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

// Test constants
const TEST_THREAD_ID = new ObjectId().toString();
const MOCK_MESSAGES: Message[] = [
  {
    _id: new ObjectId(),
    leadId: new ObjectId(),
    content: 'Hello, I am interested in your service',
    direction: MessageDirection.INBOUND,
    type: MessageType.HUMAN,
    status: MessageStatus.DELIVERED,
    metadata: {},
    sentAt: new Date(),
    deliveredAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new ObjectId(),
    leadId: new ObjectId(),
    content: 'Thank you for your interest! How can I help?',
    direction: MessageDirection.OUTBOUND,
    type: MessageType.AI,
    status: MessageStatus.DELIVERED,
    metadata: {},
    sentAt: new Date(),
    deliveredAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

describe('ThreadList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useThread as jest.Mock).mockReturnValue({
      messages: MOCK_MESSAGES,
      loading: false,
      error: null,
      connectionStatus: 'connected',
      loadMoreMessages: vi.fn()
    });
  });

  test('renders thread list with messages', () => {
    render(
      <ThreadList
        selectedThreadId={null}
        onThreadSelect={vi.fn()}
      />
    );

    expect(screen.getAllByRole('button')).toHaveLength(MOCK_MESSAGES.length);
  });

  test('handles thread selection', async () => {
    const onThreadSelect = vi.fn();
    render(
      <ThreadList
        selectedThreadId={null}
        onThreadSelect={onThreadSelect}
      />
    );

    const firstThread = screen.getAllByRole('button')[0];
    fireEvent.click(firstThread);

    await waitFor(() => {
      expect(onThreadSelect).toHaveBeenCalledWith(MOCK_MESSAGES[0]._id.toString());
    });
  });

  test('displays loading state correctly', () => {
    (useThread as jest.Mock).mockReturnValue({
      messages: [],
      loading: true,
      error: null,
      connectionStatus: 'connected'
    });

    render(
      <ThreadList
        selectedThreadId={null}
        onThreadSelect={vi.fn()}
      />
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('handles error state', () => {
    (useThread as jest.Mock).mockReturnValue({
      messages: [],
      loading: false,
      error: new Error('Failed to load threads'),
      connectionStatus: 'connected'
    });

    render(
      <ThreadList
        selectedThreadId={null}
        onThreadSelect={vi.fn()}
      />
    );

    expect(screen.getByText(/failed to load threads/i)).toBeInTheDocument();
  });

  test('meets accessibility requirements', async () => {
    const { container } = render(
      <ThreadList
        selectedThreadId={null}
        onThreadSelect={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('ThreadView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useThread as jest.Mock).mockReturnValue({
      messages: MOCK_MESSAGES,
      loading: false,
      error: null,
      connectionStatus: 'connected',
      sendMessage: vi.fn(),
      loadMoreMessages: vi.fn()
    });
  });

  test('renders message history correctly', () => {
    render(
      <ThreadView
        threadId={TEST_THREAD_ID}
        initialMessages={MOCK_MESSAGES}
      />
    );

    MOCK_MESSAGES.forEach(message => {
      expect(screen.getByText(message.content)).toBeInTheDocument();
    });
  });

  test('handles message composition and sending', async () => {
    const { sendMessage } = useThread();
    render(
      <ThreadView
        threadId={TEST_THREAD_ID}
        initialMessages={MOCK_MESSAGES}
      />
    );

    const input = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith({
        content: 'Test message',
        type: MessageType.AI
      });
    });
  });

  test('toggles between AI and human modes', async () => {
    const onModeChange = vi.fn();
    render(
      <ThreadView
        threadId={TEST_THREAD_ID}
        initialMessages={MOCK_MESSAGES}
        onModeChange={onModeChange}
      />
    );

    const modeToggle = screen.getByRole('button', { name: /ai mode/i });
    fireEvent.click(modeToggle);

    await waitFor(() => {
      expect(onModeChange).toHaveBeenCalledWith(MessageType.HUMAN);
      expect(screen.getByText(/human mode/i)).toBeInTheDocument();
    });
  });

  test('handles real-time message updates', async () => {
    const newMessage: Message = {
      _id: new ObjectId(),
      leadId: new ObjectId(),
      content: 'New message',
      direction: MessageDirection.INBOUND,
      type: MessageType.HUMAN,
      status: MessageStatus.DELIVERED,
      metadata: {},
      sentAt: new Date(),
      deliveredAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    render(
      <ThreadView
        threadId={TEST_THREAD_ID}
        initialMessages={MOCK_MESSAGES}
      />
    );

    // Simulate WebSocket message
    (useThread as jest.Mock).mockReturnValue({
      messages: [...MOCK_MESSAGES, newMessage],
      loading: false,
      error: null,
      connectionStatus: 'connected'
    });

    await waitFor(() => {
      expect(screen.getByText(newMessage.content)).toBeInTheDocument();
    });
  });

  test('meets accessibility requirements', async () => {
    const { container } = render(
      <ThreadView
        threadId={TEST_THREAD_ID}
        initialMessages={MOCK_MESSAGES}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('MessageBubble Component', () => {
  const mockMessage: Message = MOCK_MESSAGES[0];

  test('renders message content correctly', () => {
    render(<MessageBubble message={mockMessage} />);
    expect(screen.getByText(mockMessage.content)).toBeInTheDocument();
  });

  test('displays correct message status', () => {
    render(<MessageBubble message={mockMessage} />);
    expect(screen.getByText(mockMessage.status)).toBeInTheDocument();
  });

  test('applies correct styling based on message type', () => {
    const { container } = render(<MessageBubble message={mockMessage} />);
    
    if (mockMessage.type === MessageType.AI) {
      expect(container.firstChild).toHaveClass('bg-primary-50');
    } else {
      expect(container.firstChild).toHaveClass('bg-secondary-50');
    }
  });

  test('formats timestamp correctly', () => {
    render(<MessageBubble message={mockMessage} />);
    const formattedTime = screen.getByText(
      new RegExp(mockMessage.sentAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
    );
    expect(formattedTime).toBeInTheDocument();
  });

  test('meets accessibility requirements', async () => {
    const { container } = render(<MessageBubble message={mockMessage} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});