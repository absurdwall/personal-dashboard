import assert from 'node:assert/strict';
import test from 'node:test';
import {probe} from './helpers/complete-page.ts';

// Only the public IPC boundary is substituted; the compiled shipped page, CSS,
// event handlers and WebKit layout run unchanged.
const canonicalBoundary=String.raw`
  const point=(date,time,approximate=false)=>({kind:'point',date,time,utcOffsetMinutes:-240,approximate});
  const fact=(recordId,habitKey,livedDate,endpoint)=>({recordId,habitKey,livedDate,endpoint,dayRelation:endpoint.kind==='point'&&endpoint.date!==livedDate?'next-day':'same-day'});
  let sleepState={targetBinding:'sleep-target',revision:'sleep-r1',records:[
    {id:'night-a',wakeDate:'2026-06-30',sleepOnset:point('2026-08-08','23:50'),getUp:point('2026-08-09','07:20'),estimatedDurationMinutes:450},
    {id:'night-b',wakeDate:'2026-08-10',sleepOnset:point('2026-08-10','00:10',true),getUp:point('2026-08-10','08:10'),estimatedDurationMinutes:480}
  ],facts:[
    fact('night-a','sleep','2026-08-08',point('2026-08-08','23:50')),
    fact('night-a','wake','2026-08-09',point('2026-08-09','07:20')),
    fact('night-b','sleep','2026-08-09',point('2026-08-10','00:10',true)),
    fact('night-b','wake','2026-08-10',point('2026-08-10','08:10')),
    fact('range','sleep','2026-08-06',{kind:'range',start:point('2026-08-06','23:00'),end:point('2026-08-07','01:00'),reportedText:'Reported range'}),
    fact('original','wake','2026-08-06',{kind:'text',date:'2026-08-06',text:'Eight-ish, no clock'}),
    fact('unknown','sleep','2026-08-07',{kind:'unknown'})
  ]};
  // Literal public backend-projection fixtures. Rust workflow tests independently
  // establish pairing/statistics; these page tests verify rendering and updates.
  const overviewFixture=()=>{
    const ids=sleepState.facts.map(f=>f.recordId);
    const onset=ids.includes('near-before')?{count:2,mean:240,earliest:230,latest:250,approximate:false}:
      ids.includes('antipodal-a')?{count:2,mean:null,earliest:0,latest:720,approximate:false}:
      ids.includes('only-point')?{count:1,mean:250,earliest:null,latest:null,approximate:false}:
      !ids.length?{count:0,mean:null,earliest:null,latest:null,approximate:false}:
      {count:2,mean:0,earliest:-10,latest:10,approximate:true};
    const durations=[{date:'2026-08-09',minutes:450,approximate:false,onset:point('2026-08-08','23:50'),getUp:point('2026-08-09','07:20')},{date:'2026-08-10',minutes:480,approximate:true,onset:point('2026-08-10','00:10',true),getUp:point('2026-08-10','08:10')}];
    const statistics=['wake','sleep','duration'].flatMap(metric=>[7,30].map(period=>({metric,period,earliestApproximate:false,latestApproximate:metric==='sleep'||metric==='duration',...(metric==='sleep'?onset:metric==='duration'?(sleepState.records[0]?.estimatedDurationMinutes===479?{count:2,mean:480,earliest:479,latest:480,approximate:true}:{count:2,mean:465,earliest:450,latest:480,approximate:true}):{count:2,mean:465,earliest:440,latest:490,approximate:false})})));
    return {date:view.date,durations,statistics};
  };
  const ds=Array.from({length:7},(_,i)=>'2026-08-'+String(4+i).padStart(2,'0'));
  const cell=(key,date)=>({date,coverage:'complete',status:'thresholdOnly',hasRecord:true,countsAsCompletion:true,localCompletionState:'none',hasExternalCompletion:true,completionSourceLabels:['Synthetic threshold'],actualTimeLabel:null,sleepFact:sleepState.facts.find(f=>f.habitKey===key&&f.livedDate===date)??null,details:[{kind:'localRecord',sourceLabel:'Synthetic source',text:'Retained source evidence'}],localRecords:[]});
  let habit=(key)=>({key,name:key==='wake'?'Wake up':key==='sleep'?'Go to bed':'Reading',localizedNames:{zh:key==='wake'?'起床':key==='sleep'?'睡觉':'阅读'},active:true,canRecordCompletion:key==='reading',goalKind:key==='reading'?'weekly-count':'daily-time',goalLabel:'Source target',goalTarget:null,definition:null,weeklyTarget:key==='reading'?3:null,completedCount:2,sourceLabels:['Synthetic threshold'],coverageLabel:'complete',goalHistory:[],today:cell(key,view.date),recent:ds.map(date=>cell(key,date)),history:Array.from({length:84},(_,i)=>cell(key,new Date(Date.UTC(2026,4,19+i)).toISOString().slice(0,10)))});
  const habitSnapshotFixture=()=>({state:'ready',message:'Synthetic coverage',livedDate:view.date,generatedAt:view.date+'T09:00:00-04:00',displayRangeLabel:'2026-08-04 — 2026-08-10',rangeLabel:'2026-08-04 — 2026-08-10',producerLabel:'Synthetic producer',completionRevision:'completions-r1',completionTargetBinding:'completion-target',catalogRevision:null,catalogTargetBinding:'catalog-target',catalogError:null,completionError:null,namesConfigurationState:'ready',summary:{knownCompletions:3,targetCompletions:5,coverageNote:'Source evidence preserved',excludedNoGoal:0},habits:['wake','sleep','reading'].map(habit)});
  view.habitTimeHabits=['wake','sleep'].map(key=>({key,name:habit(key).name,localizedNames:habit(key).localizedNames}));
  view.habitCorrections={...view.habitCorrections,habits:['wake','sleep','reading'].map(key=>({key,name:habit(key).name,localizedNames:habit(key).localizedNames,nameKnown:true,canRecordCompletion:key==='reading',goalLabel:'Source target',localChangeCount:0,localChanges:[],cell:cell(key,view.date)}))};
  const invoke=window.__TAURI__.core.invoke;
  window.__TAURI__.core.invoke=async(command,args)=>{
    if(command==='sleep_records'){calls.push({command,args});return structuredClone({...sleepState,overview:overviewFixture()});}
    if(command==='habit_snapshot'){calls.push({command,args});return structuredClone(habitSnapshotFixture());}
    if(command==='habit_detail_history'){calls.push({command,args});return {habit:habit(args.habitKey),snapshotState:'ready',snapshotGeneratedAt:view.date,snapshotRange:'Source range',canonicalState:'missing',canonicalRevision:null,canonicalError:null,localCompletions:[],statistics:{monthAttainedDays:2,monthExact:true,cumulativeAttainedDays:2,cumulativeExact:true,currentStreak:null,highestConfirmedStreak:null,highestHistoryExact:false,streakUnit:'days',coverageFrom:'2026-08-04',coverageTo:view.date}};}
    if(command==='read_daily_view'||command==='daily_view'){
      calls.push({command,args});const dated=structuredClone(view);dated.date=args.date;dated.isToday=args.date===view.date;dated.habitCorrections.date=args.date;dated.habitCorrections.habits.forEach(h=>h.cell=cell(h.key,args.date));return dated;
    }
    if(command==='save_habit_sleep_time'){
      calls.push({command,args});const input=args.input;
      sleepState={...sleepState,revision:'sleep-r2',facts:[...sleepState.facts.filter(f=>f.habitKey!==input.habitKey||f.livedDate!==input.livedDate),fact(input.recordId??'new-night',input.habitKey,input.livedDate,input.endpoint)]};return structuredClone(sleepState);
    }
    return invoke(command,args);
  };
`;
const navigate=String.raw`
  document.querySelector('[data-workspace-destination="habits"]').click();
  await until(()=>document.querySelector('.habit-snapshot-row[data-habit-key="wake"]'));
`;

