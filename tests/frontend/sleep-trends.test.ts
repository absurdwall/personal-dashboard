import assert from 'node:assert/strict';
import test from 'node:test';
import {probe} from './helpers/complete-page.ts';

const setup = `
responses.today_clock={date:view.date,livedDate:'2026-08-09',time:'03:00'};
const point=(date,time,approximate=false)=>({kind:'point',date,time,utcOffsetMinutes:-240,approximate});
responses.sleep_records={targetBinding:'sleep-vault',revision:'sleep-1',records:[
 {id:'night-9',wakeDate:'2026-08-09',sleepOnset:point('2026-08-08','23:50'),getUp:point('2026-08-09','07:20'),estimatedDurationMinutes:450},
 {id:'night-10',wakeDate:'2026-08-10',sleepOnset:point('2026-08-10','00:10',true),getUp:point('2026-08-10','08:10',true),estimatedDurationMinutes:480},
 {id:'fuzzy',wakeDate:'2026-08-08',sleepOnset:{kind:'text',date:'2026-08-08',text:'八点多'},getUp:{kind:'unknown'},estimatedDurationMinutes:null},
 {id:'range',wakeDate:'2026-08-07',sleepOnset:{kind:'range',start:point('2026-08-06','22:00'),end:point('2026-08-06','23:00'),reportedText:'between ten and eleven'},getUp:{kind:'unrecorded'},estimatedDurationMinutes:null},
 {id:'old-night',wakeDate:'2026-06-01',sleepOnset:point('2026-05-31','23:00'),getUp:point('2026-06-01','07:00'),estimatedDurationMinutes:480}
]};
const cell={date:view.date,status:'unknown',hasRecord:false,countsAsCompletion:false,localCompletionState:'unrecorded',hasExternalCompletion:false,completionSourceLabels:[],details:[],localRecords:[]};
responses.habit_snapshot={state:'ready',message:'Synthetic habits',livedDate:view.date,generatedAt:null,displayRangeLabel:'This week',rangeLabel:'Aug 4–10',producerLabel:'Synthetic',completionRevision:null,completionTargetBinding:null,catalogRevision:'catalog',catalogTargetBinding:'sleep-vault',catalogError:null,completionError:null,namesConfigurationState:'missing',summary:{knownCompletions:2,targetCompletions:3,coverageNote:'Synthetic',excludedNoGoal:0},habits:[{key:'reading',name:'Synthetic reading',localizedNames:null,active:true,canRecordCompletion:false,goalKind:'weekly-count',goalLabel:'3 days per week',goalTarget:{kind:'weekly-count',standard:3},definition:null,weeklyTarget:3,completedCount:2,sourceLabels:[],coverageLabel:'local',goalHistory:[],today:cell,recent:[cell],history:Array.from({length:84},(_,index)=>({...cell,date:new Date(Date.UTC(2026,7,10-index)).toISOString().slice(0,10)}))}]};
const navigate=async(destination)=>{document.querySelector('[data-workspace-destination="'+destination+'"]').click();await until(()=>document.querySelector('.app-shell').dataset.workspaceDestination===destination);};
await navigate('habits');
await until(()=>document.querySelector('[data-sleep-trend="sleepOnset"]'));
`;

test('Habits exposes seven-day sleep curves with gaps and a shared metric detail', {skip:process.platform!=='darwin'},()=>{
 const result=probe(969,setup+`
 const onset=document.querySelector('[data-sleep-trend="sleepOnset"]');
 const up=document.querySelector('[data-sleep-trend="getUp"]');
 const dot=onset.querySelector('circle').getBoundingClientRect(),day=onset.querySelector('[data-sleep-date="2026-08-09"]').getBoundingClientRect();
 const before={alignment:Math.abs(dot.left+dot.width/2-day.left-day.width/2),rows:document.querySelectorAll('[data-sleep-trend]').length,points:onset.querySelectorAll('circle').length,segments:onset.querySelectorAll('[data-sleep-segment]').length,dates:onset.querySelectorAll('[data-sleep-date]').length,weekly:document.querySelector('#habits-summary-total').textContent,habit:document.querySelector('#habits-weekly-list').textContent,status:document.querySelector('#habits-status').textContent,overflow:document.documentElement.scrollWidth>innerWidth};
 up.querySelector('[data-sleep-date="2026-08-10"]').click();
 await until(()=>document.querySelector('.sleep-editor [data-sleep-statistics]'));
 const dialog=document.querySelector('.sleep-editor');
 const getUp={metric:dialog.dataset.metric,statistics:dialog.querySelector('[data-sleep-statistics]').textContent,fields:[...dialog.querySelectorAll('fieldset input[type=time]')].map(input=>input.getAttribute('aria-label'))};
 dialog.querySelector('[data-sleep-metric="sleepOnset"]').click();
 const onsetStatistics=dialog.querySelector('[data-sleep-statistics]').textContent;
 dialog.querySelector('[data-sleep-days="30"]').click();
 const range=dialog.querySelector('[data-sleep-range]').textContent;
 const detailDot=dialog.querySelector('.sleep-detail-chart circle').getBoundingClientRect(),detailDay=dialog.querySelector('.sleep-detail-chart [data-sleep-date="2026-08-09"]').getBoundingClientRect();
 const rangeAlignment=Math.abs(detailDot.left+detailDot.width/2-detailDay.left-detailDay.width/2);
 dialog.querySelector('[data-sleep-metric="duration"]').click();
 const duration=dialog.querySelector('[data-sleep-statistics]').textContent;
 const old=dialog.querySelector('[data-sleep-history-date="2026-06-01"]');
 const historical=old.textContent;old.click();
 await until(()=>document.querySelector('.sleep-editor input[type="date"]')?.value==='2026-06-01');
 return JSON.stringify({before,getUp,onsetStatistics,range,rangeAlignment,duration,historical,oldDate:document.querySelector('.sleep-editor input[type="date"]').value,errors:window.probeErrors});
 `);
 assert.ok(result.before.alignment<1,'each plotted point must align with its date');assert.equal(result.before.rows,2);assert.equal(result.before.points,2);assert.equal(result.before.segments,1);assert.equal(result.before.dates,7);
 assert.equal(result.before.weekly,'2 / 3');assert.match(result.before.habit,/Synthetic reading/);assert.equal(result.before.overflow,false);
 assert.equal(result.getUp.metric,'getUp');assert.deepEqual(result.getUp.fields,['Sleep onset · Time','Get-up time · Time']);assert.match(result.getUp.statistics,/2.*07:45/);assert.match(result.getUp.statistics,/1 approximate/);
 assert.match(result.onsetStatistics,/2.*00:00/);assert.match(result.range,/2026-07-12.*2026-08-10/);assert.ok(result.rangeAlignment<1,'thirty-day points must align with their dates');assert.match(result.duration,/2.*7h 45m/);
 assert.match(result.historical,/2026-06-01.*23:00.*07:00.*8h 0m/);assert.equal(result.oldDate,'2026-06-01');assert.deepEqual(result.errors,[]);
});

