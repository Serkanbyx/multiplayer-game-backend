import { memo, useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage } from '@mpg/shared/types/room';
import { CharacterCounter } from '../ui/CharacterCounter';
import { cn } from '../../utils/cn';

type ChatPanelProps = {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  mySelfUserId: string;
};

const MAX_MESSAGE_LENGTH = 300;

const ChatMessageRow = memo(
  ({ msg, isSelf }: { msg: ChatMessage; isSelf: boolean }) => (
    <div className={cn('flex flex-col gap-0.5', isSelf && 'items-end')}>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            'text-xs font-semibold',
            isSelf ? 'text-primary' : 'text-fg-muted',
          )}
        >
          {msg.displayName}
        </span>
        <span className="text-[10px] text-fg-muted">
          {new Date(msg.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3 py-1.5 text-sm wrap-break-word',
          isSelf
            ? 'bg-primary text-white rounded-br-sm'
            : 'bg-surface text-fg rounded-bl-sm',
        )}
      >
        {msg.text}
      </div>
    </div>
  ),
);

export const ChatPanel = memo(({ messages, onSend, mySelfUserId }: ChatPanelProps) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAutoScrollRef = useRef(true);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    isAutoScrollRef.current = isAtBottom;
  }, []);

  useEffect(() => {
    if (!isAutoScrollRef.current || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) return;
    onSend(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-surface">
      <h3 className="shrink-0 border-b border-border px-4 py-2.5 text-sm font-semibold text-fg">
        Chat
      </h3>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
        style={{ minHeight: 200, maxHeight: 400 }}
      >
        {messages.length === 0 ? (
          <p className="text-center text-sm text-fg-muted py-8">
            No messages yet. Say something!
          </p>
        ) : (
          messages.map((msg) => (
            <ChatMessageRow
              key={`${msg.userId}:${msg.timestamp}`}
              msg={msg}
              isSelf={msg.userId === mySelfUserId}
            />
          ))
        )}
      </div>

      <div className="shrink-0 border-t border-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            maxLength={MAX_MESSAGE_LENGTH}
            className="flex-1 rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || input.trim().length > MAX_MESSAGE_LENGTH}
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Send
          </button>
        </div>
        <div className="mt-1 flex justify-end">
          <CharacterCounter current={input.length} max={MAX_MESSAGE_LENGTH} />
        </div>
      </div>
    </div>
  );
});
