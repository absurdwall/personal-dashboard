import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { registerHooks } from "node:module";
import type { CodexDictationRuntime, CodexDictationEvent } from "../../frontend/collaboration-dictation-runtime.ts";
// Production emits .js imports; this source-level test resolves its one shared
// reducer to TypeScript without requiring generated dist artifacts.
const sourceHook=registerHooks({resolve(specifier,context,nextResolve){
  return nextResolve(specifier==="./collaboration-dictation-transcript.js"
    ? "./collaboration-dictation-transcript.ts" : specifier,context);
}});
const { CodexCollaborationVoiceInputController } = await import("../../frontend/collaboration-dictation.ts");
const { BrowserCodexDictationRuntime, parseCodexDictationEvent } = await import("../../frontend/collaboration-dictation-runtime.ts");
sourceHook.deregister();
import { appendVoiceTranscript, beginVoiceTranscriptSave, enqueueCollaborationDraftWrite, submitCollaborationDraftSnapshot } from "../../frontend/collaboration-voice.ts";

const recoveryLabel="[Unconfirmed preview — may overlap the final transcript; review before sending]";
const recovered=(text:string)=>`${recoveryLabel}\n${text}`;
const target={sessionId:"synthetic",targetDate:"2026-10-03"};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const preview=(id:string,text:string)=>({type:"input_transcript.added",item:{id,text}});
const final=(id:string,text:string,role="user")=>({type:"turn.done",turn:{id,role,transcript:text}});
function fixture() {
  let deliver: (event:CodexDictationEvent)=>void=()=>{};
  let id="";
  let stopped=false;
  let released=false;
  let resolveFinal:(value:{incomplete:boolean})=>void=()=>{};
  let draft="typed before dictation";
  const states:string[]=[];
  const failures:string[]=[];
  const previews:string[]=[];
  const transcripts:string[]=[];
  let incomplete=0;
  const runtime:CodexDictationRuntime={start:async(inputId,onEvent)=>{
    id=inputId;deliver=onEvent;onEvent({inputId,kind:"phase",phase:"connecting"});
    return {stopCapture:()=>{stopped=true;},finalize:()=>new Promise(resolve=>{resolveFinal=resolve;}),cancel:async()=>{released=true;}};
  }};
  const controller=new CodexCollaborationVoiceInputController(runtime,{
    onState:state=>states.push(state),
    onTranscript:(owner,text)=>{assert.deepEqual(owner,target);transcripts.push(text);draft=appendVoiceTranscript(draft,text);},
    onPreview:(_,text)=>previews.push(text),onIncomplete:()=>{incomplete++;},
    onFailure:(_,failure)=>failures.push(failure),onCancel:()=>{},
  });
  return {controller,target,states,failures,previews,transcripts,deliver:(event:CodexDictationEvent)=>deliver(event),
    emit:(value:unknown)=>{const event=parseCodexDictationEvent(id,value);if(event)deliver(event);},
    complete:(incomplete=false)=>resolveFinal({incomplete}),edit:(text:string)=>{draft=text;},
    draft:()=>draft,stopped:()=>stopped,released:()=>released,incomplete:()=>incomplete};
}

const timedPreview=(id:string,text:string,start:unknown,end:unknown)=>({...preview(id,text),start_ms:start,end_ms:end});
const timedFinal=(id:string,text:string,start:unknown,end:unknown)=>({type:"turn.done",turn:{id,role:"user",transcript:text,start_ms:start,end_ms:end}});

test("whole nonconflicting audio intervals replace corresponding previews and order delayed finals chronologically",async()=>{
  const f=fixture();await f.controller.start(target);
  f.emit(timedPreview("preview-a","wrong A",10,30));
  f.emit(timedPreview("preview-b","wrong B",110,130));
  f.emit(timedFinal("turn-b","correct B",100,150));
  f.emit(timedFinal("turn-a","old A",0,50));
  f.emit(timedFinal("turn-a","correct A",0,50));
  f.emit(timedFinal("turn-a","correct A",0,50));
  assert.equal(f.previews.at(-1),"correct A\ncorrect B");
  f.edit("latest concurrent edit");f.controller.stop();f.complete();await tick();
  assert.equal(f.draft(),"latest concurrent edit\ncorrect A\ncorrect B");
  assert.equal(f.incomplete(),0);assert.equal(f.transcripts.length,1);
});

test("delayed A final covers only A's interval, preserving a newer B preview on failure",async()=>{
  const f=fixture();await f.controller.start(target);
  f.emit(timedPreview("preview-a","provisional A ",5,25));
  f.emit(timedPreview("preview-b","received B",60,90));
  f.emit(timedFinal("turn-a","correct A",0,50));
  assert.equal(f.previews.at(-1),"correct A\nreceived B");
  f.emit({type:"error"});
  assert.deepEqual(f.transcripts,[`correct A\n${recovered("received B")}`]);
  assert.equal(f.incomplete(),1);
});

for(const expandAgain of [false,true])test(`shrinking final correction re-exposes retained preview${expandAgain?" until range expands again":""}`,async()=>{
  const f=fixture();await f.controller.start(target);
  f.emit(timedPreview("tail","received tail",80,100));
  f.emit(timedFinal("turn","wide final",0,120));
  assert.equal(f.previews.at(-1),"wide final");
  f.emit(timedFinal("turn","narrow corrected final",0,60));
  assert.equal(f.previews.at(-1),"narrow corrected final\nreceived tail");
  if(expandAgain)f.emit(timedFinal("turn","wide corrected final",0,120));
  f.controller.stop();f.complete();await tick();
  assert.deepEqual(f.transcripts,[expandAgain?"wide corrected final":`narrow corrected final\n${recovered("received tail")}`]);
  assert.equal(f.incomplete(),expandAgain?0:1);
});

test("equal words in distinct adjacent final intervals survive, exact boundary containment is allowed",async()=>{
  const f=fixture();await f.controller.start(target);
  f.emit(timedPreview("second-preview","repeated",50,100));
  f.emit(timedPreview("first-preview","repeated",0,50));
  f.emit(timedFinal("second-turn","repeated",50,100));
  f.emit(timedFinal("first-turn","repeated",0,50));
  f.controller.stop();f.complete();await tick();
  assert.deepEqual(f.transcripts,["repeated\nrepeated"]);assert.equal(f.incomplete(),0);
});

