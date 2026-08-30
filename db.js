// db.js
// Storage layer — Umera Sulthana
//
// Went with SQLite here instead of a plain JS array so chat history
// actually survives a server restart. One file (chat_history.db), zero
// setup, and it's easy to swap for Postgres later if this needs to scale
// (same columns: session_id, role, content, created_at).

import Database from "better-sqlite3";

const db = new Database("chat_history.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_session_created
  ON messages (session_id, created_at);
`);

const insertStmt = db.prepare(
  `INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)`
);

const historyStmt = db.prepare(
  `SELECT role, content, created_at FROM messages
   WHERE session_id = ?
   ORDER BY created_at ASC, id ASC`
);

const deleteStmt = db.prepare(`DELETE FROM messages WHERE session_id = ?`);

/**
 * Save one message (user or assistant) for a given session.
 */
export function appendMessage(sessionId, role, content) {
  insertStmt.run(sessionId, role, content);
}

/**
 * Get everything we've stored for this session, oldest first — this is
 * what gets handed off to the LLM (after trimming in slidingWindow.js).
 */
export function getHistory(sessionId) {
  const rows = historyStmt.all(sessionId);
  return rows.map((r) => ({ role: r.role, content: r.content }));
}

/**
 * Wipe a session clean — called when the user hits "New chat".
 */
export function clearSession(sessionId) {
  deleteStmt.run(sessionId);
}

export default db;
