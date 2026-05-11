import { useEffect } from 'react';
import type { ServerToClientEvents } from '@mpg/shared/types/events';
import { getSocket } from '../socket/socket';

export const useSocketEvent = <K extends keyof ServerToClientEvents>(
  eventName: K,
  handler: ServerToClientEvents[K]
): void => {
  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    s.on(eventName, handler as never);
    return () => { s.off(eventName, handler as never); };
  }, [eventName, handler]);
};
