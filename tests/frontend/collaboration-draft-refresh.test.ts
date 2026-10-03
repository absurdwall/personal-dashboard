import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { stripTypeScriptTypes } from "node:module";
import { beginVoiceTranscriptSave, enqueueCollaborationDraftWrite } from "../../frontend/collaboration-voice.ts";

const main=readFileSync(new URL("../../frontend/main.ts",import.meta.url),"utf8");
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function sourceFunction(name:string):string {
  const start=main.search(new RegExp(`(?:async )?function ${name}\\(`));
  assert.notEqual(start,-1,`production function ${name} exists`);
  const rest=main.slice(start);
  const end=/^}\n/m.exec(rest);
  assert.ok(end, `production function ${name} has a closing boundary`);
  return rest.slice(0,end.index+2);
}
function element(value="") {
  return {value,disabled:false,dataset:{},textContent:"",focus(){},setSelectionRange(){},
    setAttribute(){},toggleAttribute(){},removeAttribute(){}};
}
/** Executes the real composer delivery/save/cache/select/date/refresh/render handlers.
 * Only IPC and unrelated pane rendering are synthetic; no production flow is mirrored.
 */
function composer() {
  const first={id:"first",targetDate:"2026-10-03",draft:"persisted first",draftsByDate:{"2026-10-03":"persisted first","2026-10-02":"historical draft"},runState:"idle"};
  const second={id:"second",targetDate:"2026-10-03",draft:"independent second",draftsByDate:{"2026-10-03":"independent second"},runState:"idle"};
  const workspace={sessions:[first,second],context:{vaultName:"Synthetic Vault"},recoveryRequired:false};
  const names=["collaborationDraftKey","cacheCollaborationDrafts","collaborationDraftForDate",
    "currentCollaborationVoiceTarget","isCurrentCollaborationVoiceTarget","setCollaborationVoiceStatus",
    "collaborationVoiceStatusText","renderCollaborationVoiceControls","collaborationDraftForTarget",
    "handleCollaborationVoiceTranscript","cancelCollaborationVoiceCaptureForSelectionChange",
    "renderCollaborationWorkspace","stashCollaborationDraft","flushCollaborationDraft",
    "saveCollaborationDraft","selectCollaborationSession","refreshCollaborationWorkspace","saveCollaborationTargetDate"];
  const functions=names.map(sourceFunction).join("\n");
  const r:any={};
  for(const name of functions.match(/\b(?:collaboration|currentCollaboration|activeCollaboration)[A-Z]\w*/g)??[])r[name]=null;
  Object.assign(r,{beginVoiceTranscriptSave,enqueueCollaborationDraftWrite,
    collaborationDrafts:new Map(),collaborationUnsavedDrafts:new Set(),collaborationDraftWrites:new Map(),
    collaborationDraftSaveTimers:new Map(),collaborationTargetDates:new Map(),collaborationSendingDrafts:new Set(),
    collaborationVoiceStatuses:new Map(),collaborationIncompleteVoiceDrafts:new Set(),collaborationVoicePreviews:new Map(),
    collaborationWorkspaceRequest:0,collaborationActivityDate:"2026-10-03",collaborationActivityDateExplicit:true,
    collaborationTargetDate:"2026-10-03",currentCollaborationSession:first,currentCollaborationWorkspace:workspace,
    currentCollaborationConnection:{authenticated:true,authMode:"chatgpt",readOnlyTextTurnsAvailable:true},
    collaborationMessageDraft:element("persisted first"),collaborationTargetDateInput:element("2026-10-03"),
    collaborationVoiceStartButton:element(),collaborationVoiceStatus:element(),
    collaborationVoiceController:{state:"idle",navigate(){}},
    document:{activeElement:null,querySelector:()=>null},
    window:{setTimeout:()=>1,clearTimeout(){},__TAURI__:{core:{invoke:async(command:string,args:any)=>{
      if(command==="collaboration_workspace")return structuredClone(workspace);
      if(command==="collaboration_context")return workspace.context;
      if(command==="collaboration_save_draft")return r.write(args);
      assert.fail(`unexpected IPC ${command}`);
    }}}},
    write:async()=>{throw new Error("synthetic persistence failure");},
    t:(key:string)=>key,setRawText:(node:any,text:string)=>{if(node)node.textContent=text;},
    setCopy:(node:any,key:string)=>{if(node)node.textContent=key;},setCopyError(){},
    collaborationDateLabel:(date:string)=>date,collaborationRunStateLabel:(state:string)=>state,
  });
  for(const name of ["renderCollaborationContextPane","renderCollaborationSessionList","renderCollaborationMessages",
    "renderCollaborationTaskOperations","renderCollaborationMemory","watchCollaborationSession","refreshCollaborationContext"])r[name]=()=>{};
  vm.runInNewContext(stripTypeScriptTypes(functions),r);
  r.cacheCollaborationDrafts(first);r.cacheCollaborationDrafts(second);
  return {r,first,second};
}

