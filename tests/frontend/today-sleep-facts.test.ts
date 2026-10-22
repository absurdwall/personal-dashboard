import assert from 'node:assert/strict';
import test from 'node:test';
import {probe} from './helpers/complete-page.ts';

const boundary=String.raw`
  const oldFact={...view.timeAxis.currentArrangement[0],planId:null,timeEditable:false,planPrecision:null,period:null,title:null,text:'Existing unchanged Daily Record fact',sourceDate:view.date,startMinute:720,endMinute:null,continuesFromPreviousDay:false,continuesIntoNextDay:false};
  const fact={recordId:'canonical-night-1',habitKey:'sleep',livedDate:view.date,dayRelation:'next-day',endpoint:{kind:'point',date:'2026-08-11',time:'02:00',utcOffsetMinutes:-240,approximate:true}};
  const sleepEntry={...oldFact,text:'',sourceDate:'2026-08-11',startMinute:1560,sleepFact:fact};
  view.habitTimeHabits=[{key:'sleep',name:'My bedtime',localizedNames:{}}];
  view.timeAxis.confirmedFacts=[oldFact,sleepEntry];
  view.timeAxis.unlocatedConfirmedFacts=[];
  let canonical={targetBinding:'sleep-synthetic',revision:'revision-1',records:[],facts:[fact]};
  const priorInvoke=window.__TAURI__.core.invoke;
  window.__TAURI__.core.invoke=async(command,args)=>{
    if(command==='sleep_records'){calls.push({command,args});return structuredClone(canonical);}
    if(command==='habit_snapshot'){calls.push({command,args});return {state:'empty',message:'Synthetic empty snapshot',habits:[],summary:{knownCompletions:0,targetCompletions:0,coverageNote:'Synthetic'}};}
    return priorInvoke(command,args);
  };
`;

test('canonical sleep point uses the existing Today marker and fact popup with honest precision and provenance', {skip:process.platform!=='darwin'},()=>{
  const result=probe(830,`
    const marker=document.querySelector('[data-sleep-record-id="canonical-night-1"] .today-axis-marker-link');
    if(!marker)return JSON.stringify({missing:true});
    marker.click();await until(()=>document.querySelector('#today-axis-fact-popup').open);
    const popup=document.querySelector('#today-axis-fact-popup');
    return JSON.stringify({label:marker.getAttribute('aria-label'),time:marker.querySelector('.today-axis-marker-time').textContent,copy:popup.textContent,old:[...document.querySelectorAll('.today-axis-marker-title')].some(n=>n.textContent==='Existing unchanged Daily Record fact'),forms:popup.querySelectorAll('input,select,form').length,errors:window.probeErrors});
  `,false,758,{},boundary);
  assert.ok(!result.missing,'canonical source identity must appear on the existing point marker');
  assert.match(result.label,/My bedtime/);
  assert.match(result.time,/next day.*about 02:00/i);
  assert.match(result.copy,/2026-08-11 02:00/);
  assert.match(result.copy,/canonical-night-1/);
  assert.match(result.copy,/Reported sleep fact/);
  assert.match(result.copy,/UTC−04:00/);
  assert.equal(result.old,true);assert.equal(result.forms,0);assert.deepEqual(result.errors,[]);
});

test('saving the existing Habit time entry immediately refreshes the same Today canonical point', {skip:process.platform!=='darwin'},()=>{
  const result=probe(969,`
    await until(()=>!document.querySelector('[data-habit-time-edit="sleep"]').disabled);
    await new Promise(resolve=>setTimeout(resolve,80));
    document.querySelector('[data-habit-time-edit="sleep"]').click();
    const form=document.querySelector('[data-habit-time-form="sleep"]');
    form.querySelector('[data-habit-time-point]').value='01:45';
    form.requestSubmit();
    await until(()=>!document.querySelector('[data-habit-time-form="sleep"]'));
    await new Promise(resolve=>setTimeout(resolve,100));
    const marker=document.querySelector('[data-sleep-record-id="canonical-night-1"] .today-axis-marker-link');
    return JSON.stringify({time:marker?.querySelector('.today-axis-marker-time').textContent,reads:calls.filter(c=>['daily_view','today_view'].includes(c.command)),saves:calls.filter(c=>c.command==='save_habit_sleep_time'),errors:window.probeErrors});
  `,false,723,{},boundary+String.raw`
    const beforeSaveInvoke=window.__TAURI__.core.invoke;
    window.__TAURI__.core.invoke=async(command,args)=>{
      if(command==='save_habit_sleep_time'){
        calls.push({command,args});
        canonical={...canonical,revision:'revision-2',facts:[{...fact,endpoint:{kind:'point',date:'2026-08-11',time:'01:45',utcOffsetMinutes:-240,approximate:true}}]};
        view.timeAxis.confirmedFacts=[oldFact,{...sleepEntry,startMinute:1545,sleepFact:canonical.facts[0]}];
        return structuredClone(canonical);
      }
      if(command==='daily_view'){calls.push({command,args});return structuredClone(view);}
      return beforeSaveInvoke(command,args);
    };
  `);
  assert.match(result.time,/next day.*about 01:45/i);
  assert.ok(result.reads.some(c=>c.command==='daily_view'&&c.args.date==='2026-08-10'),'saved readback must retain the selected date');

  assert.equal(result.saves.length,1);assert.equal(result.saves[0].args.input.recordId,'canonical-night-1');
  assert.deepEqual(result.errors,[]);
});

