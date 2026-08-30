// server.js
// Chatbot with Memory — backend
// Author: Umera Sulthana
//
// Flow for every incoming message:
//   1. Validate input (block empty/whitespace so we don't waste an API
//      call or crash on a 400)
//   2. Save the user's message to the DB
//   3. Pull the session's history and trim it to the sliding window so we
//      don't blow past the model's context limit on long chats
//   4. Send the trimmed history to the LLM
//   5. Save the model's reply and send it back to the frontend

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { randomUUID } from "crypto";

import { appendMessage, getHistory, clearSession } from "./db.js";
import { trimHistory } from "./slidingWindow.js";
import { generateReply } from "./llmClient.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_HISTORY_MESSAGES = parseInt(
  process.env.MAX_HISTORY_MESSAGES || "20",
  10
);

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/**
 * POST /api/chat
 * body: { session_id?: string, message: string }
 * Creates a session_id if none provided (new conversation).
 */
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const sessionId = req.body.session_id || randomUUID();

    // guard clause first — don't even touch the DB if there's nothing to save
    if (typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({
        error: "Message cannot be empty or whitespace-only.",
      });
    }

    // save the user's turn before calling the model, so it's never lost
    // even if the API call below fails
    appendMessage(sessionId, "user", message.trim());

    // pull everything we've got, then only keep the most recent N messages
    // for the actual API call — keeps token usage sane on long chats
    const fullHistory = getHistory(sessionId);
    const trimmedHistory = trimHistory(fullHistory, MAX_HISTORY_MESSAGES);

    // ask the model, then persist its answer right away
    const reply = await generateReply(trimmedHistory);
    appendMessage(sessionId, "assistant", reply);

    res.json({ session_id: sessionId, reply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Something went wrong generating a reply." });
  }
});

/**
 * GET /api/chat/:session_id/history
 * Returns the full persisted conversation for a session (used to restore
 * the UI after a page refresh).
 */
app.get("/api/chat/:session_id/history", (req, res) => {
  const history = getHistory(req.params.session_id);
  res.json({ session_id: req.params.session_id, history });
});

/**
 * POST /api/chat/:session_id/reset
 * Wipes a session's history, both from the sliding window and persistence.
 */
app.post("/api/chat/:session_id/reset", (req, res) => {
  clearSession(req.params.session_id);
  res.json({ status: "cleared", session_id: req.params.session_id });
});

app.listen(PORT, () => {
  console.log(`Chatbot server running at http://localhost:${PORT}`);
});
