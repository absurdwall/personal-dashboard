import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

function scenario(width: number, height: number, preview: boolean, longDraft: boolean) {
  const output=mkdtempSync(join(tmpdir(),"pdex23-context-"));
  try {
    const html=readFileSync(new URL('../../frontend/index.html',import.meta.url),'utf8').replace(/<script[^>]*src="main.js"[^>]*><\/script>/,'');
    writeFileSync(join(output,'index.html'),html);
    writeFileSync(join(output,'styles.css'),readFileSync(new URL('../../frontend/styles.css',import.meta.url),'utf8'));
    const panels=stripTypeScriptTypes(readFileSync(new URL('../../frontend/collaboration-panels.ts',import.meta.url),'utf8')).replace(/^export /gm,'');
    const script=`${panels}
      document.querySelector('.app-shell').dataset.workspaceDestination='collaboration';
      document.querySelectorAll('[data-workspace-panel]').forEach(n=>n.hidden=n.dataset.workspacePanel!=='collaboration');
      const layout=document.querySelector('.collaboration-layout'),chat=document.querySelector('.collaboration-chat-pane'),
        context=document.querySelector('#collaboration-work-panel'),composer=document.querySelector('#collaboration-composer'),
        input=document.querySelector('#collaboration-message-draft'),messages=document.querySelector('#collaboration-message-list'),
        transcript=document.querySelector('#collaboration-voice-preview'),stop=document.querySelector('#collaboration-voice-start'),
        send=document.querySelector('#collaboration-send-message'),information=document.querySelector('.workspace-information');
      messages.innerHTML=Array.from({length:40},(_,i)=>'<article class="collaboration-message"><p>Saved synthetic reply '+i+' 中文消息 remains readable.</p></article>').join('');
      document.querySelector('#collaboration-context-panes').innerHTML=Array.from({length:50},(_,i)=>'<section class="collaboration-context-card"><h4>Background '+i+'</h4><p>Long synthetic context 中文背景 no private data.</p></section>').join('');
      input.disabled=false;input.value=${longDraft ? "'Typed existing draft\\n'.repeat(60)" : "'Typed existing draft'"};
      stop.disabled=false;send.disabled=false;
      ${preview ? "transcript.textContent='正在转写 preview\\n'.repeat(80);document.querySelector('#collaboration-voice-status').textContent='Recording';document.querySelector('#collaboration-voice-status').dataset.state='recording';stop.dataset.action='stop';stop.setAttribute('aria-label','Stop dictation');document.querySelector('#collaboration-voice-cancel').hidden=false;" : ''}
      localStorage.clear();
      initializeCollaborationPanels();await new Promise(r=>setTimeout(r,100));
      const rect=n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}};
      if (innerHeight<600) { information.scrollTop+=Math.max(0,send.getBoundingClientRect().bottom-innerHeight+16);await new Promise(r=>setTimeout(r,50)); }
      const baseline={chat:rect(chat),composer:rect(composer),scrollHeight:information.scrollHeight};
      document.querySelector('#collaboration-toggle-context').click();await new Promise(r=>setTimeout(r,100));
      const hit=n=>{const r=n.getBoundingClientRect(),target=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return r.top>=0&&r.bottom<=innerHeight&&!!target&&n.contains(target)};
      const close=document.querySelector('#collaboration-close-context');
      const result={baseline,chat:rect(chat),context:{...rect(context),hidden:context.hidden,position:getComputedStyle(context).position,css:context.style.cssText,margin:getComputedStyle(context).margin,layout:rect(layout),clientHeight:context.clientHeight,scrollHeight:context.scrollHeight},composer:rect(composer),
        scrollHeight:information.scrollHeight,input:rect(input),preview:{...rect(transcript),clientHeight:transcript.clientHeight,scrollHeight:transcript.scrollHeight},
        stopHit:hit(stop),sendHit:hit(send),inputHit:hit(input),closeHit:close?hit(close):false,messageHeight:messages.clientHeight};
      context.scrollTop=context.scrollHeight;messages.scrollTop=messages.scrollHeight;await new Promise(r=>setTimeout(r,40));
      result.contextScrolled=context.scrollTop>0;result.messageScrolled=messages.scrollTop>0;result.closeAfterScroll=close?hit(close):false;
      if(close)close.click();
      result.closed=context.hidden;result.draft=input.value;result.composerAfterScroll=rect(composer);
      return JSON.stringify(result);`;
    writeFileSync(join(output,'check.js'),script);
    const result=JSON.parse(execFileSync('swift',[new URL('./helpers/rendered-today-unlocated.swift',import.meta.url).pathname,join(output,'index.html'),join(output,'check.js'),String(width),String(height)],{encoding:'utf8',timeout:60000}));
    const evidence=process.env.PDEX23_LAYOUT_EVIDENCE;
    if(evidence) {
      mkdirSync(evidence,{recursive:true});
      const {draft,...geometry}=result;
      writeFileSync(join(evidence,`${width}x${height}-${preview?'transcript':'empty'}-${longDraft?'long':'short'}-draft.json`),JSON.stringify({...geometry,draftLength:draft.length},null,2)+'\n');
    }
    return result;
  } finally {rmSync(output,{recursive:true,force:true})}
}

