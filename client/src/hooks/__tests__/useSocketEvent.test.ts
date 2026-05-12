import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSocketEvent } from '../useSocketEvent';

const mockOn = vi.fn();
const mockOff = vi.fn();
const mockSocket = { on: mockOn, off: mockOff };

vi.mock('../../socket/socket', () => ({
  getSocket: () => mockSocket,
}));

describe('useSocketEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('subscribes to event on mount', () => {
    const handler = vi.fn();
    renderHook(() => useSocketEvent('error' as any, handler as any));

    expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('unsubscribes from event on unmount', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useSocketEvent('error' as any, handler as any));

    unmount();

    expect(mockOff).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('resubscribes when event name changes', () => {
    const handler = vi.fn();
    const { rerender } = renderHook(
      ({ event }) => useSocketEvent(event as any, handler as any),
      { initialProps: { event: 'error' } },
    );

    rerender({ event: 'room:updated' });

    expect(mockOff).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith('room:updated', expect.any(Function));
  });

  it('resubscribes when handler changes', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const { rerender } = renderHook(
      ({ handler }) => useSocketEvent('error' as any, handler as any),
      { initialProps: { handler: handler1 } },
    );

    rerender({ handler: handler2 });

    expect(mockOff).toHaveBeenCalledTimes(1);
    expect(mockOn).toHaveBeenCalledTimes(2);
  });

  it('handles null socket gracefully', () => {
    vi.doMock('../../socket/socket', () => ({
      getSocket: () => null,
    }));

    const handler = vi.fn();
    expect(() => {
      renderHook(() => useSocketEvent('error' as any, handler as any));
    }).not.toThrow();
  });
});
