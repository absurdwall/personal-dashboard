import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../../frontend/index.html", import.meta.url), "utf8");
const main = readFileSync(new URL("../../frontend/main.ts", import.meta.url), "utf8");
const copies = readFileSync(new URL("../../frontend/interface-language.ts", import.meta.url), "utf8");
const backend = readFileSync(new URL("../../src-tauri/src/collaboration.rs", import.meta.url), "utf8");
const memory = readFileSync(new URL("../../src-tauri/src/collaboration_memory.rs", import.meta.url), "utf8");

test("the A context pane exposes existing long-term background and a read-only routine reference", () => {
  const pane = html.indexOf("class=\"collaboration-context-pane\"");
  const panel = html.indexOf("id=\"collaboration-memory-panel\"");
  const paneEnd = html.indexOf("</aside>", pane);
  assert.ok(pane >= 0 && panel > pane && panel < paneEnd, "memory panel lives within the existing collaboration context pane");
  assert.match(html, /id="collaboration-long-term-content"/);
  assert.match(html, /id="collaboration-long-term-save"/);
  assert.match(html, /id="collaboration-long-term-reload"/);
  assert.match(html, /id="collaboration-routine-reference-content"/);
  assert.match(html, /id="collaboration-recent-memory-list"/);
  assert.match(html, /id="collaboration-open-matters-list"/);
  assert.match(html, /id="collaboration-continuity-note"/);
  assert.match(memory, /life\/Self\.md/);
  assert.match(memory, /\.agents\/skills\/life-daily-loop\/SKILL\.md/);
  assert.match(memory, /will not create a second profile/);
});

test("memory proposals require a user-visible approval card and exact source revision", () => {
  assert.match(html, /id="collaboration-memory-proposals"/);
  assert.match(main, /collaboration_save_long_term_memory/);
  assert.match(main, /collaboration_save_continuity_note/);
  assert.match(main, /collaboration_approve_memory_proposal/);
  assert.match(main, /collaboration_reject_memory_proposal/);
  assert.match(main, /expectedVaultBinding: binding/);
  assert.match(main, /proposal\.status === "awaitingApproval"/);
  assert.match(backend, /source_revision: String/);
  assert.match(backend, /validate_memory_update_authority\(/);
  assert.match(backend, /No long-term memory was changed\./);
  assert.match(backend, /build_long_term_memory_update\([\s\S]*?sources\.long_term\.content/);
  assert.doesNotMatch(backend, /proposed_content/);
  assert.doesNotMatch(main, /proposedContent/);
  assert.match(memory, /current\.revision\.as_deref\(\) != Some\(expected_revision\)/);
});

test("recent continuity stays Vault-bound, expires independently, and points to preserved sessions", () => {
  assert.match(main, /collaborationContinuityDrafts/);
  assert.match(main, /memory\.vaultBinding/);
  assert.match(backend, /CONTINUITY_MEMORY_MAX_AGE_DAYS: i64 = 14/);
  assert.match(backend, /fn is_current_continuity_date[\s\S]*?CONTINUITY_MEMORY_MAX_AGE_DAYS/);
  assert.match(backend, /correction_note_expires_on/);
  assert.match(main, /correctionNoteExpiresOn/);
  assert.match(backend, /source_message_id: message\.id\.clone\(\)/);
  assert.match(backend, /filter\(\|session\| session\.vault_key\.as_deref\(\) == vault_key\)/);
  assert.match(main, /renderMemorySessionLink\(item, entry\.sessionId, entry\.activityDate\)/);
  assert.match(main, /currentWorkspaceDestination !== "collaboration"[\s\S]*?refreshCollaborationWorkspace\(true\)/);
  assert.match(copies, /"collaboration\.recentMemoryBoundary":\s*\{[\s\S]*?zh:[^\n]*en:/);
});

test("every turn receives current business facts and selected-Vault memory as separate context", () => {
  assert.match(backend, /read_context\(Some\(vault_key\), target_date\)/);
  assert.match(backend, /"context": request\.context,[\s\S]*?"memory": request\.memory/);
  assert.match(backend, /pointers to saved Dashboard sessions, not as the source of current Task, Daily Record, or habit state/);
  assert.match(backend, /Never turn a one-day status into long-term background/);
});