for(const overlap of [false,true])test(`${overlap?"overlapping final owners":"preview crossing adjacent final boundaries"} remain ambiguous`,async()=>{
  const f=fixture();await f.controller.start(target);
  f.emit(timedPreview("p","received fragment",overlap?10:20,overlap?30:80));
  f.emit(timedFinal("a","A",0,overlap?100:50));
  f.emit(timedFinal("b","B",overlap?90:50,150));
  f.controller.stop();f.complete();await tick();
  assert.deepEqual(f.transcripts,[`A\nB\n${recovered("received fragment")}`]);
  assert.equal(f.incomplete(),1);
});

for(const [name,start,end] of [
  ["missing",undefined,undefined],["zero-width",0,0],["negative",-1,20],
  ["reversed",20,10],["nonfinite",0,Infinity],["numeric strings","0","20"],
] as const)test(`${name} preview timing never permits destructive coverage`,async()=>{
  const f=fixture();await f.controller.start(target);
  f.emit(timedPreview("p","received fragment",start,end));
  f.emit(timedFinal("turn","correct final",0,100));
  f.controller.stop();f.complete();await tick();
  assert.deepEqual(f.transcripts,[`correct final\n${recovered("received fragment")}`]);assert.equal(f.incomplete(),1);
});

test("preview revisions recompute coverage and chronological order without losing the retained identity",async()=>{
  const f=fixture();await f.controller.start(target);
  f.emit(timedFinal("later","later final",100,150));
  f.emit(timedPreview("p","earlier preview",10,30));
  assert.equal(f.previews.at(-1),"earlier preview\nlater final");
  f.emit(timedFinal("earlier","earlier final",0,50));
  assert.equal(f.previews.at(-1),"earlier final\nlater final");
  f.emit(timedPreview("p","revised uncovered words",60,80));
  assert.equal(f.previews.at(-1),"earlier final\nrevised uncovered words\nlater final");
  f.controller.stop();f.complete();await tick();
  assert.deepEqual(f.transcripts,[`earlier final\nlater final\n${recovered("revised uncovered words")}`]);assert.equal(f.incomplete(),1);
});

test("an invalid corrected final interval re-exposes preview and flags unresolved ordering",async()=>{
  const f=fixture();await f.controller.start(target);
  f.emit(timedPreview("p","received fragment",10,30));
  f.emit(timedFinal("turn","valid final",0,50));
  assert.equal(f.previews.at(-1),"valid final");
  f.emit(timedFinal("turn","corrected final",50,0));
  f.controller.stop();f.complete();await tick();
  assert.deepEqual(f.transcripts,[`corrected final\n${recovered("received fragment")}`]);assert.equal(f.incomplete(),1);
});

test("a conflicting final arriving later re-exposes formerly covered preview",async()=>{
  const f=fixture();await f.controller.start(target);
  f.emit(timedPreview("p","received fragment",10,30));
  f.emit(timedFinal("a","A",0,100));
  assert.equal(f.previews.at(-1),"A");
  f.emit(timedFinal("b","B",90,150));
  f.controller.stop();f.complete();await tick();
  assert.deepEqual(f.transcripts,[`A\nB\n${recovered("received fragment")}`]);assert.equal(f.incomplete(),1);
});

test("an empty final cannot silently consume received preview words",async()=>{
  const f=fixture();await f.controller.start(target);
  f.emit(timedPreview("p","received words",10,30));
  f.emit(timedFinal("turn","",0,50));
  f.controller.stop();f.complete();await tick();
  assert.deepEqual(f.transcripts,[recovered("received words")]);assert.equal(f.incomplete(),1);
});

test("recovery preserves separate word chunks when a finalized middle preview is removed",async()=>{
  const f=fixture();await f.controller.start(target);
  f.emit(timedPreview("first","buy",0,10));
  f.emit(timedPreview("middle","covered middle",10,20));
  f.emit(timedPreview("last","milk",20,30));
  f.emit(timedFinal("middle-final","correct middle",10,20));
  f.controller.stop();f.complete();await tick();
  assert.deepEqual(f.transcripts,[`correct middle\n${recovered("buy\nmilk")}`]);assert.equal(f.incomplete(),1);
});

test("parser retains finite numeric raw envelope and nested turn timings without coercion",()=>{
  const p=parseCodexDictationEvent("input",timedPreview("p","words",0,25));
  assert.equal(p?.startMs,0);assert.equal(p?.endMs,25);
  const f=parseCodexDictationEvent("input",timedFinal("t","words",10,30));
  assert.equal(f?.startMs,10);assert.equal(f?.endMs,30);
  const malformed=parseCodexDictationEvent("input",timedPreview("p","words","0",Infinity));
  assert.equal(malformed?.startMs,undefined);assert.equal(malformed?.endMs,undefined);
});

test("unpaired previews survive delayed and corrected finals without invented sealing",async()=>{
  const f=fixture();await f.controller.start(f.target);
  f.emit(preview("preview-a","provisional A "));
  f.emit(preview("preview-b","newer B"));
  f.emit(final("assistant-a","assistant response","assistant"));
  f.emit(final("turn-a","correct final A"));
  f.emit(final("turn-a","corrected final A"));
  f.emit(final("turn-a","corrected final A"));
  assert.equal(f.previews.at(-1),"provisional A newer B\ncorrected final A");
  f.emit({type:"error"});
  assert.deepEqual(f.transcripts,[`corrected final A\n${recovered("provisional A \nnewer B")}`]);
  assert.equal(f.incomplete(),1);assert.equal(f.released(),true);
});

test("equal authoritative finals from distinct turn IDs survive, duplicate/corrected ID replaces once",async()=>{
  const f=fixture();await f.controller.start(f.target);
  f.emit(final("turn-a","old"));f.emit(final("turn-a","repeated"));
  f.emit(final("turn-b","repeated"));f.emit(final("turn-a","repeated"));
  f.controller.stop();f.complete();await tick();
  assert.deepEqual(f.transcripts,["repeated\nrepeated"]);assert.equal(f.incomplete(),1);
});

