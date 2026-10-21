import assert from 'node:assert/strict';
import test from 'node:test';
import {probe} from './helpers/complete-page.ts';

// The full shipped page, voice controller, transcript assembler and browser runtime
// execute unchanged. Only public IPC and browser media/WebRTC are controlled.
const mediaBoundary = String.raw`
  const track={source:'physical',readyState:'live',stop(){this.readyState='ended';calls.push({command:'physical_track_stopped'});},onended:null};
  const otherPhysicalTrack={readyState:'live',stop(){this.readyState='ended';calls.push({command:'physical_track_stopped'});}};
  const stream={getTracks:()=>[track,otherPhysicalTrack],getAudioTracks:()=>[track]};
  const fixtureTrack={source:'fixture',readyState:'live',stop(){this.readyState='ended';},onended:null};
  const fixtureStream={getTracks:()=>[fixtureTrack],getAudioTracks:()=>[fixtureTrack]};
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{calls.push({command:'synthetic_microphone_capture',nativeAuthorized:window.nativePermissionGranted===true});if(window.mediaPermissionFailure)throw new DOMException('synthetic-private-error','NotAllowedError');if(window.holdMediaPermission)await new Promise(resolve=>{window.releaseMediaPermission=resolve;});return stream;}}});
  window.AudioContext=class {state='running';constructor(){calls.push({command:'audio_context_created'});}async decodeAudioData(){if(window.fixtureDecodeFailure)throw new DOMException('synthetic-private-error','OperationError');return {};}createBufferSource(){return {connect(){},start(){calls.push({command:'synthetic_fixture_started'});},stop(){}};}createMediaStreamDestination(){return {stream:fixtureStream};}
    createConstantSource(){return {offset:{value:0},connect(){},start(){},stop(){},disconnect(){}};}
    async resume(){}async close(){this.state='closed';}};
  window.RTCPeerConnection=class {
    constructor(){calls.push({command:'peer_created',physicalStopped:track.readyState==='ended'&&otherPhysicalTrack.readyState==='ended'});}
    connectionState='connected';channel={readyState:'open',onmessage:null,
      send(text){if(JSON.parse(text).type==='session.close')setTimeout(()=>{
        this.onmessage?.({data:JSON.stringify({type:'turn.done',turn:{id:'final-1',role:'user',transcript:'Synthetic final transcript 中文 '.repeat(16),start_ms:0,end_ms:1000}})});
        this.onmessage?.({data:JSON.stringify({type:'session.closed',reason:'client_request'})});
      },0);}};
    addTrack(track){calls.push({command:'peer_audio_source',source:track.source});return {replaceTrack:async()=>{}};}createDataChannel(){return this.channel;}
    async createOffer(){return {sdp:'synthetic'};}async setLocalDescription(){}async setRemoteDescription(){}close(){this.connectionState='closed';}
  };
  const realInvoke=window.__TAURI__.core.invoke;
  window.__TAURI__.core.invoke=async(command,args)=>{
    if(command==='collaboration_voice_gate_request_microphone'){calls.push({command});const result=window.nativePermissionResult??'authorized';window.nativePermissionGranted=result==='authorized';return result;}
    if(command==='collaboration_voice_runtime_gate'){calls.push({command,args});return;}
    if(command==='collaboration_dictation_start'){calls.push({command,args});return {inputId:args.inputId,sdp:'v=0\r\na=ice-lite\r\na=ice-options:trickle\r\na=candidate:synthetic-private-marker\r\n'};}
    if(command==='collaboration_dictation_poll')return [];
    if(command==='collaboration_dictation_stop'){calls.push({command,args});return;}
    if(command==='collaboration_save_draft'){calls.push({command,args});responses.collaboration_workspace.sessions[0].draft=args.draft;
      responses.collaboration_workspace.sessions[0].draftsByDate[args.targetDate]=args.draft;return structuredClone(responses.collaboration_workspace.sessions[0]);}
    return realInvoke(command,args);
  };
`;

