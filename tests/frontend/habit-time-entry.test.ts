import assert from 'node:assert/strict';
import test from 'node:test';
import {probe} from './helpers/complete-page.ts';

const canonicalBoundary = String.raw`
  const clockCoordinates={'01:50':110,'02:00':120,'07:10':430,'08:20':500,'08:40':520,'08:45':525,'07:30':450,'07:55':475};
  let sleepState={targetBinding:'sleep-target-synthetic',revision:null,records:[],facts:[]};
  const cell={date:view.date,coverage:'complete',status:'thresholdOnly',hasRecord:true,countsAsCompletion:true,localCompletionState:'none',hasExternalCompletion:true,completionSourceLabels:['Synthetic threshold'],actualTimeLabel:null,details:[],localRecords:[]};
  view.habitCorrections={...view.habitCorrections,habits:['wake','sleep'].map(key=>({key,name:'Renamed '+key,localizedNames:{},nameKnown:true,canRecordCompletion:false,goalLabel:'Daily time goal',localChangeCount:0,localChanges:[],cell:{...cell}}))};
  view.habitTimeHabits=['wake','sleep'].map(key=>({key,name:'Renamed '+key,localizedNames:{}}));
  const invoke=window.__TAURI__.core.invoke;
  window.__TAURI__.core.invoke=async(command,args)=>{
    if(command==='sleep_records'){calls.push({command,args});return structuredClone(sleepState);}
    if(command==='save_habit_sleep_time'){
      calls.push({command,args});const input=args.input;
      const fact={recordId:'stable-synthetic-night',habitKey:input.habitKey,livedDate:input.livedDate,dayRelation:input.endpoint.kind==='point'&&input.endpoint.time<'04:00'?'next-day':'same-day',endpoint:input.endpoint,clockPlotMinutes:input.endpoint.kind==='point'?clockCoordinates[input.endpoint.time]:null};
      sleepState={...sleepState,revision:'sleep-saved-'+calls.length,facts:[...sleepState.facts.filter(f=>f.habitKey!==fact.habitKey||f.livedDate!==fact.livedDate),...(input.endpoint.kind==='unrecorded'?[]:[fact])]};
      return structuredClone(sleepState);
    }
    return invoke(command,args);
  };
`;

test('selected Today Habit time saves through the shared context workflow and reads back in its original recording region', {skip:process.platform!=='darwin'},()=>{
  const result=probe(830,`
    await until(()=>document.querySelector('[data-habit-time-edit="sleep"]')&&!document.querySelector('[data-habit-time-edit="sleep"]').disabled);
    document.querySelector('[data-habit-time-edit="sleep"]').click();
    const form=document.querySelector('[data-habit-time-form="sleep"]');
    const input=form.querySelector('[data-habit-time-point]');
    input.value='02:00';input.dispatchEvent(new Event('input',{bubbles:true}));
    const approximate=form.querySelector('[data-habit-time-approximate]');approximate.click();
    await until(()=>form.querySelector('[data-habit-time-preview]').textContent.includes('2026-08-11'));
    const preview=form.querySelector('[data-habit-time-preview]').textContent;
    const liveForm=document.querySelector('[data-habit-time-form="sleep"]');
    const fields=[...liveForm.querySelectorAll('input,select')].map(n=>({type:n.type,name:n.name}));
    liveForm.requestSubmit();
    await until(()=>calls.some(c=>c.command==='save_habit_sleep_time'));
    await until(()=>!document.querySelector('[data-habit-time-form="sleep"]'));
    const habitRegion=document.querySelector('#historical-habit-corrections');
    const retained={regionHidden:habitRegion.hidden,value:habitRegion.querySelector('[data-habit-time-value="sleep"]').textContent,wake:habitRegion.querySelector('[data-habit-time-value="wake"]').textContent};
    document.querySelector('[data-workspace-destination="habits"]').click();
    await until(()=>document.querySelector('.habit-snapshot-row[data-habit-key="sleep"] .habit-snapshot-value strong')?.textContent.includes('02:00'));
    const originalActual=document.querySelector('.habit-snapshot-row[data-habit-key="sleep"] .habit-snapshot-value strong').textContent;
    return JSON.stringify({originalActual,...retained,saved:calls.find(c=>c.command==='save_habit_sleep_time').args.input,preview,fields,forbiddenWrites:calls.filter(c=>/completion|dated_note|daily_plan/.test(c.command)),overflow:document.documentElement.scrollWidth>innerWidth,errors:window.probeErrors});
  `,true,758,{},canonicalBoundary+habitSnapshotBoundary);
  assert.equal(result.saved.habitKey,'sleep');
  assert.equal(result.saved.livedDate,'2026-08-10');
  assert.deepEqual(result.saved.endpoint,{kind:'point',date:'2026-08-11',time:'02:00',utcOffsetMinutes:-240,approximate:true});
  assert.equal(result.saved.expectedRevision,null);
  assert.equal(result.saved.targetBinding,'sleep-target-synthetic');
  assert.ok(!('wakeDate' in result.saved));
  assert.match(result.preview,/2026-08-11.*02:00/);
  assert.match(result.value,/next day.*about 02:00/i);
  assert.match(result.originalActual,/next day.*about 02:00/i);
  assert.match(result.wake,/unrecorded/i);
  assert.equal(result.regionHidden,false);
  assert.ok(!result.fields.some(f=>f.type==='date'||/offset|wakeDate|recordId/.test(f.name)));
  assert.deepEqual(result.forbiddenWrites,[]);
  assert.equal(result.overflow,false);
  assert.deepEqual(result.errors,[]);
});