test("manual stop waits for the tail and appends once to the latest edited original-target draft",async()=>{
  const f=fixture();await f.controller.start(f.target);
  f.emit(final("opening","开头 Personal Dashboard"));
  f.emit(final("middle","middle sentence"));
  f.edit("edited during recording");f.controller.stop();f.controller.stop();
  assert.equal(f.stopped(),true);assert.equal(f.controller.state,"transcribing");
  f.edit("latest edited draft while finalizing");
  f.emit(preview("tail-preview","最后几个"));f.emit(final("tail","最后几个字。"));
  f.complete();await tick();
  f.emit(final("tail","late correction"));f.complete();await tick();
  assert.equal(f.draft(),`latest edited draft while finalizing\n开头 Personal Dashboard\nmiddle sentence\n最后几个字。\n${recovered("最后几个")}`);
  assert.equal(f.transcripts.length,1);assert.equal(f.incomplete(),1);
});

test("incomplete finalization preserves user previews and exposes incomplete status",async()=>{
  const f=fixture();await f.controller.start(f.target);
  f.emit(final("opening","opening"));f.emit(preview("tail","unfinished tail"));
  f.controller.stop();f.complete(true);await tick();
  assert.equal(f.draft(),`typed before dictation\nopening\n${recovered("unfinished tail")}`);
  assert.equal(f.incomplete(),1);assert.equal(f.released(),true);
});

test("service failure preserves received draft text without restarting or sending",async()=>{
  const f=fixture();await f.controller.start(f.target);
  f.emit(preview("tail","received words"));f.emit({type:"error"});f.emit(final("late","discard"));
  assert.equal(f.draft(),`typed before dictation\n${recovered("received words")}`);
  assert.equal(f.incomplete(),1);assert.equal(f.released(),true);assert.equal(f.controller.state,"idle");
});

test("cancel discards the input and rejects late/expired final events after a fresh input",async()=>{
  const f=fixture();await f.controller.start(f.target);
  f.emit(final("first","discard"));f.controller.cancel();
  f.emit(final("late","discard"));await f.controller.start(f.target);
  f.deliver({inputId:"expired-input",kind:"final",role:"user",itemId:"expired",text:"discard"});
  f.emit(final("fresh","keep"));f.controller.stop();f.complete();await tick();
  assert.equal(f.draft(),"typed before dictation\nkeep");assert.equal(f.transcripts.length,1);
});

test("missing authoritative identity fails visibly instead of guessing final/delta correlation",async()=>{
  const f=fixture();await f.controller.start(f.target);
  f.emit({type:"turn.done",turn:{role:"user",transcript:"uncorrelated"}});
  assert.equal(f.draft(),"typed before dictation");assert.deepEqual(f.failures,["recognition-failed"]);
  assert.equal(f.released(),true);
  assert.equal(parseCodexDictationEvent("input",{type:"input_transcript.added",item:{text:"unidentified"}})?.kind,"failed");
});

test("one aggregate draft save shares the existing queue with pending edits and manual-send flush",async()=>{
  let emit:(value:unknown)=>void=()=>{};
  let resolveFinal:(value:{incomplete:boolean})=>void=()=>{};
  let draft="existing";
  const queued=new Map<string,Promise<void>>();
  const saved:string[]=[];
  let releaseFirst:()=>void=()=>{};
  const write=(text:string)=>enqueueCollaborationDraftWrite(queued,target,async()=>{
    if(saved.length===0)await new Promise<void>(resolve=>{releaseFirst=resolve;});
    saved.push(text);
  });
  const first=write(draft);
  const controller=new CodexCollaborationVoiceInputController({start:async(id,onEvent)=>{
    emit=value=>{const event=parseCodexDictationEvent(id,value);if(event)onEvent(event);};
    return {stopCapture:()=>{},cancel:async()=>{},finalize:()=>new Promise(resolve=>{resolveFinal=resolve;})};
  }},{onState:()=>{},onCancel:()=>{},onFailure:()=>assert.fail("unexpected failure"),onTranscript:(owner,text)=>{
    const aggregate=beginVoiceTranscriptSave(owner,text,draft,(_,text)=>write(text));
    draft=aggregate.draft;
  }});
  await controller.start(target);draft="edited while older save is pending";
  emit(final("turn","correct final"));emit(final("turn","correct final"));
  controller.stop();resolveFinal({incomplete:false});await tick();
  const sendFlush=write(draft);releaseFirst();await first;await sendFlush;
  assert.deepEqual(saved,["existing","edited while older save is pending\ncorrect final","edited while older save is pending\ncorrect final"]);
  assert.equal(queued.size,0);
});

