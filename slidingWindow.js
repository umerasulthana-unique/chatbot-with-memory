// slidingWindow.js
// Umera Sulthana
//
// Simple FIFO trim: once history gets past MAX_HISTORY_MESSAGES, drop the
// oldest entries and keep the most recent ones. This is only about what
// gets SENT to the LLM on a given call — nothing here touches the DB, so
// the full conversation is never actually lost, just not all resent.

/**
 * @param {Array<{role: string, content: string}>} history - full history
 * @param {number} maxMessages - max number of messages to keep
 * @returns {Array<{role: string, content: string}>} trimmed history
 */
export function trimHistory(history, maxMessages) {
  if (history.length <= maxMessages) return history;
  // Keep the most recent `maxMessages` entries (drop oldest first).
  return history.slice(history.length - maxMessages);
}