const habitSnapshotBoundary=String.raw`
  const habitSnapshot=()=>({sleepView:structuredClone(sleepState),state:'ready',message:'Synthetic source coverage',livedDate:view.date,generatedAt:view.date+'T09:00:00-04:00',displayRangeLabel:'2026-08-03 — 2026-08-10',rangeLabel:'2026-08-03 — 2026-08-10',producerLabel:'Synthetic source',completionRevision:null,completionTargetBinding:'completion-target',catalogRevision:null,catalogTargetBinding:'catalog-target',catalogError:null,completionError:null,namesConfigurationState:'missing',summary:{knownCompletions:3,targetCompletions:5,coverageNote:'Synthetic complete coverage',excludedNoGoal:0},habits:['wake','sleep'].map(key=>({key,name:'Renamed '+key,localizedNames:{},active:true,canRecordCompletion:false,goalKind:'daily-time',goalLabel:'Before selected target',goalTarget:null,definition:null,weeklyTarget:null,completedCount:null,sourceLabels:['Synthetic threshold'],coverageLabel:'complete',goalHistory:[],today:{...cell,date:view.date,sleepFact:sleepState.facts.find(f=>f.habitKey===key&&f.livedDate===view.date)??null},recent:[{...cell,date:'2026-08-09'}],history:Array.from({length:84},(_,index)=>({...cell,date:new Date(Date.UTC(2026,4,25+index)).toISOString().slice(0,10)}))}))});
  const priorInvoke=window.__TAURI__.core.invoke;
  window.__TAURI__.core.invoke=async(command,args)=>{
    if(command==='habit_snapshot'){calls.push({command,args});return structuredClone(habitSnapshot());}
    if(command==='read_daily_view'||command==='daily_view'){
      calls.push({command,args});const dated=structuredClone(view);dated.date=args.date;dated.isToday=args.date===view.date;dated.habitCorrections.date=args.date;
      dated.habitCorrections.habits.forEach(h=>h.cell.date=args.date);return dated;
    }
    return priorInvoke(command,args);
  };
`;