// Exercise the production browser runtime through the controller boundary with
// a synthetic peer and clock. No actual microphone, cloud calls or long waits.
async function browserFixture(t:TestContext, options: {connecting?:boolean; closeDuringSetup?:boolean; pauseAt?:"permission"|"offer"|"native"|"remote"; rejectNative?:boolean; pollPending?:boolean; tailPause?:"resume"|"replace"; tailReject?:boolean; closePending?:boolean; closeSendReject?:boolean; observerThrows?:boolean; diagnostic?:boolean} = {}) {
  t.mock.timers.enable({apis:["setTimeout","setInterval","Date"]});
  const descriptors=new Map<string,PropertyDescriptor|undefined>();
  const replace=(name:string,value:unknown)=>{descriptors.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{configurable:true,value});};
  t.after(()=>{for(const[name,descriptor]of descriptors){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else Reflect.deleteProperty(globalThis,name);}});
  let release:()=>void=()=>{};
  const gate=new Promise<void>(resolve=>{release=resolve;});
  let trackStopped=false;
  let peerClosed=false;
  let nativeActive=false;
  let captureRequests=0;
  let audioCreated=0,audioClosed=false,zeroTrackStopped=false,sourceStopped=false;
  let zeroOffset=1;
  const replacements:unknown[]=[];
  const zeroTrack={kind:"audio",generated:true,stop:()=>{zeroTrackStopped=true;}};
  let senderTrack:unknown;
  const sender={replaceTrack:async(next:unknown)=>{
    replacements.push(next);
    if(options.tailPause==="replace")await gate;
    senderTrack=next;
  }};
  class FakeAudioContext {
    state="suspended";
    constructor(){audioCreated++;}
    createMediaStreamDestination(){return {stream:{getAudioTracks:()=>[zeroTrack],getTracks:()=>[zeroTrack]}};}
    createConstantSource(){return {offset:{get value(){return zeroOffset;},set value(value:number){zeroOffset=value;}},
      connect(){},disconnect(){},start(){},stop(){sourceStopped=true;}};}
    async resume(){if(options.tailPause==="resume")await gate;if(options.tailReject)throw new Error("synthetic resume failure");this.state="running";}
    async close(){audioClosed=true;this.state="closed";if(options.closePending)await gate;}
  }
  const sent:unknown[]=[];
  const nativeEvents:Array<{inputId:string;kind:string}>=[];
  let connection:FakePeer;
  let channel:FakeChannel;
  class FakeChannel extends EventTarget {
    send(text:string){if(options.closeSendReject)throw new Error("synthetic closed channel");sent.push(JSON.parse(text));}
    readyState=options.connecting?"connecting":"open";onmessage:((event:{data:string})=>void)|null=null;onclose:(()=>void)|null=null;onopen:(()=>void)|null=null;
  }
  class FakePeer {
    constructor(){connection=this;}
    connectionState="connected";onconnectionstatechange:(()=>void)|null=null;
    addTrack(track:unknown){senderTrack=track;return sender;}createDataChannel(){channel=new FakeChannel();return channel;}
    async createOffer(){if(options.pauseAt==="offer")await gate;return {sdp:"synthetic-offer"};}async setLocalDescription(){}async setRemoteDescription(){if(options.pauseAt==="remote")await gate;if(options.closeDuringSetup)channel.onclose?.();}
    iceConnectionState="checking";iceGatheringState="complete";
    async getStats(){return new Map([["private-candidate-id",{type:"candidate-pair",state:"in-progress",requestsSent:3,responsesReceived:0,localCandidateId:"private-local-id"}]]);}
    close(){peerClosed=true;}
  }
  const track={stop:()=>{trackStopped=true;}};
  replace("navigator",{mediaDevices:{getUserMedia:async()=>{captureRequests++;if(options.pauseAt==="permission")await gate;return {getTracks:()=>[track],getAudioTracks:()=>[track]};}}});
  replace("RTCPeerConnection",FakePeer);
  replace("AudioContext",FakeAudioContext);
  replace("performance",{now:()=>Date.now()});
  let runtimeInputId="";
  const calls:string[]=[];
  const diagnostics:Array<Readonly<Record<string,boolean|string>>>=[];
  const runtime=new BrowserCodexDictationRuntime(async<T>(command:string,args:Record<string,unknown>):Promise<T>=>{
    calls.push(command);runtimeInputId=String(args.inputId);
    if(command==="collaboration_dictation_start" && options.pauseAt==="native") { await gate; if(options.rejectNative)throw new Error("dictation-quota-exceeded"); }
    if(command==="collaboration_dictation_poll" && options.pollPending) { await gate; throw new Error("dictation-connection-lost"); }
    if(command==="collaboration_dictation_start")nativeActive=true;
    if(command==="collaboration_dictation_stop")nativeActive=false;
    return (command==="collaboration_dictation_start"?{inputId:args.inputId,sdp:"synthetic-answer"}:command==="collaboration_dictation_poll"?nativeEvents.splice(0):[]) as T;
  }, options.diagnostic ? async()=>({stream:await navigator.mediaDevices.getUserMedia({audio:true,video:false}),diagnostic:true}) : undefined,
  value=>{diagnostics.push(value);if(options.observerThrows)throw new Error("Synthetic diagnostic observer failure");});
  let draft="existing";
  let incomplete=0;
  const failures:string[]=[];
  const controller=new CodexCollaborationVoiceInputController(runtime,{onState:()=>{},onTranscript:(_,text)=>{draft=appendVoiceTranscript(draft,text);},onFailure:(_,failure)=>{failures.push(failure);},onCancel:()=>{},onIncomplete:()=>{incomplete++;}});
  const started=controller.start(target);
  if(options.connecting || options.pauseAt)await tick();else await started;
  return {controller,calls,started,release,failures,sent,diagnostics,
    nativeClosed:()=>nativeEvents.push({inputId:runtimeInputId,kind:"closed"}),
    disconnect:()=>{connection.connectionState="failed";connection.onconnectionstatechange?.();},captureRequests:()=>captureRequests,
    audioCreated:()=>audioCreated,audioClosed:()=>audioClosed,zeroTrackStopped:()=>zeroTrackStopped,
    sourceStopped:()=>sourceStopped,zeroOffset:()=>zeroOffset,replacements:()=>replacements,senderTrack:()=>senderTrack,
    nativeActive:()=>nativeActive,close:()=>channel.onclose?.(),openListener:()=>channel.onopen,emit:(value:unknown)=>channel.onmessage?.({data:JSON.stringify(value)}),draft:()=>draft,incomplete:()=>incomplete,trackStopped:()=>trackStopped,peerClosed:()=>peerClosed};
}

test("synthetic diagnostics distinguish ICE checks without responses before the unchanged connection deadline",async t=>{
  const f=await browserFixture(t,{connecting:true,diagnostic:true});
  t.mock.timers.tick(14_000);await tick();
  const result=Object.assign({},...f.diagnostics);
  assert.equal(result.icePairPresent,true);assert.equal(result.icePairChecking,true);
  assert.equal(result.iceRequestsSent,true);assert.equal(result.iceResponsesReceived,false);
  assert.equal(result.iceConnectionState,"checking");
  assert.ok(!JSON.stringify(result).includes("private-candidate"));
  assert.equal(f.peerClosed(),false);
  t.mock.timers.tick(1_000);await f.started;
  assert.equal(f.controller.state,"idle");assert.equal(f.peerClosed(),true);
  assert.deepEqual(f.failures,["connection-failed"]);
});

