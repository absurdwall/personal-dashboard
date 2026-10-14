import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const probeSource = join(root, "tests/frontend/helpers/rendered-today-unlocated.swift");

function render(width: number, height: number): any {
  const directory = mkdtempSync(join(tmpdir(), "pdex25-habit-webkit-"));
  try {
    const probe = join(directory, "wkwebview-probe");
    execFileSync("swiftc", [probeSource, "-o", probe], { timeout: 60_000 });
    const html = readFileSync(join(root, "dist/index.html"), "utf8")
      .replace(/<script[^>]*src="main\.js"[^>]*><\/script>/, "");
    writeFileSync(join(directory, "index.html"), html);
    copyFileSync(join(root, "dist/styles.css"), join(directory, "styles.css"));
    const check = `return (() => {
      document.querySelector('.app-shell').dataset.workspaceDestination='habits';
      document.querySelector('#workspace-destination-habits').hidden=false;
      document.querySelector('#habits-ready').hidden=false;
      document.querySelector('#habits-today-default').hidden=true;
      document.querySelector('#habit-detail-view').hidden=false;
      document.querySelector('#habits-summary-total').textContent='3 / 5';
      document.querySelector('#habit-detail-heading').textContent='📖 Evening reading';
      document.querySelector('#habit-detail-meta').textContent='Every day · Since 2026-10-12';
      document.querySelector('#habit-detail-status').textContent='Counts use confirmed facts; uncovered dates remain unknown.';
      document.querySelector('#habit-detail-month').textContent='At least 2 days';
      document.querySelector('#habit-detail-all-time').textContent='At least 2 days';
      document.querySelector('#habit-detail-current-streak').textContent='At least 2 days';
      document.querySelector('#habit-detail-highest-streak').textContent='At least 2 days';
      document.querySelector('#habit-detail-coverage').textContent='History range: 2024-01-01 — 2026-10-14 · Source snapshot window: 2026-10-12 — 2026-10-14 · Snapshot state: Ready';
      const historicalGoal=document.createElement('p');historicalGoal.className='habit-detail-goal-segment';historicalGoal.textContent='2026-10-12 · Complete daily';
      document.querySelector('#habit-detail-historical-goals').replaceChildren(historicalGoal);
      document.querySelector('#habit-detail-record-count').textContent='3 records';
      const summary=document.querySelector('.habits-week-summary');
      summary.hidden=false;
      document.querySelector('#habit-detail-lifecycle').textContent='Deactivate';
      document.querySelector('#habit-detail-edit').textContent='Edit';
      const checkIn=document.querySelector('#habit-detail-checkin');
      checkIn.hidden=false;
      const input=document.createElement('input');input.type='checkbox';input.checked=true;input.setAttribute('aria-label','Record Evening reading complete today');
      const copy=document.createElement('small');copy.textContent='Dashboard local completion';
      const control=document.createElement('div');control.className='habit-completion-control';control.append(input,copy);
      document.querySelector('#habit-detail-checkin-control').replaceChildren(control);
      const list=document.querySelector('#habit-detail-record-list');
      list.replaceChildren(...['2026-10-14','2026-10-13','2026-10-12'].map((date,index)=>{
        const row=document.createElement('article');row.className='habit-detail-record';
        const line=document.createElement('div');const time=document.createElement('time');time.dateTime=date;time.textContent=date;
        const state=document.createElement('strong');state.textContent=index===0?'Open today':'Completed';line.append(time,state);row.append(line);
        const source=document.createElement('small');source.textContent='Dashboard local · Synthetic source';row.append(source);return row;
      }));
      const rect=node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
      const detail=rect(document.querySelector('#habit-detail-view'));
      const summaryRect=rect(summary);
      const stats=document.querySelector('.habit-detail-stats');
      const goals=document.querySelector('.habit-detail-goals');
      const button=rect(document.querySelector('#habit-detail-lifecycle'));
      return JSON.stringify({viewport:{width:innerWidth,height:innerHeight},bodyWidth:document.documentElement.scrollWidth,
        detail,summary:summaryRect,statsColumns:getComputedStyle(stats).gridTemplateColumns,goals:rect(goals),button,
        checkInVisible:!checkIn.hidden,recordRows:list.children.length,
        title:document.querySelector('#habits-today-heading').textContent});
    })()`;
    writeFileSync(join(directory, "check.js"), check);
    return JSON.parse(execFileSync(probe, [join(directory, "index.html"), join(directory, "check.js"), String(width), String(height)], {
      encoding: "utf8", timeout: 60_000,
    }));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("PDEX-25 detail DOM and current Dashboard styles render in WKWebView at wide and narrow sizes", { skip: process.platform !== "darwin" }, () => {
  for (const [width, height] of [[1280, 800], [1280, 720], [830, 758], [680, 560]]) {
    const result = render(width, height);
    assert.deepEqual(result.viewport, { width, height });
    assert.equal(result.bodyWidth <= width, true, `no horizontal overflow at ${width}x${height}: ${JSON.stringify(result)}`);
    assert.ok(result.detail.width > 0 && result.summary.width > 0, `detail and summary remain visible at ${width}x${height}`);
    assert.ok(result.goals.width > 0, `historical goals remain present at ${width}x${height}`);
    assert.ok(result.button.width < 100, `lifecycle action retains quiet sizing at ${width}x${height}`);
    assert.equal(result.checkInVisible, true);
    assert.equal(result.recordRows, 3);
    if (width <= 680) assert.equal(result.statsColumns.trim().split(/\s+/).length, 2);
  }
});