test('explicit original Habit-date entry arrives at the exact historical time field and preserves the other endpoint', {skip:process.platform!=='darwin'},()=>{
  const result=probe(969,`
    document.title="historical:navigate";
    document.querySelector('[data-workspace-destination="habits"]').click();
    await until(()=>document.querySelector('[data-habit-key="sleep"][data-habit-date="2026-08-09"]'));
    document.title="historical:select-date";
    document.querySelector('[data-habit-key="sleep"][data-habit-date="2026-08-09"]').click();
    await until(()=>document.querySelector('[data-habit-time-open="sleep"][data-habit-time-date="2026-08-09"]'));
    document.title="historical:open-time";
    document.querySelector('[data-habit-time-open="sleep"][data-habit-time-date="2026-08-09"]').click();
    await until(()=>document.querySelector('[data-habit-time-form="sleep"]'));
    document.title="historical:focused";
    const active=document.activeElement;
    const form=document.querySelector('[data-habit-time-form="sleep"]');
    form.querySelector('[data-habit-time-point]').value='01:50';
    document.title="historical:submit";
    form.requestSubmit();
    await until(()=>calls.some(c=>c.command==='save_habit_sleep_time'));
    await until(()=>!document.querySelector('[data-habit-time-form="sleep"]'));
    return JSON.stringify({focused:active.hasAttribute('data-habit-time-point')&&active.closest('form').dataset.habitTimeForm==='sleep',saved:calls.find(c=>c.command==='save_habit_sleep_time').args.input,date:document.querySelector('#historical-habit-date').textContent,value:document.querySelector('[data-habit-time-value="sleep"]').textContent,errors:window.probeErrors});
  `,true,723,{},canonicalBoundary+habitSnapshotBoundary);
  assert.equal(result.focused,true);
  assert.equal(result.date,'2026-08-09');
  assert.equal(result.saved.habitKey,'sleep');
  assert.equal(result.saved.livedDate,'2026-08-09');
  assert.equal(result.saved.endpoint.date,'2026-08-10');
  assert.equal(result.saved.endpoint.time,'01:50');
  assert.match(result.value,/next day 01:50/);
  assert.deepEqual(result.errors,[]);
});

test('competing canonical endpoints are shown as a conflict with provenance instead of an unrecorded editable time', {skip:process.platform!=='darwin'},()=>{
  const result=probe(969,`
    await until(()=>calls.filter(c=>c.command==='sleep_records').length>0);
    await new Promise(resolve=>setTimeout(resolve,30));
    const button=document.querySelector('[data-habit-time-edit="wake"]');
    button.click();
    return JSON.stringify({disabled:button.disabled,value:document.querySelector('[data-habit-time-value="wake"]').textContent,provenance:[...document.querySelectorAll('[data-habit-time-conflicts="wake"] li')].map(n=>n.textContent),forms:document.querySelectorAll('[data-habit-time-form="wake"]').length,saves:calls.filter(c=>c.command==='save_habit_sleep_time').length,errors:window.probeErrors});
  `,true,723,{},canonicalBoundary+String.raw`
    sleepState={...sleepState,revision:'ambiguous-source',facts:['07:10','08:20'].map((time,index)=>({recordId:'competing-'+index,clockPlotMinutes:clockCoordinates[time],habitKey:'wake',livedDate:view.date,dayRelation:'same-day',endpoint:{kind:'point',date:view.date,time,utcOffsetMinutes:-240}}))};
  `);
  assert.equal(result.disabled,true);
  assert.match(result.value,/multiple|conflict/i);
  assert.doesNotMatch(result.value,/unrecorded/i);
  assert.equal(result.provenance.length,2);
  assert.match(result.provenance[0],/07:10/);
  assert.match(result.provenance[1],/08:20/);
  assert.equal(result.forms,0);
  assert.equal(result.saves,0);
  assert.deepEqual(result.errors,[]);
});