test('explicit language and range transitions reveal resized sleep plots while background reads preserve history position',{skip:process.platform!=='darwin'},()=>{
  const result=probe(1280,navigate+`
    document.querySelector('[data-habit-open="sleep"]').click();await until(()=>document.querySelector('[data-sleep-overview]'));
    document.querySelector('[data-sleep-period="30"]').click();
    document.querySelector('#workspace-language').click();await until(()=>document.documentElement.lang.startsWith('zh'));
    window.webkit.messageHandlers.resizeViewport.postMessage({width:830,height:758});
    await until(()=>innerWidth===830&&document.querySelector('.workspace-information').getBoundingClientRect().right<=830);
    document.querySelector('[data-sleep-period="7"]').click();
    const surface=document.querySelector('.workspace-information');
    const geometry=()=>({chart:rect(document.querySelector('[data-sleep-chart="detail"]')),viewport:rect(surface)});
    const seven=geometry();surface.scrollTop=0;
    document.querySelector('button[data-sleep-metric="duration"]').click();const metric=geometry();
    surface.scrollTop=Math.max(0,surface.scrollTop-30);const readingPosition=surface.scrollTop;
    const reads=calls.filter(c=>c.command==='sleep_records').length,beforeRefresh=document.querySelector('[data-sleep-overview]');
    document.querySelector('#refresh-habits').click();
    await until(()=>calls.filter(c=>c.command==='sleep_records').length>reads&&document.querySelector('[data-sleep-overview]')!==beforeRefresh&&document.querySelector('#habit-detail-status').textContent==='');
    return JSON.stringify({seven,metric,readingPosition,afterRefresh:surface.scrollTop,period:document.querySelector('[data-sleep-period="7"]').getAttribute('aria-pressed'),errors:window.probeErrors});
  `,true,720,{},canonicalBoundary+`
    const languageInvoke=window.__TAURI__.core.invoke;window.__TAURI__.core.invoke=async(command,args)=>command==='set_interface_language'?{interfaceLanguage:args.interfaceLanguage}:languageInvoke(command,args);
  `);
  for(const state of [result.seven,result.metric]){assert.ok(state.chart.top>=state.viewport.top);assert.ok(state.chart.bottom<=state.viewport.bottom+1,'explicit action must expose full chart: '+JSON.stringify(state));}
  assert.equal(result.afterRefresh,result.readingPosition,'background read must not reset history reading position');assert.equal(result.period,'true');assert.deepEqual(result.errors,[]);
});

