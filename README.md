# Chatbot with Memory

**Built by Umera Sulthana**

A full-stack conversational chatbot that maintains context across a session,
implementing the full architecture from stateless → stateful → persisted:

- **Stateful session logic** — every turn appends to history and sends the
  full context back to the LLM (not just the latest message).
- **Input validation gate** — rejects empty/whitespace messages before they
  reach the API (avoids 400 crashes).
- **Sliding window (FIFO)** — trims the oldest messages once history exceeds
  `MAX_HISTORY_MESSAGES`, preventing context-window overflow, while the full
  history stays intact in the database.
- **SQLite persistence** — conversations survive a server restart. Swap
  `db.js` for a Postgres adapter (schema is already relational: `session_id`,
  `role`, `content`, `created_at`) if you need multi-server / enterprise scale.

## Project structure

```
chatbot-project/
├── server.js          # Express API: /api/chat, /api/chat/:id/history, /api/chat/:id/reset
├── db.js               # SQLite persistence layer
├── slidingWindow.js    # FIFO truncation logic
├── llmClient.js        # Gemini SDK wrapper
├── package.json
├── .env.example
└── public/
    ├── index.html
    ├── style.css
    └── app.js
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the environment template and add your free API key:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and set `GEMINI_API_KEY=...`
   (Get a free key at https://aistudio.google.com — no credit card, no
   expiration. Never commit this file.)

3. Run the server:
   ```bash
   npm start
   ```

4. Open **http://localhost:3000** in your browser.

## How it works, end to end

1. Frontend generates a `session_id` (UUID) on first load, stored in
   `localStorage`, so refreshing the page restores the same conversation.
2. On send, the frontend POSTs `{ session_id, message }` to `/api/chat`.
3. Backend validates the message isn't empty, saves it to SQLite, loads the
   full history for that session, trims it to the sliding window, and sends
   it to the Gemini API.
4. The model's reply is saved back to SQLite and returned to the frontend.
5. "New chat" clears the session's history in the database and starts a
   fresh `session_id`.

## Testing memory (the "memory exam" from the training deck)

**Manual:** try this sequence in the chat UI:
1. "My name is Alex."
2. "Write me a 300-word paragraph about space travel." (forces a long
   generation to fill up context)
3. "What's my name?"

The bot should correctly answer "Alex" — proving the sliding window keeps
recent-enough context, and persistence means this works even after a
refresh.

**Automated:** `test.js` runs this exact exam against the live API, plus a
check that empty/whitespace messages are correctly rejected (the
validation gate).

```bash
npm start        # terminal 1 — starts the server
npm test         # terminal 2 — runs the automated exam
```

Expected output ends with:
```
✅ PASS — model correctly recalled "Vipin"
All tests passed.
```

The test creates its own session and resets it afterward, so it doesn't
leave leftover rows in `chat_history.db`.

## Using a different model provider

`llmClient.js` currently uses the free Google Gemini API
(`gemini-2.5-flash`). To switch to Anthropic, OpenAI, or another provider,
only this file needs to change — rewrite `generateReply(history)` to call
the new SDK, keep the same function signature, and nothing else in the app
needs to be touched.

## Extending to Postgres (enterprise scale)

Replace `db.js` with a Postgres-backed version using `pg` or
`langchain-postgres`:

```sql
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  session_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_session_created ON messages (session_id, created_at);
```

The rest of the app (`server.js`, `slidingWindow.js`, `llmClient.js`,
frontend) doesn't need to change — only the implementation inside `db.js`.