test('a late read from a same-named Vault cannot replace the selected Vault time or its save binding', {skip:process.platform!=='darwin'},()=>{
  const result=probe(969,`
    await until(()=>oldSleepReads.length>0);
    document.querySelector('#workspace-settings').click();
    document.querySelector('[data-settings-section="data"]').click();
    document.querySelector('#settings-select-vault').click();
    await until(()=>calls.some(c=>c.command==='select_today_vault'));
    document.querySelector('[data-workspace-destination="today"]').click();
    await until(()=>document.querySelector('[data-habit-time-value="wake"]')?.textContent.includes('08:40'));
    oldSleepReads.forEach(resolve=>resolve({targetBinding:'vault-a-binding',revision:'private-a',records:[],facts:[{recordId:'private-a',habitKey:'wake',livedDate:view.date,dayRelation:'same-day',endpoint:{kind:'text',date:view.date,text:'OLD_VAULT_PRIVATE_MARKER'}}]}));
    await new Promise(resolve=>setTimeout(resolve,30));
    const retained=document.querySelector('[data-habit-time-value="wake"]').textContent;
    document.querySelector('[data-habit-time-edit="wake"]').click();
    const selectedForm=document.querySelector('[data-habit-time-form="wake"]');
    selectedForm.querySelector('[data-habit-time-point]').value='08:45';selectedForm.requestSubmit();
    await until(()=>calls.some(c=>c.command==='save_habit_sleep_time'));
    return JSON.stringify({retained,privateVisible:document.body.textContent.includes('OLD_VAULT_PRIVATE_MARKER'),saved:calls.find(c=>c.command==='save_habit_sleep_time').args.input,errors:window.probeErrors});
  `,true,723,{},canonicalBoundary+String.raw`
    view.vaultPath='/Synthetic/A/Shared';view.vaultName='Shared';
    const oldSleepReads=[];
    const selectedInvoke=window.__TAURI__.core.invoke;
    window.__TAURI__.core.invoke=async(command,args)=>{
      if(command==='sleep_records'&&view.vaultPath==='/Synthetic/A/Shared'){calls.push({command,args});return new Promise(resolve=>oldSleepReads.push(resolve));}
      if(command==='select_today_vault'){
        calls.push({command,args});view.vaultPath='/Synthetic/B/Shared';
        sleepState={targetBinding:'vault-b-binding',revision:'b-revision',records:[],facts:[{recordId:'b-night',clockPlotMinutes:520,habitKey:'wake',livedDate:view.date,dayRelation:'same-day',endpoint:{kind:'point',date:view.date,time:'08:40',utcOffsetMinutes:-240}}]};
        return {view:structuredClone(view),changed:true};
      }
      return selectedInvoke(command,args);
    };
  `);
  assert.match(result.retained,/08:40/);
  assert.equal(result.privateVisible,false);
  assert.equal(result.saved.targetBinding,'vault-b-binding');
  assert.equal(result.saved.expectedRevision,'b-revision');
  assert.equal(result.saved.recordId,'b-night');
  assert.deepEqual(result.errors,[]);
});

test('leaving and returning to the same Habit date discards a late save presentation while retaining its observed result', {skip:process.platform!=='darwin'},()=>{
  const result=probe(969,`
    await until(()=>document.querySelector('[data-habit-time-edit="wake"]')&&!document.querySelector('[data-habit-time-edit="wake"]').disabled);
    document.querySelector('[data-habit-time-edit="wake"]').click();
    const initialForm=document.querySelector('[data-habit-time-form="wake"]');initialForm.querySelector('[data-habit-time-point]').value='07:30';initialForm.requestSubmit();
    await until(()=>lateSave!==null);
    document.querySelector('#workspace-settings').click();
    sleepState={...sleepState,revision:'latest-observed',facts:[{recordId:'latest-night',clockPlotMinutes:520,habitKey:'wake',livedDate:view.date,dayRelation:'same-day',endpoint:{kind:'point',date:view.date,time:'08:40',utcOffsetMinutes:-240}}]};
    document.querySelector('[data-workspace-destination="today"]').click();
    // Today read waits for writes; resolve the old effect after its editor scope has ended.
    lateSave({targetBinding:'sleep-target-synthetic',revision:'late-old-result',records:[],facts:[{recordId:'old-night',habitKey:'wake',livedDate:view.date,dayRelation:'same-day',endpoint:{kind:'text',date:view.date,text:'OLD_EDITOR_PRIVATE_MARKER'}}]});
    await until(()=>document.querySelector('[data-habit-time-value="wake"]')?.textContent.includes('08:40'));
    await new Promise(resolve=>setTimeout(resolve,20));
    return JSON.stringify({value:document.querySelector('[data-habit-time-value="wake"]').textContent,stale:document.body.textContent.includes('OLD_EDITOR_PRIVATE_MARKER'),success:document.querySelector('[data-habit-time-status]')?.textContent??'',saves:calls.filter(c=>c.command==='save_habit_sleep_time').length,errors:window.probeErrors});
  `,true,723,{},canonicalBoundary+String.raw`
    let lateSave=null;
    const slowInvoke=window.__TAURI__.core.invoke;
    window.__TAURI__.core.invoke=async(command,args)=>{
      if(command==='save_habit_sleep_time'){calls.push({command,args});return new Promise(resolve=>lateSave=resolve);}
      return slowInvoke(command,args);
    };
  `);
  assert.match(result.value,/08:40/);assert.equal(result.stale,false);assert.equal(result.success,'');assert.equal(result.saves,1);assert.deepEqual(result.errors,[]);
});