test('historical correction and later canonical changes refresh the same sleep views', {skip:process.platform!=='darwin'},()=>{
 const result=probe(830,setup+`
 responses.today_clock={date:view.date,livedDate:view.date,time:'09:30'};
 const originalInvoke=window.__TAURI__.core.invoke;
 let mutation=null;
 window.__TAURI__.core.invoke=async(command,args)=>{
   if(command!=='save_sleep_record')return originalInvoke(command,args);
   mutation=structuredClone(args.input);
   const canonical=structuredClone(responses.sleep_records);
   const index=canonical.records.findIndex(record=>record.id===args.input.recordId);
   canonical.records[index]={...canonical.records[index],sleepOnset:{kind:'point',date:'2026-05-31',time:'22:30',utcOffsetMinutes:-240,approximate:false},estimatedDurationMinutes:510};
   canonical.revision='sleep-2';responses.sleep_records=canonical;
   return structuredClone(canonical);
 };
 document.querySelector('[data-sleep-trend="sleepOnset"] [data-sleep-date="2026-08-10"]').click();
 await until(()=>document.querySelector('[data-sleep-history-date="2026-06-01"]'));
 document.querySelector('[data-sleep-history-date="2026-06-01"]').click();
 await until(()=>document.querySelector('.sleep-editor input[type="date"]')?.value==='2026-06-01');
 const onsetTime=document.querySelector('.sleep-editor fieldset input[type="time"]');
 onsetTime.value='22:30';onsetTime.dispatchEvent(new Event('change',{bubbles:true}));
 document.querySelector('.sleep-editor-form').requestSubmit();
 await until(()=>!document.querySelector('.sleep-editor'));
 document.querySelector('[data-sleep-trend="getUp"] [data-sleep-date="2026-08-10"]').click();
 await until(()=>document.querySelector('[data-sleep-history-date="2026-06-01"]'));
 const historical=document.querySelector('[data-sleep-history-date="2026-06-01"]').textContent;
 document.querySelector('.sleep-editor button').click();
 // A later Collaboration/canonical write has no Task operation marker. Re-entering
 // either destination must reread the same public sleep source rather than reuse rows.
 responses.sleep_records={...responses.sleep_records,revision:'sleep-3',records:responses.sleep_records.records.map(record=>record.id==='night-10'?{...record,sleepOnset:point('2026-08-10','00:20',true),estimatedDurationMinutes:470}:record)};
 await navigate('today');
 await until(()=>document.querySelector('#today-sleep-summary button')?.textContent.includes('00:20'));
 const today=document.querySelector('#today-sleep-summary button').textContent;
 await navigate('habits');
 await until(()=>document.querySelector('[data-sleep-trend="sleepOnset"] [data-sleep-date="2026-08-10"]')?.textContent.includes('00:20'));
 const trend=document.querySelector('[data-sleep-trend="sleepOnset"] [data-sleep-date="2026-08-10"]').textContent;
 return JSON.stringify({mutation,historical,today,trend,count:responses.sleep_records.records.length,errors:window.probeErrors});
 `);
 assert.equal(result.mutation.recordId,'old-night');assert.equal(result.mutation.wakeDate,'2026-06-01');
 assert.deepEqual(result.mutation.sleepOnset,{kind:'point',date:'2026-05-31',time:'22:30',utcOffsetMinutes:-240,approximate:false});
 assert.equal('getUp' in result.mutation,false);assert.equal(result.count,5);
 assert.match(result.historical,/2026-06-01.*22:30.*07:00.*8h 30m/);
 assert.match(result.today,/2026-08-10.*00:20.*08:10/);assert.match(result.trend,/about 00:20/);assert.deepEqual(result.errors,[]);
});

