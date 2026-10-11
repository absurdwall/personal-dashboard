import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { stripTypeScriptTypes } from "node:module";

function webKit(script: string): any {
  const directory = mkdtempSync(join(tmpdir(), "pdex-command-dom-"));
  try {
    const html = readFileSync(new URL("../../frontend/index.html", import.meta.url), "utf8")
      .replace(/<script[^>]*src="main.js"[^>]*><\/script>/, "");
    writeFileSync(join(directory, "index.html"), html);
    writeFileSync(join(directory, "styles.css"), readFileSync(new URL("../../frontend/styles.css", import.meta.url), "utf8"));
    const controller = stripTypeScriptTypes(readFileSync(new URL("../../frontend/collaboration-command-completion.ts", import.meta.url), "utf8")).replace(/export /g, "");
    writeFileSync(join(directory, "check.js"), `${controller}\n(() => {
      const input = document.querySelector('#collaboration-message-draft');
      input.disabled = false;
      document.querySelector('#workspace-destination-collaboration').hidden = false;
      const menu = document.querySelector('#collaboration-command-menu') ?? document.createElement('div'); menu.id = 'collaboration-command-menu'; menu.hidden = true;
      if (!menu.isConnected) input.after(menu);
      let submitted = 0, edited = [];
      const composer = document.querySelector('#collaboration-composer');
      composer.addEventListener('submit', event => { event.preventDefault(); submitted++; });
      input.addEventListener('input', () => edited.push(input.value));
      initializeCollaborationCommandCompletion(input, menu, () => 'Personal retro', () => composer.requestSubmit());
      const type = text => { input.value = text; input.focus(); input.setSelectionRange(text.length, text.length); input.dispatchEvent(new Event('input', { bubbles: true })); };
      const key = (key, options = {}) => input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options }));
      ${script}
    })()`);
    return JSON.parse(execFileSync("swift", [new URL("./helpers/rendered-today-layout.swift", import.meta.url).pathname,
      join(directory, "index.html"), join(directory, "check.js"), "830"], { encoding: "utf8", timeout: 60000 }));
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

test("real textarea discovers Personal Retro and Enter completes an editable draft without submitting", { skip: process.platform !== "darwin" }, () => {
  const result = webKit(`type('/'); const visible = !menu.hidden; const commands = [...menu.querySelectorAll('button')].map(n => n.textContent); key('Enter', { metaKey: true }); return JSON.stringify({visible, commands, draft: input.value, submitted, edited});`);
  assert.equal(result.visible, true);
  assert.deepEqual(result.commands, ["/retro Personal retro"]);
  assert.equal(result.draft, "/retro ");
  assert.equal(result.submitted, 0);
  assert.deepEqual(result.edited, ["/", "/retro "]);
});

test("moving the caret out of the slash token dismisses suggestions without changing ordinary text", { skip: process.platform !== "darwin" }, () => {
  const result = webKit(`type('/re later'); input.setSelectionRange(3,3); input.dispatchEvent(new MouseEvent('click')); const visible = !menu.hidden; input.setSelectionRange(9,9); input.dispatchEvent(new KeyboardEvent('keyup', {key:'ArrowRight'})); return JSON.stringify({visible, hidden: menu.hidden, draft: input.value, submitted});`);
  assert.equal(result.visible, true);
  assert.equal(result.hidden, true);
  assert.equal(result.draft, "/re later");
  assert.equal(result.submitted, 0);
});

test("slash filtering, arrow selection, Tab and pointer completion retain editable arguments", { skip: process.platform !== "darwin" }, () => {
  const result = webKit(`
    type('/workflow'); const unknownHidden = menu.hidden;
    type('/r'); key('ArrowDown'); key('ArrowUp'); const active = input.getAttribute('aria-activedescendant'); key('Tab'); const tabDraft = input.value;
    type('/re 昨天的安排'); input.setSelectionRange(3, 3); input.dispatchEvent(new MouseEvent('click')); menu.querySelector('button').click();
    return JSON.stringify({unknownHidden, active, tabDraft, clickDraft: input.value, submitted, workflow: menu.textContent.includes('workflow')});
  `);
  assert.equal(result.unknownHidden, true);
  assert.equal(result.active, "collaboration-command-menu-0");
  assert.equal(result.tabDraft, "/retro ");
  assert.equal(result.clickDraft, "/retro 昨天的安排");
  assert.equal(result.submitted, 0);
  assert.equal(result.workflow, false);
});

test("Escape closes discovery, ordinary slash text stays ordinary, and deliberate send still works", { skip: process.platform !== "darwin" }, () => {
  const result = webKit(`
    type('/'); key('Escape'); const closed = menu.hidden; key('Enter'); const afterEnter = submitted;
    input.dispatchEvent(new MouseEvent('click')); const staysClosed = menu.hidden;
    type('/r'); const reopens = !menu.hidden;
    const hidden = []; for (const text of ['https://example.test/a', 'life/Journal/Daily', '讨论 /retro', '/retro 昨天']) { type(text); hidden.push(menu.hidden); }
    key('Enter', { ctrlKey: true }); return JSON.stringify({closed, staysClosed, reopens, hidden, afterEnter, submitted, draft: input.value});
  `);
  assert.equal(result.closed, true);
  assert.equal(result.staysClosed, true);
  assert.equal(result.reopens, true);
  assert.deepEqual(result.hidden, [true, true, true, true]);
  assert.equal(result.afterEnter, 0);
  assert.equal(result.submitted, 1);
  assert.equal(result.draft, "/retro 昨天");
});

test("composition and IME confirmation keys cannot complete or send a message", { skip: process.platform !== "darwin" }, () => {
  const result = webKit(`
    type('/r'); input.dispatchEvent(new CompositionEvent('compositionstart')); key('Enter', { metaKey: true }); const during = {hidden: menu.hidden, draft: input.value, submitted};
    input.dispatchEvent(new CompositionEvent('compositionend')); const after = !menu.hidden;
    key('Enter', { isComposing: true, metaKey: true }); key('Enter', { keyCode: 229, metaKey: true });
    const before = input.value; key('Enter'); type(input.value + ' 上周工作');
    return JSON.stringify({during, after, before, draft: input.value, submitted});
  `);
  assert.deepEqual(result.during, { hidden: true, draft: "/r", submitted: 0 });
  assert.equal(result.after, true);
  assert.equal(result.before, "/r");
  assert.equal(result.draft, "/retro  上周工作");
  assert.equal(result.submitted, 0);
});

test("long help opens on demand while draft, dictation preview and real status surfaces remain exposed", { skip: process.platform !== "darwin" }, () => {
  const result = webKit(`
    const help = document.querySelector('.collaboration-help'); const collapsed = !help.open; help.querySelector('summary').click();
    const inputHelp = document.querySelector('#collaboration-voice-privacy').closest('details');
    const preview = document.querySelector('#collaboration-voice-preview'); const status = document.querySelector('#collaboration-voice-status');
    type('/r'); input.dispatchEvent(new FocusEvent('blur')); return JSON.stringify({collapsed, opened: help.open, inputHelpClosed: !inputHelp.open, previewFolded: !!preview.closest('details'), statusFolded: !!status.closest('details'), menuClosed: menu.hidden, draft: input.value, submitted});
  `);
  assert.equal(result.collapsed, true);
  assert.equal(result.opened, true);
  assert.equal(result.inputHelpClosed, true);
  assert.equal(result.previewFolded, false);
  assert.equal(result.statusFolded, false);
  assert.equal(result.menuClosed, true);
  assert.equal(result.draft, "/r");
  assert.equal(result.submitted, 0);
});

test("a composer that becomes unavailable cannot accept a stale suggestion", { skip: process.platform !== "darwin" }, () => {
  const result = webKit(`type('/r'); input.disabled = true; menu.querySelector('button').click(); return JSON.stringify({draft: input.value, submitted, hidden: menu.hidden, edited});`);
  assert.equal(result.draft, "/r");
  assert.equal(result.submitted, 0);
  assert.equal(result.hidden, true);
  assert.deepEqual(result.edited, ["/r"]);
});

test("selection or received text cannot make a stale suggestion overwrite an ordinary draft", { skip: process.platform !== "darwin" }, () => {
  const result = webKit(`
    type('/r'); input.setSelectionRange(0,2); key('Enter'); const selected = input.value;
    type('/r'); input.value = '/r\\nreceived dictation'; input.setSelectionRange(input.value.length,input.value.length); menu.querySelector('button').click();
    return JSON.stringify({selected, draft: input.value, hidden: menu.hidden, submitted});
  `);
  assert.equal(result.selected, "/r");
  assert.equal(result.draft, "/r\nreceived dictation");
  assert.equal(result.hidden, true);
  assert.equal(result.submitted, 0);
});

// Measure the real selected option after the production controller and CSS cascade.
test("selected slash candidate retains readable foreground on its soft background", { skip: process.platform !== "darwin" }, () => {
  const result = webKit(`type('/r'); const option=menu.querySelector('[aria-selected="true"]'); const style=getComputedStyle(option); return JSON.stringify({color:style.color,background:style.backgroundColor,selected:option.textContent});`);
  const luminance = (color: string) => {
    const channels=color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(value=>value/255).map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4);
    return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;
  };
  const light=luminance(result.background), dark=luminance(result.color);
  const ratio=(Math.max(light,dark)+0.05)/(Math.min(light,dark)+0.05);
  assert.equal(result.selected,"/retro Personal retro");
  assert.ok(ratio>=4.5,`selected candidate ${result.color} on ${result.background}: contrast ${ratio.toFixed(2)}`);
});