test('progressive precision editing preserves ranges and original wording while distinguishing unknown from unrecorded', {skip:process.platform!=='darwin'},()=>{
  const result=probe(1280,`
    const results=[];
    const edit=async(kind,time,endTime,text)=>{
      await until(()=>document.querySelector('[data-habit-time-edit="wake"]')&&!document.querySelector('[data-habit-time-edit="wake"]').disabled);
      document.querySelector('[data-habit-time-edit="wake"]').click();
      let editForm=document.querySelector('[data-habit-time-form="wake"]');
      const select=editForm.querySelector('[data-habit-time-kind]');select.value=kind;select.dispatchEvent(new Event('change',{bubbles:true}));
      editForm=document.querySelector('[data-habit-time-form="wake"]');
      editForm.querySelector('[data-habit-time-point]').value=time;
      editForm.querySelector('[data-habit-time-end]').value=endTime;
      editForm.querySelector('[data-habit-time-original]').value=text;
      const before=calls.filter(c=>c.command==='save_habit_sleep_time').length;
      document.title='precision:'+kind+':valid='+editForm.checkValidity();
      if(!editForm.checkValidity())throw Error(JSON.stringify([...editForm.querySelectorAll('input,select')].map(n=>({name:n.name,value:n.value,type:n.type,required:n.required,valid:n.checkValidity(),message:n.validationMessage}))));
      editForm.requestSubmit();await until(()=>calls.filter(c=>c.command==='save_habit_sleep_time').length>before);
      await until(()=>!document.querySelector('[data-habit-time-form="wake"]'));
      results.push({input:calls.filter(c=>c.command==='save_habit_sleep_time').at(-1).args.input,value:document.querySelector('[data-habit-time-value="wake"]').textContent});
    };
    await edit('range','07:00','08:00','七点到八点，原话保留');
    await edit('text','','','文档已保存，但读回结果已经变化；请重新读取核对。');
    await edit('unknown','','','');
    await edit('unrecorded','','','');
    return JSON.stringify({results,errors:window.probeErrors});
  `,true,720,{},canonicalBoundary);
  assert.deepEqual(result.results[0].input.endpoint,{kind:'range',start:{date:'2026-08-10',time:'07:00',utcOffsetMinutes:-240,approximate:false},end:{date:'2026-08-10',time:'08:00',utcOffsetMinutes:-240,approximate:false},reportedText:'七点到八点，原话保留'});
  assert.match(result.results[0].value,/07:00–08:00.*七点到八点，原话保留/);
  assert.equal(result.results[1].input.endpoint.kind,'text');
  assert.match(result.results[1].value,/文档已保存，但读回结果已经变化；请重新读取核对。/);
  assert.deepEqual(result.results[2].input.endpoint,{kind:'unknown'});assert.match(result.results[2].value,/Explicitly unknown/);
  assert.deepEqual(result.results[3].input.endpoint,{kind:'unrecorded'});assert.match(result.results[3].value,/Unrecorded/);
  assert.deepEqual(result.errors,[]);
});

