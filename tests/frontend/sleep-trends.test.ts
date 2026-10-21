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