test("diagnostic observer failures cannot change dictation capture or finalization",async t=>{
  const f=await browserFixture(t,{observerThrows:true});
  assert.equal(f.controller.state,"recording");
  f.emit(timedPreview("p","received",0,50));f.controller.stop();await tick();
  t.mock.timers.tick(1_000);await tick();
  f.emit(timedFinal("turn","final text",0,50));f.emit({type:"session.closed"});
  t.mock.timers.tick(0);await tick();
  assert.equal(f.draft(),"existing\nfinal text");
  assert.equal(f.controller.state,"idle");
  assert.equal(f.incomplete(),0);assert.deepEqual(f.failures,[]);
});


test("Stop requests the observed v3 close after zero-audio grace and accepts final then raw terminal",async t=>{
  const f=await browserFixture(t);
  f.emit(timedPreview("p","uncorrected",0,50));f.controller.stop();await tick();
  assert.equal(f.trackStopped(),true);assert.deepEqual(f.sent,[]);
  t.mock.timers.tick(999);await tick();assert.deepEqual(f.sent,[]);
  t.mock.timers.tick(1);await tick();assert.deepEqual(f.sent,[{type:"session.close"}]);
  f.emit(timedFinal("turn","correct final",0,50));f.emit(timedFinal("turn","corrected final",0,50));
  f.emit({type:"session.closed"});
  t.mock.timers.tick(0);await tick();
  assert.equal(f.draft(),"existing\ncorrected final");assert.equal(f.incomplete(),0);assert.deepEqual(f.failures,[]);
  assert.equal(f.zeroTrackStopped(),true);assert.equal(f.peerClosed(),true);assert.equal(f.nativeActive(),false);
});

for(const metadata of [
  {error:{code:"private-provider-detail",message:"private transcript detail"}},
  {failure:"private-provider-detail"},
  {reason:"close_requested"},
  {reason:"client_request",error:{code:"provider_failure"}},
  {reason:"client_request",failure:"provider_failure"},
  {reason:"server_error"},
  {reason:"quota_exceeded"},
  {reason:{code:"unrecognized"}},
  {reason:37},
] as const)test(`failure-bearing requested terminal ${JSON.stringify(Object.keys(metadata))} cannot acknowledge complete input`,async t=>{
  const f=await browserFixture(t);f.emit(timedPreview("p","received",0,50));f.controller.stop();await tick();
  t.mock.timers.tick(1_000);await tick();f.emit(timedFinal("turn","correct final",0,50));
  f.emit({type:"session.closed",...metadata});t.mock.timers.tick(0);await tick();
  assert.equal(f.draft(),"existing\ncorrect final");assert.equal(f.incomplete(),1);
  assert.deepEqual(f.failures,["service-failed"],"raw provider failure details never reach UI");
  assert.equal(f.zeroTrackStopped(),true);assert.equal(f.audioClosed(),true);assert.equal(f.peerClosed(),true);
});

for(const reason of [undefined,null,"","client_request"] as const)test(`requested terminal allows only empty or allowlisted close reason ${String(reason)}`,async t=>{
  const f=await browserFixture(t);f.emit(timedPreview("p","received",0,50));f.controller.stop();await tick();
  t.mock.timers.tick(1_000);await tick();f.emit(timedFinal("turn","correct final",0,50));
  f.emit({type:"session.closed",reason});t.mock.timers.tick(0);await tick();
  assert.equal(f.draft(),"existing\ncorrect final");assert.equal(f.incomplete(),0);assert.deepEqual(f.failures,[]);
});

test("native close before queued data-channel final cannot terminate expected close collection",async t=>{
  const f=await browserFixture(t);f.emit(timedPreview("p","received",0,50));f.controller.navigate();await tick();
  t.mock.timers.tick(1_000);await tick();f.nativeClosed();t.mock.timers.tick(200);await tick();
  assert.equal(f.controller.state,"transcribing");assert.equal(f.peerClosed(),false);assert.deepEqual(f.failures,[]);
  f.emit(timedFinal("turn","correct final",0,50));f.emit({type:"session.closed"});
  t.mock.timers.tick(0);await tick();
  assert.equal(f.draft(),"existing\ncorrect final");assert.equal(f.incomplete(),0);
});

test("expected terminal without a new final preserves previews and remains incomplete",async t=>{
  const f=await browserFixture(t);f.emit(timedPreview("p","received ending",0,50));f.controller.stop();await tick();
  t.mock.timers.tick(1_000);await tick();f.emit({type:"session.closed"});t.mock.timers.tick(0);await tick();
  assert.equal(f.draft(),`existing\n${recovered("received ending")}`);assert.equal(f.incomplete(),1);assert.deepEqual(f.failures,[]);
});

test("a final queued in the raw-terminal turn is retained before cleanup",async t=>{
  const f=await browserFixture(t);f.emit(timedPreview("p","received",0,50));f.controller.stop();await tick();
  t.mock.timers.tick(1_000);await tick();f.emit({type:"session.closed"});
  f.emit(timedFinal("turn","queued final",0,50));t.mock.timers.tick(0);await tick();
  assert.equal(f.draft(),"existing\nqueued final");assert.equal(f.incomplete(),0);assert.deepEqual(f.failures,[]);
});

test("a final without a raw terminal never claims complete drain",async t=>{
  const f=await browserFixture(t);f.controller.stop();await tick();t.mock.timers.tick(1_000);await tick();
  f.emit(timedFinal("turn","correct final",0,50));t.mock.timers.tick(9_000);await tick();
  assert.equal(f.draft(),"existing\ncorrect final");assert.equal(f.incomplete(),1);assert.equal(f.peerClosed(),true);
});

for(const failure of ["send","disconnect"] as const)test(`close-drain ${failure} failure releases generated audio and keeps received text`,async t=>{
  const f=await browserFixture(t,{closeSendReject:failure==="send"});
  f.emit(timedPreview("p","received",0,50));f.controller.stop();await tick();t.mock.timers.tick(1_000);await tick();
  if(failure==="disconnect")f.disconnect();await tick();
  assert.equal(f.draft(),`existing\n${recovered("received")}`);assert.equal(f.incomplete(),1);
  assert.deepEqual(f.failures,["connection-failed"]);assert.equal(f.zeroTrackStopped(),true);assert.equal(f.audioClosed(),true);assert.equal(f.peerClosed(),true);
});