for(const [width,height]of [[830,758],[969,723],[1280,720]])for(const language of ['en','zh']){
  test(`fixed-context Habit time entry fits ${width}×${height} ${language} and uses canonical names`, {skip:process.platform!=='darwin'},()=>{
    const result=probe(width,`
      await until(()=>document.querySelector('[data-habit-time-edit="wake"]')&&!document.querySelector('[data-habit-time-edit="wake"]').disabled);
      const timeTrigger=document.querySelector('[data-habit-time-edit="wake"]');timeTrigger.focus();timeTrigger.click();
      const editForm=document.querySelector('[data-habit-time-form="wake"]');
      const control=editForm.querySelector('[data-habit-time-point]');control.value='07:55';control.dispatchEvent(new Event('input',{bubbles:true}));
      const initiallyFocused=document.activeElement===control;
      await until(()=>editForm.querySelector('[data-habit-time-preview]').textContent.includes('07:55'));
      return JSON.stringify({focus:initiallyFocused,label:timeTrigger.getAttribute('aria-label'),preview:editForm.querySelector('[data-habit-time-preview]').textContent,liveValue:document.querySelector('[data-habit-time-form="wake"] [data-habit-time-point]').value,liveFocused:document.activeElement===document.querySelector('[data-habit-time-form="wake"] [data-habit-time-point]'),details:editForm.querySelector('details').open,fieldTypes:[...editForm.querySelectorAll('input')].map(i=>i.type),rootWidth:document.querySelector('#habit-time-records').scrollWidth,rootClient:document.querySelector('#habit-time-records').clientWidth,form:rect(editForm),body:document.documentElement.scrollWidth,viewport:innerWidth,sleepEntry:document.querySelector('[data-habit-time-edit="sleep"]')!==null,errors:window.probeErrors});
    `,true,height,{interface_language_preferences:{interfaceLanguage:language}},canonicalBoundary+String.raw`
      view.habitTimeHabits=[{key:'wake',name:'CANONICAL USER NAME',localizedNames:{en:'Canonical renamed wake with a longer personal name',zh:'改名后的起床习惯与保留的个人长名称'}}];
    `);
    assert.equal(result.focus,true);assert.equal(result.liveValue,'07:55');assert.equal(result.liveFocused,true);
    assert.match(result.label,language==='en'?/Canonical renamed wake/:/改名后的起床/);
    assert.match(result.preview,/2026-08-10.*07:55/);
    assert.equal(result.details,false);
    assert.ok(!result.fieldTypes.includes('date'));
    assert.ok(result.rootWidth<=result.rootClient+1,JSON.stringify(result));
    assert.ok(result.form.right<=width+1,JSON.stringify(result));
    assert.equal(result.body,result.viewport);
    assert.equal(result.sleepEntry,false,'a producer-only Habit must not bypass the canonical selected-date context');
    assert.deepEqual(result.errors,[]);
  });
}

test('a failed canonical read stays unavailable rather than claiming the actual time was unrecorded', {skip:process.platform!=='darwin'},()=>{
  const result=probe(969,`
    await until(()=>document.querySelector('[data-habit-time-status]'));
    return JSON.stringify({value:document.querySelector('[data-habit-time-value="wake"]').textContent,disabled:document.querySelector('[data-habit-time-edit="wake"]').disabled,status:document.querySelector('[data-habit-time-status]').textContent,errors:window.probeErrors});
  `,true,723,{},canonicalBoundary+String.raw`
    const brokenRead=window.__TAURI__.core.invoke;
    window.__TAURI__.core.invoke=async(command,args)=>{if(command==='sleep_records')throw new Error('Synthetic canonical read failure');return brokenRead(command,args);};
  `);
  assert.match(result.value,/unavailable/i);
  assert.doesNotMatch(result.value,/unrecorded/i);
  assert.equal(result.disabled,true);
  assert.match(result.status,/Synthetic canonical read failure/);
  assert.deepEqual(result.errors,[]);
});

