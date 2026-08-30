// test.js
// Umera Sulthana
//
// Quick end-to-end memory check:
//   1. tell the bot a name
//   2. make it generate something long, to eat up context
//   3. ask for the name back — should still get it right
// Plus a basic check that empty messages get rejected.
//
// Run the server first (npm start), then in another terminal: npm test

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

const TEST_NAME = "Vipin";

function log(step, msg) {
  console.log(`[${step}] ${msg}`);
}

async function sendMessage(sessionId, message) {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, message }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      `Request failed (${res.status}): ${body.error || "unknown error"}`
    );
  }

  return res.json();
}

async function runMemoryExam() {
  const sessionId = crypto.randomUUID();
  console.log(`\nRunning memory exam with session_id: ${sessionId}\n`);

  // --- Phase 1: State Initialization ---
  log("Phase 1", `Sending: "My name is ${TEST_NAME}"`);
  const initReply = await sendMessage(sessionId, `My name is ${TEST_NAME}`);
  log("Phase 1", `Reply: "${initReply.reply.slice(0, 80)}..."`);

  // --- Phase 2: Context Distraction ---
  log("Phase 2", "Sending: \"Write a 300-word paragraph about deep sea exploration.\"");
  const distractReply = await sendMessage(
    sessionId,
    "Write a 300-word paragraph about deep sea exploration."
  );
  log(
    "Phase 2",
    `Reply received (${distractReply.reply.length} chars) — context distracted.`
  );

  // --- Phase 3: State Extraction ---
  log("Phase 3", 'Sending: "What is my name?"');
  const extractReply = await sendMessage(sessionId, "What is my name?");
  log("Phase 3", `Reply: "${extractReply.reply}"`);

  // --- Assertion ---
  const passed = extractReply.reply
    .toLowerCase()
    .includes(TEST_NAME.toLowerCase());

  console.log("\n----------------------------------------");
  if (passed) {
    console.log(`✅ PASS — model correctly recalled "${TEST_NAME}"`);
  } else {
    console.log(`❌ FAIL — model did not recall "${TEST_NAME}"`);
    console.log(`   Full reply: "${extractReply.reply}"`);
  }
  console.log("----------------------------------------\n");

  // --- Cleanup: reset the test session so it doesn't linger in the DB ---
  await fetch(`${BASE_URL}/api/chat/${sessionId}/reset`, { method: "POST" });

  if (!passed) process.exit(1);
}

async function runValidationGateTest() {
  console.log("Running validation gate test (empty message should be rejected)...\n");
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: crypto.randomUUID(), message: "   " }),
  });

  const passed = res.status === 400;
  console.log(
    passed
      ? "✅ PASS — whitespace-only message correctly rejected with 400\n"
      : `❌ FAIL — expected 400, got ${res.status}\n`
  );

  if (!passed) process.exit(1);
}

async function main() {
  try {
    await runValidationGateTest();
    await runMemoryExam();
    console.log("All tests passed.\n");
  } catch (err) {
    console.error("\nTest run failed with an error:");
    console.error(err.message);
    console.error(
      "\nMake sure the server is running first: npm start\n"
    );
    process.exit(1);
  }
}

main();