test('sleep history pages beyond thirty days and missing records never become zero points', {skip:process.platform!=='darwin'},()=>{
 const result=probe(1280,setup+`
 responses.sleep_records.records.push(...Array.from({length:18},(_,index)=>({id:'july-'+index,wakeDate:'2026-07-'+String(index+1).padStart(2,'0'),sleepOnset:{kind:'unknown'},getUp:{kind:'unrecorded'},estimatedDurationMinutes:null})));
 document.querySelector('[data-sleep-trend="sleepOnset"] button').click();
 await until(()=>document.querySelector('.sleep-history-navigation button'));
 const beforeOld=document.querySelector('[data-sleep-history-date="2026-06-01"]')!==null;
 document.querySelector('.sleep-history-navigation button').click();
 const afterOld=document.querySelector('[data-sleep-history-date="2026-06-01"]')?.textContent;
 document.querySelector('.sleep-editor button').click();
 responses.sleep_records={...responses.sleep_records,revision:null,records:[]};
 document.querySelector('#refresh-habits').click();
 await until(()=>document.querySelector('[data-sleep-trend="sleepOnset"]')?.querySelectorAll('circle').length===0);
 const points=document.querySelectorAll('#habits-sleep circle').length;
 const dates=document.querySelectorAll('#habits-sleep [data-sleep-date]').length;
 document.querySelector('[data-sleep-trend="sleepOnset"] button').click();
 await until(()=>document.querySelector('[data-sleep-statistics]'));
 return JSON.stringify({beforeOld,afterOld,points,dates,stats:document.querySelector('[data-sleep-statistics]').textContent,overflow:document.documentElement.scrollWidth>innerWidth,errors:window.probeErrors});
 `);
 assert.equal(result.beforeOld,false);assert.match(result.afterOld,/2026-06-01/);
 assert.equal(result.points,0);assert.equal(result.dates,14);assert.match(result.stats,/0 valid samples.*Average —/);assert.equal(result.overflow,false);assert.deepEqual(result.errors,[]);
});


test('a delayed current-day clock cannot replace the selected historical sleep summary', {skip:process.platform!=='darwin'},()=>{
 const result=probe(969,`
 responses.sleep_records={targetBinding:'sleep-vault',revision:null,records:[]};
 const invoke=window.__TAURI__.core.invoke;
 let releaseClock;
 let delayClock=true;
 window.__TAURI__.core.invoke=async(command,args)=>{
   if(command==='today_clock'&&delayClock){delayClock=false;return new Promise(resolve=>{releaseClock=()=>resolve({date:view.date,livedDate:view.date,time:'09:30'});});}
   if(command==='calendar_month')return {...month,year:2026,month:8,days:[{...month.days[0],date:'2026-08-09',inMonth:true,availability:'missing'}]};
   if(['read_daily_view','daily_view'].includes(command)&&args?.date)return {...structuredClone(view),date:args.date,isToday:false};
   return invoke(command,args);
 };
 await until(()=>!document.querySelector('#refresh-today').disabled);
 document.querySelector('#refresh-today').click();
 await until(()=>releaseClock);
 document.querySelector('[data-workspace-destination="calendar"]').click();
 await until(()=>document.querySelector('button[data-calendar-date="2026-08-09"]'));
 document.querySelector('button[data-calendar-date="2026-08-09"]').click();
 await until(()=>document.querySelector('#calendar-summary-heading').textContent.includes('9')&&!document.querySelector('#calendar-open-day').disabled);
 document.querySelector('#calendar-open-day').click();
 await until(()=>document.querySelector('#today-sleep-summary button')?.textContent.includes('2026-08-09'));
 releaseClock();
 await new Promise(resolve=>setTimeout(resolve,30));
 const summary=document.querySelector('#today-sleep-summary button').textContent;
 document.querySelector('#today-sleep-summary button').click();
 await until(()=>document.querySelector('.sleep-editor input[type="date"]'));
 return JSON.stringify({summary,date:document.querySelector('.sleep-editor input[type="date"]').value,errors:window.probeErrors});
 `);
 assert.match(result.summary,/2026-08-09/);assert.equal(result.date,'2026-08-09');assert.deepEqual(result.errors,[]);
});

