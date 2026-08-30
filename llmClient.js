// llmClient.js
// Umera Sulthana
//
// Switched this over to Google's Gemini API — it has a genuinely free
// tier (no card, no expiration), which made it the better fit for this
// project vs. paying-after-credits providers. Kept the same exported
// generateReply(history) signature, so nothing else in the app had to
// change to make the swap.

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MODEL_NAME = process.env.MODEL_NAME || "gemini-2.5-flash";

// Our history uses 'user' / 'assistant' (Anthropic/OpenAI-style roles).
// Gemini expects 'user' / 'model' instead, so translate on the way in.
function toGeminiRole(role) {
  return role === "assistant" ? "model" : "user";
}

/**
 * Sends the full (trimmed) conversation history to Gemini and returns the
 * model's text reply.
 *
 * Gemini's chat API wants the history *without* the newest message, then
 * you call sendMessage() with just that newest message — so we split the
 * array: everything except the last entry becomes prior history, and the
 * last entry (the user's latest message) gets sent as the new turn.
 *
 * @param {Array<{role: 'user'|'assistant', content: string}>} history
 * @returns {Promise<string>}
 */
export async function generateReply(history) {
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const priorHistory = history.slice(0, -1).map((msg) => ({
    role: toGeminiRole(msg.role),
    parts: [{ text: msg.content }],
  }));

  const latestMessage = history[history.length - 1];

  const chat = model.startChat({ history: priorHistory });
  const result = await chat.sendMessage(latestMessage.content);

  return result.response.text();
}
