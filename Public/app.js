// app.js
// Frontend logic — Umera Sulthana
//
// Nothing fancy, just fetch calls + DOM updates. The one thing worth
// noting: session_id lives in localStorage, so a page refresh doesn't
// wipe the conversation — it just reloads history from the server.

const chatWindow = document.getElementById("chatWindow");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const resetBtn = document.getElementById("resetBtn");

const SESSION_KEY = "chatbot_session_id";

function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function newSession() {
  const id = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, id);
  return id;
}

function addBubble(role, text) {
  const div = document.createElement("div");
  div.className = `bubble ${role}`;
  div.textContent = text;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return div;
}

async function loadHistory() {
  const sessionId = getSessionId();
  try {
    const res = await fetch(`/api/chat/${sessionId}/history`);
    const data = await res.json();
    chatWindow.innerHTML = "";
    if (data.history && data.history.length > 0) {
      data.history.forEach((msg) => addBubble(msg.role, msg.content));
    } else {
      addBubble("assistant", "Hi! Ask me anything — I'll remember our conversation.");
    }
  } catch (err) {
    console.error("Failed to load history:", err);
  }
}

async function sendMessage(text) {
  const sessionId = getSessionId();
  addBubble("user", text);

  const typingBubble = addBubble("assistant typing", "Thinking...");
  messageInput.disabled = true;
  chatForm.querySelector("button").disabled = true;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, message: text }),
    });

    const data = await res.json();
    typingBubble.remove();

    if (!res.ok) {
      addBubble("error", data.error || "Something went wrong.");
      return;
    }

    addBubble("assistant", data.reply);
  } catch (err) {
    typingBubble.remove();
    addBubble("error", "Network error — could not reach the server.");
    console.error(err);
  } finally {
    messageInput.disabled = false;
    chatForm.querySelector("button").disabled = false;
    messageInput.focus();
  }
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return; // client-side mirror of the server's validation gate
  messageInput.value = "";
  sendMessage(text);
});

resetBtn.addEventListener("click", async () => {
  const sessionId = getSessionId();
  await fetch(`/api/chat/${sessionId}/reset`, { method: "POST" });
  newSession();
  chatWindow.innerHTML = "";
  addBubble("assistant", "Started a new conversation. What's on your mind?");
});

loadHistory();
