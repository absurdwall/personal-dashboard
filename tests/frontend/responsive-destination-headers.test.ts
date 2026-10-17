import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const pages = ["today", "tasks", "calendar", "habits", "collaboration"] as const;
type Page = (typeof pages)[number];

function renderHeaders(): any[] {
  const output = mkdtempSync(join(tmpdir(), "pdex-responsive-destination-headers-"));
  try {
    const html = readFileSync(join(root, "frontend/index.html"), "utf8")
      .replace(/<script[^>]*src="[^"]*main\.js[^"]*"[^>]*><\/script>/g, "");
    writeFileSync(join(output, "index.html"), html);
    copyFileSync(join(root, "frontend/styles.css"), join(output, "styles.css"));
    const script = `
      const wait=()=>new Promise(resolve=>setTimeout(resolve,10));
      const resize=async(width,height)=>{
        window.webkit.messageHandlers.resizeViewport.postMessage({width,height});
        for(let i=0;i<100&&(innerWidth!==width||innerHeight!==height);i++)await new Promise(resolve=>setTimeout(resolve,10));
        await wait();
      };
      const rect=node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
      const app=document.querySelector('.app-shell');
      const sidebar=app.querySelector('.workspace-sidebar');
      const rows=[];
      const measure=async(width,height,navigationExpanded,page,editorOpen=false)=>{
            if(innerWidth!==width||innerHeight!==height)await resize(width,height);
            app.dataset.navigationExpanded=String(navigationExpanded);
            sidebar.hidden=!navigationExpanded;
            app.dataset.workspaceDestination=page;
            document.querySelectorAll('[data-workspace-panel]').forEach(node=>node.hidden=node.dataset.workspacePanel!==page);
            const tasksLayout=document.querySelector('#workspace-destination-tasks .tasks-layout');
            let editor=tasksLayout.querySelector(':scope > .tasks-selected-detail');
            if(editor)editor.remove();
            if(page==='tasks'&&editorOpen){
              editor=document.createElement('aside');
              editor.className='tasks-selected-detail';
              editor.innerHTML='<div class="task-editor-dialog"><form class="task-editor-details" data-task-surface="tasks"><div class="task-form-grid"><label>Content<textarea>synthetic panel</textarea></label></div></form></div>';
              tasksLayout.append(editor);
            }
            await wait();
            const destination=document.querySelector('#workspace-destination-'+page);
            const header=destination.querySelector('.destination-page-header');
            const intro=header?.querySelector(':scope > div:first-child');
            const heading=header?.querySelector('.destination-heading');
            const description=intro?.querySelector(':scope > p:last-child');
            const controls=header?.children[1];
            const toolbar=page==='tasks'?destination.querySelector('.tasks-content > .tasks-toolbar'):null;
            const toolbarIntro=toolbar?.children[0];
            const toolbarHeading=toolbar?.querySelector('#tasks-list-heading');
            const toolbarActions=toolbar?.querySelector('.tasks-toolbar-actions');
            rows.push({width,height,navigationExpanded,page,editorOpen,
              destination:rect(destination),header:header?rect(header):null,intro:intro?rect(intro):null,
              heading:heading?rect(heading):null,description:description?rect(description):null,
              controls:controls?rect(controls):null,toolbar:toolbar?rect(toolbar):null,
              toolbarIntro:toolbarIntro?rect(toolbarIntro):null,toolbarHeading:toolbarHeading?rect(toolbarHeading):null,
              toolbarActions:toolbarActions?rect(toolbarActions):null,
              headerTitle:heading?.textContent?.trim()??null,
              toolbarTitle:toolbarHeading?.textContent?.trim()??null});
      };
      for(const width of [560,640,680,705,760,840])
        for(const navigationExpanded of [true,false])
          await measure(width,607,navigationExpanded,'collaboration');
      for(const navigationExpanded of [true,false])
        for(const page of ${JSON.stringify(pages.filter((page) => page !== "collaboration"))})
          await measure(705,607,navigationExpanded,page);
      for(const navigationExpanded of [true,false])
        await measure(1193,723,navigationExpanded,'tasks',true);
      return JSON.stringify(rows);
    `;
    const scriptPath = join(output, "measure.js");
    writeFileSync(scriptPath, script);
    const helper = join(output, "probe.swift");
    writeFileSync(helper, readFileSync(join(root, "tests/frontend/helpers/rendered-today-unlocated.swift"), "utf8")
      .replace("addingTimeInterval(20)", "addingTimeInterval(90)"));
    const raw = execFileSync("swift", [helper, join(output, "index.html"), scriptPath, "840", "607"], {
      cwd: root,
      encoding: "utf8",
      timeout: 90_000,
    });
    const encoded = raw.match(/\[[\s\S]*\]/)?.[0];
    assert.ok(encoded, `WKWebView returned no responsive header measurements: ${raw}`);
    return JSON.parse(encoded);
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
}

test("destination headers reflow from available workspace width across navigation and editor states", { skip: process.platform !== "darwin" }, () => {
  const rows = renderHeaders();
  const collaboration = rows.filter((row) => row.page === "collaboration" && row.width <= 840);
  assert.equal(collaboration.length, 12);
  for (const row of collaboration) {
    assert.ok(row.header.width > 0, JSON.stringify(row));
    assert.ok(row.heading.width >= Math.min(48, row.header.width), `Collaboration heading stays readable: ${JSON.stringify(row)}`);
    assert.ok(row.description.width >= Math.min(180, row.header.width), `Collaboration description keeps a readable line width: ${JSON.stringify(row)}`);
    for (const node of [row.intro, row.controls]) {
      assert.ok(node.left >= row.header.left - 1 && node.right <= row.header.right + 1, `header child stays within available width: ${JSON.stringify(row)}`);
    }
    const sideBySide = row.controls.top < row.intro.bottom - 1;
    assert.equal(sideBySide, row.header.width >= 600, `date controls wrap only when the page container is narrow: ${JSON.stringify(row)}`);
  }

  const pageHeaders = rows.filter((row) => row.width === 705 && row.page !== "collaboration");
  assert.equal(pageHeaders.length, (pages.length - 1) * 2);
  for (const row of pageHeaders) {
    assert.ok(row.heading.width >= Math.min(48, row.header.width), `shared ${row.page} heading remains readable: ${JSON.stringify(row)}`);
  }

  const taskToolbars = rows.filter((row) => row.page === "tasks" && row.width === 1193);
  assert.equal(taskToolbars.length, 2);
  for (const row of taskToolbars) {
    assert.ok(row.toolbarHeading.width >= 120, `Tasks list heading does not collapse under filters: ${JSON.stringify(row)}`);
    assert.ok(row.toolbarActions.left >= row.toolbar.left - 1 && row.toolbarActions.right <= row.toolbar.right + 1,
      `Tasks filters stay within the content width: ${JSON.stringify(row)}`);
    if (row.editorOpen) {
      assert.ok(row.toolbarActions.top >= row.toolbarIntro.bottom - 1,
        `filters move below the title when the selected editor narrows the content: ${JSON.stringify(row)}`);
    }
  }
});
