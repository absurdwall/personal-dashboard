import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {registerHooks,stripTypeScriptTypes} from 'node:module';
// Load the complete production owner, transforming its constructor syntax only;
// no generated dist artifact or private-function extraction is involved.
const hook=registerHooks({
 resolve(specifier,context,next){return next(['./collaboration-dictation-fixture.js','./collaboration-dictation-runtime.js','./collaboration-dictation-transcript.js'].includes(specifier)?specifier.replace(/\.js$/,'.ts'):specifier,context);},
 load(url,context,next){if(url.endsWith('/frontend/collaboration-dictation-capture.ts'))return {format:'module',shortCircuit:true,source:stripTypeScriptTypes(readFileSync(new URL(url),'utf8'),{mode:'transform'})};return next(url,context);}
});
const {CollaborationDictationCapture}=await import('../../frontend/collaboration-dictation-capture.ts');
hook.deregister();
const identity={diagnosticVoiceFixture:true,diagnosticVoiceLocalMicrophonePreflight:true};

function fixture(t) {
 const originalNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 const originalAudio=Object.getOwnPropertyDescriptor(globalThis,'AudioContext');
 let captures=0,stops=0,claims=0,permissions=0,consumed=false;
 let permission=()=>Promise.resolve('authorized'),captureFailure=false;
 const reports=[],requests=[];
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async constraints=>{requests.push(constraints);captures++;if(captureFailure)throw Error('capture-unavailable');return {getTracks:()=>[{stop:()=>stops++}]};}}}});
 Object.defineProperty(globalThis,'AudioContext',{configurable:true,value:class {
  async decodeAudioData(){return {};}async resume(){}async close(){}
  createMediaStreamDestination(){return {stream:{getTracks:()=>[{stop(){}}]}};}
  createBufferSource(){return {connect(){},start(){},stop(){}};}
  createConstantSource(){return {offset:{value:0},connect(){},start(){},stop(){}};}
 }});
 t.after(()=>{if(originalNavigator)Object.defineProperty(globalThis,'navigator',originalNavigator);else delete globalThis.navigator;if(originalAudio)Object.defineProperty(globalThis,'AudioContext',originalAudio);else delete globalThis.AudioContext;});
 const invoke=async(command,args)=>{
  if(command==='collaboration_voice_gate_fixture')return [0];
  if(command==='collaboration_voice_gate_claim_microphone_preflight'){claims++;if(consumed)throw Error('capture-unavailable');consumed=true;return;}
  if(command==='collaboration_voice_gate_request_microphone'){permissions++;return permission();}
  if(command==='collaboration_voice_runtime_gate'){reports.push(args.result);return;}
  throw Error(command);
 };
 const owner=new CollaborationDictationCapture(invoke);owner.configure(identity);
 return {owner,invoke,reports,requests,failCapture:()=>{captureFailure=true;},permission:value=>{permission=value;},counts:()=>({captures,stops,claims,permissions})};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
for(const outcome of ['success','denied','cancel','capture failure'])test(`diagnostic preflight is consumed after ${outcome}, across reset and reconfigure`,async t=>{
 const f=fixture(t),abort=new AbortController();
 if(outcome==='capture failure')f.failCapture();
 if(outcome==='denied')f.permission(async()=>'denied');
 if(outcome==='cancel')f.permission(async()=>{abort.abort();return 'authorized';});
 if(outcome==='success')(await f.owner.capture(abort.signal)).release();
 else await assert.rejects(f.owner.capture(abort.signal));
 f.owner.resetReport();f.owner.configure({});f.owner.configure(identity);
 await assert.rejects(f.owner.capture(),/capture-unavailable/);
 await flush();
 assert.deepEqual(f.counts(),{captures:outcome==='success'||outcome==='capture failure'?1:0,stops:outcome==='success'?1:0,claims:1,permissions:1});
 assert.equal(f.reports.at(-1).localMicrophonePreflightRequested,false);
 assert.equal(f.reports.at(-1).localMicrophonePreflightStopped,false);
 // A new JS owner still cannot rearm the native process claim.
 const replacement=new CollaborationDictationCapture(f.invoke);replacement.configure(identity);
 await assert.rejects(replacement.capture(),/capture-unavailable/);
 assert.equal(f.counts().captures,outcome==='success'||outcome==='capture failure'?1:0);
 assert.equal(f.counts().permissions,1);
});
test('concurrent preflight attempts consume before awaiting permission',async t=>{
 const f=fixture(t);let release,requests=0;f.permission(()=>++requests===1?new Promise(resolve=>{release=resolve;}):Promise.resolve('authorized'));
 const first=f.owner.capture();await flush();
 try {await assert.rejects(f.owner.capture(),/capture-unavailable/);
 assert.equal(f.counts().permissions,1);assert.equal(f.counts().captures,0);}
 finally {release('authorized');(await first).release();}
 assert.deepEqual(f.counts(),{captures:1,stops:1,claims:1,permissions:1});
});
test('default diagnostic fixture and ordinary capture do not consume the preflight gate',async t=>{
 const f=fixture(t);f.owner.configure({diagnosticVoiceFixture:true});(await f.owner.capture()).release();
 f.owner.configure({});await f.owner.capture();
 assert.deepEqual(f.counts(),{captures:1,stops:0,claims:0,permissions:0});
 assert.deepEqual(f.requests,[{audio:true,video:false}]);
});

for(const mode of ['unavailable','denied'])test(`ordinary capture preserves ${mode} browser failure without consuming a diagnostic claim`,async t=>{
 const f=fixture(t);f.owner.configure({});
 const denied=new DOMException('private browser detail','NotAllowedError');
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:mode==='unavailable'?{}:{mediaDevices:{getUserMedia:async constraints=>{
  assert.deepEqual(constraints,{audio:true,video:false});throw denied;
 }}}});
 await assert.rejects(f.owner.capture(),mode==='unavailable'?/capture-unavailable/:error=>error===denied);
 assert.deepEqual(f.counts(),{captures:0,stops:0,claims:0,permissions:0});
});