test('changing the selected Vault invalidates an earlier sleep calendar lookup', {skip:process.platform!=='darwin'},()=>{
 const result=probe(969,`
 responses.sleep_records={targetBinding:'sleep-vault-a',revision:null,records:[]};
 const invoke=window.__TAURI__.core.invoke;
 let releaseClock;
 let delayClock=true;
 window.__TAURI__.core.invoke=async(command,args)=>{
   if(command==='today_clock'&&delayClock){delayClock=false;return new Promise(resolve=>{releaseClock=()=>resolve({date:view.date,livedDate:view.date,time:'09:30'});});}
   if(command==='select_today_vault'){
     responses.sleep_records={targetBinding:'sleep-vault-b',revision:null,records:[]};
     return {changed:true,view:{...structuredClone(view),date:'2026-08-09',isToday:false,targetBinding:'vault-b',tasks:{...view.tasks,targetBinding:'tasks-vault-b'}}};
   }
   return invoke(command,args);
 };
 await until(()=>!document.querySelector('#refresh-today').disabled);
 document.querySelector('#refresh-today').click();
 await until(()=>releaseClock);
 document.querySelector('#select-today-vault').click();
 await until(()=>document.querySelector('#today-sleep-summary button')?.textContent.includes('2026-08-09'));
 releaseClock();
 await new Promise(resolve=>setTimeout(resolve,30));
 const summary=document.querySelector('#today-sleep-summary button').textContent;
 document.querySelector('#today-sleep-summary button').click();
 await until(()=>document.querySelector('.sleep-editor input[type="date"]'));
 return JSON.stringify({summary,date:document.querySelector('.sleep-editor input[type="date"]').value,errors:window.probeErrors});
 `);
 assert.match(result.summary,/2026-08-09/);assert.equal(result.date,'2026-08-09');assert.deepEqual(result.errors,[]);
});

test('English sleep placeholder and errors use the shared language catalog without translating reported text', {skip:process.platform!=='darwin'},()=>{
 const result=probe(969,`
   await until(()=>!document.querySelector('#today-sleep-summary').hidden);
   const placeholder=document.querySelector('#today-sleep-summary button').textContent;
   releaseSleep();
   await until(()=>document.querySelector('#today-sleep-summary button').textContent.includes('2026-08-10'));
   document.querySelector('#today-sleep-summary button').click();
   await until(()=>document.querySelector('.sleep-editor form'));
   const dialog=document.querySelector('.sleep-editor');
   const reported=dialog.querySelector('input[aria-label="Sleep onset · Original wording"]');
   dialog.querySelector('input[aria-label="Get-up time · Time"]').value='08:20';
   dialog.querySelector('form').requestSubmit();
   await until(()=>dialog.querySelector('[role=status]').textContent);
   const status=dialog.querySelector('[role=status]');
   dialog.querySelector('[data-sleep-metric="duration"]').click();
   const english={text:status.textContent,diagnostic:status.dataset.i18nError,reported:reported.value,statistics:dialog.querySelector('[data-sleep-statistics]').textContent};
   freezeSleepReads=true;
   document.querySelector('#workspace-language').click();
   await until(()=>document.documentElement.lang.startsWith('zh'));
   return JSON.stringify({placeholder,english,chinese:status.textContent,summary:document.querySelector('#today-sleep-summary button').textContent,statistics:dialog.querySelector('[data-sleep-statistics]').textContent,reportedAfter:reported.value,errors:window.probeErrors});
 `,true,758,{},`
   const sleepFixture={targetBinding:'sleep-language',revision:'sleep-language-rev',records:[{id:'language-night',wakeDate:'2026-08-10',sleepOnset:{kind:'text',date:'2026-08-09',text:'八点多 English original'},getUp:{kind:'point',date:'2026-08-10',time:'07:20',utcOffsetMinutes:-240,approximate:true},estimatedDurationMinutes:null},{id:'other-language-night',wakeDate:'2026-08-09',sleepOnset:{kind:'point',date:'2026-08-08',time:'23:50',utcOffsetMinutes:-240},getUp:{kind:'point',date:'2026-08-09',time:'07:20',utcOffsetMinutes:-240},estimatedDurationMinutes:450}]};
   let finishSleep, sleepReady=false, freezeSleepReads=false;
   const sleepPending=new Promise(resolve=>{finishSleep=resolve;});
   const releaseSleep=()=>{sleepReady=true;finishSleep(sleepFixture);};
   const baseInvoke=window.__TAURI__.core.invoke;
   window.__TAURI__.core.invoke=async(command,args)=>{
     if(command==='sleep_records')return freezeSleepReads?new Promise(()=>{}):sleepReady?sleepFixture:sleepPending;
     if(command==='save_sleep_record')throw new Error('起床端点的实际日期必须与记录起床日一致。');
     if(command==='set_interface_language')return {interfaceLanguage:args.interfaceLanguage};
     return baseInvoke(command,args);
   };
 `);
 assert.equal(result.placeholder,'Sleep');
 assert.match(result.english.text,/actual get-up date must match the record/);
 assert.match(result.english.diagnostic,/起床端点的实际日期必须与记录起床日一致/);
 assert.match(result.chinese,/起床端点的实际日期必须与记录起床日一致/);
 assert.match(result.english.statistics,/7h 30m/);
 assert.match(result.summary,/约 07:20/);
 assert.ok(!result.summary.includes('about'));
 assert.match(result.statistics,/7 小时 30 分/);
 assert.equal(result.english.reported,'八点多 English original');
 assert.equal(result.reportedAfter,'八点多 English original');
 assert.deepEqual(result.errors,[]);
});

