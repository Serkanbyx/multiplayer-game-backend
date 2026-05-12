import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatPanel } from '../ChatPanel';
import type { ChatMessage } from '@mpg/shared/types/room';


const createMessage = (
  overrides: Partial<ChatMessage> = {},
): ChatMessage => ({
  userId: 'user-1',
  displayName: 'Alice',
  text: 'Hello!',
  timestamp: Date.now(),
  ...overrides,
});

const defaultProps = {
  messages: [] as ChatMessage[],
  onSend: vi.fn(),
  mySelfUserId: 'me',
  throttledUntil: null as number | null,
};

describe('ChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state when no messages', () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText(/no messages yet/i)).toBeInTheDocument();
  });

  it('renders message list', () => {
    const messages = [
      createMessage({ userId: 'user-1', displayName: 'Alice', text: 'Hello!' }),
      createMessage({ userId: 'user-2', displayName: 'Bob', text: 'Hi there!', timestamp: Date.now() + 1 }),
    ];
    render(<ChatPanel {...defaultProps} messages={messages} />);

    expect(screen.getByText('Hello!')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('sends message when clicking Send button', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<ChatPanel {...defaultProps} onSend={onSend} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'Test message');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(onSend).toHaveBeenCalledWith('Test message');
  });

  it('sends message on Enter key', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<ChatPanel {...defaultProps} onSend={onSend} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'Enter message{Enter}');

    expect(onSend).toHaveBeenCalledWith('Enter message');
  });

  it('clears input after sending', async () => {
    const user = userEvent.setup();
    render(<ChatPanel {...defaultProps} onSend={vi.fn()} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'Clear me');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(input).toHaveValue('');
  });

  it('does NOT send empty or whitespace-only messages', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<ChatPanel {...defaultProps} onSend={onSend} />);

    await user.click(screen.getByRole('button', { name: /send/i }));
    expect(onSend).not.toHaveBeenCalled();

    const input = screen.getByRole('textbox');
    await user.type(input, '   ');
    await user.click(screen.getByRole('button', { name: /send/i }));
    expect(onSend).not.toHaveBeenCalled();
  });

  it('enforces 300-char maxLength on input', () => {
    render(<ChatPanel {...defaultProps} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('maxLength', '300');
  });

  it('shows character counter', () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText('0/300')).toBeInTheDocument();
  });

  it('disables input and shows countdown when throttled', () => {
    render(<ChatPanel {...defaultProps} throttledUntil={Date.now() + 5000} />);

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    expect(screen.getByText(/please wait/i)).toBeInTheDocument();
  });

  it('Send button is disabled when input is empty', () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });
});