test('context overlays the message area without changing chat or obscuring recording actions at 1280×720', {skip:process.platform!=='darwin'},()=>{
  const r=scenario(1280,720,true,true);
  assert.equal(r.context.position,'absolute',JSON.stringify(r));
  assert.equal(r.scrollHeight,r.baseline.scrollHeight);
  assert.deepEqual(r.chat,r.baseline.chat);
  assert.deepEqual(r.composer,r.baseline.composer);
  assert.ok(r.context.bottom<=r.composer.top,JSON.stringify(r));
  assert.ok(r.context.top>=r.chat.top,JSON.stringify(r));
  assert.equal(r.contextScrolled,true);
  assert.equal(r.closeHit,true);
  assert.equal(r.closeAfterScroll,true);
  assert.equal(r.closed,true);
  assert.equal(r.stopHit,true);
  assert.equal(r.sendHit,true);
  assert.equal(r.inputHit,true);
  assert.equal(r.messageScrolled,true);
  assert.ok(r.messageHeight>=48);
  assert.deepEqual(r.composerAfterScroll,r.composer);
  assert.ok(r.preview.scrollHeight>r.preview.clientHeight);
  assert.ok(r.preview.top>=r.input.bottom);
  assert.equal(r.draft,'Typed existing draft\n'.repeat(60));
});

for (const [width,height,preview,longDraft] of [[1280,800,false,false],[830,758,true,true],[680,560,true,true],[680,560,false,false]] as const) {
  test(`context and ${preview ? 'long' : 'empty'} transcript preserve input actions at ${width}×${height}`, {skip:process.platform!=='darwin'},()=>{
    const r=scenario(width,height,preview,longDraft);
    assert.equal(r.scrollHeight,r.baseline.scrollHeight);
    assert.deepEqual(r.chat,r.baseline.chat);
    assert.ok(r.context.bottom<=r.composer.top,JSON.stringify(r));
    assert.equal(r.contextScrolled,true);
    assert.equal(r.closeHit,true);
    assert.equal(r.closeAfterScroll,true);
    assert.equal(r.closed,true);
    assert.equal(r.stopHit,true,JSON.stringify(r));
    assert.equal(r.sendHit,true,JSON.stringify(r));
    assert.equal(r.inputHit,true,JSON.stringify(r));
    assert.ok(r.messageHeight>=48,JSON.stringify(r));
    assert.equal(r.messageScrolled,true);
    assert.deepEqual(r.composerAfterScroll,r.composer);
    if (!preview) assert.equal(r.preview.height,0);
    else assert.ok(r.preview.scrollHeight>r.preview.clientHeight);
  });
}
