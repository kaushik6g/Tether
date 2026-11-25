import type { Message, MessagePage } from '@/features/api';

export function mergeMessagePages(loaded: MessagePage | undefined, latest: MessagePage): MessagePage {
  if (!loaded || latest.messages.length === 0) return latest;

  const recentIds = new Set(latest.messages.map((message) => message.id));
  const overlap = loaded.messages.findIndex((message) => recentIds.has(message.id));
  if (overlap < 0) return latest;

  return {
    messages: [...loaded.messages.slice(0, overlap), ...latest.messages],
    hasMore: overlap === 0 ? latest.hasMore : loaded.hasMore,
  };
}

export function prependMessages(older: MessagePage, current: Message[]): MessagePage {
  return { messages: [...older.messages, ...current], hasMore: older.hasMore };
}
