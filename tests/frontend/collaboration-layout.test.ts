import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const sizes = [[795, 720], [874, 756], [1280, 720], [1280, 756]] as const;

type Scenario = { width: number; height: number; selected: boolean; expandContext?: boolean; expandHistory?: boolean; openComposerHelp?: boolean };

function renderScenario({ width, height, selected, expandContext = false, expandHistory = false, openComposerHelp = false }: Scenario): any {
  const output = mkdtempSync(join(tmpdir(), "pdex17-collaboration-layout-"));
  try {
    const html = readFileSync(join(root, "frontend/index.html"), "utf8")
      .replace(/<script[^>]*src="[^\"]*main\.js[^\"]*"[^>]*><\/script>/g, "");
    writeFileSync(join(output, "index.html"), html);
    copyFileSync(join(root, "frontend/styles.css"), join(output, "styles.css"));
    const panels = stripTypeScriptTypes(readFileSync(join(root, "frontend/collaboration-panels.ts"), "utf8"), { mode: "transform" })
      .replace(/^export /gm, "");
    const fixtureSetup = selected ? `
      document.querySelector('#collaboration-runtime-status').textContent='Synthetic connection failure';
      document.querySelector('#collaboration-runtime-status').dataset.state='error';
      document.querySelector('#collaboration-activity-date').value='2026-10-11';
      document.querySelector('#collaboration-session-list').innerHTML=Array.from({length:${expandHistory ? 5 : 1}},(_,i)=>'<li><button class="collaboration-session-button" aria-pressed="'+(i===0)+'"><strong>Synthetic long session '+i+'</strong><small>Local fixture · retained failure status</small></button></li>').join('');
      document.querySelector('#collaboration-sessions-status').textContent='${expandHistory ? 5 : 1} synthetic saved sessions';
      document.querySelector('#collaboration-chat-heading').textContent='Synthetic long session';
      runStatus.textContent='Previous response was retained after a synthetic transport failure.';
      runStatus.dataset.state='error';
      messages.innerHTML=Array.from({length:34},(_,i)=>'<article class="collaboration-message"><p>Synthetic saved reply paragraph '+i+'. No account, Vault, or task text is present.</p><p>Additional synthetic detail remains readable and scrollable inside the message list.</p></article>').join('');
      document.querySelector('#collaboration-message-draft').disabled=false;
      document.querySelector('#collaboration-send-message').disabled=false;
    ` : `
      document.querySelector('#collaboration-runtime-status').textContent='Synthetic connection ready';
      document.querySelector('#collaboration-runtime-status').dataset.state='ready';
      document.querySelector('#collaboration-activity-date').value='2026-10-11';
      document.querySelector('#collaboration-session-list').replaceChildren();
      document.querySelector('#collaboration-sessions-status').textContent='No synthetic sessions';
      messages.replaceChildren();
    `;
    const script = `${panels}
      const app=document.querySelector('.app-shell');
      app.dataset.workspaceDestination='collaboration';
      app.dataset.navigationExpanded='true';
      app.dataset.backgroundImageState='ready';
      app.style.setProperty('--background-image','linear-gradient(135deg,#e3cbb1,#729c91)');
      document.querySelectorAll('[data-workspace-panel]').forEach(node=>node.hidden=node.dataset.workspacePanel!=='collaboration');
      document.querySelector('#workspace-title').textContent='Collaboration';
      document.querySelector('#workspace-description').textContent='Synthetic isolated layout regression';
      document.querySelector('#collaboration-context-vault').textContent='Synthetic local fixture · no Vault access';
      document.querySelector('#collaboration-context-panes').innerHTML=Array.from({length:6},(_,i)=>'<section class="collaboration-context-card"><h4>Synthetic context group '+i+'</h4><p>Short synthetic context; no source was read.</p><ul><li>Fixture item '+i+' A</li><li>Fixture item '+i+' B</li></ul></section>').join('');
      const runStatus=document.querySelector('#collaboration-run-status');
      const messages=document.querySelector('#collaboration-message-list');
      ${fixtureSetup}
      initializeCollaborationPanels();
      await new Promise(resolve=>setTimeout(resolve,80));
      const layout=document.querySelector('.collaboration-layout');
      if(${expandContext} && ['single','two'].includes(layout.dataset.columns) && document.querySelector('#collaboration-toggle-context').getAttribute('aria-expanded')==='false') document.querySelector('#collaboration-toggle-context').click();
      if(${expandHistory} && document.querySelector('#collaboration-toggle-history').getAttribute('aria-expanded')==='false') document.querySelector('#collaboration-toggle-history').click();
      const inputHelp=document.querySelector('.collaboration-composer .collaboration-help');
      if(${openComposerHelp}) inputHelp.open=true;
      await new Promise(resolve=>setTimeout(resolve,40));
      const information=document.querySelector('.workspace-information');information.scrollTop=0;
      await new Promise(resolve=>setTimeout(resolve,40));
      const rect=node=>{const r=node.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};};
      const style=node=>{const s=getComputedStyle(node);return {fontFamily:s.fontFamily,fontSize:s.fontSize,lineHeight:s.lineHeight};};
      const shell=document.querySelector('.workspace-shell');
      const regions=document.querySelector('.workspace-regions');
      const destination=document.querySelector('#workspace-destination-collaboration');
      const chat=document.querySelector('.collaboration-chat-pane');
      const primary=document.querySelector('.collaboration-primary-layout');
      const currentWork=document.querySelector('#collaboration-work-panel');
      const history=document.querySelector('#collaboration-history-panel');
      const statusBar=document.querySelector('.collaboration-status-bar');
      const composer=document.querySelector('#collaboration-composer');
      const send=document.querySelector('#collaboration-send-message');
      const textarea=document.querySelector('#collaboration-message-draft');
      const localHeader=document.querySelector('.collaboration-header');
      const activityDate=document.querySelector('#collaboration-activity-date');
      const title=document.querySelector('#collaboration-heading');
      const messagesRect=rect(messages),chatRect=rect(chat),composerRect=rect(composer);
      const result={
        viewport:{width:innerWidth,height:innerHeight},mode:layout.dataset.columns,
        shell:rect(shell),regions:rect(regions),information:{...rect(information),clientHeight:information.clientHeight,scrollHeight:information.scrollHeight},
        destination:rect(destination),primary:rect(primary),chat:chatRect,
        status:{...rect(statusBar),children:[...statusBar.children].map(rect)},
        history:{...rect(history),hidden:history.hidden,scrollHeight:history.scrollHeight,clientHeight:history.clientHeight,overflowY:getComputedStyle(history).overflowY},
        messageList:{...messagesRect,clientHeight:messages.clientHeight,scrollHeight:messages.scrollHeight,overflowY:getComputedStyle(messages).overflowY},
        composer:composerRect,textarea:rect(textarea),send:rect(send),composerHelpOpen:inputHelp.open,currentWork:{...rect(currentWork),hidden:currentWork.hidden,scrollHeight:currentWork.scrollHeight,clientHeight:currentWork.clientHeight,overflowY:getComputedStyle(currentWork).overflowY},
        chatSurface:{background:getComputedStyle(chat).backgroundColor,borderStyle:getComputedStyle(chat).borderTopStyle,borderWidth:getComputedStyle(chat).borderTopWidth},
        retainedFailure:runStatus.dataset.state==='error'&&runStatus.textContent.includes('retained'),
        globalHeaderHidden:getComputedStyle(document.querySelector('.workspace-header')).display==='none',
        localHeaderInsideInformation:information.contains(localHeader),
        activityDateInsideLocalHeader:localHeader.contains(activityDate),
        retainedStatusInChat:!(${selected})||rect(runStatus).top>=chatRect.top&&rect(runStatus).bottom<=chatRect.bottom,
        currentWorkFollowsPrimary:layout.dataset.columns!=='two'||currentWork.hidden||rect(currentWork).top>=rect(primary).bottom,
        composerInChat:composerRect.top>=chatRect.top&&composerRect.bottom<=chatRect.bottom,
        composerInViewport:composerRect.top>=0&&composerRect.bottom<=innerHeight,
        noSessionInput:{disabled:textarea.disabled,hitTest:document.elementFromPoint(textarea.getBoundingClientRect().left+textarea.getBoundingClientRect().width/2,textarea.getBoundingClientRect().top+textarea.getBoundingClientRect().height/2)?.id,hasFocus:document.activeElement===textarea},
        titleStyles:{today:style(document.querySelector('#today-page-heading')),tasks:style(document.querySelector('#tasks-heading')),calendar:style(document.querySelector('.calendar-header h2')),habits:style(document.querySelector('#habits-heading')),collaboration:style(title)},
        descriptionStyles:{today:style(document.querySelector('#workspace-destination-today .destination-page-header > div:first-child > p:last-child')),tasks:style(document.querySelector('#workspace-destination-tasks .destination-page-header > div:first-child > p:last-child')),collaboration:style(document.querySelector('.collaboration-description'))},
        pageFrames:Object.fromEntries(['today','tasks','calendar','collaboration'].map(name=>{const destination=document.querySelector('#workspace-destination-'+name),header=destination.querySelector('.destination-page-header'),frame=getComputedStyle(destination),heading=getComputedStyle(header);const previouslyHidden=destination.hidden;destination.hidden=false;const bounds=rect(destination);destination.hidden=previouslyHidden;return[name,{paddingTop:frame.paddingTop,paddingRight:frame.paddingRight,paddingBottom:frame.paddingBottom,paddingLeft:frame.paddingLeft,headerMarginBottom:heading.marginBottom,headerPaddingBottom:heading.paddingBottom,headerBorderBottomWidth:heading.borderBottomWidth,bounds:{left:bounds.left,right:bounds.right,width:bounds.width}}]}))
      };
      const composerTop=composerRect.top;
      messages.scrollTop=messages.scrollHeight;
      await new Promise(resolve=>setTimeout(resolve,30));
      result.messageScrollTop=messages.scrollTop;
      result.composerTopAfterMessageScroll=rect(composer).top;
      const reachableByPageScroll=async node=>{
        const infoRect=rect(information),targetRect=rect(node);
        const desired=information.scrollTop+targetRect.top-infoRect.top;
        information.scrollTop=Math.max(0,Math.min(desired,information.scrollHeight-information.clientHeight));
        await new Promise(resolve=>setTimeout(resolve,30));
        const scrolledInfo=rect(information),scrolledTarget=rect(node);
        return scrolledTarget.bottom>scrolledInfo.top&&scrolledTarget.top<scrolledInfo.bottom;
      };
      if(['single','two'].includes(layout.dataset.columns)&&(!currentWork.hidden||!history.hidden)){
        if(!currentWork.hidden)result.currentWorkReachableByPageScroll=await reachableByPageScroll(currentWork);
        if(!history.hidden)result.historyReachableByPageScroll=await reachableByPageScroll(history);
        result.pageScrollTop=information.scrollTop;
      } else if(layout.dataset.columns==='three'&&!currentWork.hidden){
        currentWork.scrollTop=currentWork.scrollHeight;
        result.currentWorkReachableByPaneScroll=currentWork.scrollTop>0;
      }
      result.composerTopAfterMessageScrollDifference=Math.abs(result.composerTopAfterMessageScroll-composerTop);
      if(${selected}) {
        const interactionNodes=[textarea,send,document.querySelector('#collaboration-new-session'),document.querySelector('.collaboration-session-button')].filter(Boolean);
        result.interactionTargets=[];
        for(const target of interactionNodes){
          let bounds=rect(target);
          if(bounds.top<0||bounds.bottom>innerHeight||bounds.left<0||bounds.right>innerWidth){target.scrollIntoView({block:'center',inline:'nearest'});await new Promise(resolve=>setTimeout(resolve,24));bounds=rect(target);}
          const hit=document.elementFromPoint(bounds.left+bounds.width/2,bounds.top+bounds.height/2);
          target.focus({preventScroll:true});
          result.interactionTargets.push({id:target.id||target.className,visible:bounds.top>=0&&bounds.bottom<=innerHeight&&bounds.left>=0&&bounds.right<=innerWidth,pointerHit:Boolean(hit&&target.contains(hit)),focused:document.activeElement===target,disabled:target.disabled===true});
        }
      }
      return JSON.stringify(result);`;
    const scriptPath = join(output, "check.js");
    writeFileSync(scriptPath, script);
    const swiftProbe = join(root, "tests/frontend/helpers/rendered-today-unlocated.swift");
    const raw = execFileSync("swift", [swiftProbe, join(output, "index.html"), scriptPath, String(width), String(height)], {
      cwd: root, encoding: "utf8", timeout: 60_000,
    });
    const encoded = raw.match(/\{[\s\S]*\}/)?.[0];
    assert.ok(encoded, `WKWebView returned no geometry: ${raw}`);
    return JSON.parse(encoded);
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
}

function assertSharedHeadings(result: any) {
  const reference = result.titleStyles.today;
  for (const [name, title] of Object.entries(result.titleStyles) as [string, any][]) {
    assert.equal(title.fontFamily, reference.fontFamily, `${name} title family`);
    assert.equal(title.fontSize, reference.fontSize, `${name} title size`);
    assert.equal(title.lineHeight, reference.lineHeight, `${name} title line height`);
  }
  assert.deepEqual(result.descriptionStyles.collaboration, result.descriptionStyles.today, "Collaboration uses the visible Today introduction scale");
  assert.deepEqual(result.descriptionStyles.collaboration, result.descriptionStyles.tasks, "Collaboration uses the visible Tasks introduction scale");
  for (const [name, frame] of Object.entries(result.pageFrames) as [string, any][]) {
    const {bounds: _bounds, ...style} = frame;
    const {bounds: _todayBounds, ...todayStyle} = result.pageFrames.today;
    assert.deepEqual(style, todayStyle, `${name} uses the shared page frame and header rhythm`);
    for (const coordinate of ["left", "right", "width"]) {
      assert.ok(Math.abs(frame.bounds[coordinate] - result.pageFrames.today.bounds[coordinate]) < 1, `${name} ${coordinate} aligns with Today: ${JSON.stringify(frame.bounds)}`);
    }
  }
}

function assertCollaborationTargets(result: any) {
  assert.equal(result.interactionTargets.length,4,JSON.stringify(result.interactionTargets));
  for(const target of result.interactionTargets){
    assert.equal(target.visible,true,JSON.stringify(target));
    assert.equal(target.pointerHit,true,JSON.stringify(target));
    assert.equal(target.focused,true,JSON.stringify(target));
    assert.equal(target.disabled,false,JSON.stringify(target));
  }
}

for (const [width, height] of sizes) {
  test(`empty Collaboration keeps its composer visible with shared headings at ${width}×${height}`, { skip: process.platform !== "darwin" }, () => {
    const result = renderScenario({ width, height, selected: false });
    assert.deepEqual(result.viewport, { width, height });
    assert.equal(result.globalHeaderHidden, true);
    assert.equal(result.localHeaderInsideInformation, true);
    assert.equal(result.activityDateInsideLocalHeader, true);
    assert.equal(result.noSessionInput.disabled, false);
    assert.equal(result.noSessionInput.hitTest, "collaboration-message-draft");
    assert.equal(result.composerInChat, true, JSON.stringify(result));
    assert.equal(result.composerInViewport, true, JSON.stringify(result));
    assert.ok(result.textarea.height > 0);
    assert.ok(result.chatSurface.background !== "rgba(0, 0, 0, 0)", JSON.stringify(result.chatSurface));
    assert.equal(result.chatSurface.borderStyle, "solid");
    assertSharedHeadings(result);
  });

  test(`selected long Collaboration keeps a readable scrolling history and reachable composer at ${width}×${height}`, { skip: process.platform !== "darwin" }, () => {
    const result = renderScenario({ width, height, selected: true, expandContext: true });
    assert.deepEqual(result.viewport, { width, height });
    assert.equal(result.globalHeaderHidden, true);
    assert.equal(result.retainedFailure, true);
    assert.equal(result.localHeaderInsideInformation, true);
    assert.equal(result.activityDateInsideLocalHeader, true);
    assert.equal(result.retainedStatusInChat, true, JSON.stringify(result));
    assert.equal(result.currentWorkFollowsPrimary, true, JSON.stringify(result));
    assert.equal(result.composerInChat, true, JSON.stringify(result));
    assert.equal(result.composerInViewport, true, JSON.stringify(result));
    assertCollaborationTargets(result);
    assert.ok(result.messageList.clientHeight >= 80, JSON.stringify(result));
    assert.ok(result.messageList.scrollHeight > result.messageList.clientHeight, JSON.stringify(result.messageList));
    assert.ok(result.messageScrollTop > 0);
    assert.ok(result.composerTopAfterMessageScrollDifference < 1, JSON.stringify(result));
    if (result.mode === "two" || result.mode === "single") {
      assert.ok(result.information.scrollHeight > result.information.clientHeight, JSON.stringify(result.information));
      assert.equal(result.currentWorkReachableByPageScroll, true, JSON.stringify(result.currentWork));
    } else {
      assert.equal(result.mode, "three");
      assert.equal(result.currentWorkReachableByPaneScroll, true, JSON.stringify(result.currentWork));
    }
    assertSharedHeadings(result);
  });
}

test("expanded input and saving details do not clip the retained composer controls at 795×720", { skip: process.platform !== "darwin" }, () => {
  const result = renderScenario({ width: 795, height: 720, selected: true, expandContext: true, openComposerHelp: true });
  assert.equal(result.composerHelpOpen, true);
  assert.equal(result.mode, "single");
  assert.equal(result.composerInChat, true, JSON.stringify(result));
  assert.equal(result.composerInViewport, true, JSON.stringify(result));
  assert.ok(result.send.height > 0);
  assert.ok(result.send.top >= result.composer.top && result.send.bottom <= result.composer.bottom, JSON.stringify(result));
});

test("single-column Collaboration keeps the composer visible when five-session history is expanded at 640×756", { skip: process.platform !== "darwin" }, () => {
  const result = renderScenario({ width: 640, height: 756, selected: true, expandHistory: true });
  assert.deepEqual(result.viewport, { width: 640, height: 756 });
  assert.equal(result.mode, "single");
  assert.equal(result.history.hidden, false);
  assert.ok(result.status.height < 60, JSON.stringify(result.status));
  assert.ok(result.status.children.every((child:any)=>child.top>=result.status.top&&child.bottom<=result.status.bottom&&child.left>=result.status.left&&child.right<=result.status.right), JSON.stringify(result.status));
  assert.equal(result.retainedStatusInChat, true, JSON.stringify(result));
  assert.equal(result.composerInChat, true, JSON.stringify(result));
  assert.equal(result.composerInViewport, true, JSON.stringify(result));
  assert.ok(result.messageList.clientHeight >= 80, JSON.stringify(result.messageList));
  assert.ok(result.messageList.scrollHeight > result.messageList.clientHeight);
  assert.ok(result.messageScrollTop > 0);
  assert.ok(result.composerTopAfterMessageScrollDifference < 1);
  assert.ok(result.history.clientHeight >= 100, JSON.stringify(result.history));
  assert.ok(result.history.top >= result.chat.bottom, JSON.stringify({ history: result.history, chat: result.chat }));
  assert.equal(result.historyReachableByPageScroll, true, JSON.stringify(result));
});