test("manual stop releases the real microphone immediately and sends generated zeros for at most ten seconds",async t=>{
  const f=await browserFixture(t);
  t.mock.timers.tick(121_000);await tick();
  assert.equal(f.controller.state,"recording");assert.equal(f.audioCreated(),0);
  f.emit(timedPreview("tail","uncorrected ending",0,50));
  f.controller.stop();
  assert.equal(f.trackStopped(),true,"capture releases before asynchronous tail setup");
  await tick();
  assert.equal(f.audioCreated(),1);assert.equal(f.zeroOffset(),0);
  assert.equal(f.replacements().length,1);assert.equal((f.senderTrack() as any).generated,true);
  assert.equal(f.captureRequests(),1,"generated silence never reacquires the microphone");
  f.emit(timedFinal("tail","correct ending",0,50));f.emit(timedFinal("tail","corrected ending",0,50));
  t.mock.timers.tick(9_999);await tick();
  assert.equal(f.controller.state,"transcribing");assert.equal(f.zeroTrackStopped(),false);
  t.mock.timers.tick(1);await tick();
  assert.equal(f.draft(),"existing\ncorrected ending");assert.equal(f.incomplete(),1);
  assert.equal(f.zeroTrackStopped(),true);assert.equal(f.sourceStopped(),true);assert.equal(f.audioClosed(),true);
  assert.equal(f.peerClosed(),true);assert.equal(f.controller.state,"idle");
});

for(const tailPause of ["resume","replace"] as const)test(`cancel while generated-tail ${tailPause} is pending releases everything and late settlement cannot restart audio`,async t=>{
  const f=await browserFixture(t,{tailPause});
  f.controller.stop();await tick();
  assert.equal(f.trackStopped(),true);assert.equal(f.audioCreated(),1);
  f.controller.cancel();await tick();
  assert.equal(f.zeroTrackStopped(),true);assert.equal(f.audioClosed(),true);assert.equal(f.peerClosed(),true);
  f.release();await tick();
  assert.equal(f.zeroTrackStopped(),true);assert.equal(f.sourceStopped(),true);
  assert.equal(f.replacements().length,tailPause==="resume"?0:1);
  assert.equal(f.captureRequests(),1);assert.equal(f.draft(),"existing");assert.equal(f.controller.state,"idle");
  t.mock.timers.tick(10_000);await tick();assert.deepEqual(f.sent,[],"cancel never sends session.close");
});

for(const tailPause of ["resume","replace"] as const)test(`a never-settling ${tailPause} and context close cannot extend the ten-second drain`,async t=>{
  const f=await browserFixture(t,{tailPause,closePending:true});
  f.emit(timedPreview("p","received ending",0,50));
  f.controller.stop();await tick();
  t.mock.timers.tick(10_000);await tick();
  assert.equal(f.controller.state,"idle");assert.equal(f.trackStopped(),true);
  assert.equal(f.zeroTrackStopped(),true);assert.equal(f.audioClosed(),true);assert.equal(f.peerClosed(),true);
  assert.equal(f.draft(),`existing\n${recovered("received ending")}`);assert.equal(f.incomplete(),1);
  f.release();await tick();
  assert.equal(f.replacements().length,tailPause==="resume"?0:1);assert.equal(f.captureRequests(),1);
  assert.deepEqual(f.sent,[{type:"session.close"}],"pending setup never blocks bounded close");
});

test("navigation uses generated tail on the original target while service failure releases it immediately",async t=>{
  const f=await browserFixture(t);
  f.emit(timedPreview("p","received ending",0,50));f.controller.navigate();await tick();
  assert.equal(f.trackStopped(),true);assert.equal(f.audioCreated(),1);
  f.emit({type:"session.closed"});await tick();
  assert.equal(f.zeroTrackStopped(),true);assert.equal(f.audioClosed(),true);assert.equal(f.peerClosed(),true);
  assert.equal(f.draft(),`existing\n${recovered("received ending")}`);assert.equal(f.incomplete(),1);
  assert.deepEqual(f.failures,["service-failed"]);
});

for(const end of ["cancel","close"] as const)test(`${end} while recording never starts generated-tail audio`,async t=>{
  const f=await browserFixture(t);f.controller[end]();await tick();
  assert.equal(f.trackStopped(),true);assert.equal(f.peerClosed(),true);assert.equal(f.audioCreated(),0);
});

test("failed generated-audio setup remains incomplete even if a user final arrives",async t=>{
  const f=await browserFixture(t,{tailReject:true});
  f.emit(timedPreview("p","received ending",0,50));f.controller.stop();await tick();
  f.emit(timedFinal("turn","correct ending",0,50));
  t.mock.timers.tick(10_000);await tick();
  assert.equal(f.draft(),"existing\ncorrect ending");assert.equal(f.incomplete(),1);
  assert.equal(f.zeroTrackStopped(),true);assert.equal(f.audioClosed(),true);assert.equal(f.peerClosed(),true);
});

test("production capture continues beyond two minutes and only manual stop starts bounded finalization",async t=>{
  const f=await browserFixture(t);
  f.emit(final("opening","opening"));
  t.mock.timers.tick(121_000);await tick();
  assert.equal(f.controller.state,"recording");assert.equal(f.trackStopped(),false);
  f.emit(final("middle","middle"));f.controller.stop();
  assert.equal(f.trackStopped(),true);assert.equal(f.peerClosed(),false);
  f.emit(preview("tail","ending"));f.emit(final("tail","ending corrected"));
  t.mock.timers.tick(10_000);await tick();
  assert.equal(f.draft(),`existing\nopening\nmiddle\nending corrected\n${recovered("ending")}`);assert.equal(f.incomplete(),1);
  assert.equal(f.peerClosed(),true);assert.equal(f.calls.filter(c=>c==="collaboration_dictation_stop").length,1);
});

