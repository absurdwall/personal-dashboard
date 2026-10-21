import assert from "node:assert/strict";
import test from "node:test";
import { probe } from "./helpers/complete-page.ts";

// Full shipped page; only the public Tauri transport is controlled.
test("a late title updates the original list entry while another session stays selected", {skip:process.platform !== "darwin"}, () => {
  const result=probe(969, `
    const pane={state:'ready',message:'Synthetic',items:[]};
    const make=(id,title,pending)=>({id,title,titleGenerationPending:pending,createdDate:view.date,targetDate:view.date,
      activityDates:[view.date],runState:'completed',progress:'Reply saved',draft:'',draftsByDate:{},taskOperations:[],
      messages:[{role:'user',text:'Opening '+id,messageDate:view.date,targetDate:view.date},{role:'assistant',text:'Reply '+id,messageDate:view.date,targetDate:view.date}]});
    const first=make('first','Temporary first title',true),second=make('second','Second stable title',false);
    responses.collaboration_workspace={sessions:[first,second],context:{vaultName:'Synthetic',dailyRecord:pane,tasks:pane,habits:pane},recoveryRequired:false};
    responses.collaboration_connection={authenticated:true,authMode:'chatgpt',readOnlyTextTurnsAvailable:true,models:[],selectedModel:null};
    responses.collaboration_session=second;
    responses.collaboration_context=responses.collaboration_workspace.context;
    document.querySelector('[data-workspace-destination="collaboration"].destination-button').click();
    await until(()=>document.querySelectorAll('.collaboration-session-button').length===2);
    await until(()=>document.querySelector('#collaboration-chat-heading').textContent==='Temporary first title');
    const before={heading:document.querySelector('#collaboration-chat-heading').textContent,list:document.querySelector('[data-session-id="first"] strong').textContent};
    document.querySelector('[data-session-id="second"]').click();
    await until(()=>document.querySelector('#collaboration-chat-heading').textContent==='Second stable title');
    responses.collaboration_workspace.sessions[0]={...first,title:'Generated first title',titleGenerationPending:false};
    await new Promise(resolve=>setTimeout(resolve,1000));
    await until(()=>document.querySelector('[data-session-id="first"] strong').textContent==='Generated first title');
    const otherHeading=document.querySelector('#collaboration-chat-heading').textContent;
    responses.collaboration_session=responses.collaboration_workspace.sessions[0];
    document.querySelector('[data-session-id="first"]').click();
    await until(()=>document.querySelector('#collaboration-chat-heading').textContent==='Generated first title');
    return JSON.stringify({before,otherHeading,heading:document.querySelector('#collaboration-chat-heading').textContent,list:document.querySelector('[data-session-id="first"] strong').textContent,errors:window.probeErrors});
  `);
  assert.deepEqual(result.before,{heading:'Temporary first title',list:'Temporary first title'});
  assert.equal(result.otherHeading,'Second stable title');
  assert.equal(result.heading,'Generated first title');
  assert.equal(result.list,result.heading);
  assert.deepEqual(result.errors,[]);
});