for(const mode of ['identity','requested endpoint','preserved endpoint','other record','Vault binding','unavailable readback']) {
 test(`sleep editor keeps an unconfirmed ${mode} save response editable`, {skip:process.platform!=='darwin'},()=>{
  const result=probe(969,`
    const point=(date,time)=>({kind:'point',date,time,utcOffsetMinutes:-240,approximate:false});
    responses.sleep_records={targetBinding:'readback-vault',revision:'readback-r1',records:[
      {id:'night',wakeDate:view.date,sleepOnset:point('2026-08-09','23:50'),getUp:point(view.date,'07:20'),estimatedDurationMinutes:450},
      {id:'older-night',wakeDate:'2026-08-09',sleepOnset:point('2026-08-08','23:50'),getUp:point('2026-08-09','07:20'),estimatedDurationMinutes:450}
    ]};
    document.querySelector('#refresh-today').click();
    await until(()=>document.querySelector('#today-sleep-summary button').textContent.includes('07:20'));
    document.querySelector('#today-sleep-summary button').click();
    await until(()=>document.querySelector('.sleep-editor form'));
    const dialog=document.querySelector('.sleep-editor'),input=dialog.querySelector('input[aria-label="Get-up time · Time"]');
    input.value='08:20';let changedEvents=0;document.addEventListener('sleep-records-changed',()=>changedEvents++);
    const invoke=window.__TAURI__.core.invoke;
    window.__TAURI__.core.invoke=async(command,args)=>{
      if(command==='save_sleep_record'){
        const saved=structuredClone(responses.sleep_records);saved.revision='readback-r2';saved.records[0].getUp=point(view.date,'08:20');saved.records[0].estimatedDurationMinutes=510;
        const mode=${JSON.stringify(mode)};
        if(mode==='unavailable readback')throw Error('作息已保存，但无法确认读回：Synthetic readback unavailable');
        if(mode==='identity')saved.records[0].id='another-record-on-the-same-date';
        if(mode==='requested endpoint')saved.records[0].getUp=point(view.date,'09:20');
        if(mode==='preserved endpoint')saved.records[0].sleepOnset=point('2026-08-09','22:00');
        if(mode==='other record')saved.records[1].getUp=point('2026-08-09','09:20');
        if(mode==='Vault binding')saved.targetBinding='different-vault';
        return saved;
      }
      return invoke(command,args);
    };
    dialog.querySelector('form').requestSubmit();await new Promise(resolve=>setTimeout(resolve,20));
    const status=dialog.querySelector('[role=status]'),english=status.textContent,diagnostic=status.dataset.i18nError;
    responses.set_interface_language={interfaceLanguage:'zh'};document.querySelector('#workspace-language').click();
    await until(()=>document.documentElement.lang.startsWith('zh'));
    const chinese=status.textContent;
    responses.set_interface_language={interfaceLanguage:'en'};document.querySelector('#workspace-language').click();
    await until(()=>document.documentElement.lang.startsWith('en'));
    return JSON.stringify({open:dialog.open,content:input.value,status:english,chinese,englishAgain:status.textContent,diagnostic,changedEvents,errors:window.probeErrors});
  `);
  assert.equal(result.open,true,'an unrelated or changed readback must not close the editor as saved');
  assert.equal(result.content,'08:20');
  assert.match(result.status,/readback changed|readback could not be confirmed/i);
  assert.match(result.chinese,/文档已保存，但读回结果已经变化|作息已保存，但无法确认读回/);
  assert.equal(result.englishAgain,result.status);
  assert.ok(result.diagnostic);
  assert.equal(result.changedEvents,0);
  assert.deepEqual(result.errors,[]);
 });
}