const scenarios = [[830,758],[969,723],[1280,720]].flatMap(([width,height])=>['en','zh'].map(language=>({width,height,language,fixture:false,preflight:false})));
scenarios.push({width:969,height:723,language:'en',fixture:true,preflight:false});
scenarios.push({width:969,height:723,language:'en',fixture:true,preflight:true});
for (const {width,height,language,fixture,preflight} of scenarios) {
  test(`dictation completion keeps editable text and stable controls at ${width}x${height} ${language}${fixture?' diagnostic fixture':''}${preflight?' local permission preflight':''}`, {skip:process.platform!=='darwin'},()=>{
    const session={id:'composer',title:'Synthetic composer',createdDate:'2026-08-10',activityDates:['2026-08-10'],lastActivityAt:'2026-08-10T09:30:00-04:00',targetDate:'2026-08-10',runId:null,runState:'idle',progress:'',runtimeThreadId:null,taskToolAvailable:true,dailyPlanToolAvailable:true,dailyRecordToolAvailable:true,memoryToolAvailable:true,messages:[],taskOperations:[],memoryProposals:[],draft:'Keyboard text',draftsByDate:{'2026-08-10':'Keyboard text'}};
    const pane={state:'ready',message:'Synthetic context',items:[]};
    const result=probe(width,`
      document.title='opening collaboration';
      document.querySelector('[data-workspace-destination="collaboration"]').click();
      await until(()=>!document.querySelector('#collaboration-voice-start').disabled);
      document.title='voice ready';
      const input=document.querySelector('#collaboration-message-draft'),voice=document.querySelector('#collaboration-voice-start'),send=document.querySelector('#collaboration-send-message'),status=document.querySelector('#collaboration-voice-status'),controls=document.querySelector('.collaboration-voice-controls');
      const settle=async(f)=>{for(let n=0;n<2000;n++){if(f())return;await new Promise(r=>setTimeout(r,2));}throw Error('voice condition timed out');};
      // Open real saved-session history before measuring the conversation column.
      // ResizeObserver may otherwise apply the narrower column after the first sample.
      await until(()=>document.querySelectorAll('.collaboration-session-button').length===1);
      const historyToggle=document.querySelector('#collaboration-toggle-history');
      if(historyToggle.getAttribute('aria-expanded')!=='true')historyToggle.click();
      await until(()=>historyToggle.getAttribute('aria-expanded')==='true');
      await new Promise(resolve=>setTimeout(resolve,100));
      input.value='Keyboard text';input.dispatchEvent(new Event('input',{bubbles:true}));
      const keyboard={input:rect(input),controls:rect(controls),run:rect(document.querySelector('#collaboration-run-status'))};
      voice.click();await until(()=>status.dataset.state==='recording');document.title='recording';
      status.textContent=${JSON.stringify(language==='zh'?'正在处理很长的中文语音状态文字，请稍候，等待完整输入。'.repeat(7):'Processing a long English dictation status while preserving the editable message. '.repeat(7))};
      await new Promise(r=>setTimeout(r,20));
      const recording={input:rect(input),controls:rect(controls),voice:rect(voice),send:rect(send)};
      voice.click();await until(()=>status.dataset.state==='transcribing');document.title='stopping';
      await settle(()=>status.dataset.state==='idle');document.title='idle';
      input.focus();input.value+=' edited';input.dispatchEvent(new Event('input',{bubbles:true}));
      return JSON.stringify({nativePermissions:calls.filter(c=>c.command==='collaboration_voice_gate_request_microphone').length,nativeAuthorizedAtCapture:calls.find(c=>c.command==='synthetic_microphone_capture')?.nativeAuthorized,diagnostics:calls.filter(c=>c.command==='collaboration_voice_runtime_gate').at(-1)?.args.result??null,physicalStops:calls.filter(c=>c.command==='physical_track_stopped').length,peers:calls.filter(c=>c.command==='peer_created'),audioSources:calls.filter(c=>c.command==='peer_audio_source').map(c=>c.source),keyboard,recording,idle:{input:rect(input),controls:rect(controls),status:status.textContent,state:status.dataset.state,preview:document.querySelector('#collaboration-voice-preview').textContent,cancelHidden:document.querySelector('#collaboration-voice-cancel').hidden,value:input.value,disabled:input.disabled,run:rect(document.querySelector('#collaboration-run-status'))},fixtureStarts:calls.filter(c=>c.command==='synthetic_fixture_started').length,microphones:calls.filter(c=>c.command==='synthetic_microphone_capture').length,submits:calls.filter(c=>c.command==='collaboration_submit_message').length,starts:calls.filter(c=>c.command==='collaboration_dictation_start').length,stops:calls.filter(c=>c.command==='collaboration_dictation_stop').length,overflow:document.documentElement.scrollWidth>innerWidth,errors:window.probeErrors});
    `,true,height,{
      application_identity:{productName:'Synthetic Dashboard',diagnosticVoiceFixture:fixture,diagnosticVoiceLocalMicrophonePreflight:preflight},
      collaboration_voice_gate_fixture:[1,2,3],
      interface_language_preferences:{interfaceLanguage:language},
      collaboration_connection:{authenticated:true,authMode:'chatgpt',readOnlyTextTurnsAvailable:true,models:[],selectedModel:null,selectedReasoningEffort:null},
      collaboration_workspace:{date:'2026-08-10',vaultName:'Synthetic Vault',selectedModel:null,context:{date:'2026-08-10',vaultName:'Synthetic Vault',dailyRecord:pane,tasks:pane,habits:pane,taskRecords:[],taskLists:[]},memory:null,sessions:[session],activeRun:null,recoveryRequired:false},
    },mediaBoundary);
    assert.equal(result.idle.status,'');
    assert.equal(result.idle.preview,'');
    assert.equal(result.idle.state,'idle');
    assert.equal(result.idle.cancelHidden,true);
    assert.equal(result.idle.value,'Keyboard text\n'+'Synthetic final transcript 中文 '.repeat(16).trim()+' edited');
    assert.equal(result.idle.disabled,false);
    if(fixture){
      assert.ok(result.diagnostics);
      assert.equal(result.diagnostics.remoteAnswer,true);
      assert.equal(result.diagnostics.remoteDescriptionApplied,true);
      assert.equal(result.diagnostics.remoteHasCandidate,true);
      assert.equal(result.diagnostics.remoteIceLite,true);
      assert.equal(result.diagnostics.remoteTrickle,true);
      assert.ok(!JSON.stringify(result.diagnostics).includes('synthetic-private-marker'));
      assert.equal(result.diagnostics.dataChannelOpen,true);
      assert.equal(result.diagnostics.productionFinalizeReturned,true);
      assert.equal(result.diagnostics.productionIncomplete,false);
      assert.ok(Object.values(result.diagnostics).every(value=>typeof value==='boolean'||typeof value==='string'&&value.length<=120));
    }else assert.equal(result.diagnostics,null);
    assert.equal(result.fixtureStarts,fixture?1:0);
    assert.equal(result.microphones,fixture&&!preflight?0:1);
    assert.equal(result.nativePermissions,preflight?1:0);
    if(preflight){
      assert.equal(result.nativeAuthorizedAtCapture,true);
      assert.equal(result.physicalStops,2);
      assert.equal(result.peers[0].physicalStopped,true);
      assert.deepEqual(result.audioSources,['fixture']);
      assert.equal(result.diagnostics.localMicrophonePreflightRequested,true);
      assert.equal(result.diagnostics.localMicrophonePreflightStopped,true);
      assert.equal(result.diagnostics.microphone,false);
      assert.equal(result.diagnostics.cloudMicrophone,false);
    }
    assert.equal(result.submits,0);
    assert.equal(result.starts,1);
    assert.ok(result.stops>=1);
    for(const phase of ['keyboard','recording','idle']) {
      assert.ok(result[phase].input.width>=220,JSON.stringify(result));
      assert.ok(result[phase].input.bottom<=result[phase].controls.top+1||
        result[phase].input.right<=result[phase].controls.left+1,JSON.stringify(result));
    }
    assert.deepEqual(result.idle.run,result.keyboard.run,'dictation must not move the global run-status area');
    assert.ok(result.recording.voice.top>=0&&result.recording.voice.bottom<=height&&
      result.recording.send.top>=0&&result.recording.send.bottom<=height,JSON.stringify(result));
    if(width===830) console.log(`Composer ${width} ${language}: editor ${result.recording.input.width}px; controls ${result.recording.controls.width}px`);
    assert.ok(Math.abs(result.recording.controls.width-result.keyboard.controls.width)<1,JSON.stringify(result));
    assert.ok(Math.abs(result.idle.controls.width-result.keyboard.controls.width)<1,JSON.stringify(result));
    assert.ok(result.recording.voice.right<=width&&result.recording.send.right<=width);
    assert.equal(result.overflow,false);
    assert.deepEqual(result.errors,[]);
  });
}

