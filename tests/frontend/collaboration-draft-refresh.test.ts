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
function composer(actualVoice=false, pendingStart=false, empty=false) {
  const first={id:"first",targetDate:"2026-10-03",draft:"persisted first",draftsByDate:{"2026-10-03":"persisted first","2026-10-02":"historical draft"},runState:"idle"};
  const second={id:"second",targetDate:"2026-10-03",draft:"independent second",draftsByDate:{"2026-10-03":"independent second"},runState:"idle"};
  const workspace={sessions:empty?[]:[first,second],context:{vaultName:"Synthetic Vault"},recoveryRequired:false};
  const names=["collaborationDraftKey","cacheCollaborationDrafts","collaborationDraftForDate",
    "currentCollaborationVoiceTarget","isCurrentCollaborationVoiceTarget","setCollaborationVoiceStatus",
    "collaborationVoiceStatusText","renderCollaborationVoiceControls","collaborationDraftForTarget",
    "handleCollaborationVoiceTranscript","cancelCollaborationVoiceCaptureForSelectionChange",
    "renderCollaborationWorkspace","stashCollaborationDraft","flushCollaborationDraft",
    "saveCollaborationDraft","selectCollaborationSession","refreshCollaborationWorkspace","saveCollaborationTargetDate",
    "collaborationVoiceFailureStatus","startOrStopCollaborationVoice","selectTodayVault","resumeHabitReadsAfterVaultSelection","sendCollaborationMessage","handleCollaborationDraftInput","resetVaultScopedWorkspaceState","renderPendingWriteFailure","openCollaborationForTask","createCollaborationSession","localOperationId","localCalendarDate",
    ...(main.includes("function prepareCollaborationForVaultSwitch(")?["prepareCollaborationForVaultSwitch"]:[]),
    ...(main.includes("function drainCollaborationDraftsForVaultSwitch(")?["drainCollaborationDraftsForVaultSwitch"]:[])];
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
  for(const name of ["taskCreateListLabel","taskCreateSubmit","taskCreateDate","taskCreateTime","todayTaskCreateDate","todayTaskCreateTime","calendarTaskCreateSubmit","calendarTaskCreateDate","calendarTaskCreateTime","habitsRange","calendarSummaryHeading","collaborationStatusTimer","habitDefinitionDialog","habitsDestination","taskCreateDialog","calendarTaskCreateDialog"])r[name]=null;
  Object.assign(r,{beginVoiceTranscriptSave,enqueueCollaborationDraftWrite,submitCollaborationDraftSnapshot,
    CodexCollaborationVoiceInputController,BrowserCodexDictationRuntime:class{constructor(){return runtime;}},crypto,AbortController,
    vaultSelectionInProgress:false,collaborationVaultSwitchDraftWrites:null,collaborationVaultSelectionRevision:0,
    selectVaultAndRefresh,vaultSelectionRequests:{begin:()=>1,isCurrent:()=>true},todayPresentationRequests:{begin:()=>1,isCurrent:()=>true},
    currentInterfaceLanguage:"en",currentWorkspaceDestination:"settings",updateTodayOperationState(){},
    // This Collaboration seam has no selected Habit pane; execute the real
    // post-picker resume hook with that explicit state rather than omitting it.
    habitsStatus:null,currentHabitSnapshot:null,selectedHabitDetailKey:null,
    currentHabitDetailHistory:null,habitDetailLoading:false,selectedHabitCell:null,currentHabitDateView:null,
    waitForPendingWrites:async()=>true,renderPendingWriteFailure(){},renderToday(){},renderWorkspaceContextStatus(){},
    openCalendar(){},refreshHabits(){},refreshTasks(){},renderVaultSelectionError(error:any){throw error;},
    stashCalendarTaskCreateDraft(){},taskEditorForms:()=>[],compactScheduleTransactions:new Map(),
    taskCreateAttempts:new Map(), taskEndedCreateAttempts:new Map(), taskEditDrafts:new Map(),
    normalizeTaskDateTimeFields(){},renderWorkspaceRailContext(){},settingsVaultStatus:element(),
    // Title polling is unrelated pane refresh at this draft-protection seam;
    // its real timer lifecycle is exercised by collaboration-title.test.ts.
    collaborationTitlePolling:{setPending(){}},
    refreshCollaborationRunOwner(){},showWorkspaceDestination(){},
    collaborationDrafts:new Map(),collaborationUnsavedDrafts:new Set(),collaborationDraftWrites:new Map(),
    collaborationDraftSaveTimers:new Map(),collaborationTargetDates:new Map(),collaborationSendingDrafts:new Set(),
    collaborationVoiceStatuses:new Map(),collaborationIncompleteVoiceDrafts:new Set(),collaborationVoicePreviews:new Map(),
    collaborationWorkspaceRequest:0,collaborationActivityDate:"2026-10-03",collaborationActivityDateExplicit:true,
    collaborationTargetDate:"2026-10-03",currentCollaborationSession:empty?null:first,currentCollaborationWorkspace:workspace,
    currentCollaborationConnection:{authenticated:true,authMode:"chatgpt",readOnlyTextTurnsAvailable:true},
    collaborationMessageDraft:element(empty?"":"persisted first"),collaborationTargetDateInput:element("2026-10-03"),
    collaborationComposerStatus:element(),collaborationSendButton:element(),collaborationRunStatus:element(),
    collaborationVoiceStartButton:element(),collaborationVoiceStatus:element(),
    collaborationVoiceController:{state:"idle",navigate(){}},todayClock:async()=>({livedDate:"2026-10-03"}),
    document:{activeElement:null,querySelector:()=>null},
    window:{setTimeout:()=>1,clearTimeout(){},clearInterval(){},requestAnimationFrame(){},__TAURI__:{core:{invoke:async(command:string,args:any)=>{
      if(command==="today_clock")return r.todayClock();
      if(command==="collaboration_workspace")return r.readWorkspace();
      if(command==="collaboration_context")return workspace.context;
      if(command==="collaboration_save_draft"){writes.push({vault,args});return r.write(args);}
      if(command==="select_today_vault"){pickerCalls++;vault=nextVault;return {changed:true,view:{defaultPhase:"morning"}};}
      if(command==="collaboration_submit_message")return r.submit(args);
      if(command==="collaboration_create_session")return r.create(args);
      if(command==="collaboration_set_target_date")return r.setTarget(args);
      assert.fail(`unexpected IPC ${command}`);
    }}}},
    readWorkspace:async()=>structuredClone(workspace),write:async()=>{throw new Error("synthetic persistence failure");},submit:async()=>structuredClone(first),
    create:async()=>({...structuredClone(first),createdDate:first.targetDate}),setTarget:async()=>structuredClone(first),
    t:(key:string)=>key,setRawText:(node:any,text:string)=>{if(node)node.textContent=text;},
    setCopy:(node:any,key:string)=>{if(node)node.textContent=key;},setCopyError(node:any,key:string){if(node)node.textContent=key;},
    collaborationDateLabel:(date:string)=>date,collaborationRunStateLabel:(state:string)=>state,collaborationRunProgressLabel:(session:any)=>session.runState,
  });
  for(const name of ["renderCollaborationContextPane","renderCollaborationSessionList","renderCollaborationMessages",
    "renderCollaborationTaskOperations","renderCollaborationMemory","watchCollaborationSession","refreshCollaborationContext"])r[name]=()=>{};
  const controllerStart=main.indexOf("const collaborationVoiceController = new CodexCollaborationVoiceInputController(");
  const controllerEnd=main.indexOf("\n);",controllerStart)+4;
  const controller=actualVoice?main.slice(controllerStart,controllerEnd)+"\nglobalThis.controller=collaborationVoiceController;":"";
  vm.runInNewContext(stripTypeScriptTypes(functions+"\n"+controller),r);
  if(!empty){r.cacheCollaborationDrafts(first);r.cacheCollaborationDrafts(second);}
  return {r,first,second,workspace,writes,persist,chooseVault:(name:string)=>{nextVault=name;},stopped:()=>stopped,pickerCalls:()=>pickerCalls,vault:()=>vault,releaseStart,
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

test("Discuss and target-date/create/blur flows cannot append drafts during the unrelated Vault-write wait",async()=>{
  const f=composer(true);const {r,first}=f;r.write=async(args:any)=>f.persist(args);
  let release:()=>void=()=>{};r.waitForPendingWrites=()=>new Promise(resolve=>{release=()=>resolve(true);});
  const switching=r.selectTodayVault();await tick();assert.equal(f.pickerCalls(),0);
  const beforeWrites=f.writes.length;const before=r.collaborationDrafts.get(r.collaborationDraftKey(first.id,first.targetDate));
  await r.openCollaborationForTask("unique-task-id","Synthetic task",first.targetDate);
  r.collaborationTargetDateInput.value="2026-10-02";await r.saveCollaborationTargetDate();
  await r.createCollaborationSession();await r.flushCollaborationDraft();
  assert.equal(f.writes.length,beforeWrites,"blocked user actions enqueue no additional draft");
  assert.equal(r.collaborationDrafts.get(r.collaborationDraftKey(first.id,first.targetDate)),before);
  assert.equal(r.collaborationTargetDate,first.targetDate);
  release();await switching;assert.equal(f.pickerCalls(),1);
});

for(const failedBeforeRecheck of [false,true])test(`late original save ${failedBeforeRecheck?"already failed":"still pending"} after initial prepare blocks the second-wait picker and preserves memory`,async()=>{
  const f=composer(true);const {r,first,second}=f;r.write=async(args:any)=>f.persist(args);
  let releaseOther:()=>void=()=>{};r.waitForPendingWrites=()=>new Promise(resolve=>{releaseOther=()=>resolve(true);});
  const switching=r.selectTodayVault();await tick();
  let reject:(error:Error)=>void=()=>{};r.write=()=>new Promise((_,failure)=>{reject=failure;});
  const key=r.collaborationDraftKey(second.id,first.targetDate);
  const late=r.saveCollaborationDraft({sessionId:second.id,targetDate:first.targetDate},"unique original async draft");
  const failed=assert.rejects(late,/late save failed/);
  if(failedBeforeRecheck){reject(new Error("late save failed"));await failed;assert.equal(r.collaborationDraftWrites.has(key),false);}
  releaseOther();await tick();assert.equal(f.pickerCalls(),0);
  if(!failedBeforeRecheck){reject(new Error("late save failed"));await failed;}
  await switching;assert.equal(f.vault(),"A");assert.equal(f.pickerCalls(),0);
  r.selectCollaborationSession(second);await tick();await r.refreshCollaborationWorkspace();
  assert.equal(r.collaborationMessageDraft.value,"unique original async draft");
  assert.equal(r.collaborationUnsavedDrafts.has(key),true);
  assert.equal(r.settingsVaultStatus.dataset.state,"error");
});

for(const operation of ["discuss-create","discuss-date","create"] as const)test(`old ${operation} response after a completed Vault switch cannot rebound old caches or save in B`,async()=>{
  const f=composer(true);const {r,first}=f;r.write=async(args:any)=>f.persist(args);
  let deliver:(value:any)=>void=()=>{};const response=new Promise(resolve=>{deliver=resolve;});
  r.create=()=>response;r.setTarget=()=>response;
  if(operation==="discuss-create")r.currentCollaborationSession=null;
  const before=operation==="create"?r.createCollaborationSession():r.openCollaborationForTask("unique-task-id","Synthetic task",operation==="discuss-date"?"2026-10-02":first.targetDate);
  await tick();await r.selectTodayVault();assert.equal(f.vault(),"B");assert.equal(r.vaultSelectionInProgress,false);
  const count=f.writes.length;
  deliver({...first,createdDate:first.targetDate,targetDate:"2026-10-02"});await before;
  assert.equal(r.currentCollaborationSession,null);assert.equal(r.collaborationDrafts.size,0);
  assert.equal(f.writes.length,count);assert.ok(f.writes.every(write=>write.vault==="A"));
});

test("a task-focus draft generated before Vault selection remains editable if its original save fails",async()=>{
  const f=composer(true);const {r,first}=f;r.write=async(args:any)=>f.persist(args);
  let fail:(error:Error)=>void=()=>{};
  r.write=(args:any)=>args.draft.includes("collaboration.taskFocusDraft")?new Promise((_,reject)=>{fail=reject;}):Promise.resolve(f.persist(args));
  const focus=r.openCollaborationForTask("unique-task-id","Synthetic task",first.targetDate);await tick();
  const key=r.collaborationDraftKey(first.id,first.targetDate);const original=r.collaborationDrafts.get(key);
  assert.match(original,/collaboration.taskFocusDraft/);
  const switching=r.selectTodayVault();await tick();fail(new Error("task focus save failed"));await focus;await switching;
  assert.equal(f.pickerCalls(),0);assert.equal(f.vault(),"A");assert.equal(r.collaborationDrafts.get(key),original);
  await r.refreshCollaborationWorkspace();assert.equal(r.collaborationMessageDraft.value,original);
});

for(const response of ["failure","refresh"] as const)test(`old creation ${response} completion cannot publish status under the new Vault`,async()=>{
  const f=composer(true);const {r,first}=f;r.write=async(args:any)=>f.persist(args);
  r.collaborationSessionsStatus=element();let complete:(value:any)=>void=()=>{},fail:(error:Error)=>void=()=>{};
  const pending=new Promise((resolve,reject)=>{complete=resolve;fail=reject;});
  if(response==="failure")r.create=()=>pending;else r.readWorkspace=()=>pending;
  const creation=r.createCollaborationSession();await tick();await r.selectTodayVault();assert.equal(f.vault(),"B");
  const status=r.collaborationSessionsStatus.textContent;
  if(response==="failure")fail(new Error("old create failed"));else complete({sessions:[first],context:{vaultName:"Synthetic A"}});
  await creation;assert.equal(r.collaborationSessionsStatus.textContent,status);
  assert.equal(r.currentCollaborationSession,null);assert.equal(r.collaborationDrafts.size,0);
});


test("accepted keyboard send stays empty when a late workspace snapshot still carries the consumed draft", async () => {
  const f=composer(); const {r,first}=f;
  r.write=async(args:any)=>f.persist(args);
  const stale=structuredClone(first);
  r.submit=async()=>{first.draft="";first.draftsByDate[first.targetDate]="";return structuredClone(first);};
  r.readWorkspace=async()=>({sessions:[stale],context:{vaultName:"Synthetic Vault"},recoveryRequired:false});
  await r.sendCollaborationMessage();await tick();await tick();
  assert.equal(r.collaborationMessageDraft.value,"","a stale source response must not restore the submitted text");
});

test("unconfirmed prior result leaves the production correction composer and dictation available",()=>{
  const {r}=composer();
  r.currentCollaborationWorkspace.recoveryRequired=true;
  r.collaborationSendButton=element();
  r.collaborationComposerStatus=element();
  r.collaborationRecoveryDetails=element();
  r.renderCollaborationWorkspace();
  assert.equal(r.collaborationMessageDraft.disabled,false);
  assert.equal(r.collaborationSendButton.disabled,false);
  assert.equal(r.collaborationVoiceStartButton.disabled,false);
  assert.equal(r.collaborationComposerStatus.hidden,true);
  assert.equal(r.collaborationRecoveryDetails.hidden,false);
});

test("a disconnected new chat keeps local text editable but gates dictation start and preserves stop/cancel",async()=>{
  const {r,workspace}=composer(false,false,true);
  const created={id:"",createdDate:"2026-10-03",targetDate:"2026-10-03",draft:"",draftsByDate:{"2026-10-03":""},runState:"idle"};
  r.currentCollaborationConnection={authenticated:false,authMode:"chatgpt",readOnlyTextTurnsAvailable:false};
  r.collaborationMessageDraft.value="Editable while disconnected";
  r.handleCollaborationDraftInput();
  r.create=async(args:any)=>{
    created.id=args.sessionId;created.createdDate=args.date;created.targetDate=args.date;
    created.draft=args.initialDraft;created.draftsByDate[args.date]=args.initialDraft;
    workspace.sessions.push(structuredClone(created));
    return structuredClone(created);
  };
  r.readWorkspace=async()=>structuredClone(workspace);
  await r.createCollaborationSession();
  r.collaborationSendButton=element();r.collaborationComposerStatus=element();
  r.renderCollaborationWorkspace();
  assert.equal(r.currentCollaborationSession.id,created.id);
  assert.equal(r.collaborationMessageDraft.value,"Editable while disconnected");
  assert.equal(r.collaborationMessageDraft.disabled,false);
  assert.equal(r.collaborationSendButton.disabled,true);
  assert.equal(r.collaborationVoiceStartButton.disabled,true);

  r.collaborationVoiceController.state="recording";
  r.collaborationVoiceCancelButton=element();
  r.vaultSelectionInProgress=true;
  r.renderCollaborationVoiceControls();
  assert.equal(r.collaborationVoiceStartButton.dataset.action,"stop");
  assert.equal(r.collaborationVoiceStartButton.disabled,false);
  assert.equal(r.collaborationVoiceCancelButton.disabled,false);
});

test("current execution owner stays visible while an older result still needs recovery",()=>{
  const {r}=composer();
  r.currentCollaborationWorkspace.recoveryRequired=true;
  r.currentCollaborationWorkspace.activeRun={sessionId:"s2",sessionTitle:"Fresh correction",runState:"thinking"};
  r.collaborationWorkOwner=element();
  r.renderCollaborationWorkspace();
  assert.equal(r.collaborationWorkOwner.dataset.state,"active");
});

test("empty-session input retains a local draft while disconnected without writing or creating a session",()=>{
  const {r,writes}=composer(false,false,true);
  r.currentCollaborationConnection=null;
  r.document.activeElement=r.collaborationMessageDraft;
  r.collaborationMessageDraft.value="Synthetic unsent draft";
  r.collaborationComposerStatus=element();
  r.collaborationSendButton=element();
  r.renderCollaborationWorkspace();
  assert.equal(r.collaborationMessageDraft.disabled,false);
  assert.equal(r.collaborationSendButton.disabled,true);
  assert.equal(r.collaborationComposerStatus.textContent,"collaboration.composerConnect");
  r.handleCollaborationDraftInput();
  assert.equal(r.collaborationEmptyDraft,"Synthetic unsent draft");
  r.renderCollaborationWorkspace();
  assert.equal(r.collaborationMessageDraft.value,"Synthetic unsent draft");
  assert.equal(r.collaborationMessageDraft.disabled,false);
  assert.equal(r.currentCollaborationSession,null);
  assert.equal(r.collaborationDrafts.size,0);
  assert.equal(writes.length,0);
});

test("refresh does not auto-select an older saved session over the active empty composer draft",async()=>{
  const {r,first,workspace}=composer(false,false,true);
  r.document.activeElement=r.collaborationMessageDraft;r.collaborationMessageDraft.value="Synthetic new conversation draft";
  r.handleCollaborationDraftInput();workspace.sessions.push(first);
  r.readWorkspace=async()=>structuredClone(workspace);
  await r.refreshCollaborationWorkspace();
  assert.equal(r.currentCollaborationSession,null);
  assert.equal(r.collaborationMessageDraft.value,"Synthetic new conversation draft");
  assert.equal(r.collaborationEmptyComposerActive,true);
});

test("an unbound draft and its chosen target date survive explicit Vault setup",async()=>{
  const f=composer(true,false,true);const {r,writes}=f;
  r.currentCollaborationWorkspace.context.vaultName="";
  r.document.activeElement=r.collaborationMessageDraft;r.collaborationMessageDraft.value="Synthetic draft before Vault setup";
  r.collaborationEmptyTargetDate="2026-10-02";r.collaborationTargetDate="2026-10-02";
  r.collaborationActivityDate="2026-10-02";r.collaborationActivityDateExplicit=true;
  r.handleCollaborationDraftInput();r.write=async(args:any)=>f.persist(args);
  assert.equal(r.currentCollaborationSession,null);assert.equal(r.collaborationEmptyDraft,"Synthetic draft before Vault setup");
  await r.selectTodayVault();
  assert.equal(f.vault(),"B");assert.equal(f.pickerCalls(),1);
  assert.equal(r.currentCollaborationSession,null);assert.equal(r.collaborationDrafts.size,0);
  assert.equal(r.collaborationMessageDraft.disabled,false);
  assert.equal(r.collaborationMessageDraft.value,"Synthetic draft before Vault setup");
  assert.equal(r.collaborationEmptyDraft,"Synthetic draft before Vault setup");
  assert.equal(r.collaborationEmptyTargetDate,"2026-10-02");
  assert.equal(r.collaborationActivityDate,"2026-10-02");assert.equal(writes.length,0);
});

test("empty-state session creation freezes its chosen target date until creation resolves",async()=>{
  const f=composer(false,false,true);const {r,workspace}=f;
  const chosenDate="2026-10-02";
  const created={id:"created",createdDate:chosenDate,targetDate:chosenDate,draft:"",draftsByDate:{[chosenDate]:""},runState:"idle"};
  let finish:(session:any)=>void=()=>{};
  r.collaborationEmptyTargetDate=chosenDate;r.collaborationTargetDate=chosenDate;
  r.collaborationActivityDate=chosenDate;r.collaborationActivityDateExplicit=true;
  r.collaborationTargetDateInput.value=chosenDate;
  r.create=(args:any)=>{created.id=args.sessionId;created.createdDate=args.date;created.targetDate=args.date;return new Promise(resolve=>{finish=resolve;});};
  r.readWorkspace=async()=>structuredClone(workspace);
  const creation=r.createCollaborationSession();
  assert.equal(r.collaborationTargetDateInput.disabled,true);
  r.collaborationTargetDateInput.value="2026-10-03";
  await r.saveCollaborationTargetDate();
  assert.equal(r.collaborationEmptyTargetDate,chosenDate);
  assert.equal(r.collaborationTargetDate,chosenDate);
  finish(structuredClone(created));
  await creation;
  assert.equal(r.currentCollaborationSession.id,created.id);
  assert.equal(r.collaborationTargetDateInput.value,chosenDate);
});

test("New chat waits for the authoritative lived date after Today clears the activity date",async()=>{
  const f=composer(false,false,true);const {r,workspace}=f;
  const createArgs:any[]=[];
  const created={id:"",createdDate:"",targetDate:"",draft:"",draftsByDate:{} as Record<string,string>,runState:"idle"};
  let finishClock:(clock:any)=>void=()=>{};
  let clockCalls=0;
  r.collaborationActivityDate="";r.collaborationActivityDateExplicit=false;
  r.collaborationEmptyTargetDate=null;r.collaborationTargetDate="";
  r.collaborationTargetDateInput.value="";r.collaborationDateInput=element("");
  r.collaborationMessageDraft.value="Draft before the lived date is known";
  r.handleCollaborationDraftInput();
  r.localCalendarDate=()=>"2026-10-03";
  r.todayClock=()=>{clockCalls++;return new Promise(resolve=>{finishClock=resolve;});};
  r.create=async(args:any)=>{
    createArgs.push(structuredClone(args));
    created.id=args.sessionId;created.createdDate=args.date;created.targetDate=args.date;
    created.draft=args.initialDraft;created.draftsByDate[args.date]=args.initialDraft;
    workspace.sessions.push(structuredClone(created));
    return structuredClone(created);
  };
  r.readWorkspace=async()=>structuredClone(workspace);
  const controls=new Map<string,any>([
    ["#collaboration-new-session",element()],
    ["#collaboration-date-previous",element()],
    ["#collaboration-date-next",element()],
    ["#collaboration-date-today",element()],
  ]);
  r.document.querySelector=(selector:string)=>controls.get(selector)??null;

  const creation=r.createCollaborationSession();
  await tick();
  assert.equal(clockCalls,1);
  assert.equal(createArgs.length,0,"session creation waits for the backend's lived date");
  assert.equal(r.collaborationSessionCreationPromise!==null,true,"the new-chat entry stays pending during clock lookup");
  assert.equal(controls.get("#collaboration-new-session").disabled,true);
  assert.equal(r.collaborationDateInput.disabled,true);
  assert.equal(controls.get("#collaboration-date-today").disabled,true);
  assert.equal(r.collaborationSessionCreationAttempt,null,"the stable retry identity is created only after its date is known");

  finishClock({livedDate:"2026-10-02"});
  await creation;
  assert.equal(createArgs.length,1);
  assert.equal(createArgs[0].date,"2026-10-02","backend lived date wins over the local calendar day");
  assert.equal(createArgs[0].initialDraft,"Draft before the lived date is known");
  assert.equal(r.currentCollaborationSession.id,createArgs[0].sessionId);
});

test("explicit Send retries an uncertain empty-state creation without replacing a newer editable draft",async()=>{
  const f=composer(false,false,true);const {r,workspace}=f;
  const created={id:"",createdDate:"2026-10-03",targetDate:"2026-10-03",draft:"",draftsByDate:{"2026-10-03":""},runState:"idle"};
  let createCalls=0;const createArgs:any[]=[];const submitted:any[]=[];
  r.collaborationSessionsStatus=element();r.collaborationComposerStatus=element();r.collaborationSendButton=element();
  r.collaborationMessageDraft.value="Synthetic question retained after create failure";
  r.handleCollaborationDraftInput();
  r.create=async(args:any)=>{createArgs.push(structuredClone(args));if(++createCalls===1){created.id=args.sessionId;created.draft=args.initialDraft;created.draftsByDate[args.date]=args.initialDraft;workspace.sessions.push(structuredClone(created));throw new Error("synthetic response lost after session save");}return structuredClone(workspace.sessions[0]);};
  r.readWorkspace=async()=>structuredClone(workspace);
  r.write=async(args:any)=>{created.draft=args.draft;created.draftsByDate[args.targetDate]=args.draft;return structuredClone(created);};
  r.submit=async(args:any)=>{submitted.push(args);created.draft="";created.draftsByDate[args.targetDate]="";return structuredClone(created);};

  await r.sendCollaborationMessage();
  assert.equal(createCalls,1);assert.equal(submitted.length,0);
  assert.equal(workspace.sessions.length,1,"the simulated first call saved before its response was lost");
  assert.equal(r.currentCollaborationSession,null);
  assert.equal(r.collaborationMessageDraft.value,"Synthetic question retained after create failure");
  assert.equal(r.collaborationComposerStatus.textContent,"collaboration.sessionCreateFailed");
  assert.equal(r.collaborationMessageDraft.disabled,false);

  const latestDraft="Newer edit kept after the session save response was lost";
  r.collaborationMessageDraft.value=latestDraft;
  r.handleCollaborationDraftInput();

  await r.sendCollaborationMessage();await tick();await tick();
  assert.equal(createCalls,2);assert.equal(workspace.sessions.length,1);
  assert.equal(createArgs[0].sessionId,createArgs[1].sessionId,"explicit retry reuses the creation identity");
  assert.equal(createArgs[0].date,"2026-10-03");
  assert.equal(createArgs[0].initialDraft,"Synthetic question retained after create failure");
  assert.equal(createArgs[1].initialDraft,createArgs[0].initialDraft);
  assert.equal(r.currentCollaborationSession.id,createArgs[0].sessionId);
  assert.equal(submitted.length,1);assert.equal(submitted[0].sessionId,createArgs[0].sessionId);
  assert.equal(submitted[0].text,latestDraft);
  assert.equal(r.collaborationMessageDraft.value,"");
});

test("an unresolved empty-state creation does not block other sessions and its own draft stays scoped",async()=>{
  const f=composer(false,false,true);const {r,second,workspace}=f;
  const originalDraft="Draft for the new chat";
  const latestDraft="Latest new-chat edit after an uncertain create";
  const created={id:"",createdDate:"2026-10-03",targetDate:"2026-10-03",draft:"",draftsByDate:{"2026-10-03":""},runState:"idle"};
  let createCalls=0;const submitted:any[]=[];
  r.collaborationMessageDraft.value=originalDraft;r.handleCollaborationDraftInput();
  r.create=async(args:any)=>{
    createCalls++;
    if(createCalls===1){
      created.id=args.sessionId;created.createdDate=args.date;created.targetDate=args.date;
      created.draft=args.initialDraft;created.draftsByDate[args.date]=args.initialDraft;
      workspace.sessions.push(structuredClone(created));
      throw new Error("synthetic response lost after session save");
    }
    return structuredClone(workspace.sessions.find((session:any)=>session.id===args.sessionId));
  };
  r.readWorkspace=async()=>structuredClone(workspace);
  r.write=async(args:any)=>{created.draft=args.draft;created.draftsByDate[args.targetDate]=args.draft;return structuredClone(created);};
  r.submit=async(args:any)=>{submitted.push(args);created.draft="";created.draftsByDate[args.targetDate]="";return structuredClone(created);};
  await r.createCollaborationSession();
  assert.equal(r.currentCollaborationSession,null);
  assert.ok(r.collaborationSessionCreationAttempt);
  const attemptId=r.collaborationSessionCreationAttempt.id;

  r.collaborationMessageDraft.value=latestDraft;r.handleCollaborationDraftInput();
  second.targetDate="2026-10-02";second.draft="Independent older-session draft";
  second.draftsByDate={"2026-10-02":"Independent older-session draft"};
  workspace.sessions.unshift(structuredClone(second));
  r.selectCollaborationSession(second);await tick();await tick();
  assert.equal(r.currentCollaborationSession.id,second.id,"an unresolved create does not trap history selection");
  assert.equal(r.collaborationDraftForDate(second,second.targetDate),second.draft);
  assert.equal(r.collaborationSessionCreationAttempt.id,attemptId);

  await r.createCollaborationSession();await tick();
  assert.equal(createCalls,2);
  assert.equal(workspace.sessions.filter((session:any)=>session.id===attemptId).length,1);
  assert.equal(r.currentCollaborationSession.id,attemptId,"explicit New Chat recovers the same identity");
  assert.equal(r.collaborationMessageDraft.value,latestDraft);
  assert.equal(r.collaborationTargetDate,"2026-10-03","recovering the attempt restores its frozen date, not the older session date");
  assert.equal(r.collaborationTargetDateInput.value,"2026-10-03");
  assert.equal(r.collaborationDraftForDate(second,second.targetDate),second.draft,"the older session draft stays separate");
  assert.equal(submitted.length,0,"session recovery never sends the draft");
  await r.sendCollaborationMessage();await tick();await tick();
  assert.equal(submitted.length,1,"only the later explicit Send submits the recovered draft");
  assert.equal(submitted[0].text,latestDraft);
  assert.equal(submitted[0].sessionId,attemptId);
  assert.equal(r.collaborationTargetDate,"2026-10-03");
  assert.equal(r.collaborationMessageDraft.value,"");
});

test("a confirmed empty-state session is reused after Send fails, with its draft available for retry",async()=>{
  const f=composer(false,false,true);const {r,workspace}=f;
  const created={id:"created",createdDate:"2026-10-03",targetDate:"2026-10-03",draft:"",draftsByDate:{"2026-10-03":""},runState:"idle"};
  let createCalls=0,submitCalls=0;
  r.collaborationSessionsStatus=element();r.collaborationComposerStatus=element();r.collaborationSendButton=element();
  r.collaborationMessageDraft.value="Synthetic question retained after Send failure";r.handleCollaborationDraftInput();
  r.create=async(args:any)=>{createCalls++;created.id=args.sessionId;created.createdDate=args.date;created.targetDate=args.date;workspace.sessions.push(created);return structuredClone(created);};
  r.readWorkspace=async()=>structuredClone(workspace);
  r.write=async(args:any)=>{created.draft=args.draft;created.draftsByDate[args.targetDate]=args.draft;return structuredClone(created);};
  r.submit=async(args:any)=>{submitCalls++;if(submitCalls===1)throw new Error("synthetic Send failure");created.draft="";created.draftsByDate[args.targetDate]="";return structuredClone(created);};

  await r.sendCollaborationMessage();
  assert.equal(createCalls,1);assert.equal(submitCalls,1);assert.equal(workspace.sessions.length,1);
  assert.equal(r.currentCollaborationSession.id,created.id);
  assert.equal(r.collaborationMessageDraft.value,"Synthetic question retained after Send failure");
  assert.equal(r.collaborationDrafts.get(r.collaborationDraftKey(created.id,"2026-10-03")),"Synthetic question retained after Send failure");
  await r.sendCollaborationMessage();await tick();
  assert.equal(createCalls,1);assert.equal(submitCalls,2);assert.equal(workspace.sessions.length,1);
  assert.equal(r.currentCollaborationSession.id,created.id);
  assert.equal(r.collaborationMessageDraft.value,"");
});

test("New chat preserves the previous session draft without copying it into the new conversation",async()=>{
  const f=composer();const {r,first,workspace}=f;
  const created={id:"created",createdDate:"2026-10-03",targetDate:"2026-10-03",draft:"",draftsByDate:{"2026-10-03":""},runState:"idle"};
  r.collaborationSessionsStatus=element();r.document.activeElement=r.collaborationMessageDraft;r.collaborationMessageDraft.value="Old session unsaved edit";
  r.handleCollaborationDraftInput();
  r.create=async(args:any)=>{created.id=args.sessionId;created.createdDate=args.date;created.targetDate=args.date;workspace.sessions.push(created);return structuredClone(created);};
  r.readWorkspace=async()=>structuredClone(workspace);
  await r.createCollaborationSession();await tick();
  assert.equal(r.currentCollaborationSession.id,created.id);
  assert.equal(r.collaborationDrafts.get(r.collaborationDraftKey(first.id,first.targetDate)),"Old session unsaved edit");
  assert.equal(r.collaborationDraftForDate(created,created.targetDate),"");
  assert.equal(workspace.sessions.length,3);
});