test('sleep save recovery diagnostics switch language without changing paths or OS details', {skip:process.platform!=='darwin'},()=>{
 const diagnostic='作息正本操作失败：Not a directory (os error 20); rollback also failed (作息正本操作失败：Permission denied: 原始尾串 (os error 13)); the actual displaced sleep-record document inode remains linked at /synthetic/life/作息: 原文.snapshot';
 const path='/synthetic/life/作息: 原文.snapshot',os='Permission denied: 原始尾串 (os error 13)';
 const moreCases=[
  {raw:`作息正本操作失败：${os}; the complete sleep-record document is present at ${path} and can be verified by refreshing`,zh:'完整的作息正本位于',en:'the complete sleep-record document',opaque:[path,os]},
  {raw:`The new sleep-record document is active, but its temporary hard link remains at ${path}: ${os}`,zh:'临时硬链接仍保留在',en:'temporary hard link remains',opaque:[path,os]},
  {raw:`作息正本操作失败：${os}; activation was rolled back and the rejected sleep-record candidate remains at ${path}`,zh:'启用已回滚',en:'activation was rolled back',opaque:[path,os]},
  {raw:`Could not verify the displaced sleep-record document after atomic exchange; its durable recovery link remains at ${path}: ${os}`,zh:'无法验证移出的作息正本',en:'Could not verify the displaced sleep-record document',opaque:[path,os]},
  {raw:`Could not verify the sleep-record document after atomic exchange; the actual displaced inode remains recoverable at ${path}: ${os}`,zh:'实际移出的 inode 仍可恢复',en:'the actual displaced inode remains recoverable',opaque:[path,os]},
  {raw:`作息正本操作失败：${os}; the displaced external sleep-record document remains at ${path} for recovery`,zh:'移出的外部作息正本仍保留在',en:'the displaced external sleep-record document',opaque:[path,os]},
  {raw:'作息正本已在外部发生变化。请刷新 Today 或 Habits 后再保存；外部内容未被覆盖。',zh:'外部内容未被覆盖',en:'The canonical sleep document changed externally',opaque:[]},
  {raw:`作息正本在保存边界发生了并发变化。未静默丢弃交错内容；恢复副本保存在 ${path}。请检查后刷新 Today 或 Habits。`,zh:'未静默丢弃交错内容',en:'Interleaved content was not silently discarded',opaque:[path]},
  {raw:'作息已保存，但无法确认读回：作息正本无效：unknown field `用户:key` at line 4',zh:'作息正本无效',en:'The sleep document is invalid: unknown field `用户:key` at line 4',opaque:['unknown field `用户:key` at line 4']},
 ];
 const result=probe(969,`
  responses.sleep_records={targetBinding:'sleep-error-vault',revision:'sleep-error-revision',records:[{id:'night',wakeDate:view.date,sleepOnset:{kind:'text',date:'2026-08-09',text:'用户原文 rollback also failed'},getUp:{kind:'point',date:view.date,time:'07:20',utcOffsetMinutes:-240,approximate:false},estimatedDurationMinutes:null}]};
  let diagnostic=${JSON.stringify(diagnostic)};
  const invoke=window.__TAURI__.core.invoke;
  window.__TAURI__.core.invoke=async(command,args)=>{
    if(command==='save_sleep_record')throw new Error(diagnostic);
    if(command==='set_interface_language')return {interfaceLanguage:args.interfaceLanguage};
    return invoke(command,args);
  };
  document.querySelector('#refresh-today').click();
  await until(()=>document.querySelector('#today-sleep-summary button')?.textContent.includes('2026-08-10'));
  document.querySelector('#today-sleep-summary button').click();
  await until(()=>document.querySelector('.sleep-editor form'));
  const dialog=document.querySelector('.sleep-editor');
  dialog.querySelector('input[aria-label="Get-up time · Time"]').value='08:20';
  dialog.querySelector('form').requestSubmit();
  await until(()=>dialog.querySelector('[role=status]').textContent);
  const status=dialog.querySelector('[role=status]');
  const english=status.textContent;
  document.querySelector('#workspace-language').click();
  await until(()=>document.documentElement.lang.startsWith('zh'));
  const chinese=status.textContent;
  document.querySelector('#workspace-language').click();
  await until(()=>document.documentElement.lang.startsWith('en'));
  const first={english,chinese,englishAgain:status.textContent,diagnostic:status.dataset.i18nError};
  const more=[];
  for(const [index,fixture] of ${JSON.stringify(moreCases)}.entries()){
    diagnostic=fixture.raw;
    dialog.querySelector('input[aria-label="Get-up time · Time"]').value='08:'+String(21+index);
    dialog.querySelector('form').requestSubmit();
    await until(()=>status.dataset.i18nError==='Error: '+fixture.raw);
    const en=status.textContent;
    document.querySelector('#workspace-language').click();
    await until(()=>document.documentElement.lang.startsWith('zh'));
    const zh=status.textContent;
    document.querySelector('#workspace-language').click();
    await until(()=>document.documentElement.lang.startsWith('en'));
    more.push({en,zh,enAgain:status.textContent,diagnostic:status.dataset.i18nError});
  }
  return JSON.stringify({...first,more,reported:dialog.querySelector('input[aria-label="Sleep onset · Original wording"]').value,open:dialog.open,errors:window.probeErrors});
 `);
 assert.match(result.chinese,/回滚也失败/);
 assert.ok(!result.chinese.includes('rollback also failed'));
 assert.match(result.english,/The canonical sleep operation failed: Not a directory \(os error 20\); rollback also failed \(The canonical sleep operation failed: Permission denied: 原始尾串 \(os error 13\)\)/);
 assert.ok(!result.english.includes('作息正本操作失败'));
 for(const rendered of [result.chinese,result.english]){
  assert.ok(rendered.includes('/synthetic/life/作息: 原文.snapshot'));
  assert.ok(rendered.includes('Permission denied: 原始尾串 (os error 13)'));
 }
 assert.equal(result.englishAgain,result.english);
 assert.equal(result.diagnostic,'Error: '+diagnostic);
 assert.equal(result.reported,'用户原文 rollback also failed');
 for(const [index,fixture] of moreCases.entries()){
  const rendered=result.more[index];
  assert.ok(rendered.en.includes(fixture.en),rendered.en);
  assert.ok(rendered.zh.includes(fixture.zh),rendered.zh);
  assert.ok(!rendered.en.includes('作息正本操作失败')&&!rendered.en.includes('作息正本无效'),rendered.en);
  for(const original of fixture.opaque)for(const localized of [rendered.en,rendered.zh])assert.ok(localized.includes(original),localized);
  assert.equal(rendered.enAgain,rendered.en);
  assert.equal(rendered.diagnostic,'Error: '+fixture.raw);
 }
 assert.equal(result.open,true);
 assert.deepEqual(result.errors,[]);
});