test("production runtime uses interval coverage while retaining the independent post-stop final gate",async t=>{
  const f=await browserFixture(t);
  f.emit(timedPreview("p","uncorrected",0,50));
  f.controller.stop();await tick();f.emit(timedFinal("turn","correct final",0,50));
  t.mock.timers.tick(10_000);await tick();
  assert.equal(f.draft(),"existing\ncorrect final");assert.equal(f.incomplete(),1);
  assert.equal(f.peerClosed(),true);assert.equal(f.trackStopped(),true);
});

test("covered previews cannot turn a duplicate pre-stop final into a tail acknowledgement",async t=>{
  const f=await browserFixture(t);
  f.emit(timedPreview("p","uncorrected",0,50));f.emit(timedFinal("turn","correct final",0,50));
  f.controller.stop();f.emit(timedFinal("turn","correct final",0,50));
  t.mock.timers.tick(10_000);await tick();
  assert.equal(f.draft(),"existing\ncorrect final");assert.equal(f.incomplete(),1);
});

test("production runtime never acknowledges an unpaired newer preview from a delayed final",async t=>{
  const f=await browserFixture(t);
  f.emit(preview("preview-a","A preview "));f.emit(preview("preview-b","newer B preview"));
  f.controller.stop();f.emit(final("delayed-a","correct A final"));
  t.mock.timers.tick(10_000);await tick();
  assert.equal(f.draft(),`existing\ncorrect A final\n${recovered("A preview \nnewer B preview")}`);
  assert.equal(f.incomplete(),1);assert.equal(f.peerClosed(),true);
});

test("duplicated pre-stop final cannot falsely acknowledge a new tail",async t=>{
  const f=await browserFixture(t);
  f.emit(final("opening","opening"));f.emit(preview("tail","unconfirmed ending"));f.controller.stop();
  f.emit(final("opening","opening"));
  t.mock.timers.tick(10_000);await tick();
  assert.equal(f.draft(),`existing\nopening\n${recovered("unconfirmed ending")}`);assert.equal(f.incomplete(),1);assert.equal(f.peerClosed(),true);
});

test("stop without a new final remains incomplete even when no preview has arrived for the tail",async t=>{
  const f=await browserFixture(t);
  f.emit(final("opening","opening"));f.controller.stop();t.mock.timers.tick(10_000);await tick();
  assert.equal(f.draft(),"existing\nopening");assert.equal(f.incomplete(),1);
});


test("channel failure while connecting rejects startup promptly and removes the open listener",async t=>{
  const f=await browserFixture(t,{connecting:true});
  assert.equal(f.controller.state,"connecting");assert.equal(typeof f.openListener(),"function");
  f.close();await f.started;
  assert.equal(f.controller.state,"idle");assert.equal(f.openListener(),null);
  assert.equal(f.trackStopped(),true);assert.equal(f.peerClosed(),true);
  t.mock.timers.tick(15_000);await tick();assert.equal(f.controller.state,"idle");
});

test("a channel already closed during SDP setup never waits for a future abort event",async t=>{
  const f=await browserFixture(t,{closeDuringSetup:true});
  assert.equal(f.controller.state,"idle");assert.equal(f.trackStopped(),true);assert.equal(f.peerClosed(),true);
  assert.equal(f.calls.filter(c=>c==="collaboration_dictation_stop").length,1);
});

for (const terminate of ["navigate", "cancel"] as const) for (const pauseAt of ["permission", "offer", "native", "remote"] as const) {
  test(`${terminate} cancels pending ${pauseAt} and late completion cannot restart capture`, async t => {
    const f=await browserFixture(t,{pauseAt});
    assert.notEqual(f.controller.state,"idle");
    f.controller[terminate]();
    assert.equal(f.controller.state,"idle");
    f.release();await f.started;
    assert.equal(f.trackStopped(),true);assert.equal(f.draft(),"existing");
    assert.deepEqual(f.failures,[]);
    if(pauseAt!=="permission")assert.equal(f.peerClosed(),true);
    assert.equal(f.calls.filter(c=>c==="collaboration_dictation_start").length,pauseAt==="native"||pauseAt==="remote"?1:0);
    assert.equal(f.calls.filter(c=>c==="collaboration_dictation_stop").length,pauseAt==="native"?2:pauseAt==="remote"?1:0);
    assert.equal(f.nativeActive(),false, "a stop that won before start must be repeated after start settles");
  });
}

test("cancel while native setup later rejects still releases its temporary input",async t=>{
  const f=await browserFixture(t,{pauseAt:"native",rejectNative:true});
  f.controller.cancel();f.release();await f.started;
  assert.equal(f.trackStopped(),true);assert.equal(f.peerClosed(),true);
  assert.equal(f.calls.filter(c=>c==="collaboration_dictation_stop").length,2);
  assert.deepEqual(f.failures,[]);assert.equal(f.nativeActive(),false);
});

for (const [code,category] of [["session_expired","login-required"],["insufficient_quota","quota-exceeded"],["dictation-service-ended","service-failed"],["dictation-connection-lost","connection-failed"]]) {
  test(`${category} preserves partial text with a specific failure and incomplete status`,async()=>{
    const f=fixture();await f.controller.start(target);
    f.emit(preview("partial","received words"));
    f.deliver({inputId:"expired",kind:"failed",failure:code});
    // Use the production parser's error code path for the active input.
    f.emit({type:"error",error:{code}});
    assert.equal(f.draft(),`typed before dictation\n${recovered("received words")}`);
    assert.deepEqual(f.failures,[category]);assert.equal(f.incomplete(),1);
    assert.equal(f.released(),true);
    f.controller.stop();f.emit(final("late","discard"));
    assert.equal(f.transcripts.length,1);assert.equal(f.controller.state,"idle");
  });
}