for(const [width,height]of [[830,758],[969,723],[1280,720]])for(const language of ['en','zh']){
  test(`opening sleep detail exposes controls and entire plot without blanking summary at ${width} ${language}`,{skip:process.platform!=='darwin'},()=>{
    const result=probe(width,navigate+`
      document.querySelector('[data-sleep-chart="mini"] [data-habit-date="2026-08-10"]').focus();
      document.querySelector('[data-habit-open="wake"]').click();await until(()=>document.querySelector('[data-sleep-overview]'));
      const surface=document.querySelector('.workspace-information');
      const geometry=()=>({surface:rect(surface),summary:rect(document.querySelector('.habits-week-summary')),summaryText:document.querySelector('#habits-summary-total').textContent,heading:rect(document.querySelector('.habit-detail-heading')),chart:rect(document.querySelector('[data-sleep-chart="detail"]')),tab:rect(document.querySelector('button[data-sleep-metric="wake"]')),range:rect(document.querySelector('[data-sleep-period="30"]'))});
      const first=geometry();const thirty=document.querySelector('[data-sleep-period="30"]');thirty.focus();thirty.click();
      return JSON.stringify({first,thirty:geometry(),errors:window.probeErrors});
    `,true,height,{interface_language_preferences:{interfaceLanguage:language}},canonicalBoundary+`
      const normalHabit=habit;habit=key=>({...normalHabit(key),name:'Wake up and prepare quietly for the entire morning',localizedNames:{zh:'起床并留出安静的早间准备时间'}});
    `);
    for(const state of [result.first,result.thirty]){
      for(const part of ['heading','chart','tab','range']){
        assert.ok(state[part].top>=state.surface.top-1,part+' must start within the scroll viewport');
        assert.ok(state[part].bottom<=state.surface.bottom+1,part+' must fit initial scroll viewport: '+JSON.stringify(state));
      }
      assert.equal(state.summaryText,'3 / 5');
      if(width>900){assert.ok(state.summary.top>=state.surface.top-1,'side summary stays visible');assert.ok(state.summary.top<state.chart.top);}
    }
    assert.deepEqual(result.errors,[]);
  });
  test(`actual sleep values remain word-safe and bounded for all precisions at ${width} ${language}`,{skip:process.platform!=='darwin'},()=>{
    const result=probe(width,navigate+`
      const states=[null,{kind:'unknown'},point(view.date,'07:30'),point(view.date,'07:30',true),point('2026-08-11','02:00'),{kind:'range',start:point(view.date,'07:00'),end:point(view.date,'08:00'),reportedText:'Between seven and eight'},{kind:'text',date:view.date,text:'LongOriginalTokenWithoutSpacesToExerciseClamping plus the entire original wording'}];
      const results=[];
      for(const endpoint of states){
        sleepState={...sleepState,facts:endpoint?[fact('current','wake',view.date,endpoint)]:[],revision:'state-'+results.length};
        const reads=calls.filter(c=>c.command==='sleep_records').length;
        document.querySelector('#refresh-habits').click();await until(()=>calls.filter(c=>c.command==='sleep_records').length>reads);
        const expected=require('./sleep-facts.js').formatSleepEndpoint(endpoint?fact('current','wake',view.date,endpoint):null,document.documentElement.lang.startsWith('zh')?'zh':'en');
        await until(()=>document.querySelector('.habit-snapshot-row[data-habit-key="wake"] .habit-snapshot-value strong').textContent===expected);
        const value=document.querySelector('.habit-snapshot-row[data-habit-key="wake"] .habit-snapshot-value strong');
        const range=document.createRange();range.selectNodeContents(value);
        results.push({kind:endpoint?.kind??'missing',text:value.textContent,title:value.title,box:rect(value),lines:[...range.getClientRects()].map(r=>({top:r.top,width:r.width})),lineHeight:parseFloat(getComputedStyle(value).lineHeight),overflow:document.documentElement.scrollWidth>innerWidth});
      }
      return JSON.stringify({results,errors:window.probeErrors});
    `,true,height,{interface_language_preferences:{interfaceLanguage:language}},canonicalBoundary+`
      const normalHabit=habit;habit=key=>({...normalHabit(key),name:'A very long renamed Habit with preserved source context',localizedNames:{zh:'起床并保留一段安静的早间准备时间'}});
    `);
    for(const state of result.results){
      assert.equal(state.text,state.title,'full formatted evidence stays available');assert.equal(state.overflow,false);
      assert.ok(state.box.height<=(state.lineHeight||16)*3+1,'actual slot remains bounded: '+JSON.stringify(state));
      if(state.kind==='missing')assert.equal(new Set(state.lines.map(line=>line.top)).size,1,'Unrecorded must not split midword');
      if(state.kind!=='text')assert.ok(state.lines.every(line=>line.width<=state.box.width+1),'clock/state glyphs must not be clipped horizontally: '+JSON.stringify(state));
    }
    assert.deepEqual(result.errors,[]);
  });
}

