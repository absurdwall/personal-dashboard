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
  // Width policy is covered by collaboration-panels behavior tests.
  assert.match(html, /aria-controls="collaboration-history-panel"/);
  assert.match(html, /aria-controls="collaboration-work-panel"/);
});

test("external apps stay disabled in Dashboard collaboration", () => {
  assert.doesNotMatch(html, /collaboration-external-capabilities|collaboration-external-apps/);
  assert.doesNotMatch(main, /selectedCollaborationExternalAppIds|renderCollaborationExternalCapabilities/);
  assert.doesNotMatch(main, /collaboration_external_apps|collaboration_resolve_external_approval/);
  assert.doesNotMatch(main, /"collaboration_submit_message"[\s\S]{0,180}externalAppIds/);
  assert.match(main, /collaboration\.externalDisabledNotice/);
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
  assert.match(html, /id="collaboration-composer-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(html, /aria-describedby="collaboration-composer-status"/);
  assert.match(main, /collaboration\.composerNewSession/);
  assert.match(main, /collaboration\.composerConnect/);
  assert.match(main, /"collaboration_submit_message"/);
});

test("disabled controls show unavailable state without a wait cursor", () => {
  assert.match(css, /button:disabled\s*\{[^}]*cursor:\s*not-allowed/);
  assert.doesNotMatch(css, /button:disabled\s*\{[^}]*cursor:\s*wait/);
  assert.match(copies, /"collaboration\.composerNewSession":\s*\{[^\n]*zh:[^\n]*en:/);
});

test("multi-session history keeps target dates and drafts with each session", () => {
  assert.match(html, /id="collaboration-activity-date" type="date"/);
  assert.match(html, /id="collaboration-target-date" type="date"/);
  assert.match(main, /session\.activityDates[\s\S]*session\.createdDate[\s\S]*session\.targetDate/);
  assert.match(main, /collaboration_save_draft/);
  assert.match(main, /draftsByDate: Readonly<Record<string, string>>/);
  assert.match(main, /\{ sessionId, targetDate, draft \}/);
  assert.match(main, /collaboration_set_target_date/);
  assert.match(main, /session\.draft/);
  assert.match(main, /function selectCollaborationSession[\s\S]*?refreshCollaborationWorkspace\(\)/);
});

test("queue ownership, cancellation, and restart recovery are visible and actionable", () => {
  assert.match(html, /id="collaboration-work-owner"/);
  assert.match(html, /id="collaboration-stop-run"/);
  assert.match(main, /workspace\.activeRun/);
  assert.match(main, /workspace\.recoveryRequired/);
  assert.match(main, /refreshCollaborationRunOwner\(updated\)/);
  assert.match(main, /collaboration_stop_run/);
  assert.match(main, /collaboration_reconcile_run/);
  assert.match(main, /collaboration_resume_not_started/);
  assert.match(main, /message\.deliveryState/);
  assert.match(copies, /"collaboration\.checkSavedResult":\s*\{[\s\S]*?zh:[^\n]*en:/);
  assert.match(copies, /"collaboration\.resumeNotStarted":\s*\{[\s\S]*?zh:[^\n]*en:/);
});

test("local voice transcripts enter the existing editable composer and shared saved-draft queue", () => {
  assert.match(html, /id="collaboration-voice-language"[^>]*disabled/);
  assert.match(html, /id="collaboration-voice-start"[^>]*disabled/);
  assert.match(html, /id="collaboration-voice-cancel"[^>]*hidden/);
  assert.match(html, /id="collaboration-voice-privacy"[^>]*data-i18n="collaboration\.voicePrivacy"/);
  assert.match(main, /"collaboration_voice_capabilities"/);
  assert.match(main, /"collaboration_transcribe_voice"/);
  assert.match(main, /onTranscript: handleCollaborationVoiceTranscript/);
  const transcriptHandler = main.match(/function handleCollaborationVoiceTranscript\([\s\S]*?\n}\n/);
  assert.ok(transcriptHandler, "voice results have one draft routing handler");
  assert.match(transcriptHandler[0], /beginVoiceTranscriptSave\([\s\S]*?saveCollaborationDraft/);
  assert.match(transcriptHandler[0], /if \(isCurrentTarget && collaborationMessageDraft\)/);
  assert.doesNotMatch(transcriptHandler[0], /requestSubmit|sendCollaborationMessage|collaboration_submit_message/);
  assert.match(main, /session\.draftsByDate\[target\.targetDate\]/);
  assert.match(main, /await flushCollaborationDraft\(target, message\);[\s\S]*?"collaboration_submit_message"/);
});

test("voice completion keeps the recording-time session/date when navigation changes", () => {
  assert.match(main, /targetDate: collaborationTargetDates\.get\(session\.id\)[\s\S]*?collaborationTargetDate/);
  assert.match(main, /void collaborationVoiceController\.start\(target, locale\)/);
  assert.match(main, /saveCollaborationDraft\(\{ sessionId, targetDate \}, draft\)/);
  assert.match(main, /collaborationDrafts\.set\(key, draft\)/);
});