test("failed voice save survives real refresh, failed date navigation, session reselection and editor rendering",async()=>{
  const {r,first,second}=composer();
  const target={sessionId:first.id,targetDate:first.targetDate};
  r.handleCollaborationVoiceTranscript(target,"received dictation");
  await tick();
  const expected="persisted first\nreceived dictation";
  assert.equal(r.collaborationMessageDraft.value,expected);
  assert.equal(r.collaborationVoiceStatus.textContent,"collaboration.voiceDraftSaveFailed");
  await r.refreshCollaborationWorkspace();
  assert.equal(r.collaborationMessageDraft.value,expected,"stale workspace result cannot overwrite failed-save text");
  assert.equal(r.collaborationMessageDraft.disabled,false);
  r.collaborationTargetDateInput.value="2026-10-02";
  await r.saveCollaborationTargetDate();
  assert.equal(r.collaborationTargetDate,"2026-10-03","failed save prevents target change");
  assert.equal(r.collaborationMessageDraft.value,expected);
  r.selectCollaborationSession(second);await tick();
  assert.equal(r.collaborationMessageDraft.value,"independent second");
  r.selectCollaborationSession(first);await tick();
  assert.equal(r.collaborationMessageDraft.value,expected,"returning to the original session preserves editable dictation");
  assert.equal(r.collaborationVoiceStatus.textContent,"collaboration.voiceDraftSaveFailed");
  assert.equal(r.collaborationUnsavedDrafts.has(r.collaborationDraftKey(first.id,first.targetDate)),true);
});

test("an older save acknowledgement cannot unprotect a newer draft before its exact snapshot is saved",async()=>{
  const {r,first}=composer();
  const target={sessionId:first.id,targetDate:first.targetDate};
  let resolveFirst:(saved:any)=>void=()=>{};let resolveSecond:(saved:any)=>void=()=>{};
  let count=0;
  r.write=()=>new Promise(resolve=>{if(++count===1)resolveFirst=resolve;else resolveSecond=resolve;});
  const older=r.saveCollaborationDraft(target,"older edit");
  const newer=r.saveCollaborationDraft(target,"newer edit plus dictation");
  await r.refreshCollaborationWorkspace();
  assert.equal(r.collaborationMessageDraft.value,"newer edit plus dictation");
  resolveFirst({...first,draft:"older edit",draftsByDate:{[first.targetDate]:"older edit"}});
  await older;await tick();
  await r.refreshCollaborationWorkspace();
  assert.equal(r.collaborationMessageDraft.value,"newer edit plus dictation");
  const key=r.collaborationDraftKey(first.id,first.targetDate);
  assert.equal(r.collaborationUnsavedDrafts.has(key),true);
  resolveSecond({...first,draft:"newer edit plus dictation",draftsByDate:{[first.targetDate]:"newer edit plus dictation"}});
  await newer;
  assert.equal(r.collaborationUnsavedDrafts.has(key),false,"only exact current snapshot acknowledgement clears protection");
  assert.equal(r.collaborationMessageDraft.value,"newer edit plus dictation");
});


test("A → B → A queued saves preserve the intentional revert when the last save fails",async()=>{
  const {r,first}=composer();
  const target={sessionId:first.id,targetDate:first.targetDate};
  const writes:Array<{resolve:()=>void;reject:(error:Error)=>void}>=[];
  r.write=(args:any)=>new Promise((resolve,reject)=>{
    writes.push({resolve:()=>{
      first.draft=args.draft;
      first.draftsByDate[first.targetDate]=args.draft;
      resolve(structuredClone(first));
    },reject});
  });
  const firstA=r.saveCollaborationDraft(target,"A");
  const middleB=r.saveCollaborationDraft(target,"B");
  const lastA=r.saveCollaborationDraft(target,"A");
  const failedLast=assert.rejects(lastA,/last A failed/);
  writes[0].resolve();await firstA;await tick();
  writes[1].resolve();await middleB;await tick();
  assert.equal(first.draft,"B","native storage currently contains the middle snapshot");
  await r.refreshCollaborationWorkspace();
  assert.equal(r.collaborationMessageDraft.value,"A","old equal-valued acknowledgement cannot expose the revert to stale reads");
  writes[2].reject(new Error("last A failed"));await failedLast;
  await r.refreshCollaborationWorkspace();
  assert.equal(r.collaborationMessageDraft.value,"A","failed final save leaves the latest revert editable");
  assert.equal(r.collaborationMessageDraft.disabled,false);
  assert.equal(r.collaborationUnsavedDrafts.has(r.collaborationDraftKey(first.id,first.targetDate)),true);
});

test("an equal-valued acknowledgement cannot clear protection while a reverted edit is still debounced",async()=>{
  const {r,first}=composer();
  const target={sessionId:first.id,targetDate:first.targetDate};
  let acknowledge:(saved:any)=>void=()=>{};
  r.write=()=>new Promise(resolve=>{acknowledge=resolve;});
  const older=r.saveCollaborationDraft(target,"A");
  r.collaborationMessageDraft.value="B";r.stashCollaborationDraft();
  r.collaborationMessageDraft.value="A";r.stashCollaborationDraft();
  acknowledge({...first,draft:"A",draftsByDate:{[first.targetDate]:"A"}});
  await older;
  const key=r.collaborationDraftKey(first.id,first.targetDate);
  assert.equal(r.collaborationDraftSaveTimers.has(key),true);
  assert.equal(r.collaborationUnsavedDrafts.has(key),true,"the reverted edit still needs its debounced persistence attempt");
});