test('original sleep rows show weekday/clock trends and missing dates while preserving ordinary Habit evidence', {skip:process.platform!=='darwin'},()=>{
  const result=probe(969,navigate+`
    const rows=['wake','sleep'].map(key=>{
      const row=document.querySelector('.habit-snapshot-row[data-habit-key="'+key+'"]');
      const chart=row.querySelector('[data-sleep-chart="mini"]');
      return {dates:chart?.querySelectorAll('button[data-habit-date]').length??0,ticks:chart?.querySelectorAll('.habit-sleep-tick').length??0,cells:row.querySelectorAll('.habit-recent .habit-cell').length,gap:chart?.querySelector('[data-habit-date="2026-08-04"]')?.getAttribute('aria-label').includes('Unrecorded')??false};
    });
    return JSON.stringify({rows,ordinary:document.querySelectorAll('[data-habit-key="reading"] .habit-recent .habit-cell').length,summary:document.querySelector('#habits-summary-total').textContent,errors:window.probeErrors});
  `,true,723,{},canonicalBoundary);
  assert.deepEqual(result.rows,[{dates:7,ticks:3,cells:0,gap:true},{dates:7,ticks:3,cells:0,gap:true}]);
  assert.equal(result.ordinary,7);assert.equal(result.summary,'3 / 5');assert.deepEqual(result.errors,[]);
});

test('both Habit entries share a bounded overview with truthful circular clock and same-record elapsed statistics', {skip:process.platform!=='darwin'},()=>{
  const result=probe(969,navigate+`
    document.querySelector('[data-habit-open="wake"]').click();
    await until(()=>document.querySelector('#habit-detail-content .habit-detail-intro'));
    const overview=document.querySelector('[data-sleep-overview]');
    const wakeDefault=overview?.dataset.sleepMetric??null;
    overview?.querySelector('[data-sleep-metric="sleep"]')?.click();
    document.querySelector('[data-sleep-period="30"]')?.click();
    const selected=()=>document.querySelector('[data-sleep-overview]');
    const onset={metric:selected()?.dataset.sleepMetric,days:selected()?.querySelectorAll('[data-sleep-chart="detail"] button[data-habit-date]').length??0,count:selected()?.querySelector('[data-sleep-stat="count"] strong')?.textContent,mean:selected()?.querySelector('[data-sleep-stat="mean"] strong')?.textContent};
    document.querySelector('[data-sleep-metric="duration"]')?.click();
    const elapsed={count:selected()?.querySelector('[data-sleep-stat="count"] strong')?.textContent,mean:selected()?.querySelector('[data-sleep-stat="mean"] strong')?.textContent,wakeDay:selected()?.querySelector('[data-sleep-chart="detail"] [data-habit-date="2026-08-09"]')?.getAttribute('aria-label')};
    document.querySelector('#habit-detail-back').click();document.querySelector('[data-habit-open="sleep"]').click();
    await until(()=>document.querySelector('#habit-detail-heading').textContent.includes('Go to bed'));
    return JSON.stringify({wakeDefault,onset,elapsed,sleepDefault:document.querySelector('[data-sleep-overview]')?.dataset.sleepMetric??null,errors:window.probeErrors});
  `,true,723,{},canonicalBoundary);
  assert.equal(result.wakeDefault,'wake');assert.equal(result.sleepDefault,'sleep');
  assert.equal(result.onset.metric,'sleep');assert.equal(result.onset.days,30);assert.equal(result.onset.count,'2 / 30');assert.match(result.onset.mean,/about 00:00/i);
  assert.equal(result.elapsed.count,'2 / 30');assert.match(result.elapsed.mean,/about 7 h 45 min/i);assert.match(result.elapsed.wakeDay,/7 h 30 min/);assert.deepEqual(result.errors,[]);
});

test('missing and older dates retain inline evidence then explicitly focus the exact Today editor and refresh after save', {skip:process.platform!=='darwin'},()=>{
  const result=probe(969,navigate+`
    document.querySelector('[data-sleep-chart="mini"] [data-habit-key="sleep"][data-habit-date="2026-08-05"]').click();
    await until(()=>document.querySelector('[data-habit-time-open="sleep"][data-habit-time-date="2026-08-05"]'));
    const row=document.querySelector('.habit-snapshot-row[data-habit-key="sleep"]');
    const miniRetained=!row.querySelector('.habit-recent').hidden;
    document.querySelector('[data-habit-time-open="sleep"][data-habit-time-date="2026-08-05"]').click();
    await until(()=>document.querySelector('[data-habit-time-form="sleep"]'));
    const focus=document.activeElement?.hasAttribute('data-habit-time-point')&&document.activeElement?.closest('form')?.dataset.habitTimeForm==='sleep';
    const timeForm=document.querySelector('[data-habit-time-form="sleep"]');timeForm.querySelector('[data-habit-time-point]').value='02:15';timeForm.requestSubmit();
    await until(()=>!document.querySelector('[data-habit-time-form="sleep"]'));
    document.querySelector('[data-workspace-destination="habits"]').click();
    await until(()=>document.querySelector('[data-sleep-chart="mini"] [data-habit-key="sleep"][data-habit-date="2026-08-05"]')?.getAttribute('aria-label').includes('02:15'));
    const updated=document.querySelector('[data-sleep-chart="mini"] [data-habit-key="sleep"][data-habit-date="2026-08-05"]').getAttribute('aria-label');
    document.querySelector('[data-habit-open="sleep"]').click();await until(()=>document.querySelector('[data-sleep-history-date]'));
    const earlier=document.querySelector('[data-sleep-history-date]');earlier.value='2026-02-01';earlier.closest('form').requestSubmit();
    await until(()=>calls.some(c=>c.command==='read_daily_view'&&c.args.date==='2026-02-01'));
    const oldRow=document.querySelector('.habit-snapshot-row[data-habit-key="sleep"]');
    const oldEvidence=oldRow.querySelector('.habit-cell-detail');
    const oldAction=oldRow.querySelector('[data-habit-time-open="sleep"][data-habit-time-date="2026-02-01"]');
    return JSON.stringify({miniRetained,focus,updated,oldInline:oldEvidence?.textContent.includes('2026-02-01')??false,oldAction:Boolean(oldAction),writes:calls.filter(c=>/save_|completion|dated_note/.test(c.command)).map(c=>c.command),errors:window.probeErrors});
  `,true,723,{},canonicalBoundary);
  assert.equal(result.miniRetained,true);assert.equal(result.focus,true);assert.match(result.updated,/next day 02:15/);
  assert.equal(result.oldInline,true);assert.equal(result.oldAction,true);assert.deepEqual(result.writes,['save_habit_sleep_time']);assert.deepEqual(result.errors,[]);
});

