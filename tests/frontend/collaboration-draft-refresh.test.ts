import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { beginVoiceTranscriptSave, enqueueCollaborationDraftWrite, submitCollaborationDraftSnapshot } from "../../frontend/collaboration-voice.ts";

import { selectVaultAndRefresh } from "../../frontend/vault-selection.ts";
const hook=registerHooks({resolve(specifier,context,nextResolve){return nextResolve(specifier==="./collaboration-dictation-transcript.js"?"./collaboration-dictation-transcript.ts":specifier,context);}});
const {CodexCollaborationVoiceInputController}=await import("../../frontend/collaboration-dictation.ts");hook.deregister();
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
function composer(actualVoice=false, pendingStart=false) {
  const first={id:"first",targetDate:"2026-10-03",draft:"persisted first",draftsByDate:{"2026-10-03":"persisted first","2026-10-02":"historical draft"},runState:"idle"};
  const second={id:"second",targetDate:"2026-10-03",draft:"independent second",draftsByDate:{"2026-10-03":"independent second"},runState:"idle"};
  const workspace={sessions:[first,second],context:{vaultName:"Synthetic Vault"},recoveryRequired:false};
  const names=["collaborationDraftKey","cacheCollaborationDrafts","collaborationDraftForDate",
    "currentCollaborationVoiceTarget","isCurrentCollaborationVoiceTarget","setCollaborationVoiceStatus",
    "collaborationVoiceStatusText","renderCollaborationVoiceControls","collaborationDraftForTarget",
    "handleCollaborationVoiceTranscript","cancelCollaborationVoiceCaptureForSelectionChange",
    "renderCollaborationWorkspace","stashCollaborationDraft","flushCollaborationDraft",
    "saveCollaborationDraft","selectCollaborationSession","refreshCollaborationWorkspace","saveCollaborationTargetDate",
    "collaborationVoiceFailureStatus","startOrStopCollaborationVoice","selectTodayVault","sendCollaborationMessage","resetVaultScopedWorkspaceState","renderPendingWriteFailure",
    ...(main.includes("function prepareCollaborationForVaultSwitch(")?["prepareCollaborationForVaultSwitch"]:[])];
  const functions=names.map(sourceFunction).join("\n");
  const r:any={};
  for(const name of functions.match(/\b(?:collaboration|currentCollaboration|activeCollaboration)[A-Z]\w*/g)??[])r[name]=null;
  let inputId="",deliver:(event:any)=>void=()=>{},releaseFinal:(value:any)=>void=()=>{},releaseStart:()=>void=()=>{};
  let stopped=0,vault="A",nextVault="B",pickerCalls=0;const writes:Array<{vault:string;args:any}>=[];
  const startGate=new Promise<void>(resolve=>{releaseStart=resolve;});
  const runtime={start:async(id:string,onEvent:(event:any)=>void)=>{
    inputId=id;deliver=onEvent;if(pendingStart)await startGate;
    return {stopCapture:()=>{stopped++;},cancel:async()=>{},finalize:()=>new Promise(resolve=>{releaseFinal=resolve;})};
  }};
  const persist=(args:any)=>{
    const session=args.sessionId===first.id?first:second;
    session.draftsByDate[args.targetDate]=args.draft;if(session.targetDate===args.targetDate)session.draft=args.draft;
    return structuredClone(session);
  };
  const reset=sourceFunction("resetVaultScopedWorkspaceState");
  for(const match of reset.matchAll(/\b([a-zA-Z]\w*)\??\.(?:clear|invalidate|reset|toggleAttribute|replaceChildren|textContent|hidden|disabled|dataset)/g))if(!(match[1] in r))r[match[1]]=null;
  for(const match of reset.matchAll(/if \(([a-zA-Z]\w*)\)/g))if(!(match[1] in r))r[match[1]]=null;
  for(const match of reset.matchAll(/\b([a-zA-Z]\w*)\.clear\(/g))if(!r[match[1]])r[match[1]]=new Map();
  for(const match of reset.matchAll(/\b([a-zA-Z]\w*)\.invalidate\(/g))r[match[1]]={invalidate(){}};
  for(const name of ["taskCreateListLabel","taskCreateSubmit","taskCreateDate","taskCreateTime","todayTaskCreateDate","todayTaskCreateTime","calendarTaskCreateSubmit","calendarTaskCreateDate","calendarTaskCreateTime","habitsRange","calendarSummaryHeading","collaborationStatusTimer"])r[name]=null;
  Object.assign(r,{beginVoiceTranscriptSave,enqueueCollaborationDraftWrite,submitCollaborationDraftSnapshot,
    CodexCollaborationVoiceInputController,BrowserCodexDictationRuntime:class{constructor(){return runtime;}},crypto,AbortController,
    vaultSelectionInProgress:false,collaborationVaultSwitchDraftWrites:null,
    selectVaultAndRefresh,vaultSelectionRequests:{begin:()=>1,isCurrent:()=>true},todayPresentationRequests:{begin:()=>1,isCurrent:()=>true},
    currentInterfaceLanguage:"en",currentWorkspaceDestination:"settings",updateTodayOperationState(){},
    waitForPendingWrites:async()=>true,renderPendingWriteFailure(){},renderToday(){},renderWorkspaceContextStatus(){},
    openCalendar(){},refreshHabits(){},refreshTasks(){},renderVaultSelectionError(){},
    normalizeTaskDateTimeFields(){},renderWorkspaceRailContext(){},settingsVaultStatus:element(),
    refreshCollaborationRunOwner(){},
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
    window:{setTimeout:()=>1,clearTimeout(){},clearInterval(){},__TAURI__:{core:{invoke:async(command:string,args:any)=>{
      if(command==="today_clock")return {livedDate:"2026-10-03"};
      if(command==="collaboration_workspace")return structuredClone(workspace);
      if(command==="collaboration_context")return workspace.context;
      if(command==="collaboration_save_draft"){writes.push({vault,args});return r.write(args);}
      if(command==="select_today_vault"){pickerCalls++;vault=nextVault;return {changed:true,view:{defaultPhase:"morning"}};}
      if(command==="collaboration_submit_message")return r.submit(args);
      assert.fail(`unexpected IPC ${command}`);
    }}}},
    write:async()=>{throw new Error("synthetic persistence failure");},submit:async()=>structuredClone(first),
    t:(key:string)=>key,setRawText:(node:any,text:string)=>{if(node)node.textContent=text;},
    setCopy:(node:any,key:string)=>{if(node)node.textContent=key;},setCopyError(node:any,key:string){if(node)node.textContent=key;},
    collaborationDateLabel:(date:string)=>date,collaborationRunStateLabel:(state:string)=>state,
  });
  for(const name of ["renderCollaborationContextPane","renderCollaborationSessionList","renderCollaborationMessages",
    "renderCollaborationTaskOperations","renderCollaborationMemory","watchCollaborationSession","refreshCollaborationContext"])r[name]=()=>{};
  const controllerStart=main.indexOf("const collaborationVoiceController = new CodexCollaborationVoiceInputController(");
  const controllerEnd=main.indexOf("\n);",controllerStart)+4;
  const controller=actualVoice?main.slice(controllerStart,controllerEnd)+"\nglobalThis.controller=collaborationVoiceController;":"";
  vm.runInNewContext(stripTypeScriptTypes(functions+"\n"+controller),r);
  r.cacheCollaborationDrafts(first);r.cacheCollaborationDrafts(second);
  return {r,first,second,writes,persist,chooseVault:(name:string)=>{nextVault=name;},stopped:()=>stopped,pickerCalls:()=>pickerCalls,vault:()=>vault,releaseStart,
    emit:(kind:string,text:string,id="turn")=>deliver({inputId,kind,role:"user",itemId:id,text,startMs:0,endMs:50}),
    complete:(incomplete=false)=>releaseFinal({incomplete})};
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

for(const success of [false,true])test(`Vault switch awaits stopped original input and all target writes before ${success?"switching":"blocking failed save"}`,async()=>{
  const f=composer(true);const {r,first,second}=f;
  r.write=async(args:any)=>f.persist(args);
  await r.controller.start({sessionId:first.id,targetDate:first.targetDate});f.emit("preview","received");
  r.selectCollaborationSession(second);await tick();assert.equal(f.stopped(),1,"ordinary navigation stops without waiting");
  r.collaborationDrafts.set(r.collaborationDraftKey(first.id,first.targetDate),"latest original edit");
  let saveFinished:(value:any)=>void=()=>{},saveFailed:(error:Error)=>void=()=>{};
  r.write=(args:any)=>args.sessionId===first.id?new Promise((resolve,reject)=>{saveFinished=()=>resolve(f.persist(args));saveFailed=reject;}):Promise.resolve(f.persist(args));
  const switching=r.selectTodayVault();await tick();
  assert.equal(f.pickerCalls(),0);assert.equal(f.vault(),"A");
  f.emit("final","correct tail");f.complete();await tick();
  assert.equal(f.pickerCalls(),0,"picker waits for original-target transcript persistence");
  if(success)saveFinished(null);else saveFailed(new Error("voice save failed"));
  await switching;
  assert.equal(f.pickerCalls(),success?1:0);assert.equal(f.vault(),success?"B":"A");
  assert.ok(f.writes.every(write=>write.vault==="A"));
  if(!success){
    r.selectCollaborationSession(first);await tick();await r.refreshCollaborationWorkspace();
    assert.equal(r.collaborationMessageDraft.value,"latest original edit\ncorrect tail");
    assert.equal(r.collaborationVoiceStatus.textContent,"collaboration.voiceDraftSaveFailed");
    assert.equal(r.collaborationMessageDraft.disabled,false);
    assert.equal(r.settingsVaultStatus.textContent,"settings.vaultNotSwitchedAfterSaveFailure");
  }
});

test("Vault switch cancels pending permission without waiting for or reviving Start",async()=>{
  const f=composer(true,true);const {r,first}=f;
  r.write=async(args:any)=>f.persist(args);
  const starting=r.controller.start({sessionId:first.id,targetDate:first.targetDate});
  await r.selectTodayVault();assert.equal(f.pickerCalls(),1);assert.equal(r.controller.state,"idle");
  f.releaseStart();await starting;assert.equal(r.controller.state,"idle");assert.equal(f.stopped(),0);
});

test("old incomplete text stays marked through Start, Cancel, complete new input and arbitrary edits; empty removal clears it",async()=>{
  const f=composer(true);const {r,first}=f;const target={sessionId:first.id,targetDate:first.targetDate};
  r.write=async(args:any)=>f.persist(args);
  await r.controller.start(target);f.emit("preview","partial");r.controller.stop();f.complete(true);await tick();
  const key=r.collaborationDraftKey(first.id,first.targetDate);assert.equal(r.collaborationIncompleteVoiceDrafts.has(key),true);
  await r.controller.start(target);assert.equal(r.collaborationIncompleteVoiceDrafts.has(key),true);
  r.controller.cancel();assert.match(r.collaborationVoiceStatus.textContent,/voiceIncomplete/);
  await r.controller.start(target);f.emit("final","new complete words");r.controller.stop();f.complete();await tick();
  assert.equal(r.collaborationIncompleteVoiceDrafts.has(key),true);
  r.collaborationMessageDraft.value="edited prefix\n"+r.collaborationMessageDraft.value;r.stashCollaborationDraft();r.renderCollaborationVoiceControls();
  assert.match(r.collaborationVoiceStatus.textContent,/voiceIncomplete/);
  r.collaborationMessageDraft.value="";r.stashCollaborationDraft();r.renderCollaborationVoiceControls();
  assert.equal(r.collaborationIncompleteVoiceDrafts.has(key),false);
  assert.doesNotMatch(r.collaborationVoiceStatus.textContent,/voiceIncomplete/);
});

for(const newerPartial of [false,true])test(`successful submitted snapshot ${newerPartial?"preserves newer partial marker":"clears its consumed incomplete marker"}`,async()=>{
  const f=composer(true);const {r,first}=f;const target={sessionId:first.id,targetDate:first.targetDate};
  r.write=async(args:any)=>f.persist(args);
  await r.controller.start(target);f.emit("preview","old partial");r.controller.stop();f.complete(true);await tick();
  let acknowledge:(value:any)=>void=()=>{};r.submit=()=>new Promise(resolve=>{acknowledge=resolve;});
  const sending=r.sendCollaborationMessage();await tick();
  if(newerPartial){await r.controller.start(target);f.emit("preview","new partial");r.controller.stop();f.complete(true);await tick();}
  acknowledge({...first,draft:"",draftsByDate:{[first.targetDate]:""}});await sending;await tick();
  const key=r.collaborationDraftKey(first.id,first.targetDate);
  assert.equal(r.collaborationIncompleteVoiceDrafts.has(key),newerPartial);
  if(newerPartial)assert.match(r.collaborationMessageDraft.value,/new partial/);
});

test("a save that fails during deferred finalization still blocks the later Vault picker snapshot",async()=>{
  const f=composer(true);const {r,first,second}=f;
  let reject:(error:Error)=>void=()=>{};
  r.write=()=>new Promise((_,failure)=>{reject=failure;});
  const key=r.collaborationDraftKey(second.id,"2026-10-02");
  const pending=r.saveCollaborationDraft({sessionId:second.id,targetDate:"2026-10-02"},"noncurrent intentional edit");
  const rejected=assert.rejects(pending,/settled before snapshot/);
  await r.controller.start({sessionId:first.id,targetDate:first.targetDate});
  const switching=r.selectTodayVault();await tick();assert.equal(f.stopped(),1);
  reject(new Error("settled before snapshot"));await rejected;await tick();
  assert.equal(r.collaborationDraftWrites.has(key),false,"queue has already removed the failed promise");
  f.emit("final","tail");f.complete();await tick();
  // The voice save also uses the deferred IPC: it must settle before failure is reported.
  reject(new Error("voice save failed"));await switching;
  assert.equal(f.pickerCalls(),0);assert.equal(r.collaborationDrafts.get(key),"noncurrent intentional edit");
  assert.equal(r.collaborationUnsavedDrafts.has(key),true);
  assert.equal(r.settingsVaultStatus.dataset.state,"error");
});

test("Vault barrier flushes a noncurrent dirty date and its debounce using that cached snapshot only",async()=>{
  const f=composer(true);const {r,second}=f;r.write=async(args:any)=>f.persist(args);
  const key=r.collaborationDraftKey(second.id,"2026-10-02");
  r.collaborationDrafts.set(key,"historical unsaved words");r.collaborationUnsavedDrafts.add(key);r.collaborationDraftSaveTimers.set(key,22);
  await r.selectTodayVault();
  const write=f.writes.find(write=>write.args.sessionId===second.id);
  assert.equal(write?.vault,"A");assert.equal(write?.args.targetDate,"2026-10-02");assert.equal(write?.args.draft,"historical unsaved words");
  assert.equal(f.pickerCalls(),1);assert.equal(r.collaborationDraftSaveTimers.size,0);
});

test("an existing Send transaction blocks Vault change until its original-Vault result finishes",async()=>{
  const f=composer(true);const {r,first}=f;r.write=async(args:any)=>f.persist(args);
  let acknowledge:(value:any)=>void=()=>{};r.submit=()=>new Promise(resolve=>{acknowledge=resolve;});
  const sending=r.sendCollaborationMessage();await tick();assert.equal(r.collaborationSendingDrafts.size,1);
  await r.selectTodayVault();assert.equal(f.pickerCalls(),0);assert.equal(f.vault(),"A");
  assert.equal(r.collaborationDraftSaveTimers.size,0,"blocked Send cannot schedule a stale submitted-text debounce");
  assert.equal(r.settingsVaultStatus.dataset.state,"error");
  acknowledge({...first,draft:"",draftsByDate:{[first.targetDate]:""}});await sending;
  assert.ok(f.writes.every(write=>write.vault==="A"));
});

test("saved incomplete draft keeps its warning across successful Vault reset and return",async()=>{
  const f=composer(true);const {r,first}=f;const target={sessionId:first.id,targetDate:first.targetDate};
  await r.controller.start(target);f.emit("preview","received partial");r.controller.stop();f.complete(true);await tick();
  const key=r.collaborationDraftKey(first.id,first.targetDate);assert.equal(r.collaborationIncompleteVoiceDrafts.has(key),true);
  r.write=async(args:any)=>f.persist(args);await r.selectTodayVault();
  assert.equal(f.vault(),"B");assert.equal(r.collaborationDrafts.size,0,"real reset clears text caches after safe save");
  assert.equal(r.collaborationIncompleteVoiceDrafts.has(key),true,"reset cannot resolve retained incomplete words");
  f.chooseVault("A");await r.selectTodayVault();await r.refreshCollaborationWorkspace();r.selectCollaborationSession(first);await tick();
  assert.match(r.collaborationMessageDraft.value,/received partial/);assert.match(r.collaborationVoiceStatus.textContent,/voiceIncomplete/);
});

test("Vault Stop snapshots the latest visible edit before its state callback rerenders the editor",async()=>{
  const f=composer(true);const {r,first}=f;r.write=async(args:any)=>f.persist(args);
  await r.controller.start({sessionId:first.id,targetDate:first.targetDate});
  r.collaborationMessageDraft.value="latest unflushed editor change";
  const switching=r.selectTodayVault();f.emit("final","final words");f.complete();await switching;
  assert.ok(f.writes.some(write=>write.args.draft==="latest unflushed editor change\nfinal words"));
  assert.ok(f.writes.every(write=>write.vault==="A"));
});

test("waiting Vault saves freeze composer and guard new Start, Send and editor-stash entry points",async()=>{
  const f=composer(true);const {r}=f;let acknowledge:()=>void=()=>{};
  r.write=(args:any)=>new Promise(resolve=>{acknowledge=()=>resolve(f.persist(args));});
  const switching=r.selectTodayVault();await tick();
  assert.equal(r.collaborationMessageDraft.disabled,true);assert.equal(r.collaborationVoiceStartButton.disabled,true);
  const before=[...r.collaborationDrafts.entries()];
  r.collaborationMessageDraft.value="programmatic edit while frozen";r.stashCollaborationDraft();
  assert.deepEqual([...r.collaborationDrafts.entries()],before);
  await r.startOrStopCollaborationVoice();await r.sendCollaborationMessage();
  assert.equal(r.controller.state,"idle");assert.equal(r.collaborationSendingDrafts.size,0);
  acknowledge();await switching;assert.equal(f.pickerCalls(),1);
});