for(const [width,height,kind] of [[830,758,'range'],[969,723,'text'],[1280,720,'unknown']] as const){
  for(const language of ['en','zh'] as const){
    test(`independent ${kind} stays unlocated and the popup fits with a collapsed sidebar ${width}×${height} ${language}`,{skip:process.platform!=='darwin'},()=>{
      const endpoint=kind==='range'?{kind,start:{date:'2026-08-10',time:'07:10',utcOffsetMinutes:-240},end:{date:'2026-08-10',time:'08:20',utcOffsetMinutes:-240},reportedText:'七点到八点多，原话保留'}:kind==='text'?{kind,date:'2026-08-10',text:'八点多吧，原话保留'}:{kind};
      const result=probe(width,`
        await until(()=>document.querySelector('[data-sleep-record-id="canonical-night-1"]'));
        const ready=document.querySelector('#today-ready');
        const unlocatedToggle=document.querySelector('#today-unlocated-time-shortcut');
        if(unlocatedToggle.getAttribute('aria-expanded')!=='true')unlocatedToggle.click();
        await new Promise(resolve=>setTimeout(resolve,30));
        const unlocated=document.querySelector('#today-confirmed-facts-unlocated');
        const unlocatedCopy=unlocated.textContent;
        unlocatedToggle.click();
        const markers=[...document.querySelectorAll('.today-axis-marker[data-sleep-record-id]')];
        const marker=markers[0].querySelector('.today-axis-marker-link');
        marker.scrollIntoView({block:'center'});await new Promise(resolve=>setTimeout(resolve,30));
        marker.click();await until(()=>document.querySelector('#today-axis-fact-popup').open);
        const popup=document.querySelector('#today-axis-fact-popup'),r=popup.getBoundingClientRect();
        return JSON.stringify({ready:!ready.hidden,sideHidden:document.querySelector('.today-side-region').hidden,markers:markers.length,unlocated:unlocatedCopy,popup:popup.textContent,open:popup.open,geometry:{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height},viewport:{width:innerWidth,height:innerHeight},overflow:document.documentElement.scrollWidth>innerWidth,errors:window.probeErrors});
      `,false,height,{interface_language_preferences:{interfaceLanguage:language}},boundary+`
        view.state='error';view.dailyRecordAvailability='error';view.message='Synthetic unavailable Daily Record';
        view.habitTimeHabits[0].name='My bedtime · Long unchanged canonical Habit name for narrow-window review';
        view.timeAxis.confirmedFacts=[sleepEntry];
        const uncertain={recordId:'canonical-uncertain',habitKey:'wake',livedDate:view.date,dayRelation:'unresolved',endpoint:${JSON.stringify(endpoint)}};
        view.timeAxis.unlocatedConfirmedFacts=[{...oldFact,text:'',startMinute:null,sleepFact:uncertain}];
        canonical.facts.push(uncertain);
      `);
      assert.equal(result.ready,true);assert.equal(result.sideHidden,true);assert.equal(result.markers,1);
      assert.match(result.unlocated,/canonical-uncertain/);
      if(kind==='unknown')assert.match(result.unlocated,language==='zh'?/明确未知/:/Explicitly unknown/);
      else assert.match(result.unlocated,/原话保留/);
      assert.match(result.popup,language==='zh'?/报告作息事实/:/Reported sleep fact/);
      assert.match(result.popup,/My bedtime/);assert.equal(result.open,true);
      assert.ok(result.geometry.width>0&&result.geometry.height>0);
      assert.ok(result.geometry.left>=0&&result.geometry.right<=result.viewport.width+1);
      assert.ok(result.geometry.top>=0&&result.geometry.bottom<=result.viewport.height+1);
      assert.equal(result.overflow,false);assert.deepEqual(result.errors,[]);
    });
  }
}

test('sleep source failures stay separate from existing facts and remain visible after a live language switch',{skip:process.platform!=='darwin'},()=>{
  const result=probe(969,`
    const initialStatus=document.querySelector('#today-status').textContent;
    document.querySelector('#workspace-language').click();
    await until(()=>document.documentElement.lang==='zh-CN');
    return JSON.stringify({initial:initialStatus,changed:document.querySelector('#today-status').textContent,old:[...document.querySelectorAll('.today-axis-marker-title')].some(n=>n.textContent==='Existing unchanged Daily Record fact'),errors:window.probeErrors});
  `,false,723,{},boundary+String.raw`
    view.timeAxis.confirmedFacts=[oldFact];view.timeAxis.sleepError='不支持的作息正本版本。';canonical.facts=[];
    const languageInvoke=window.__TAURI__.core.invoke;
    window.__TAURI__.core.invoke=async(command,args)=>{
      if(command==='set_interface_language'){calls.push({command,args});return {interfaceLanguage:args.interfaceLanguage};}
      return languageInvoke(command,args);
    };
  `);
  assert.match(result.initial,/Sleep read did not complete/);
  assert.match(result.changed,/作息读取未完成/);
  assert.equal(result.old,true);assert.deepEqual(result.errors,[]);
});