test('clock statistics cross the 04:00 ownership boundary without a false noon mean and sparse series never invent a segment', {skip:process.platform!=='darwin'},()=>{
  const result=probe(969,navigate+`
    document.querySelector('[data-habit-open="sleep"]').click();await until(()=>document.querySelector('[data-sleep-overview]'));
    const nearBoundary={mean:document.querySelector('[data-sleep-stat="mean"] strong').textContent,heights:[...document.querySelectorAll('[data-sleep-chart="detail"] circle')].map(n=>Number(n.getAttribute('cy')))};
    const replaceFacts=async(facts)=>{
      sleepState={...sleepState,facts,revision:'revision-'+facts.length+'-'+Math.random()};
      const reads=calls.filter(c=>c.command==='sleep_records').length;
      document.querySelector('#refresh-habits').click();await until(()=>calls.filter(c=>c.command==='sleep_records').length>reads);
      await new Promise(resolve=>setTimeout(resolve,30));
    };
    await replaceFacts([fact('antipodal-a','sleep','2026-08-08',point('2026-08-09','00:00')),fact('antipodal-b','sleep','2026-08-09',point('2026-08-09','12:00'))]);
    const antipodal=document.querySelector('[data-sleep-stat="mean"] strong').textContent;
    await replaceFacts([fact('only-point','sleep','2026-08-09',point('2026-08-09','04:10'))]);
    const single={points:document.querySelectorAll('[data-sleep-chart="detail"] circle').length,segments:document.querySelectorAll('[data-sleep-chart="detail"] polyline').length};
    await replaceFacts([]);
    const empty={points:document.querySelectorAll('[data-sleep-chart="detail"] circle').length,segments:document.querySelectorAll('[data-sleep-chart="detail"] polyline').length,copy:document.querySelector('.habit-sleep-detail-empty')?.textContent,count:document.querySelector('[data-sleep-stat="count"] strong').textContent};
    return JSON.stringify({nearBoundary,antipodal,single,empty,errors:window.probeErrors});
  `,true,723,{},canonicalBoundary+`
    sleepState={...sleepState,facts:[fact('near-before','sleep','2026-08-08',point('2026-08-09','03:50')),fact('near-after','sleep','2026-08-09',point('2026-08-09','04:10'))]};
  `);
  assert.equal(result.nearBoundary.mean,'04:00');assert.ok(Math.abs(result.nearBoundary.heights[0]-result.nearBoundary.heights[1])<15);
  assert.equal(result.antipodal,'—');assert.deepEqual(result.single,{points:1,segments:0});
  assert.deepEqual(result.empty,{points:0,segments:0,copy:'No point times to plot',count:'0 / 7'});assert.deepEqual(result.errors,[]);
});