const midnightBoundary = `
 let observedClock={date:'2026-08-10',livedDate:'2026-08-10',time:'23:59'};
 let allowClockTimer=false,clockTicks=0;
 const realSetInterval=window.setInterval.bind(window);
 window.setInterval=(callback,delay,...args)=>realSetInterval(()=>{
   if(delay!==60000||allowClockTimer)callback(...args);
 },delay===60000?10:delay);
 const baseInvoke=window.__TAURI__.core.invoke;
 const point=(date,time)=>({kind:'point',date,time,utcOffsetMinutes:-240,approximate:false});
 responses.sleep_records={targetBinding:'midnight-sleep',revision:'sleep-1',records:[
  {id:'night-10',wakeDate:'2026-08-10',sleepOnset:point('2026-08-09','22:10'),getUp:point('2026-08-10','06:10'),estimatedDurationMinutes:480},
  {id:'night-11',wakeDate:'2026-08-11',sleepOnset:point('2026-08-10','23:25'),getUp:point('2026-08-11','08:25'),estimatedDurationMinutes:540},
 ]};
 window.__TAURI__.core.invoke=async(command,args)=>{
  if(command==='today_clock'){
   if(allowClockTimer){allowClockTimer=false;clockTicks++;}
   return structuredClone(observedClock);
  }
  return baseInvoke(command,args);
 };
`;

test('the real clock timer advances current sleep at midnight without rerendering a dirty Daily Record', {skip:process.platform!=='darwin'},()=>{
 const result=probe(969,`
  await until(()=>document.querySelector('#today-sleep-summary button')?.textContent.includes('06:10'));
  const input=document.querySelector('#today-daytime-content');
  input.value='未保存的日记录 draft across midnight';input.dispatchEvent(new Event('input',{bubbles:true}));
  const before={summary:document.querySelector('#today-sleep-summary button').textContent,reads:calls.filter(c=>c.command==='sleep_records').length,records:calls.filter(c=>['today_view','read_daily_view'].includes(c.command)).length};
  observedClock={date:'2026-08-11',livedDate:'2026-08-10',time:'00:01'};
  allowClockTimer=true;await until(()=>clockTicks===1);
  await new Promise(resolve=>setTimeout(resolve,40));
  const midnight={summary:document.querySelector('#today-sleep-summary button').textContent,reads:calls.filter(c=>c.command==='sleep_records').length};
  observedClock={...observedClock,time:'00:02'};allowClockTimer=true;await until(()=>clockTicks===2);
  await new Promise(resolve=>setTimeout(resolve,30));
  const sameDateReads=calls.filter(c=>c.command==='sleep_records').length;
  observedClock={date:'2026-08-11',livedDate:'2026-08-11',time:'04:00'};allowClockTimer=true;await until(()=>clockTicks===3);
  await until(()=>document.querySelector('#today-sleep-summary button').textContent.includes('06:10'));
  const pinned={summary:document.querySelector('#today-sleep-summary button').textContent,date:document.querySelector('#today-date').textContent};
  observedClock={date:'2026-08-12',livedDate:'2026-08-11',time:'00:01'};allowClockTimer=true;await until(()=>clockTicks===4);
  await new Promise(resolve=>setTimeout(resolve,30));
  return JSON.stringify({before,midnight,sameDateReads,pinned,summary:document.querySelector('#today-sleep-summary button').textContent,input:input.value,sameInput:input===document.querySelector('#today-daytime-content'),reads:calls.filter(c=>c.command==='sleep_records').length,records:calls.filter(c=>['today_view','read_daily_view'].includes(c.command)).length,errors:window.probeErrors});
 `,true,758,{},midnightBoundary);
 assert.match(result.before.summary,/2026-08-10.*22:10.*06:10/);
 assert.match(result.midnight.summary,/2026-08-11.*23:25.*08:25/);
 assert.match(result.pinned.summary,/2026-08-10.*22:10.*06:10/);
 assert.match(result.pinned.date,/2026-08-10/);
 assert.equal(result.summary,result.pinned.summary,'the pinned historical date must not drift at another midnight');
 assert.equal(result.sameDateReads,result.midnight.reads,'ordinary same-date ticks must not reread sleep');
 assert.equal(result.input,'未保存的日记录 draft across midnight');
 assert.equal(result.sameInput,true);
 assert.equal(result.records,result.before.records,'sleep rollover must not refresh the Daily Record');
 assert.equal(result.midnight.reads,result.before.reads+1);
 assert.equal(result.reads,result.before.reads+2,'only midnight and the historical pin change sleep dates');
 assert.deepEqual(result.errors,[]);
});