for(const mode of ['native-denied','denied','decode-failed','cancelled']) {
  test(`local permission preflight ${mode} never sends physical audio or starts a cloud call`, {skip:process.platform!=='darwin'},()=>{
    const session={id:'preflight',title:'Synthetic preflight',createdDate:'2026-08-10',activityDates:['2026-08-10'],lastActivityAt:'2026-08-10T09:30:00-04:00',targetDate:'2026-08-10',runId:null,runState:'idle',progress:'',runtimeThreadId:null,taskToolAvailable:true,messages:[],taskOperations:[],memoryProposals:[],draft:'Keyboard text',draftsByDate:{'2026-08-10':'Keyboard text'}};
    const pane={state:'ready',message:'Synthetic context',items:[]};
    const result=probe(969,`
      document.querySelector('[data-workspace-destination="collaboration"]').click();
      await until(()=>!document.querySelector('#collaboration-voice-start').disabled);
      document.querySelector('#collaboration-voice-start').click();
      ${mode==='cancelled'?`await until(()=>window.releaseMediaPermission);document.querySelector('#collaboration-voice-cancel').click();window.releaseMediaPermission();`:''}
      await until(()=>calls.some(call=>call.command===${JSON.stringify(mode==='native-denied'?'collaboration_voice_gate_request_microphone':'synthetic_microphone_capture')}));
      await until(()=>document.querySelector('#collaboration-voice-status').dataset.state==='idle');
      await new Promise(resolve=>setTimeout(resolve,30));
      return JSON.stringify({status:document.querySelector('#collaboration-voice-status').textContent,draft:document.querySelector('#collaboration-message-draft').value,physicalStops:calls.filter(call=>call.command==='physical_track_stopped').length,peers:calls.filter(call=>call.command==='peer_created').length,starts:calls.filter(call=>call.command==='collaboration_dictation_start').length,sources:calls.filter(call=>call.command==='peer_audio_source'),microphones:calls.filter(call=>call.command==='synthetic_microphone_capture').length,audioContexts:calls.filter(call=>call.command==='audio_context_created').length,nativePermissions:calls.filter(call=>call.command==='collaboration_voice_gate_request_microphone').length,diagnostics:calls.filter(call=>call.command==='collaboration_voice_runtime_gate').at(-1)?.args.result,errors:window.probeErrors});
    `,true,723,{
      application_identity:{productName:'Synthetic Dashboard',diagnosticVoiceFixture:true,diagnosticVoiceLocalMicrophonePreflight:true},
      collaboration_voice_gate_fixture:[1,2,3],
      interface_language_preferences:{interfaceLanguage:'en'},
      collaboration_connection:{authenticated:true,authMode:'chatgpt',readOnlyTextTurnsAvailable:true,models:[],selectedModel:null,selectedReasoningEffort:null},
      collaboration_workspace:{date:'2026-08-10',vaultName:'Synthetic Vault',selectedModel:null,context:{date:'2026-08-10',vaultName:'Synthetic Vault',dailyRecord:pane,tasks:pane,habits:pane,taskRecords:[],taskLists:[]},memory:null,sessions:[session],activeRun:null,recoveryRequired:false},
    },mediaBoundary+`window.nativePermissionResult=${JSON.stringify(mode==='native-denied'?'denied':'authorized')};window.mediaPermissionFailure=${mode==='denied'};window.fixtureDecodeFailure=${mode==='decode-failed'};window.holdMediaPermission=${mode==='cancelled'};`);
    assert.equal(result.nativePermissions,1);
    assert.equal(result.microphones,mode==='native-denied'?0:1);
    assert.equal(result.physicalStops,['native-denied','denied'].includes(mode)?0:2);
    if(mode==='native-denied')assert.equal(result.audioContexts,0);
    assert.equal(result.peers,0);
    assert.equal(result.starts,0);
    assert.deepEqual(result.sources,[]);
    assert.equal(result.draft,'Keyboard text');
    assert.equal(result.diagnostics.localMicrophonePreflightRequested,true);
    assert.ok(!JSON.stringify(result.diagnostics).includes('synthetic-private-error'));
    if(mode!=='cancelled')assert.ok(result.status.length>0);
    assert.deepEqual(result.errors,[]);
  });
}