for(const [width,height]of [[830,758],[969,723],[1280,720]])for(const language of ['en','zh']){
  test(`sleep overview preserves readable aligned dates and one 30-day chart at ${width}×${height} ${language}`,{skip:process.platform!=='darwin'},()=>{
    const result=probe(width,navigate+`
      const sleepRow=document.querySelector('.habit-snapshot-row[data-habit-key="sleep"]');
      const miniChart=sleepRow.querySelector('[data-sleep-chart="mini"]');
      const knownButton=miniChart.querySelector('[data-habit-date="2026-08-09"]');knownButton.focus();
      // The probe's offscreen NSWindow can update activeElement without
      // delivering native focus events. Exercise the public focus event here;
      // the packaged scenario independently drives real keyboard/AX focus.
      knownButton.dispatchEvent(new FocusEvent('focus'));
      const miniTooltip={text:miniChart.querySelector('.habit-sleep-tooltip').textContent,hidden:miniChart.querySelector('.habit-sleep-tooltip').hidden,focused:document.activeElement===knownButton,visible:knownButton.getClientRects().length,style:getComputedStyle(knownButton).visibility,ancestorHidden:knownButton.closest('[hidden]')?.id};
      const gapWidths=[...miniChart.querySelectorAll('.habit-sleep-gap')].filter(n=>n.textContent).map(n=>{const range=document.createRange();range.selectNodeContents(n);return {text:range.getBoundingClientRect().width,box:n.clientWidth};});
      const miniBounds=rect(miniChart),tickBounds=[...miniChart.querySelectorAll('.habit-sleep-tick')].map(rect),dateBounds=[...miniChart.querySelectorAll('button[data-habit-date]')].map(rect);
      document.querySelector('[data-habit-open="sleep"]').click();await until(()=>document.querySelector('[data-sleep-overview]'));document.querySelector('[data-sleep-period="30"]').click();
      const detailChart=document.querySelector('[data-sleep-chart="detail"]'),targetLayer=detailChart.querySelector('.habit-sleep-date-targets');
      const plotBox=rect(detailChart),layerBox=rect(targetLayer);
      return JSON.stringify({miniTooltip,miniBounds,tickBounds,dateBounds,gapWidths,detail:{width:detailChart.clientWidth,scroll:detailChart.scrollWidth,dates:targetLayer.children.length,plotBox,layerBox},overflow:document.documentElement.scrollWidth>innerWidth,errors:window.probeErrors});
    `,true,height,{interface_language_preferences:{interfaceLanguage:language}},canonicalBoundary+`
      const normalHabit=habit;
      const longNames={wake:'Wake up and prepare quietly for the entire morning',sleep:'入睡并保留一段安静的晚间收尾时间'};
      habit=(key)=>({...normalHabit(key),name:longNames[key]??normalHabit(key).name,localizedNames:{zh:key==='wake'?'起床并留出安静的早间准备时间':key==='sleep'?'睡觉并保留安静的晚间收尾时间':'阅读'}});
    `);
    assert.equal(result.miniTooltip.hidden,false,JSON.stringify(result.miniTooltip));assert.match(result.miniTooltip.text,/2026-08-09.*00:10/);
    assert.ok(result.gapWidths.every(g=>g.text<=g.box+1),'permanent missing/precision labels must fit their date columns');
    assert.equal(result.dateBounds.length,7);assert.ok(result.dateBounds.every(d=>d.width>0&&d.top<result.tickBounds[0].top));
    assert.ok(result.tickBounds.every(t=>t.left>=result.miniBounds.left&&t.right<=result.miniBounds.right));
    assert.equal(result.detail.dates,30);assert.ok(result.detail.scroll<=result.detail.width+1);assert.equal(result.overflow,false);
    // SVG's left time-scale gutter is40/600of chart width; targets must use
    // the same geometry at all viewport sizes, not a fixed40CSS pixels.
    const expectedLeft=result.detail.plotBox.left+result.detail.plotBox.width/15;
    assert.ok(Math.abs(result.detail.layerBox.left-expectedLeft)<2,'focus/date targets must align with the plotted dates');
    assert.deepEqual(result.errors,[]);
  });
}

test('out-of-order overview reads and same-named Vault selection never expose the old view', {skip:process.platform!=='darwin'},()=>{
  const result=probe(969,navigate+`
    holdOverview=true;document.querySelector('#refresh-habits').click();await until(()=>pendingOverview.length>0);
    document.querySelector('#workspace-settings').click();document.querySelector('[data-settings-section="data"]').click();document.querySelector('#settings-select-vault').click();
    await until(()=>calls.some(c=>c.command==='select_today_vault'));
    document.querySelector('[data-workspace-destination="habits"]').click();
    await until(()=>document.querySelector('[data-sleep-chart="mini"] [data-habit-key="wake"][data-habit-date="2026-08-10"]')?.getAttribute('aria-label').includes('08:40'));
    pendingOverview.forEach(resolve=>resolve({targetBinding:'old-vault-a',revision:'stale-a',records:[],facts:[fact('old-a','wake',view.date,{kind:'text',date:view.date,text:'OLD_VAULT_PRIVATE_MARKER'})]}));
    await new Promise(resolve=>setTimeout(resolve,35));
    return JSON.stringify({label:document.querySelector('[data-sleep-chart="mini"] [data-habit-key="wake"][data-habit-date="2026-08-10"]').getAttribute('aria-label'),stale:document.body.textContent.includes('OLD_VAULT_PRIVATE_MARKER'),summary:document.querySelector('#habits-summary-total').textContent,errors:window.probeErrors});
  `,true,723,{},canonicalBoundary+`
    view.vaultPath='/Synthetic/A/Shared';view.vaultName='Shared';
    let holdOverview=false;const pendingOverview=[];const overviewInvoke=window.__TAURI__.core.invoke;
    window.__TAURI__.core.invoke=async(command,args)=>{
      if(command==='sleep_records'&&holdOverview){calls.push({command,args});return new Promise(resolve=>pendingOverview.push(resolve));}
      if(command==='select_today_vault'){calls.push({command,args});view.vaultPath='/Synthetic/B/Shared';holdOverview=false;sleepState={targetBinding:'new-vault-b',revision:'b1',records:[],facts:[fact('b','wake',view.date,point(view.date,'08:40'))]};return {view:structuredClone(view),changed:true};}
      return overviewInvoke(command,args);
    };
  `);
  assert.match(result.label,/08:40/);assert.equal(result.stale,false);assert.equal(result.summary,'3 / 5');assert.deepEqual(result.errors,[]);
});

