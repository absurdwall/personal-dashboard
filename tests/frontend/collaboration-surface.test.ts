import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../../frontend/index.html", import.meta.url), "utf8");
const main = readFileSync(new URL("../../frontend/main.ts", import.meta.url), "utf8");
const css = readFileSync(new URL("../../frontend/styles.css", import.meta.url), "utf8");
const copies = readFileSync(new URL("../../frontend/interface-language.ts", import.meta.url), "utf8");

test("Collaboration is a latest-shell destination with the adjacent approved A work areas", () => {
  assert.match(html, /data-workspace-destination="collaboration"/);
  assert.match(html, /data-workspace-panel="collaboration"/);
  for (const selector of [
    'class="collaboration-session-pane"',
    'class="collaboration-chat-pane"',
    'class="collaboration-context-pane"',
    'id="collaboration-session-list"',
    'id="collaboration-message-list"',
    'id="collaboration-context-panes"',
  ]) {
    assert.ok(html.includes(selector), `missing collaboration surface marker ${selector}`);
  }
  assert.match(css, /\.collaboration-layout\s*\{/);
  assert.match(css, /grid-template-columns:\s*13\.5rem minmax\(25rem, 1\.45fr\) minmax\(19rem, 1fr\)/);
});

test("Codex settings report experimental status and runtime capability instead of promising every install", () => {
  assert.match(html, /data-settings-panel="codex"/);
  assert.match(html, /id="collaboration-connection-status"/);
  assert.match(html, /id="collaboration-turn-capability"/);
  assert.match(html, /id="collaboration-model"[^>]*disabled/);
  assert.match(html, /id="collaboration-reasoning-effort"[^>]*disabled/);
  assert.match(main, /connection\.readOnlyTextTurnsAvailable/);
  assert.match(main, /for \(const model of connection\.models\)/);
  assert.match(main, /for \(const effort of selectedModel\?\.reasoningEfforts \?\? \[\]\)/);
  assert.match(copies, /"collaboration\.experimental":\s*\{[^\n]*zh:[^\n]*en:/);
  assert.match(copies, /"collaboration\.turnBlocked":\s*\{[^\n]*zh:[^\n]*en:/);
});

test("the composer remains gated on authenticated runtime plus verified read-only turns", () => {
  assert.match(main, /currentCollaborationConnection\?\.authenticated === true\s*&&\s*currentCollaborationConnection\.authMode === "chatgpt"\s*&&\s*currentCollaborationConnection\.readOnlyTextTurnsAvailable/);
  assert.match(html, /id="collaboration-message-draft"[^>]*disabled/);
  assert.match(html, /id="collaboration-send-message"[^>]*disabled/);
  assert.match(main, /"collaboration_submit_message"/);
});

test("local voice text stays in the existing editable composer until manual send", () => {
  assert.match(html, /id="collaboration-message-draft"[^>]*disabled/);
  assert.match(html, /id="collaboration-voice-language"[^>]*disabled/);
  assert.match(html, /id="collaboration-voice-start"[^>]*disabled/);
  assert.match(html, /id="collaboration-voice-cancel"[^>]*hidden/);
  assert.match(html, /id="collaboration-voice-privacy"[^>]*data-i18n="collaboration\.voicePrivacy"/);
  assert.match(main, /"collaboration_voice_capabilities"/);
  assert.match(main, /"collaboration_transcribe_voice"/);
  assert.match(main, /onTranscript: handleCollaborationVoiceTranscript/);
  const transcriptHandler = main.match(/function handleCollaborationVoiceTranscript\([\s\S]*?\n}\n/);
  assert.ok(transcriptHandler, "voice results have one draft routing handler");
  assert.match(transcriptHandler[0], /appendVoiceTranscript\(currentDraft, text\)/);
  assert.doesNotMatch(transcriptHandler[0], /requestSubmit|sendCollaborationMessage/);
  assert.match(main, /collaborationVoiceDraftStore\.save\(target, draft\)/);
  assert.match(main, /await collaborationVoiceDraftStore\.waitForPending\(draftTarget\);[\s\S]*?"collaboration_submit_message"/);
  assert.match(main, /collaborationDrafts\.set\(key, draft\)/);
  assert.match(main, /collaborationVoiceDraftStore\.read\(target, session\)/);
  assert.match(main, /collaborationVoiceController\.cancel\(\)/);
});
