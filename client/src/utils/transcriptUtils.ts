import { MessageLog } from '../types';

/**
 * Updates the transcript history.
 * Handles appending new streaming text to the most recent message bubble
 * to ensure long responses are kept together and not fragmented.
 */
export function updateTranscripts(
  currentHistory: MessageLog[],
  text: string,
  isUser: boolean
): MessageLog[] {
  // Filter out empty updates to prevent processing overhead or empty bubbles
  if (!text) return currentHistory;

  const last = currentHistory[currentHistory.length - 1];
  const now = new Date();
  const role = isUser ? 'user' : 'assistant';

  const isSameRole = last && last.role === role;

  // Calculate time since the last message was *updated* (using its timestamp).
  // We use a generous threshold (3000ms) to keep streaming responses in one bubble,
  // even if there are slight pauses in generation or speech.
  // Note: We update the timestamp on every append to keep the session "alive"
  // during long streams, preventing a long monologue from being split.
  const isRecent = last && now.getTime() - last.timestamp.getTime() < 3000;

  if (isSameRole && isRecent) {
    return [
      ...currentHistory.slice(0, -1),
      {
        ...last,
        text: last.text + text,
        timestamp: now,
      },
    ];
  }

  return [
    ...currentHistory,
    {
      id: Date.now().toString(),
      role: role,
      text: text,
      timestamp: now,
    },
  ];
}