test('an unavailable canonical overview does not masquerade as an empty successful series or erase Habit source evidence', {skip:process.platform!=='darwin'},()=>{
  const result=probe(969,navigate+`
    document.querySelector('[data-habit-open="sleep"]').click();await until(()=>document.querySelector('[data-sleep-overview]'));
    return JSON.stringify({count:document.querySelector('[data-sleep-stat="count"] strong').textContent,error:document.querySelector('.habit-sleep-read-error')?.textContent,actual:document.querySelector('[data-habit-key="sleep"] .habit-snapshot-value').textContent,summary:document.querySelector('#habits-summary-total').textContent,source:document.querySelector('[data-habit-key="reading"]').textContent,writes:calls.filter(c=>/save_|set_habit|dated_note/.test(c.command)).length,errors:window.probeErrors});
  `,true,723,{},canonicalBoundary+`
    const unavailableInvoke=window.__TAURI__.core.invoke;window.__TAURI__.core.invoke=async(command,args)=>{
      if(command==='sleep_records'){calls.push({command,args});throw Error('Synthetic canonical read unavailable');}
      return unavailableInvoke(command,args);
    };
  `);
  assert.equal(result.count,'— / 7');assert.match(result.error,/Synthetic canonical read unavailable/);assert.match(result.actual,/unavailable/i);
  assert.equal(result.summary,'3 / 5');assert.match(result.source,/Synthetic threshold/);assert.equal(result.writes,0);assert.deepEqual(result.errors,[]);
});

test('overview errors follow live interface-language changes', {skip:process.platform!=='darwin'},()=>{
  const result=probe(969,navigate+`
    document.querySelector('[data-habit-open="sleep"]').click();await until(()=>document.querySelector('[data-sleep-overview]'));
    const english=document.querySelector('.habit-sleep-read-error').textContent;
    document.querySelector('#workspace-language').click();await until(()=>document.documentElement.lang.startsWith('zh'));
    const chinese=document.querySelector('.habit-sleep-read-error').textContent;
    return JSON.stringify({english,chinese,errors:window.probeErrors});
  `,true,723,{},canonicalBoundary+`
    const languageInvoke=window.__TAURI__.core.invoke;window.__TAURI__.core.invoke=async(command,args)=>{
      if(command==='sleep_records'){calls.push({command,args});throw '不支持的作息正本版本。';}
      if(command==='set_interface_language'){calls.push({command,args});return {interfaceLanguage:args.interfaceLanguage};}
      return languageInvoke(command,args);
    };
  `);
  assert.match(result.english,/Unsupported sleep document version/);assert.doesNotMatch(result.english,/不支持/);
  assert.match(result.chinese,/不支持的作息正本版本/);assert.deepEqual(result.errors,[]);
});

test('a newer refresh preserves the chosen metric and period when an older read arrives late', {skip:process.platform!=='darwin'},()=>{
  const result=probe(969,navigate+`
    holdRefresh=true;document.querySelector('#refresh-habits').click();await until(()=>refreshWaiters.length===1);
    document.querySelector('#refresh-habits').click();await until(()=>refreshWaiters.length===2);
    refreshWaiters[1]({targetBinding:'sleep-target',revision:'freshest',records:[],facts:[fact('latest','wake',view.date,point(view.date,'08:45'))]});
    await until(()=>document.querySelector('[data-sleep-chart="mini"] [data-habit-key="wake"][data-habit-date="2026-08-10"]')?.getAttribute('aria-label').includes('08:45'));
    document.querySelector('[data-habit-open="sleep"]').click();await until(()=>document.querySelector('[data-sleep-overview]'));
    document.querySelector('[data-sleep-metric="wake"]').click();document.querySelector('[data-sleep-period="30"]').click();
    refreshWaiters[0]({targetBinding:'sleep-target',revision:'old-result',records:[],facts:[fact('old','wake',view.date,{kind:'text',date:view.date,text:'STALE_READ_MARKER'})]});
    await new Promise(resolve=>setTimeout(resolve,30));
    return JSON.stringify({metric:document.querySelector('[data-sleep-overview]').dataset.sleepMetric,period:document.querySelector('[data-sleep-period="30"]').getAttribute('aria-pressed'),label:document.querySelector('[data-sleep-chart="detail"] [data-habit-date="2026-08-10"]').getAttribute('aria-label'),stale:document.body.textContent.includes('STALE_READ_MARKER'),errors:window.probeErrors});
  `,true,723,{},canonicalBoundary+`
    let holdRefresh=false;const refreshWaiters=[];const refreshedInvoke=window.__TAURI__.core.invoke;
    window.__TAURI__.core.invoke=async(command,args)=>{if(command==='sleep_records'&&holdRefresh){calls.push({command,args});return new Promise(resolve=>refreshWaiters.push(resolve));}return refreshedInvoke(command,args);};
  `);
  assert.equal(result.metric,'wake');assert.equal(result.period,'true');assert.match(result.label,/08:45/);assert.equal(result.stale,false);assert.deepEqual(result.errors,[]);
});

