import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));

function selectedLongSession(): any {
  const output = mkdtempSync(join(tmpdir(), "pdex17-collaboration-layout-"));
  try {
    const html = readFileSync(join(root, "frontend/index.html"), "utf8")
      .replace(/<script[^>]*src="[^\"]*main\.js[^\"]*"[^>]*><\/script>/g, "");
    writeFileSync(join(output, "index.html"), html);
    copyFileSync(join(root, "frontend/styles.css"), join(output, "styles.css"));
    const panels = stripTypeScriptTypes(readFileSync(join(root, "frontend/collaboration-panels.ts"), "utf8"), { mode: "transform" })
      .replace(/^export /gm, "");
    const script = `${panels}
      const app=document.querySelector('.app-shell');
      app.dataset.workspaceDestination='collaboration';
      app.dataset.navigationExpanded='true';
      app.dataset.backgroundImageState='ready';
      app.style.setProperty('--background-image','linear-gradient(135deg,#e3cbb1,#729c91)');
      document.querySelectorAll('[data-workspace-panel]').forEach(node=>node.hidden=node.dataset.workspacePanel!=='collaboration');
      document.querySelector('#workspace-title').textContent='Collaboration';
      document.querySelector('#workspace-description').textContent='Synthetic isolated layout regression';
      document.querySelector('#collaboration-runtime-status').textContent='Synthetic connection failure';
      document.querySelector('#collaboration-runtime-status').dataset.state='error';
      document.querySelector('#collaboration-activity-date').value='2026-10-11';
      document.querySelector('#collaboration-session-list').innerHTML='<li><button class="collaboration-session-button" aria-pressed="true"><strong>Synthetic long session</strong><small>Local fixture · retained failure status</small></button></li>';
      document.querySelector('#collaboration-sessions-status').textContent='1 synthetic saved session';
      document.querySelector('#collaboration-chat-heading').textContent='Synthetic long session';
      const runStatus=document.querySelector('#collaboration-run-status');
      runStatus.textContent='Previous response was retained after a synthetic transport failure.';
      runStatus.dataset.state='error';
      document.querySelector('#collaboration-message-list').innerHTML=Array.from({length:34},(_,i)=>'<article class="collaboration-message"><p>Synthetic saved reply paragraph '+i+'. No account, Vault, or task text is present.</p><p>Additional synthetic detail remains readable and scrollable inside the message list.</p></article>').join('');
      document.querySelector('#collaboration-message-draft').disabled=false;
      document.querySelector('#collaboration-send-message').disabled=false;
      document.querySelector('#collaboration-context-vault').textContent='Synthetic local fixture · no Vault access';
      document.querySelector('#collaboration-context-panes').innerHTML=Array.from({length:6},(_,i)=>'<section class="collaboration-context-card"><h4>Synthetic context group '+i+'</h4><p>Short synthetic context; no source was read.</p><ul><li>Fixture item '+i+' A</li><li>Fixture item '+i+' B</li></ul></section>').join('');
      initializeCollaborationPanels();
      await new Promise(resolve=>setTimeout(resolve,80));
      const layout=document.querySelector('.collaboration-layout');
      if(layout.dataset.columns==='two' && document.querySelector('#collaboration-toggle-context').getAttribute('aria-expanded')==='false') document.querySelector('#collaboration-toggle-context').click();
      await new Promise(resolve=>setTimeout(resolve,40));
      const information=document.querySelector('.workspace-information');information.scrollTop=0;
      await new Promise(resolve=>setTimeout(resolve,40));
      const rect=node=>{const r=node.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};};
      const chat=document.querySelector('.collaboration-chat-pane');
      const messages=document.querySelector('#collaboration-message-list');
      const composer=document.querySelector('#collaboration-composer');
      const infoRect=rect(information),chatRect=rect(chat),messageRect=rect(messages),composerRect=rect(composer);
      return JSON.stringify({viewport:{width:innerWidth,height:innerHeight},mode:layout.dataset.columns,information:{...infoRect,clientHeight:information.clientHeight,scrollHeight:information.scrollHeight},chat:chatRect,messageList:{...messageRect,clientHeight:messages.clientHeight,scrollHeight:messages.scrollHeight},composer:composerRect,retainedFailure:runStatus.dataset.state==='error'&&runStatus.textContent.includes('retained'),composerInChat:composerRect.top>=chatRect.top&&composerRect.bottom<=chatRect.bottom,composerInViewport:composerRect.top>=0&&composerRect.bottom<=innerHeight});`;
    const scriptPath = join(output, "check.js");
    writeFileSync(scriptPath, script);
    const swiftProbe = join(root, "tests/frontend/helpers/rendered-today-unlocated.swift");
    const raw = execFileSync("swift", [swiftProbe, join(output, "index.html"), scriptPath, "874", "756"], {
      cwd: root, encoding: "utf8", timeout: 60_000,
    });
    const encoded = raw.match(/\{[\s\S]*\}/)?.[0];
    assert.ok(encoded, `WKWebView returned no geometry: ${raw}`);
    return JSON.parse(encoded);
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
}

test("a selected long conversation keeps the composer reachable while messages scroll independently", { skip: process.platform !== "darwin" }, () => {
  const result = selectedLongSession();
  assert.deepEqual(result.viewport, { width: 874, height: 756 });
  assert.equal(result.mode, "two");
  assert.equal(result.retainedFailure, true);
  assert.ok(result.messageList.scrollHeight > result.messageList.clientHeight, JSON.stringify(result.messageList));
  assert.ok(result.information.scrollHeight > result.information.clientHeight, JSON.stringify(result.information));
  assert.equal(result.composerInChat, true, JSON.stringify(result));
  assert.equal(result.composerInViewport, true, JSON.stringify(result));
});

