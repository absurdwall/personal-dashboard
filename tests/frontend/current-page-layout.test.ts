import assert from 'node:assert/strict';
import test from 'node:test';
import { probe } from './helpers/complete-page.ts';

const date = '2026-10-11';
const pane = { state: 'ready', message: 'Synthetic fixture', items: [] };
const sessions = Array.from({length: 5}, (_, index) => ({
  id: `synthetic-${index}`, title: `Synthetic long session ${index}`, createdDate: date,
  targetDate: date, activityDates: [date], draft: 'Retained synthetic draft', draftsByDate: {[date]: 'Retained synthetic draft'},
  runState: 'failed', error: 'Synthetic retained transport failure', taskOperations: [],
  messages: Array.from({length: 34}, (_, i) => ({role: 'assistant', messageDate: date, targetDate: date,
    text: `Synthetic saved reply ${i}. Additional detail remains readable and scrollable inside the message list.`})),
}));

test('complete current Collaboration keeps composer and expanded five-session history usable at 640×756', {skip: process.platform !== 'darwin'}, () => {
  const result = probe(640, `
    document.querySelector('[data-workspace-destination="collaboration"].destination-button').click();
    await until(()=>document.querySelectorAll('.collaboration-session-button').length===5&&document.querySelectorAll('.collaboration-message').length===34);
    const toggle=document.querySelector('#collaboration-toggle-history');
    if(toggle.getAttribute('aria-expanded')!=='true')toggle.click();
    await new Promise(resolve=>setTimeout(resolve,100));
    const chat=document.querySelector('.collaboration-chat-pane'),composer=document.querySelector('#collaboration-composer'),history=document.querySelector('#collaboration-history-panel'),messages=document.querySelector('#collaboration-message-list');
    const targets=['collaboration-message-draft','collaboration-voice-start','collaboration-send-message'].map(id=>{
      const node=document.getElementById(id),r=rect(node),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
      return {id,rect:r,hit:Boolean(hit&&node.contains(hit))};
    });
    const before=rect(composer);messages.scrollTop=messages.scrollHeight;
    await new Promise(resolve=>setTimeout(resolve,20));
    return JSON.stringify({chat:rect(chat),composer:before,after:rect(composer),history:{...rect(history),hidden:history.hidden,position:getComputedStyle(history).position,scrollHeight:history.scrollHeight,clientHeight:history.clientHeight},targets,messageHeight:messages.clientHeight,messageScroll:messages.scrollTop,draft:document.querySelector('#collaboration-message-draft').value,errors:window.probeErrors,calls});
  `, true, 756, {
    today_clock: {livedDate: date, time: '09:30'},
    collaboration_workspace: {sessions, context: {vaultName: 'Synthetic Vault', dailyRecord:pane, tasks:pane, habits:pane}, recoveryRequired:false},
    collaboration_connection: {authenticated:true,authMode:'chatgpt',readOnlyTextTurnsAvailable:true,models:[],selectedModel:null},
  });
  console.log('Complete Collaboration 640×756:', JSON.stringify(result));
  assert.deepEqual(result.errors, []);
  assert.equal(result.draft, 'Retained synthetic draft');
  assert.ok(result.composer.top>=result.chat.top && result.composer.bottom<=result.chat.bottom && result.composer.bottom<=756,JSON.stringify(result));
  for(const target of result.targets) { assert.ok(target.rect.top>=0&&target.rect.bottom<=756,JSON.stringify(target));assert.equal(target.hit,true,JSON.stringify(target)); }
  assert.equal(result.history.hidden,false);assert.equal(result.history.position,'absolute');
  assert.ok(result.history.clientHeight>=100 && result.history.scrollHeight>result.history.clientHeight,JSON.stringify(result.history));
  assert.ok(result.history.bottom<=result.composer.top);
  assert.ok(result.messageHeight>=64&&result.messageScroll>0);
  assert.equal(result.after.top,result.composer.top);
  assert.deepEqual(result.calls.filter((call:{command:string})=>/^(create_|edit_|update_|save_|set_)/.test(call.command)),[]);
});