for(const [start,end,startDate,endDate]of [['03:00','05:00','2026-08-11','2026-08-11'],['23:00','01:00','2026-08-10','2026-08-11'],['07:00','08:00','2026-08-10','2026-08-10']]){
  test(`range preview shows both actual dates before saving ${start}–${end}`,{skip:process.platform!=='darwin'},()=>{
    const result=probe(969,`
      await until(()=>document.querySelector('[data-habit-time-edit="sleep"]')&&!document.querySelector('[data-habit-time-edit="sleep"]').disabled);
      document.querySelector('[data-habit-time-edit="sleep"]').click();
      const select=document.querySelector('[data-habit-time-kind]');select.value='range';select.dispatchEvent(new Event('change',{bubbles:true}));
      const form=document.querySelector('[data-habit-time-form="sleep"]');
      const time=form.querySelector('[data-habit-time-point]'),end=form.querySelector('[data-habit-time-end]'),original=form.querySelector('[data-habit-time-original]');
      time.value=${JSON.stringify(start)};end.value=${JSON.stringify(end)};original.value='Original range wording';end.dispatchEvent(new Event('input',{bubbles:true}));
      await until(()=>form.querySelector('[data-habit-time-preview]').textContent.includes(${JSON.stringify(end)}));
      const preview=form.querySelector('[data-habit-time-preview]').textContent;
      document.querySelector('[data-habit-time-form="sleep"]').requestSubmit();await until(()=>calls.some(c=>c.command==='save_habit_sleep_time'));
      return JSON.stringify({preview,input:calls.find(c=>c.command==='save_habit_sleep_time').args.input,dates:form.querySelectorAll('input[type="date"]').length,errors:window.probeErrors});
    `,true,723,{},canonicalBoundary);
    assert.match(result.preview,new RegExp(startDate+' '+start));assert.match(result.preview,new RegExp(endDate+' '+end));
    assert.equal(result.input.endpoint.start.date,startDate);assert.equal(result.input.endpoint.end.date,endDate);assert.equal(result.input.endpoint.reportedText,'Original range wording');assert.equal(result.dates,0);assert.deepEqual(result.errors,[]);
  });
}

test('a backend-selected Vault cannot supply a pending-selection editor with another Vault binding',{skip:process.platform!=='darwin'},()=>{
  const result=probe(969,`
    await until(()=>document.querySelector('[data-habit-time-edit="wake"]')&&!document.querySelector('[data-habit-time-edit="wake"]').disabled);
    document.querySelector('#workspace-settings').click();document.querySelector('[data-settings-section="data"]').click();document.querySelector('#settings-select-vault').click();
    await until(()=>window.releaseSelection&&backendVault==='/Synthetic/B/Shared');
    document.querySelector('[data-workspace-destination="today"]').click();
    await until(()=>document.querySelector('[data-habit-time-edit="wake"]'));
    const reads=calls.filter(c=>c.command==='sleep_records').length;
    // The editor may be disabled while the selection response is held. If it is
    // enabled, act as a user would; the assertion below catches an unsafe write.
    await until(()=>document.querySelector('[data-habit-time-edit="wake"]').disabled||document.querySelector('[data-habit-time-value="wake"]').textContent.includes('PRIVATE_B_CONTEXT'));
    const leaked=document.body.textContent.includes('PRIVATE_B_CONTEXT');
    const entryTrigger=document.querySelector('[data-habit-time-edit="wake"]');
    if(!entryTrigger.disabled){
      entryTrigger.click();const kind=document.querySelector('[data-habit-time-kind]');kind.value='point';kind.dispatchEvent(new Event('change',{bubbles:true}));
      const form=document.querySelector('[data-habit-time-form="wake"]');form.querySelector('[data-habit-time-point]').value='07:55';form.requestSubmit();await until(()=>calls.some(c=>c.command==='save_habit_sleep_time'));
    }
    const before=calls.filter(c=>c.command==='save_habit_sleep_time').map(c=>c.args.input);
    const next=structuredClone(view);next.vaultPath='/Synthetic/B/Shared';next.date='2026-08-09';next.habitCorrections.date=next.date;next.habitCorrections.habits.forEach(h=>h.cell.date=next.date);
    Object.assign(view,next);window.releaseSelection({view:next,changed:true});
    await until(()=>document.querySelector('[data-habit-time-edit="wake"]')&&!document.querySelector('[data-habit-time-edit="wake"]').disabled);
    return JSON.stringify({leaked,before,reads,paths:calls.filter(c=>c.command==='sleep_records').map(c=>c.args?.vaultPath??null),errors:window.probeErrors});
  `,true,723,{},canonicalBoundary+String.raw`
    view.vaultPath='/Synthetic/A/Shared';view.vaultName='Shared';let backendVault=view.vaultPath;
    const selectedInvoke=window.__TAURI__.core.invoke;
    window.__TAURI__.core.invoke=async(command,args)=>{
      if(command==='select_today_vault'){calls.push({command,args});backendVault='/Synthetic/B/Shared';return new Promise(resolve=>window.releaseSelection=resolve);}
      if(command==='sleep_records'){
        calls.push({command,args});if(args?.vaultPath&&args.vaultPath!==backendVault)throw '所选 Vault 已改变；未读取作息。';
        if(backendVault==='/Synthetic/B/Shared')return {targetBinding:'binding-b',revision:'b1',records:[],facts:[{recordId:'private-b',habitKey:'wake',livedDate:'2026-08-10',dayRelation:'unresolved',endpoint:{kind:'text',date:'2026-08-10',text:'PRIVATE_B_CONTEXT'}}]};
        return structuredClone(sleepState);
      }
      return selectedInvoke(command,args);
    };
  `);
  assert.equal(result.leaked,false);assert.deepEqual(result.before,[],'no write may use B binding with A date while selection is pending');
  assert.ok(result.paths.every(path=>path==='/Synthetic/A/Shared'||path==='/Synthetic/B/Shared'));assert.deepEqual(result.errors,[]);
});


