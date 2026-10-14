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

type Scenario = { width: number; height: number; selected: boolean; expandContext?: boolean; collapseContext?: boolean; expandHistory?: boolean; openComposerHelp?: boolean; resizeTextarea?: boolean; warningPressure?: boolean; voicePreview?: boolean; longContext?: boolean; language?: "en" | "zh" };

function renderScenario({ width, height, selected, expandContext = false, collapseContext = false, expandHistory = false, openComposerHelp = false, resizeTextarea = false, warningPressure = false, voicePreview = false, longContext = false, language = "en" }: Scenario): any {
  const output = mkdtempSync(join(tmpdir(), "pdex17-collaboration-layout-"));
  try {
    const html = readFileSync(join(root, "frontend/index.html"), "utf8")
      .replace(/<script[^>]*src="[^\"]*main\.js[^\"]*"[^>]*><\/script>/g, "");
    writeFileSync(join(output, "index.html"), html);
    copyFileSync(join(root, "frontend/styles.css"), join(output, "styles.css"));
    const panels = stripTypeScriptTypes(readFileSync(join(root, "frontend/collaboration-panels.ts"), "utf8"), { mode: "transform" })
      .replace(/^export /gm, "");
    const interfaceLanguage = stripTypeScriptTypes(readFileSync(join(root, "frontend/interface-language.ts"), "utf8"), { mode: "transform" })
      .replace(/^export /gm, "");
    const fixtureSetup = selected ? `
      document.querySelector('#collaboration-runtime-status').textContent='Synthetic connection failure';
      document.querySelector('#collaboration-runtime-status').dataset.state='error';
      document.querySelector('#collaboration-activity-date').value='2026-10-11';
      document.querySelector('#collaboration-session-list').innerHTML=Array.from({length:${expandHistory ? 5 : 1}},(_,i)=>'<li><button class="collaboration-session-button" aria-pressed="'+(i===0)+'"><strong>Synthetic long session '+i+'</strong><small>Local fixture · retained failure status</small></button></li>').join('');
      document.querySelector('#collaboration-sessions-status').textContent='${expandHistory ? 5 : 1} synthetic saved sessions';
      document.querySelector('#collaboration-chat-heading').textContent='Synthetic long session';
      document.querySelector('#collaboration-chat-date').textContent='Target date: 2026-10-11';
      document.querySelector('#collaboration-composer-date').textContent='Target date: 2026-10-11';
      runStatus.textContent='Previous response was retained after a synthetic transport failure.';
      runStatus.dataset.state='error';
      messages.innerHTML=Array.from({length:34},(_,i)=>'<article class="collaboration-message"><p>Synthetic saved reply paragraph '+i+'. No account, Vault, or task text is present.</p><p>Additional synthetic detail remains readable and scrollable inside the message list.</p></article>').join('');
      document.querySelector('#collaboration-message-draft').disabled=false;
      document.querySelector('#collaboration-send-message').disabled=false;
      document.querySelector('#collaboration-voice-start').disabled=false;
      ${voicePreview ? `document.querySelector('#collaboration-voice-start').dataset.action='stop'; document.querySelector('#collaboration-voice-status').dataset.state='recording'; document.querySelector('#collaboration-voice-status').textContent='Dictation is recording'; document.querySelector('#collaboration-voice-preview').textContent='Synthetic live transcript preview; stopping will keep it editable in the message draft.';` : ""}
    ` : `
      document.querySelector('#collaboration-runtime-status').textContent='Synthetic connection ready';
      document.querySelector('#collaboration-runtime-status').dataset.state='ready';
      document.querySelector('#collaboration-activity-date').value='2026-10-11';
      document.querySelector('#collaboration-session-list').replaceChildren();
      document.querySelector('#collaboration-sessions-status').textContent='No synthetic sessions';
      messages.replaceChildren();
    `;
    const script = `${interfaceLanguage}
      ${panels}
      const app=document.querySelector('.app-shell');
      app.dataset.workspaceDestination='collaboration';
      app.dataset.navigationExpanded='true';
      app.dataset.backgroundImageState='ready';
      app.style.setProperty('--background-image','linear-gradient(135deg,#e3cbb1,#729c91)');
      applyInterfaceLanguage('${language}',document);
      document.querySelectorAll('[data-workspace-panel]').forEach(node=>node.hidden=node.dataset.workspacePanel!=='collaboration');
      document.querySelector('#workspace-title').textContent='Collaboration';
      document.querySelector('#workspace-description').textContent='Synthetic isolated layout regression';
      document.querySelector('#collaboration-context-vault').textContent='Synthetic local fixture · no Vault access';
      document.querySelector('#collaboration-context-panes').innerHTML=Array.from({length:${longContext ? 48 : 6}},(_,i)=>'<section class="collaboration-context-card"><h4>Synthetic context group '+i+'</h4><p>${longContext ? "Long synthetic context detail remains local to this fixture; no Vault or saved conversation was read. ".repeat(8) : "Short synthetic context; no source was read."}</p><ul><li>Fixture item '+i+' A</li><li>Fixture item '+i+' B</li></ul></section>').join('');
      const runStatus=document.querySelector('#collaboration-run-status');
      const messages=document.querySelector('#collaboration-message-list');
      ${fixtureSetup}
      if(${warningPressure}) {
        const copy=${JSON.stringify(language === "zh" ? {
          account:"Codex 账户状态：已连接，但当前响应仍在核对中。连接运行时、账户会话与本地响应状态分别保留；请检查保存结果后再继续。",
          owner:"待处理结果：上一次请求的最终状态尚未确认。检查运行历史前不会自动重放或重复提交；本地草稿仍保留。",
          completed:"上一次会话已完成。",
          heading:"合成已保存会话 · 长权限范围和恢复状态",
          warnings:[
            "当前会话使用较旧的 Task 工具能力。它不能完整报告之前运行时可用的权限边界；本条提示保留作为能力范围说明。",
            "当前会话使用较旧的 Daily Record 工具能力。读取和写入结果必须依照现有审批和所选 Vault 规则核验。",
            "当前会话使用较旧的 Habit 与记忆能力。未提供的能力不会由界面推断或替代；原有结果仍可查看。"
          ]
        } : {
          account:"Codex account status: connected, while the previous response is still being checked. Runtime connection, account session, and local result status remain separate; inspect the saved result before continuing.",
          owner:"Pending result: the previous request has not yet been confirmed. It will not be automatically replayed or submitted again while you review its history; the local draft remains available.",
          completed:"The selected conversation is complete.",
          heading:"Synthetic saved conversation with long scope and recovery notices",
          warnings:[
            "This session uses an older Task tool capability. It cannot fully report the permission boundary available to earlier runtime turns; this notice remains as a scope warning.",
            "This session uses an older Daily Record tool capability. Read and write outcomes still require the existing approval and selected Vault checks.",
            "This session uses older Habit and memory capabilities. The interface does not infer or substitute unavailable capabilities; prior results remain available for review."
          ]
        })};
        document.querySelector('#collaboration-runtime-status').textContent=copy.account;
        document.querySelector('#collaboration-work-owner').textContent=copy.owner;
        document.querySelector('#collaboration-work-owner').dataset.state='recovery';
        document.querySelector('#collaboration-task-tool-notice').replaceChildren(...copy.warnings.map(text=>{const span=document.createElement('span');span.textContent=text;return span;}));
        document.querySelector('#collaboration-task-tool-notice').hidden=false;
        document.querySelector('#collaboration-review-entry-notice').hidden=true;
        runStatus.textContent=copy.completed;
        runStatus.dataset.state='completed';
        document.querySelector('#collaboration-chat-heading').textContent=copy.heading;
        const capabilityDisclosure=document.querySelector('#collaboration-task-tool-disclosure');
        capabilityDisclosure.hidden=false;
        capabilityDisclosure.open=true;
      }
      initializeCollaborationPanels();
      await new Promise(resolve=>setTimeout(resolve,80));
      const layout=document.querySelector('.collaboration-layout');
      if(${expandContext} && document.querySelector('#collaboration-toggle-context').getAttribute('aria-expanded')==='false') document.querySelector('#collaboration-toggle-context').click();
      if(${expandHistory} && document.querySelector('#collaboration-toggle-history').getAttribute('aria-expanded')==='false') document.querySelector('#collaboration-toggle-history').click();
      const inputHelp=document.querySelector('.collaboration-composer .collaboration-help');
      if(${openComposerHelp}) inputHelp.open=true;
      if(${resizeTextarea}) document.querySelector('#collaboration-message-draft').style.height='86px';
      await new Promise(resolve=>setTimeout(resolve,40));
      const information=document.querySelector('.workspace-information');information.scrollTop=0;
      let scrolledToChatForNarrowViewport=false;
      if(${selected}&&${warningPressure}&&${width}<=640){const infoRect=information.getBoundingClientRect(),chatRect=document.querySelector('.collaboration-chat-pane').getBoundingClientRect();information.scrollTop=Math.max(0,chatRect.top-infoRect.top-24);scrolledToChatForNarrowViewport=true;}
      await new Promise(resolve=>setTimeout(resolve,40));
      const rect=node=>{const r=node.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};};
      const style=node=>{const s=getComputedStyle(node);return {fontFamily:s.fontFamily,fontSize:s.fontSize,lineHeight:s.lineHeight};};
      const shell=document.querySelector('.workspace-shell');
      const regions=document.querySelector('.workspace-regions');
      const destination=document.querySelector('#workspace-destination-collaboration');
      const chat=document.querySelector('.collaboration-chat-pane');
      const primary=document.querySelector('.collaboration-primary-layout');
      const currentWork=document.querySelector('#collaboration-work-panel');
      const contextClose=document.querySelector('#collaboration-close-context');
      const voicePreviewNode=document.querySelector('#collaboration-voice-preview');
      const history=document.querySelector('#collaboration-history-panel');
      const statusBar=document.querySelector('.collaboration-status-bar');
      const composer=document.querySelector('#collaboration-composer');
      const send=document.querySelector('#collaboration-send-message');
      const textarea=document.querySelector('#collaboration-message-draft');
      const localHeader=document.querySelector('.collaboration-header');
      const activityDate=document.querySelector('#collaboration-activity-date');
      const title=document.querySelector('#collaboration-heading');
      const messagesRect=rect(messages),chatRect=rect(chat),composerRect=rect(composer);
      const hitTarget=(node)=>{const r=node.getBoundingClientRect(),inBounds=r.top>=chatRect.top&&r.bottom<=chatRect.bottom&&r.left>=chatRect.left&&r.right<=chatRect.right&&r.top>=0&&r.bottom<=innerHeight;const hit=inBounds?document.elementFromPoint(r.left+r.width/2,r.top+r.height/2):null;return {rect:rect(node),inBounds,pointerHit:Boolean(hit&&node.contains(hit))};};
      const helpSummary=composer.querySelector('.collaboration-help summary');
      const hitTargets={textarea:hitTarget(textarea),microphone:hitTarget(document.querySelector('#collaboration-voice-start')),send:hitTarget(send),help:hitTarget(helpSummary)};
      const result={
        viewport:{width:innerWidth,height:innerHeight},mode:layout.dataset.columns,
        shell:rect(shell),regions:rect(regions),information:{...rect(information),clientHeight:information.clientHeight,scrollHeight:information.scrollHeight,scrollTop:information.scrollTop,scrolledToChatForNarrowViewport},
        destination:rect(destination),primary:rect(primary),chat:{...chatRect,scrollHeight:chat.scrollHeight,clientHeight:chat.clientHeight,scrollTop:chat.scrollTop,overflowY:getComputedStyle(chat).overflowY},
        warningPressure:${warningPressure},warningText:document.querySelector('#collaboration-task-tool-notice').textContent,accountStatusText:document.querySelector('#collaboration-work-owner').textContent,language:{document:document.documentElement.lang,messageLabel:document.querySelector('label[for="collaboration-message-draft"]').textContent,helpLabel:helpSummary.textContent,sendLabel:send.textContent},
        runStatus:rect(runStatus),taskNotice:{scrollHeight:document.querySelector('#collaboration-task-tool-notice').scrollHeight,clientHeight:document.querySelector('#collaboration-task-tool-notice').clientHeight,tabIndex:document.querySelector('#collaboration-task-tool-notice').tabIndex},
        hitTargets,
        status:{...rect(statusBar),children:[...statusBar.children].map(node=>({...rect(node),text:node.textContent,overflowY:getComputedStyle(node).overflowY,tabIndex:node.tabIndex}))},
        history:{...rect(history),hidden:history.hidden,scrollHeight:history.scrollHeight,clientHeight:history.clientHeight,overflowY:getComputedStyle(history).overflowY},
        contextPanel:{...rect(currentWork),hidden:currentWork.hidden,scrollHeight:currentWork.scrollHeight,clientHeight:currentWork.clientHeight,overflowY:getComputedStyle(currentWork).overflowY,closeButtonPresent:Boolean(contextClose),closeButtonNearHeading:Boolean(contextClose&&currentWork.querySelector('.collaboration-pane-heading').contains(contextClose)),closeButtonVisible:Boolean(contextClose&&rect(contextClose).height>0),anchoredToChat:rect(currentWork).left>=chatRect.left&&rect(currentWork).right<=chatRect.right&&rect(currentWork).top>=chatRect.top,overlapsChat:rect(currentWork).left<chatRect.right&&rect(currentWork).right>chatRect.left&&rect(currentWork).top<chatRect.bottom&&rect(currentWork).bottom>chatRect.top,clearsComposer:rect(currentWork).bottom<=composerRect.top+1},
        voicePreview:{...rect(voicePreviewNode),visible:rect(voicePreviewNode).height>0,text:voicePreviewNode.textContent,stopAction:document.querySelector('#collaboration-voice-start').dataset.action,sendDisabled:send.disabled},
        messageList:{...messagesRect,clientHeight:messages.clientHeight,scrollHeight:messages.scrollHeight,overflowY:getComputedStyle(messages).overflowY},
        composer:composerRect,textarea:rect(textarea),send:rect(send),composerHelpOpen:inputHelp.open,currentWork:{...rect(currentWork),hidden:currentWork.hidden,scrollHeight:currentWork.scrollHeight,clientHeight:currentWork.clientHeight,overflowY:getComputedStyle(currentWork).overflowY},
        chatSurface:{background:getComputedStyle(chat).backgroundColor,borderStyle:getComputedStyle(chat).borderTopStyle,borderWidth:getComputedStyle(chat).borderTopWidth},
        retainedFailure:runStatus.dataset.state==='error'&&runStatus.textContent.includes('retained'),
        globalHeaderHidden:getComputedStyle(document.querySelector('.workspace-header')).display==='none',
        localHeaderInsideInformation:information.contains(localHeader),
        activityDateInsideLocalHeader:localHeader.contains(activityDate),
        retainedStatusInChat:!(${selected})||rect(runStatus).top>=chatRect.top&&rect(runStatus).bottom<=chatRect.bottom,
        contextRemainsWithinChat:currentWork.hidden||rect(currentWork).left>=chatRect.left&&rect(currentWork).right<=chatRect.right&&rect(currentWork).top>=chatRect.top,
        composerInChat:composerRect.top>=chatRect.top&&composerRect.bottom<=chatRect.bottom,
        composerInViewport:composerRect.top>=0&&composerRect.bottom<=innerHeight,
        noSessionInput:{disabled:textarea.disabled,hitTest:document.elementFromPoint(textarea.getBoundingClientRect().left+textarea.getBoundingClientRect().width/2,textarea.getBoundingClientRect().top+textarea.getBoundingClientRect().height/2)?.id,hasFocus:document.activeElement===textarea},
        titleStyles:{today:style(document.querySelector('#today-page-heading')),tasks:style(document.querySelector('#tasks-heading')),calendar:style(document.querySelector('.calendar-header h2')),habits:style(document.querySelector('#habits-heading')),collaboration:style(title)},
        descriptionStyles:{today:style(document.querySelector('#workspace-destination-today .destination-page-header > div:first-child > p:last-child')),tasks:style(document.querySelector('#workspace-destination-tasks .destination-page-header > div:first-child > p:last-child')),collaboration:style(document.querySelector('.collaboration-description'))},
        pageFrames:Object.fromEntries(['today','tasks','calendar','collaboration'].map(name=>{const destination=document.querySelector('#workspace-destination-'+name),header=destination.querySelector('.destination-page-header'),frame=getComputedStyle(destination),heading=getComputedStyle(header);const previouslyHidden=destination.hidden;destination.hidden=false;const bounds=rect(destination);destination.hidden=previouslyHidden;return[name,{paddingTop:frame.paddingTop,paddingRight:frame.paddingRight,paddingBottom:frame.paddingBottom,paddingLeft:frame.paddingLeft,headerMarginBottom:heading.marginBottom,headerPaddingBottom:heading.paddingBottom,headerBorderBottomWidth:heading.borderBottomWidth,bounds:{left:bounds.left,right:bounds.right,width:bounds.width}}]}))
      };
      if(contextClose&&${collapseContext}) {
        contextClose.focus();
        contextClose.click();
        result.contextPanel.closedLocally=currentWork.hidden;
        result.contextPanel.focusReturnedToToggle=document.activeElement===document.querySelector('#collaboration-toggle-context');
      }
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
        const interactionNodes=[textarea,document.querySelector('#collaboration-voice-start'),send,helpSummary];
        result.interactionTargets=[];
        for(const target of interactionNodes){
          let bounds=rect(target);
          const inComposer=target===textarea||target===document.querySelector('#collaboration-voice-start')||target===send||target===helpSummary;
          const chatBounds=rect(chat);
          if((inComposer&&(bounds.top<chatBounds.top||bounds.bottom>chatBounds.bottom))||bounds.top<0||bounds.bottom>innerHeight||bounds.left<0||bounds.right>innerWidth){target.scrollIntoView({block:'nearest',inline:'nearest'});await new Promise(resolve=>setTimeout(resolve,24));bounds=rect(target);}
          const hit=document.elementFromPoint(bounds.left+bounds.width/2,bounds.top+bounds.height/2);
          target.focus({preventScroll:true});
          const currentChat=rect(chat);
          result.interactionTargets.push({id:target.id||target.className,visible:bounds.top>=0&&bounds.bottom<=innerHeight&&bounds.left>=0&&bounds.right<=innerWidth,withinChat:target===textarea||target===send||target===helpSummary||target===document.querySelector('#collaboration-voice-start')?bounds.top>=currentChat.top&&bounds.bottom<=currentChat.bottom:true,pointerHit:Boolean(hit&&target.contains(hit)),focused:document.activeElement===target,disabled:target.disabled===true});
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
  assert.equal(result.interactionTargets.length,4,"textarea, dictation, send and input help are all represented");
  for(const target of result.interactionTargets){
    assert.equal(target.visible,true,`${target.id} remains in the window after scrolling`);
    assert.equal(target.withinChat,true,`${target.id} can be reached inside the conversation`);
    assert.equal(target.pointerHit,true,`${target.id} receives pointer input`);
    assert.equal(target.focused,true,`${target.id} accepts keyboard focus`);
    assert.equal(target.disabled,false,`${target.id} remains enabled for a selected session`);
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
    assert.equal(result.composerInChat, true, "the empty composer fits inside the conversation");
    assert.equal(result.composerInViewport, true, JSON.stringify(result));
    assert.ok(result.textarea.height > 0);
    assert.ok(result.chatSurface.background !== "rgba(0, 0, 0, 0)", JSON.stringify(result.chatSurface));
    assert.equal(result.chatSurface.borderStyle, "solid");
    assertSharedHeadings(result);
  });

  test(`selected long Collaboration keeps a readable scrolling history and reachable composer at ${width}×${height}`, { skip: process.platform !== "darwin" }, () => {
    const result = renderScenario({ width, height, selected: true, expandContext: true, longContext: true });
    assert.deepEqual(result.viewport, { width, height });
    assert.equal(result.globalHeaderHidden, true);
    assert.equal(result.retainedFailure, true);
    assert.equal(result.localHeaderInsideInformation, true);
    assert.equal(result.activityDateInsideLocalHeader, true);
    assert.equal(result.retainedStatusInChat, true, JSON.stringify(result));
    assert.equal(result.contextRemainsWithinChat, true, JSON.stringify(result));
    assert.equal(result.contextPanel.overlapsChat, true, JSON.stringify(result.contextPanel));
    assert.equal(result.contextPanel.clearsComposer, true, JSON.stringify({context:result.contextPanel,composer:result.composer}));
    assert.equal(result.composerInChat, true, "the selected composer fits inside the conversation");
    assert.equal(result.composerInViewport, true, JSON.stringify(result));
    assertCollaborationTargets(result);
    assert.ok(result.messageList.clientHeight >= 80, JSON.stringify(result));
    assert.ok(result.messageList.scrollHeight > result.messageList.clientHeight, JSON.stringify(result.messageList));
    assert.ok(result.messageScrollTop > 0);
    assert.ok(result.composerTopAfterMessageScrollDifference < 1, JSON.stringify(result));
    if (result.mode === "single") {
      assert.ok(result.information.scrollHeight > result.information.clientHeight, "expanded narrow panels remain reachable by scrolling the workspace");
      assert.equal(result.currentWorkReachableByPageScroll, true, JSON.stringify(result.currentWork));
    } else if (result.mode === "two") {
      assert.equal(result.information.scrollHeight, result.information.clientHeight, "the floating context does not add page height in the two-column layout");
      assert.equal(result.currentWorkReachableByPageScroll, true, JSON.stringify(result.currentWork));
    } else {
      assert.equal(result.mode, "three");
      assert.equal(result.currentWorkReachableByPaneScroll, true, JSON.stringify(result.currentWork));
    }
    assertSharedHeadings(result);
  });
}

test("long retained notices keep the conversation and composer usable across Collaboration sizes", { skip: process.platform !== "darwin" }, () => {
  const cases = [
    { width: 960, height: 720, language: "en" as const },
    { width: 830, height: 758, language: "zh" as const, openComposerHelp: true, resizeTextarea: true },
    { width: 640, height: 720, language: "en" as const },
    { width: 640, height: 520, language: "zh" as const, openComposerHelp: true, resizeTextarea: true },
  ];
  for (const scenario of cases) {
    const result = renderScenario({ ...scenario, selected: true, expandHistory: true, expandContext: true, warningPressure: true, voicePreview: true, longContext: true });
    const label = `${scenario.width}×${scenario.height} ${scenario.language}`;
    assert.equal(result.warningPressure, true, label);
    const allWarnings = scenario.language === "zh"
      ? ["较旧的 Task", "较旧的 Daily Record", "较旧的 Habit"]
      : ["older Task tool capability", "older Daily Record tool capability", "older Habit and memory capabilities"];
    for (const warning of allWarnings) assert.ok(result.warningText.includes(warning), `${label}: ${warning}`);
    assert.ok(result.accountStatusText.includes(scenario.language === "zh" ? "待处理结果" : "Pending result"), label);
    assert.equal(result.history.hidden, false, label);
    assert.equal(result.currentWork.hidden, false, label);
    assert.equal(result.contextPanel.overlapsChat, true, `${label}: context stays anchored over chat`);
    assert.equal(result.contextPanel.clearsComposer, true, `${label}: context stops above composer`);
    assert.equal(result.contextPanel.overflowY, "auto", `${label}: context owns its scrolling`);
    assert.ok(result.contextPanel.scrollHeight > result.contextPanel.clientHeight, `${label}: long context scrolls inside its panel`);
    assert.equal(result.voicePreview.visible, true, `${label}: transcript preview is shown only with content`);
    assert.equal(result.voicePreview.stopAction, "stop", `${label}: recording control remains a stop control`);
    assert.ok(result.messageList.clientHeight >= (scenario.openComposerHelp || scenario.resizeTextarea ? 48 : 80), `${label}: ${JSON.stringify({messageList:result.messageList,chat:result.chat,composer:result.composer})}`);
    assert.equal(result.messageList.scrollHeight > result.messageList.clientHeight, true, label);
    if (!scenario.openComposerHelp && !scenario.resizeTextarea) {
      assert.equal(result.composerInChat, true, `${label}: ${JSON.stringify({chat:result.chat,composer:result.composer})}`);
      if (!result.composerInViewport) {
        assert.ok(result.information.scrollHeight > result.information.clientHeight, `${label}: vertical workspace scrolling exposes the composer`);
      }
    } else if (!result.composerInViewport) {
      assert.ok(result.information.scrollHeight > result.information.clientHeight, `${label}: expanded input and help remain reachable by scrolling the workspace`);
      assertCollaborationTargets(result);
    }
    assert.ok(result.taskNotice.scrollHeight > result.taskNotice.clientHeight, `${label}: the complete capability notice remains scrollable`);
    assert.equal(result.taskNotice.tabIndex, 0, `${label}: the capability notice is keyboard reachable`);
    assert.equal(result.status.children[0].overflowY, "hidden", `${label}: the existing compact status row keeps its one-line ellipsis`);
    assert.ok(result.status.children[0].text.includes(scenario.language === "zh" ? "Codex 账户状态" : "Codex account status"), `${label}: full runtime text remains in the accessible DOM`);
    assert.equal(result.status.children[0].tabIndex, 0, `${label}: runtime status remains keyboard reachable`);
    assert.equal(result.status.children[1].text, "", `${label}: no synthetic model summary is added to the fixture`);
    assert.equal(result.status.children[1].tabIndex, -1, `${label}: the empty model summary is not a focus target`);
    assert.equal(result.language.document, scenario.language === "zh" ? "zh-CN" : "en", label);
    const localizedLabels = scenario.language === "zh"
      ? ["消息", "输入与保存说明", "发送"]
      : ["Message", "Input and saving details", "Send"];
    assert.deepEqual([result.language.messageLabel,result.language.helpLabel,result.language.sendLabel], localizedLabels, `${label}: production form labels are translated`);
    if (scenario.width >= 800 && result.composerInViewport && !scenario.openComposerHelp && !scenario.resizeTextarea) {
      for (const [name, target] of Object.entries(result.hitTargets) as [string, any][]) {
        assert.equal(target.inBounds, true, `${label} initial ${name}: ${JSON.stringify({target,chat:result.chat})}`);
        assert.equal(target.pointerHit, true, `${label} initial ${name}`);
      }
    }
    assertCollaborationTargets(result);
  }
});

test("expanded input and saving details do not clip the retained composer controls at 795×720", { skip: process.platform !== "darwin" }, () => {
  const result = renderScenario({ width: 795, height: 720, selected: true, expandContext: true, openComposerHelp: true });
  assert.equal(result.composerHelpOpen, true);
  assert.equal(result.mode, "single");
  assert.equal(result.composerInChat, true, JSON.stringify(result));
  if (!result.composerInViewport) {
    assert.ok(result.information.scrollHeight > result.information.clientHeight, "the expanded composer remains reachable through workspace scrolling");
    assertCollaborationTargets(result);
  }
  assert.ok(result.send.height > 0);
  assert.ok(result.send.top >= result.composer.top && result.send.bottom <= result.composer.bottom, JSON.stringify(result));
});

test("single-column Collaboration keeps the composer visible when five-session history is expanded at 640×756", { skip: process.platform !== "darwin" }, () => {
  const result = renderScenario({ width: 640, height: 756, selected: true, expandHistory: true });
  assert.deepEqual(result.viewport, { width: 640, height: 756 });
  assert.equal(result.mode, "single");
  assert.equal(result.history.hidden, false);
  assert.ok(result.status.height < 60, JSON.stringify(result.status));
  assert.ok(result.status.children.filter((child:any)=>child.width>0&&child.height>0).every((child:any)=>child.top>=result.status.top&&child.bottom<=result.status.bottom&&child.left>=result.status.left&&child.right<=result.status.right), "visible status controls stay inside the compact status row");
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

test("long current context floats over the chat without covering live dictation or send at 1280×720", { skip: process.platform !== "darwin" }, () => {
  const result = renderScenario({ width: 1280, height: 720, selected: true, expandContext: true, collapseContext: true, voicePreview: true, longContext: true });
  assert.equal(result.contextPanel.hidden, false);
  assert.equal(result.contextPanel.anchoredToChat, true, JSON.stringify(result.contextPanel));
  assert.equal(result.contextPanel.overlapsChat, true, JSON.stringify(result.contextPanel));
  assert.equal(result.contextPanel.clearsComposer, true, JSON.stringify({ context: result.contextPanel, composer: result.composer }));
  assert.equal(result.contextPanel.overflowY, "auto");
  assert.ok(result.contextPanel.scrollHeight > result.contextPanel.clientHeight);
  assert.equal(result.contextPanel.closeButtonPresent, true);
  assert.equal(result.contextPanel.closeButtonNearHeading, true);
  assert.equal(result.contextPanel.closeButtonVisible, true);
  assert.equal(result.contextPanel.closedLocally, true);
  assert.equal(result.contextPanel.focusReturnedToToggle, true, JSON.stringify(result.contextPanel));
  assert.equal(result.voicePreview.visible, true);
  assert.equal(result.voicePreview.stopAction, "stop");
  assert.equal(result.voicePreview.sendDisabled, false);
  for (const name of ["textarea", "microphone", "send"] as const) {
    assert.equal(result.hitTargets[name].inBounds, true, `${name}: ${JSON.stringify({ hit:result.hitTargets[name],chat:result.chat,composer:result.composer,workspace:result.information })}`);
    assert.equal(result.hitTargets[name].pointerHit, true, `${name}: ${JSON.stringify(result.hitTargets[name])}`);
  }
});
