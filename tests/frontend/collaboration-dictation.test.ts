import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { CodexCollaborationVoiceInputController } from "../../frontend/collaboration-dictation.ts";
import { BrowserCodexDictationRuntime, parseCodexDictationEvent, type CodexDictationRuntime, type CodexDictationEvent } from "../../frontend/collaboration-dictation-runtime.ts";
import { appendVoiceTranscript, beginVoiceTranscriptSave, enqueueCollaborationDraftWrite } from "../../frontend/collaboration-voice.ts";

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

test("ordered user previews are replaced by corrected finals, preserving repetitions by identity",async()=>{
  const f=fixture();await f.controller.start(f.target);
  f.emit(preview("p1","provisional "));f.emit(preview("p1","provisional "));f.emit(preview("p2","text"));
  assert.equal(f.previews.at(-1),"provisional text");
  f.emit(final("assistant-a","assistant response","assistant"));
  f.emit(final("turn-1","correct final"));f.emit(final("turn-1","correct final"));
  f.emit(preview("p1","late old preview"));
  assert.equal(f.previews.at(-1),"correct final");
  f.emit(preview("p3","new provisional"));
  f.emit(final("turn-1","corrected final"));
  assert.equal(f.previews.at(-1),"corrected final\nnew provisional");
  f.emit(final("turn-2","corrected final"));
  assert.equal(f.draft(),"typed before dictation");
  f.controller.stop();f.complete();await tick();
  assert.deepEqual(f.transcripts,["corrected final\ncorrected final"]);
  assert.equal(f.previews.at(-1),"");
  assert.deepEqual(f.states,["requesting","connecting","recording","transcribing","idle"]);
  assert.equal(f.released(),true);
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
  assert.equal(f.draft(),"latest edited draft while finalizing\n开头 Personal Dashboard\nmiddle sentence\n最后几个字。");
  assert.equal(f.transcripts.length,1);assert.equal(f.incomplete(),0);
});

test("incomplete finalization preserves user previews and exposes incomplete status",async()=>{
  const f=fixture();await f.controller.start(f.target);
  f.emit(final("opening","opening"));f.emit(preview("tail","unfinished tail"));
  f.controller.stop();f.complete(true);await tick();
  assert.equal(f.draft(),"typed before dictation\nopening\nunfinished tail");
  assert.equal(f.incomplete(),1);assert.equal(f.released(),true);
});

test("service failure preserves received draft text without restarting or sending",async()=>{
  const f=fixture();await f.controller.start(f.target);
  f.emit(preview("tail","received words"));f.emit({type:"error"});f.emit(final("late","discard"));
  assert.equal(f.draft(),"typed before dictation\nreceived words");
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
  emit(preview("p","provisional"));emit(final("turn","correct final"));emit(final("turn","correct final"));
  controller.stop();resolveFinal({incomplete:false});await tick();
  const sendFlush=write(draft);releaseFirst();await first;await sendFlush;
  assert.deepEqual(saved,["existing","edited while older save is pending\ncorrect final","edited while older save is pending\ncorrect final"]);
  assert.equal(queued.size,0);
});

// Exercise the production browser runtime through the controller boundary with
// a synthetic peer and clock. No actual microphone, cloud calls or long waits.
async function browserFixture(t:TestContext, options: {connecting?:boolean; closeDuringSetup?:boolean} = {}) {
  t.mock.timers.enable({apis:["setTimeout","setInterval","Date"]});
  const descriptors=new Map<string,PropertyDescriptor|undefined>();
  const replace=(name:string,value:unknown)=>{descriptors.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{configurable:true,value});};
  t.after(()=>{for(const[name,descriptor]of descriptors){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else Reflect.deleteProperty(globalThis,name);}});
  let trackStopped=false;
  let peerClosed=false;
  let channel:FakeChannel;
  class FakeChannel extends EventTarget {
    readyState=options.connecting?"connecting":"open";onmessage:((event:{data:string})=>void)|null=null;onclose:(()=>void)|null=null;onopen:(()=>void)|null=null;
  }
  class FakePeer {
    connectionState="connected";onconnectionstatechange:(()=>void)|null=null;
    addTrack(){}createDataChannel(){channel=new FakeChannel();return channel;}
    async createOffer(){return {sdp:"synthetic-offer"};}async setLocalDescription(){}async setRemoteDescription(){if(options.closeDuringSetup)channel.onclose?.();}
    close(){peerClosed=true;}
  }
  const track={stop:()=>{trackStopped=true;}};
  replace("navigator",{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[track],getAudioTracks:()=>[track]})}});
  replace("RTCPeerConnection",FakePeer);
  const calls:string[]=[];
  const runtime=new BrowserCodexDictationRuntime(async<T>(command:string,args:Record<string,unknown>):Promise<T>=>{
    calls.push(command);
    return (command==="collaboration_dictation_start"?{inputId:args.inputId,sdp:"synthetic-answer"}:[]) as T;
  });
  let draft="existing";
  let incomplete=0;
  const controller=new CodexCollaborationVoiceInputController(runtime,{onState:()=>{},onTranscript:(_,text)=>{draft=appendVoiceTranscript(draft,text);},onFailure:()=>{},onCancel:()=>{},onIncomplete:()=>{incomplete++;}});
  const started=controller.start(target);
  if(options.connecting)await tick();else await started;
  return {controller,calls,started,close:()=>channel.onclose?.(),openListener:()=>channel.onopen,emit:(value:unknown)=>channel.onmessage?.({data:JSON.stringify(value)}),draft:()=>draft,incomplete:()=>incomplete,trackStopped:()=>trackStopped,peerClosed:()=>peerClosed};
}

test("production capture continues beyond two minutes and only manual stop starts bounded finalization",async t=>{
  const f=await browserFixture(t);
  f.emit(final("opening","opening"));
  t.mock.timers.tick(121_000);await tick();
  assert.equal(f.controller.state,"recording");assert.equal(f.trackStopped(),false);
  f.emit(final("middle","middle"));f.controller.stop();
  assert.equal(f.trackStopped(),true);assert.equal(f.peerClosed(),false);
  f.emit(preview("tail","ending"));f.emit(final("tail","ending corrected"));
  t.mock.timers.tick(4_000);await tick();
  assert.equal(f.draft(),"existing\nopening\nmiddle\nending corrected");assert.equal(f.incomplete(),0);
  assert.equal(f.peerClosed(),true);assert.equal(f.calls.filter(c=>c==="collaboration_dictation_stop").length,1);
});

test("duplicated pre-stop final cannot falsely acknowledge a new tail",async t=>{
  const f=await browserFixture(t);
  f.emit(final("opening","opening"));f.emit(preview("tail","unconfirmed ending"));f.controller.stop();
  f.emit(final("opening","opening"));
  t.mock.timers.tick(4_000);await tick();
  assert.equal(f.draft(),"existing\nopening\nunconfirmed ending");assert.equal(f.incomplete(),1);assert.equal(f.peerClosed(),true);
});

test("stop without a new final remains incomplete even when no preview has arrived for the tail",async t=>{
  const f=await browserFixture(t);
  f.emit(final("opening","opening"));f.controller.stop();t.mock.timers.tick(4_000);await tick();
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