test('a bound canonical-read rejection uses paired English copy while retaining its raw diagnostic',{skip:process.platform!=='darwin'},()=>{
  const result=probe(969,`
    await until(()=>document.querySelector('[data-habit-time-status]'));
    const status=document.querySelector('[data-habit-time-status]');
    return JSON.stringify({text:status.textContent,raw:status.dataset.i18nError,disabled:document.querySelector('[data-habit-time-edit="wake"]').disabled,errors:window.probeErrors});
  `,true,723,{},canonicalBoundary+`
    const boundInvoke=window.__TAURI__.core.invoke;window.__TAURI__.core.invoke=async(command,args)=>{if(command==='sleep_records')throw '所选 Vault 已改变；未读取作息。';return boundInvoke(command,args);};
  `);
  assert.match(result.text,/Selected Vault changed; no sleep records read\./);assert.doesNotMatch(result.text,/所选/);assert.equal(result.raw,'所选 Vault 已改变；未读取作息。');assert.equal(result.disabled,true);assert.deepEqual(result.errors,[]);
});

for(const knownDate of [null,'2026-08-11'])test(`original wording preserves its ${knownDate?'explicit':'unknown'} actual date independently of the selected lived day`,{skip:process.platform!=='darwin'},()=>{
  const result=probe(969,`
    await until(()=>!document.querySelector('[data-habit-time-edit="sleep"]').disabled);
    document.querySelector('[data-habit-time-edit="sleep"]').click();
    const kind=document.querySelector('[data-habit-time-kind]');kind.value='text';kind.dispatchEvent(new Event('change',{bubbles:true}));
    const form=document.querySelector('[data-habit-time-form="sleep"]'),text=form.querySelector('[data-habit-time-original]');text.value='around 2 a.m., not normalized';text.dispatchEvent(new Event('input',{bubbles:true}));
    const preview=form.querySelector('[data-habit-time-preview]').textContent;form.requestSubmit();await until(()=>calls.some(c=>c.command==='save_habit_sleep_time'));
    return JSON.stringify({preview,input:calls.find(c=>c.command==='save_habit_sleep_time').args.input,errors:window.probeErrors});
  `,true,723,{},canonicalBoundary+`
    ${knownDate?`sleepState.facts=[{recordId:'legacy-text',habitKey:'sleep',livedDate:view.date,dayRelation:'unresolved',endpoint:{kind:'text',date:'2026-08-11',text:'legacy explicit-date wording'}}];`:''}
  `);
  assert.equal(result.input.livedDate,'2026-08-10');assert.equal(result.input.endpoint.date,knownDate);
  assert.equal(result.input.endpoint.text,'around 2 a.m., not normalized');assert.match(result.preview,knownDate?/2026-08-11/:/actual calendar date.*unknown/i);assert.deepEqual(result.errors,[]);
});