test('a midnight timer supersedes an unresolved summary clock without accepting its late date', {skip:process.platform!=='darwin'},()=>{
 const result=probe(969,`
  await until(()=>document.querySelector('#today-sleep-summary button')?.textContent.includes('06:10'));
  const invoke=window.__TAURI__.core.invoke;let releaseClock,holdClock=true;
  window.__TAURI__.core.invoke=async(command,args)=>{
   if(command==='today_clock'&&holdClock){holdClock=false;return new Promise(resolve=>{releaseClock=()=>resolve({date:'2026-08-10',livedDate:'2026-08-10',time:'23:59'});});}
   return invoke(command,args);
  };
  document.querySelector('#refresh-today').click();await until(()=>releaseClock);
  observedClock={date:'2026-08-11',livedDate:'2026-08-10',time:'00:01'};allowClockTimer=true;
  await until(()=>clockTicks===1&&document.querySelector('#today-sleep-summary button').textContent.includes('08:25'));
  const current=document.querySelector('#today-sleep-summary button').textContent;
  releaseClock();await new Promise(resolve=>setTimeout(resolve,30));
  return JSON.stringify({current,after:document.querySelector('#today-sleep-summary button').textContent,errors:window.probeErrors});
 `,true,758,{},midnightBoundary);
 assert.match(result.current,/2026-08-11.*23:25.*08:25/);
 assert.equal(result.after,result.current);
 assert.deepEqual(result.errors,[]);
});

test('a late periodic clock cannot move an explicitly selected historical sleep day', {skip:process.platform!=='darwin'},()=>{
 const result=probe(969,`
  await until(()=>document.querySelector('#today-sleep-summary button')?.textContent.includes('06:10'));
  responses.sleep_records.records.push({id:'night-9',wakeDate:'2026-08-09',sleepOnset:point('2026-08-08','21:09'),getUp:point('2026-08-09','05:09'),estimatedDurationMinutes:480});
  const invoke=window.__TAURI__.core.invoke;let releaseClock,holdClock=true;
  window.__TAURI__.core.invoke=async(command,args)=>{
   if(command==='today_clock'&&allowClockTimer&&holdClock){holdClock=false;allowClockTimer=false;clockTicks++;return new Promise(resolve=>{releaseClock=()=>resolve({date:'2026-08-11',livedDate:'2026-08-10',time:'00:01'});});}
   if(command==='calendar_month')return {...month,year:2026,month:8,days:[{...month.days[0],date:'2026-08-09',inMonth:true,availability:'missing'}]};
   if(['read_daily_view','daily_view'].includes(command)&&args?.date)return {...structuredClone(view),date:args.date,isToday:false};
   return invoke(command,args);
  };
  allowClockTimer=true;await until(()=>releaseClock);
  document.querySelector('[data-workspace-destination="calendar"]').click();
  await until(()=>document.querySelector('button[data-calendar-date="2026-08-09"]'));
  document.querySelector('button[data-calendar-date="2026-08-09"]').click();
  await until(()=>document.querySelector('#calendar-summary-heading').textContent.includes('9')&&!document.querySelector('#calendar-open-day').disabled);
  document.querySelector('#calendar-open-day').click();
  await until(()=>document.querySelector('#today-sleep-summary button')?.textContent.includes('05:09'));
  const historical=document.querySelector('#today-sleep-summary button').textContent;
  releaseClock();await new Promise(resolve=>setTimeout(resolve,30));
  observedClock={date:'2026-08-11',livedDate:'2026-08-10',time:'00:02'};allowClockTimer=true;await until(()=>clockTicks===2);
  await new Promise(resolve=>setTimeout(resolve,30));
  return JSON.stringify({historical,after:document.querySelector('#today-sleep-summary button').textContent,errors:window.probeErrors});
 `,true,758,{},midnightBoundary);
 assert.match(result.historical,/2026-08-09.*21:09.*05:09/);
 assert.equal(result.after,result.historical);
 assert.deepEqual(result.errors,[]);
});

test('a Vault reset rejects a late sleep read started by the midnight timer', {skip:process.platform!=='darwin'},()=>{
 const result=probe(969,`
  await until(()=>document.querySelector('#today-sleep-summary button')?.textContent.includes('06:10'));
  const invoke=window.__TAURI__.core.invoke;let releaseSleep,holdSleep=true;
  window.__TAURI__.core.invoke=async(command,args)=>{
   if(command==='sleep_records'&&holdSleep){holdSleep=false;const old=structuredClone(responses.sleep_records);return new Promise(resolve=>{releaseSleep=()=>resolve(old);});}
   if(command==='select_today_vault'){
    responses.sleep_records={targetBinding:'sleep-vault-b',revision:'b',records:[{id:'b-night',wakeDate:'2026-08-09',sleepOnset:point('2026-08-08','20:05'),getUp:point('2026-08-09','05:05'),estimatedDurationMinutes:540}]};
    return {changed:true,view:{...structuredClone(view),date:'2026-08-09',isToday:false,targetBinding:'vault-b',tasks:{...view.tasks,targetBinding:'tasks-vault-b'}}};
   }
   return invoke(command,args);
  };
  observedClock={date:'2026-08-11',livedDate:'2026-08-10',time:'00:01'};allowClockTimer=true;await until(()=>releaseSleep);
  document.querySelector('#select-today-vault').click();
  await until(()=>document.querySelector('#today-sleep-summary button')?.textContent.includes('05:05'));
  const current=document.querySelector('#today-sleep-summary button').textContent;
  releaseSleep();await new Promise(resolve=>setTimeout(resolve,30));
  return JSON.stringify({current,after:document.querySelector('#today-sleep-summary button').textContent,errors:window.probeErrors});
 `,true,758,{},midnightBoundary);
 assert.match(result.current,/2026-08-09.*20:05.*05:05/);
 assert.equal(result.after,result.current);
 assert.deepEqual(result.errors,[]);
});