test("session/date/Today navigation finalizes only the immutable original target and latest original draft",async()=>{
  const original={sessionId:"old-session",targetDate:"2026-10-03"};
  const next={sessionId:"new-session",targetDate:"2026-10-04"};
  let visible={...original};
  const drafts=new Map([[JSON.stringify(original),"old draft"],[JSON.stringify(next),"new draft"]]);
  const saved:Array<{owner:typeof original;text:string}>=[];
  let emit:(event:CodexDictationEvent)=>void=()=>{};let id="";
  let complete:(result:{incomplete:boolean})=>void=()=>{};let stopped=0;
  const controller=new CodexCollaborationVoiceInputController({start:async(inputId,onEvent)=>{
    id=inputId;emit=onEvent;
    return {stopCapture:()=>{stopped++;},cancel:async()=>{},finalize:()=>new Promise(resolve=>{complete=resolve;})};
  }},{onState:()=>{},onCancel:()=>{},onFailure:()=>assert.fail("unexpected failure"),onTranscript:(owner,text)=>{
    const key=JSON.stringify(owner);
    const aggregate=beginVoiceTranscriptSave(owner,text,drafts.get(key)??"",async(target,text)=>{saved.push({owner:target,text});});
    drafts.set(key,aggregate.draft);
  }});
  await controller.start(visible);
  // A lived-day change mutates the caller's target, but never the input owner.
  visible.targetDate="2026-10-04";visible={...next};
  controller.navigate();controller.navigate();assert.equal(stopped,1);
  drafts.set(JSON.stringify(original),"latest original edit");
  emit({inputId:id,kind:"final",role:"user",itemId:"tail",text:"received tail"});
  complete({incomplete:false});await tick();
  assert.deepEqual(saved,[{owner:original,text:"latest original edit\nreceived tail"}]);
  assert.equal(drafts.get(JSON.stringify(next)),"new draft");
  assert.deepEqual(visible,next);
});

test("close snapshots received text once, releases immediately, and permits a fresh input after reopen",async t=>{
  const f=await browserFixture(t);
  f.emit(preview("p","received before close"));f.controller.stop();f.controller.close();f.controller.close();
  assert.equal(f.trackStopped(),true);assert.equal(f.peerClosed(),true);assert.equal(f.controller.state,"idle");
  assert.equal(f.draft(),`existing\n${recovered("received before close")}`);assert.equal(f.incomplete(),1);
  f.emit(final("late","not received before close"));t.mock.timers.tick(10_000);await tick();
  assert.equal(f.draft(),`existing\n${recovered("received before close")}`);
  await f.controller.start(target);assert.equal(f.controller.state,"recording");f.controller.cancel();
  assert.equal(f.calls.filter(c=>c==="collaboration_dictation_start").length,2);
});

test("a late in-flight poll failure after close cannot overwrite saved input status",async t=>{
  const f=await browserFixture(t,{pollPending:true});
  f.emit(preview("p","received"));t.mock.timers.tick(200);await tick();
  f.controller.close();f.release();await tick();
  assert.equal(f.draft(),`existing\n${recovered("received")}`);assert.deepEqual(f.failures,[]);assert.equal(f.incomplete(),1);
});

test("failed original-target persistence keeps the controller aggregate editable in memory",async()=>{
  let memory="latest original edit";const persisted="existing saved draft";
  let saveFailed=false;let saved:Promise<unknown>|undefined;
  let emit:(event:CodexDictationEvent)=>void=()=>{};let id="";
  const controller=new CodexCollaborationVoiceInputController({start:async(inputId,onEvent)=>{
    id=inputId;emit=onEvent;
    return {stopCapture:()=>{},cancel:async()=>{},finalize:async()=>({incomplete:false})};
  }},{onState:()=>{},onCancel:()=>{},onFailure:()=>assert.fail("unexpected failure"),onTranscript:(owner,text)=>{
    const save=beginVoiceTranscriptSave(owner,text,memory,async()=>{throw new Error("synthetic disk failure");});
    memory=save.draft;saved=save.saved.catch(()=>{saveFailed=true;});
  }});
  await controller.start(target);
  emit({inputId:id,kind:"final",role:"user",itemId:"turn",text:"received"});
  controller.stop();await tick();await saved;
  assert.equal(memory,"latest original edit\nreceived");assert.equal(persisted,"existing saved draft");assert.equal(saveFailed,true);
});

for (const phase of ["recording", "transcribing"] as const) {
  test(`explicit cancellation during ${phase} discards all text and ignores delayed finalization`,async t=>{
    const f=await browserFixture(t);f.emit(preview("p","discard preview"));f.emit(final("turn","discard final"));
    if(phase==="transcribing")f.controller.stop();
    f.controller.cancel();f.controller.cancel();
    assert.equal(f.trackStopped(),true);assert.equal(f.peerClosed(),true);
    f.emit(final("late","discard"));t.mock.timers.tick(10_000);await tick();
    assert.equal(f.draft(),"existing");assert.equal(f.incomplete(),0);assert.deepEqual(f.failures,[]);
  });
}

test("production service close preserves partial text, reports incomplete failure and ends collection",async t=>{
  const f=await browserFixture(t);
  f.emit(preview("p","received before service close"));f.emit({type:"session.closed"});
  assert.equal(f.draft(),`existing\n${recovered("received before service close")}`);assert.deepEqual(f.failures,["service-failed"]);
  assert.equal(f.incomplete(),1);assert.equal(f.trackStopped(),true);assert.equal(f.peerClosed(),true);
  f.emit(final("late","discard"));t.mock.timers.tick(30_000);await tick();
  assert.equal(f.calls.filter(c=>c==="collaboration_dictation_start").length,1);
});

for (const outcome of ["success", "failure"] as const) {
  test(`manual send ${outcome} cannot erase dictation delivered while submit is pending`,async()=>{
    let draft="submitted snapshot";
    let resolve:()=>void=()=>{};
    const nativeCleared=new Promise<void>(r=>{resolve=r;});
    const submit=submitCollaborationDraftSnapshot(draft,()=>draft,async()=>{
      await nativeCleared;
      if(outcome==="failure")throw new Error("synthetic submit failure");
      return {message:"submitted snapshot"};
    });
    draft=appendVoiceTranscript(draft,"later dictation");
    const newest=draft;resolve();
    if(outcome==="success") {
      const acknowledged=await submit;
      draft=acknowledged.draft;
      assert.equal(acknowledged.result.message,"submitted snapshot");
    } else await assert.rejects(submit,/synthetic submit failure/);
    assert.equal(draft,newest);
  });
}