test('elapsed averages round the total minutes instead of displaying sixty minutes', {skip:process.platform!=='darwin'},()=>{
  const result=probe(969,navigate+`
    document.querySelector('[data-habit-open="wake"]').click();await until(()=>document.querySelector('[data-sleep-overview]'));document.querySelector('[data-sleep-metric="duration"]').click();
    return JSON.stringify({mean:document.querySelector('[data-sleep-stat="mean"] strong').textContent,count:document.querySelector('[data-sleep-stat="count"] strong').textContent,errors:window.probeErrors});
  `,true,723,{},canonicalBoundary+`
    sleepState.records[0]={...sleepState.records[0],sleepOnset:point('2026-08-08','23:21'),estimatedDurationMinutes:479};
    sleepState.facts=sleepState.facts.map(f=>f.recordId==='night-a'&&f.habitKey==='sleep'?{...f,endpoint:point('2026-08-08','23:21')}:f);
  `);
  assert.equal(result.count,'2 / 7');assert.equal(result.mean,'about 8 h 0 min');assert.deepEqual(result.errors,[]);
});

test('existing sourced actual-time display survives an absent independent fact without inventing a chart point', {skip:process.platform!=='darwin'},()=>{
  const result=probe(969,navigate+`
    const wakeRow=document.querySelector('.habit-snapshot-row[data-habit-key="wake"]');
    return JSON.stringify({actual:wakeRow.querySelector('.habit-snapshot-value strong').textContent,points:wakeRow.querySelectorAll('[data-sleep-chart="mini"] circle').length,errors:window.probeErrors});
  `,true,723,{},canonicalBoundary+`
    sleepState={...sleepState,records:[],facts:[]};const sourcedHabit=habit;
    habit=(key)=>{const result=sourcedHabit(key);return key==='wake'?{...result,today:{...result.today,actualTimeLabel:'07:55'}}:result;};
  `);
  assert.equal(result.actual,'07:55');assert.equal(result.points,0);assert.deepEqual(result.errors,[]);
});


test('already-rendered sleep copy and errors change language without losing controls or original diagnostics',{skip:process.platform!=='darwin'},()=>{
  const result=probe(969,navigate+`
    document.querySelector('[data-habit-open="sleep"]').click();await until(()=>document.querySelector('[data-sleep-overview]'));
    const overview=document.querySelector('[data-sleep-overview]');
    const history=overview.querySelector('[data-sleep-history-date]');history.value='2026-08-01';
    require('./interface-language.js').applyInterfaceLanguage('zh');
    const translated={same:document.querySelector('[data-sleep-overview]')===overview,inputSame:document.querySelector('[data-sleep-history-date]')===history,date:history.value,tab:overview.querySelector('button[data-sleep-metric="sleep"]').textContent,earliest:overview.querySelector('[data-sleep-stat="earliest"] strong').textContent,latest:overview.querySelector('[data-sleep-stat="latest"] strong').textContent};
    window.failOverviewRead=true;document.querySelector('#refresh-habits').click();await until(()=>document.querySelector('.habit-sleep-read-error'));
    const wrapper=document.querySelector('.habit-sleep-read-error'),original=wrapper.dataset.i18nError;
    require('./interface-language.js').applyInterfaceLanguage('en');
    return JSON.stringify({translated,original,rawAfter:wrapper.dataset.i18nError,error:wrapper.textContent,errorSame:document.querySelector('.habit-sleep-read-error')===wrapper,errors:window.probeErrors});
  `,true,723,{},canonicalBoundary+`
    window.failOverviewRead=false;const stableInvoke=window.__TAURI__.core.invoke;
    window.__TAURI__.core.invoke=async(command,args)=>{if(command==='sleep_records'&&window.failOverviewRead)throw '不支持的作息正本版本。';return stableInvoke(command,args);};
  `);
  assert.equal(result.translated.same,true);assert.equal(result.translated.inputSame,true);assert.equal(result.translated.date,'2026-08-01');
  assert.equal(result.translated.tab,'入睡');assert.equal(result.translated.earliest,'23:50');assert.match(result.translated.latest,/约.*00:10/);
  assert.equal(result.original,'不支持的作息正本版本。');assert.equal(result.rawAfter,result.original);assert.equal(result.errorSame,true);assert.match(result.error,/unsupported.*sleep/i);assert.deepEqual(result.errors,[]);
});


test('overview statistics from another date cannot appear in the selected context',{skip:process.platform!=='darwin'},()=>{
  const result=probe(969,navigate+`
    document.querySelector('[data-habit-open="wake"]').click();await until(()=>document.querySelector('[data-sleep-overview]'));
    return JSON.stringify({count:document.querySelector('[data-sleep-stat="count"] strong').textContent,mean:document.querySelector('[data-sleep-stat="mean"] strong').textContent,points:document.querySelectorAll('[data-sleep-chart="detail"] circle').length,errors:window.probeErrors});
  `,true,723,{},canonicalBoundary+`
    const datedInvoke=window.__TAURI__.core.invoke;window.__TAURI__.core.invoke=async(command,args)=>{const value=await datedInvoke(command,args);if(command==='sleep_records')value.overview.date='2026-08-09';return value;};
  `);
  assert.equal(result.count,'— / 7');assert.equal(result.mean,'—');assert.equal(result.points,2);assert.deepEqual(result.errors,[]);
});
