import assert from 'node:assert/strict';
import test from 'node:test';
import {probe} from './helpers/complete-page.ts';

// The full shipped page, voice controller, transcript assembler and browser runtime
// execute unchanged. Only public IPC and browser media/WebRTC are controlled.
const mediaBoundary = `
  const track={readyState:'live',stop(){this.readyState='ended';},onended:null};
  const stream={getTracks:()=>[track],getAudioTracks:()=>[track]};
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{calls.push({command:'synthetic_microphone_capture'});return stream;}}});
  window.AudioContext=class {state='running';async decodeAudioData(){return {};}createBufferSource(){return {connect(){},start(){calls.push({command:'synthetic_fixture_started'});},stop(){}};}createMediaStreamDestination(){return {stream};}
    createConstantSource(){return {offset:{value:0},connect(){},start(){},stop(){},disconnect(){}};}
    async resume(){}async close(){this.state='closed';}};
  window.RTCPeerConnection=class {
    connectionState='connected';channel={readyState:'open',onmessage:null,
      send(text){if(JSON.parse(text).type==='session.close')setTimeout(()=>{
        this.onmessage?.({data:JSON.stringify({type:'turn.done',turn:{id:'final-1',role:'user',transcript:'Synthetic final transcript 中文 '.repeat(16),start_ms:0,end_ms:1000}})});
        this.onmessage?.({data:JSON.stringify({type:'session.closed',reason:'client_request'})});
      },0);}};
    addTrack(){return {replaceTrack:async()=>{}};}createDataChannel(){return this.channel;}
    async createOffer(){return {sdp:'synthetic'};}async setLocalDescription(){}async setRemoteDescription(){}close(){this.connectionState='closed';}
  };
  const realInvoke=window.__TAURI__.core.invoke;
  window.__TAURI__.core.invoke=async(command,args)=>{
    if(command==='collaboration_dictation_start'){calls.push({command,args});return {inputId:args.inputId,sdp:'synthetic'};}
    if(command==='collaboration_dictation_poll')return [];
    if(command==='collaboration_dictation_stop'){calls.push({command,args});return;}
    if(command==='collaboration_save_draft'){calls.push({command,args});responses.collaboration_workspace.sessions[0].draft=args.draft;
      responses.collaboration_workspace.sessions[0].draftsByDate[args.targetDate]=args.draft;return structuredClone(responses.collaboration_workspace.sessions[0]);}
    return realInvoke(command,args);
  };
`;

const scenarios = [[830,758],[969,723],[1280,720]].flatMap(([width,height])=>['en','zh'].map(language=>({width,height,language,fixture:false})));
scenarios.push({width:969,height:723,language:'en',fixture:true});
for (const {width,height,language,fixture} of scenarios) {
  test(`dictation completion keeps editable text and stable controls at ${width}x${height} ${language}${fixture?' diagnostic fixture':''}`, {skip:process.platform!=='darwin'},()=>{
    const session={id:'composer',title:'Synthetic composer',createdDate:'2026-08-10',activityDates:['2026-08-10'],lastActivityAt:'2026-08-10T09:30:00-04:00',targetDate:'2026-08-10',runId:null,runState:'idle',progress:'',runtimeThreadId:null,taskToolAvailable:true,dailyPlanToolAvailable:true,dailyRecordToolAvailable:true,memoryToolAvailable:true,messages:[],taskOperations:[],memoryProposals:[],draft:'Keyboard text',draftsByDate:{'2026-08-10':'Keyboard text'}};
    const pane={state:'ready',message:'Synthetic context',items:[]};
    const result=probe(width,`
      document.title='opening collaboration';
      document.querySelector('[data-workspace-destination="collaboration"]').click();
      await until(()=>!document.querySelector('#collaboration-voice-start').disabled);
      document.title='voice ready';
      const input=document.querySelector('#collaboration-message-draft'),voice=document.querySelector('#collaboration-voice-start'),send=document.querySelector('#collaboration-send-message'),status=document.querySelector('#collaboration-voice-status'),controls=document.querySelector('.collaboration-voice-controls');
      const settle=async(f)=>{for(let n=0;n<2000;n++){if(f())return;await new Promise(r=>setTimeout(r,2));}throw Error('voice condition timed out');};
      input.value='Keyboard text';input.dispatchEvent(new Event('input',{bubbles:true}));
      const keyboard={input:rect(input),controls:rect(controls),run:rect(document.querySelector('#collaboration-run-status'))};
      voice.click();await until(()=>status.dataset.state==='recording');document.title='recording';
      status.textContent=${JSON.stringify(language==='zh'?'正在处理很长的中文语音状态文字，请稍候，等待完整输入。'.repeat(7):'Processing a long English dictation status while preserving the editable message. '.repeat(7))};
      await new Promise(r=>setTimeout(r,20));
      const recording={input:rect(input),controls:rect(controls),voice:rect(voice),send:rect(send)};
      voice.click();await until(()=>status.dataset.state==='transcribing');document.title='stopping';
      await settle(()=>status.dataset.state==='idle');document.title='idle';
      input.focus();input.value+=' edited';input.dispatchEvent(new Event('input',{bubbles:true}));
      return JSON.stringify({keyboard,recording,idle:{input:rect(input),controls:rect(controls),status:status.textContent,state:status.dataset.state,preview:document.querySelector('#collaboration-voice-preview').textContent,cancelHidden:document.querySelector('#collaboration-voice-cancel').hidden,value:input.value,disabled:input.disabled,run:rect(document.querySelector('#collaboration-run-status'))},fixtureStarts:calls.filter(c=>c.command==='synthetic_fixture_started').length,microphones:calls.filter(c=>c.command==='synthetic_microphone_capture').length,submits:calls.filter(c=>c.command==='collaboration_submit_message').length,starts:calls.filter(c=>c.command==='collaboration_dictation_start').length,stops:calls.filter(c=>c.command==='collaboration_dictation_stop').length,overflow:document.documentElement.scrollWidth>innerWidth,errors:window.probeErrors});
    `,true,height,{
      application_identity:{productName:'Synthetic Dashboard',diagnosticVoiceFixture:fixture},
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
    assert.equal(result.fixtureStarts,fixture?1:0);
    assert.equal(result.microphones,fixture?0:1);
    assert.equal(result.submits,0);
    assert.equal(result.starts,1);
    assert.ok(result.stops>=1);
    assert.ok(result.recording.input.width>=220,JSON.stringify(result));
    assert.ok(Math.abs(result.recording.controls.width-result.keyboard.controls.width)<1,JSON.stringify(result));
    assert.ok(Math.abs(result.idle.controls.width-result.keyboard.controls.width)<1,JSON.stringify(result));
    assert.ok(result.recording.voice.right<=width&&result.recording.send.right<=width);
    assert.equal(result.overflow,false);
    assert.deepEqual(result.errors,[]);
  });
}
