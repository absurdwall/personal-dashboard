import assert from "node:assert/strict";
import test from "node:test";
import { CodexCollaborationVoiceInputController } from "../../frontend/collaboration-dictation.ts";
import { parseCodexDictationEvent, type CodexDictationRuntime, type CodexDictationEvent } from "../../frontend/collaboration-dictation-runtime.ts";
import { appendVoiceTranscript } from "../../frontend/collaboration-voice.ts";

function fixture() {
  let deliver: (event:CodexDictationEvent)=>void=()=>{};
  let id="";
  let stopped=false;
  let released=false;
  let draft="typed before dictation";
  const states:string[]=[];
  const failures:string[]=[];
  const runtime:CodexDictationRuntime={start:async(inputId,onEvent)=>{
    id=inputId;deliver=onEvent;
    return {stopCapture:()=>{stopped=true;},finalize:async()=>{released=true;return {incomplete:false};},cancel:async()=>{released=true;}};
  }};
  const target={sessionId:"synthetic",targetDate:"2026-10-03"};
  const controller=new CodexCollaborationVoiceInputController(runtime,{
    onState:state=>states.push(state),
    onTranscript:(owner,text)=>{assert.deepEqual(owner,target);draft=appendVoiceTranscript(draft,text);},
    onFailure:(_,failure)=>failures.push(failure),onCancel:()=>{},
  });
  return {controller,target,states,failures,emit:(value:unknown)=>{const event=parseCodexDictationEvent(id,value);if(event)deliver(event);},draft:()=>draft,stopped:()=>stopped,released:()=>released};
}

test("Codex user final enters the editable original draft only after manual stop",async()=>{
  const f=fixture();
  await f.controller.start(f.target);
  f.emit({type:"input_transcript.added",item:{id:"preview",text:"provisional text"}});
  f.emit({type:"turn.done",turn:{id:"turn-a",role:"assistant",transcript:"assistant response"}});
  f.emit({type:"turn.done",turn:{id:"turn-user",role:"user",transcript:"correct final user text"}});
  assert.equal(f.draft(),"typed before dictation");
  assert.equal(f.controller.state,"recording");
  f.controller.stop();
  assert.equal(f.stopped(),true);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.draft(),"typed before dictation\ncorrect final user text");
  assert.equal(f.released(),true);
  assert.deepEqual(f.states,["requesting","recording","transcribing","idle"]);
});

test("cancel drops this input and ignores a late final without touching the old draft",async()=>{
  const f=fixture();await f.controller.start(f.target);
  f.emit({type:"turn.done",turn:{id:"user-a",role:"user",transcript:"discard"}});
  f.controller.cancel();
  f.emit({type:"turn.done",turn:{id:"user-late",role:"user",transcript:"late"}});
  assert.equal(f.draft(),"typed before dictation");
  assert.equal(f.released(),true);
  assert.equal(f.controller.state,"idle");
});

test("a final without a verified server turn identity fails visibly and preserves the old draft",async()=>{
  const f=fixture();await f.controller.start(f.target);
  f.emit({type:"turn.done",turn:{role:"user",transcript:"uncorrelated"}});
  assert.equal(f.draft(),"typed before dictation");
  assert.deepEqual(f.failures,["recognition-failed"]);
  assert.equal(f.released(),true);
});
