import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { readFileSync, mkdtempSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const output=mkdtempSync(join(tmpdir(),'pdex-calendar-production-'));
after(()=>rmSync(output,{recursive:true,force:true}));
const root=new URL('../..',import.meta.url).pathname;
execFileSync(join(root,'node_modules/.bin/tsc'),['--module','commonjs','--outDir',output],{cwd:root});
const main=readFileSync(join(output,'main.js'),'utf8').replace('void connectToApplication();','')+`
window.calendarHarness={
  render(month,selectedView=null){
    currentInterfaceLanguage='zh';currentWorkspaceDestination='calendar';currentCalendarMonth=month;
    appShell.dataset.workspaceDestination='calendar';
    workspaceDestinationPanels.forEach(panel=>panel.hidden=panel.dataset.workspacePanel!=='calendar');
    workspaceInformation.prepend(document.querySelector('#workspace-destination-calendar'));
    if(selectedView)selectedCalendarDate=selectedView.date;
    renderCalendarGrid(month);workspaceInformation.scrollTop=0;
    if(selectedView)renderCalendarSummary(selectedView);
  },
  language(interfaceLanguage){renderInterfaceLanguage({interfaceLanguage});},
  selected:()=>({date:selectedCalendarDate,view:currentCalendarSummaryView}),
};`;
writeFileSync(join(output,'main.js'),main);
const modules=Object.fromEntries(readdirSync(output).filter(n=>n.endsWith('.js')).map(n=>['./'+n,readFileSync(join(output,n),'utf8')]));

function webKit(script:string,width=1280,height=720):any {
  const directory=mkdtempSync(join(tmpdir(),'pdex-calendar-dom-'));
  try {
    writeFileSync(join(directory,'index.html'),readFileSync(new URL('../../frontend/index.html',import.meta.url),'utf8').replace(/<script[^>]*src="main.js"[^>]*><\/script>/,''));
    writeFileSync(join(directory,'styles.css'),readFileSync(new URL('../../frontend/styles.css',import.meta.url),'utf8'));
    writeFileSync(join(directory,'check.js'),`
      const modules=${JSON.stringify(modules)},cache={};
      function require(name){if(cache[name])return cache[name];const exports={};cache[name]=exports;new Function('exports','require',modules[name])(exports,require);return exports;}
      const sourceFixture=${readFileSync(new URL('./fixtures/compact-calendar-view.json',import.meta.url),'utf8')};
      let selectedView=null,commands=[];
      window.__TAURI__={core:{invoke:async(command,args)=>{commands.push({command,args});if(command==='read_daily_view' || command==='today_view')return selectedView ?? sourceFixture.selected;if(command==='calendar_month')return sourceFixture.month;throw Error('Unexpected native command '+command);}}};
      require('./main.js');
      function fixture(weeks){
        const first=weeks===5?'2026-08-30':'2026-04-26',month=weeks===5?9:5;
        const days=Array.from({length:weeks*7},(_,i)=>{const day=new Date(first+'T12:00:00Z');day.setUTCDate(day.getUTCDate()+i);const date=day.toISOString().slice(0,10);return {date,inMonth:day.getUTCMonth()+1===month,isToday:i===10,availability:i===10?'unreviewed':i===11?'reviewed':i===12?'error':'missing',taskSummaries:i===10?Array.from({length:4},(_,k)=>({id:'task-'+k,name:'Synthetic long task '+k+' to preview on one line',state:k===2?'completed':'pending'})):[],taskOverflowCount:i===10?3:0};});
        return {year:2026,month,configured:true,taskState:'ready',taskMessage:'',days};
      }
      const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
      function selectedFor(month){
        const view=structuredClone(sourceFixture.selected),date=month.days.find(day=>day.isToday)?.date??view.date;
        view.date=date;view.tasks.currentDate=date;view.tasks.tasks=view.tasks.tasks.map(task=>({...task,date}));
        view.timeline=Array.from({length:24},(_,index)=>({period:'Synthetic period '+(index+1),title:'Long selected-day summary item '+(index+1),detail:'A complete synthetic detail remains reachable in the docked summary.'}));
        return view;
      }
      function calendarSnapshot(weeks,render=true){
        if(render){const month=fixture(weeks);calendarHarness.render(month,selectedFor(month));}
        const grid=document.querySelector('#calendar-grid'),cells=[...grid.children],dense=cells[10],all=[...dense.querySelectorAll('.calendar-day-task-summary')],visible=all.filter(item=>!item.hidden&&getComputedStyle(item).display!=='none');
        const overflow=dense.querySelector('.calendar-day-task-overflow'),frame=document.querySelector('.calendar-frame'),summary=document.querySelector('.calendar-summary'),panel=document.querySelector('#calendar-task-panel'),information=document.querySelector('.workspace-information'),form=document.querySelector('#calendar-task-create-dialog'),submit=[...panel.querySelectorAll('.task-editor-toggle')].at(-1);
        return {width:innerWidth,height:innerHeight,frame:rect(frame),grid:rect(grid),cells:cells.map(rect),summary:{rect:rect(summary),hidden:summary.hidden||getComputedStyle(summary).display==='none',display:getComputedStyle(summary).display,scrollHeight:summary.scrollHeight,clientHeight:summary.clientHeight,text:summary.textContent},panel:{rect:rect(panel),hidden:panel.hidden,position:getComputedStyle(panel).position,scrollHeight:panel.scrollHeight,clientHeight:panel.clientHeight,tasks:panel.querySelectorAll('.calendar-task-list > *').length,formHidden:!form.open,submit:rect(submit)},information:{rect:rect(information),scrollHeight:information.scrollHeight,clientHeight:information.clientHeight,scrollTop:information.scrollTop},dense:{rect:rect(dense),top:rect(dense.querySelector('.calendar-day-top')),number:rect(dense.querySelector('.calendar-day-top strong')),marker:rect(dense.querySelector('.calendar-day-marker')),overflowRect:rect(overflow),overflowText:overflow.textContent,overflowCount:overflow.dataset.calendarTaskOverflow,totalPreviews:all.length,visiblePreviews:visible.map(item=>({rect:rect(item),whiteSpace:getComputedStyle(item).whiteSpace,overflow:getComputedStyle(item).overflow,scroll:item.scrollWidth,client:item.clientWidth,state:item.dataset.taskState,hidden:item.hidden}))}};
      }
      async function waitForViewport(width,height){for(let n=0;n<100;n++){if(innerWidth===width&&innerHeight===height)return;await new Promise(r=>setTimeout(r,10));}throw Error('Viewport resize timed out '+innerWidth+'x'+innerHeight);}
      ${script}`);
    return JSON.parse(execFileSync('swift',[new URL('./helpers/rendered-today-unlocated.swift',import.meta.url).pathname,join(directory,'index.html'),join(directory,'check.js'),String(width),String(height)],{encoding:'utf8',timeout:60000}));
  } finally {rmSync(directory,{recursive:true,force:true});}
}

test('five-week month fits the shipped 1280×720 workspace while selected-day details stay below it', {skip:process.platform!=='darwin'},()=>{
  const result=webKit(`return JSON.stringify(calendarSnapshot(5));`);
  assert.equal(result.height,720);assert.equal(result.width,1280);
  assert.ok(result.grid.top>=0&&result.grid.bottom<=720,JSON.stringify(result.grid));
  assert.ok(Math.max(...result.cells.map((cell:any)=>cell.height))-Math.min(...result.cells.map((cell:any)=>cell.height))<1);
  assert.equal(result.panel.hidden,false);assert.ok(result.panel.rect.top>=result.frame.bottom,JSON.stringify(result));
  assert.ok(result.summary.rect.left>=result.grid.right&&result.summary.rect.right<=1280,JSON.stringify(result.summary));
  assert.ok(result.dense.marker.left>=result.dense.number.right&&result.dense.overflowRect.right<=result.dense.rect.right,JSON.stringify(result.dense));
  assert.ok(result.dense.overflowRect.top>=result.dense.marker.bottom||result.dense.overflowRect.left>=result.dense.marker.right,JSON.stringify(result.dense));
  assert.ok(result.dense.visiblePreviews.length<=4);
  assert.equal(result.dense.overflowText,'+'+(7-result.dense.visiblePreviews.length));
  assert.ok(result.summary.scrollHeight>result.summary.clientHeight,'long selected-day summary should have its own scroll area');
  assert.equal(result.panel.tasks,7);assert.equal(result.panel.formHidden,true);
});

for(const [width,height] of [[640,720],[795,756],[874,688],[1280,720],[830,758],[640,688]]) {
  for(const weeks of [5,6]) {
    test(`${weeks}-week month fits with responsive summary presentation at ${width}×${height}`,{skip:process.platform!=='darwin'},()=>{
      const result=webKit(`return JSON.stringify(calendarSnapshot(${weeks}));`,width,height);
      assert.equal(result.width,width);assert.equal(result.height,height);
      assert.equal(result.cells.length,weeks*7);
      assert.ok(result.grid.top>=0 && result.grid.bottom<=height,JSON.stringify(result.grid));
      assert.ok(result.grid.right<=width);
      assert.ok(Math.max(...result.cells.map((c:any)=>c.height))-Math.min(...result.cells.map((c:any)=>c.height))<1);
      assert.equal(result.panel.hidden,false);assert.ok(result.panel.rect.top>=result.frame.bottom,JSON.stringify(result));
      if(width>1000)assert.ok(result.summary.rect.left>=result.grid.right&&result.summary.rect.right<=width,JSON.stringify(result.summary));
      else assert.equal(result.summary.hidden,true,'narrow summary remains hidden rather than stacking below the month');
      assert.ok(result.dense.marker.left>=result.dense.number.right&&result.dense.overflowRect.right<=result.dense.rect.right,JSON.stringify(result.dense));
      assert.ok(result.dense.overflowRect.top>=result.dense.marker.bottom||result.dense.overflowRect.left>=result.dense.marker.right,JSON.stringify(result.dense));
      assert.ok(result.dense.visiblePreviews.length<=4);
      assert.equal(result.dense.overflowText,'+'+(7-result.dense.visiblePreviews.length));
      for(const preview of result.dense.visiblePreviews) {
        assert.equal(preview.whiteSpace,'nowrap');assert.equal(preview.overflow,'hidden');
        assert.ok(preview.rect.bottom<=result.dense.rect.bottom && preview.rect.right<=result.dense.rect.right);
        assert.ok(preview.scroll>preview.client,'long titles must truncate rather than widen a date');
      }
    });
  }
}

test('short 640×520 Calendar keeps dates and true overflow reachable while the selected panel stays in page flow',{skip:process.platform!=='darwin'},()=>{
  const result=webKit(`
    const state=calendarSnapshot(6),information=document.querySelector('.workspace-information'),dense=document.querySelectorAll('#calendar-grid .calendar-day')[10];
    information.scrollTop=Math.max(0,rect(dense).top-rect(information).top-40);await new Promise(r=>setTimeout(r,20));
    const controls={information:rect(information),date:rect(dense.querySelector('strong')),marker:rect(dense.querySelector('.calendar-day-marker')),overflow:rect(dense.querySelector('.calendar-day-task-overflow'))};
    information.scrollTop=information.scrollHeight;await new Promise(r=>setTimeout(r,20));
    const panel=document.querySelector('#calendar-task-panel'),submit=[...panel.querySelectorAll('.task-editor-toggle')].at(-1);
    return JSON.stringify({state,controls,scrolled:{information:rect(information),scrollHeight:information.scrollHeight,clientHeight:information.clientHeight,panel:rect(panel),submit:rect(submit)}});
  `,640,520);
  assert.equal(result.state.cells.length,42);
  assert.ok(result.state.grid.height>0&&Math.max(...result.state.cells.map((cell:any)=>cell.height))-Math.min(...result.state.cells.map((cell:any)=>cell.height))<1);
  assert.ok(result.state.dense.overflowText==='+'+(7-result.state.dense.visiblePreviews.length));
  assert.ok(result.controls.date.top>=result.controls.information.top&&result.controls.date.bottom<=result.controls.information.bottom);
  assert.ok(result.controls.marker.top>=result.controls.information.top&&result.controls.marker.bottom<=result.controls.information.bottom);
  assert.ok(result.controls.overflow.top>=result.controls.information.top&&result.controls.overflow.bottom<=result.controls.information.bottom);
  assert.ok(result.state.dense.marker.left>=result.state.dense.number.right&&result.state.dense.overflowRect.right<=result.state.dense.rect.right);
  assert.ok(result.state.dense.overflowRect.top>=result.state.dense.marker.bottom||result.state.dense.overflowRect.left>=result.state.dense.marker.right);
  assert.ok(result.scrolled.scrollHeight>result.scrolled.clientHeight);
  assert.ok(result.scrolled.panel.bottom<=result.scrolled.information.bottom+1&&result.scrolled.submit.bottom<=result.scrolled.information.bottom,JSON.stringify(result.scrolled));
});

test('selected-day summary and task controls remain reachable in their own scroll areas below a full month',{skip:process.platform!=='darwin'},()=>{
  const result=webKit(`
    const initial=calendarSnapshot(5),information=document.querySelector('.workspace-information'),summary=document.querySelector('.calendar-summary');
    const lastSummary=summary.querySelector('.calendar-daily-plan-preview li:last-child');
    summary.scrollTop=summary.scrollHeight;await new Promise(r=>setTimeout(r,20));
    const summaryScrolled={top:rect(summary),last:rect(lastSummary),scrollTop:summary.scrollTop,scrollHeight:summary.scrollHeight,clientHeight:summary.clientHeight};
    information.scrollTop=information.scrollHeight;await new Promise(r=>setTimeout(r,20));
    const panel=document.querySelector('#calendar-task-panel'),submit=[...panel.querySelectorAll('.task-editor-toggle')].at(-1);
    return JSON.stringify({initial,summaryScrolled,information:{top:rect(information),scrollTop:information.scrollTop,scrollHeight:information.scrollHeight,clientHeight:information.clientHeight,panel:rect(panel),submit:rect(submit)}});
  `);
  assert.ok(result.initial.grid.bottom<=720,JSON.stringify(result.initial.grid));
  assert.ok(result.initial.panel.rect.top>=result.initial.frame.bottom,JSON.stringify(result.initial));
  assert.ok(result.initial.panel.tasks===7&&result.initial.panel.formHidden===true,JSON.stringify(result.initial.panel));
  assert.ok(result.initial.information.scrollHeight>result.initial.information.clientHeight,JSON.stringify(result.initial.information));
  assert.ok(result.initial.information.rect.top+result.initial.information.scrollHeight+1>=result.initial.panel.rect.bottom,JSON.stringify(result.initial));
  assert.ok(result.summaryScrolled.scrollHeight>result.summaryScrolled.clientHeight);
  assert.ok(result.summaryScrolled.last.top>=result.summaryScrolled.top.top&&result.summaryScrolled.last.bottom<=result.summaryScrolled.top.bottom,JSON.stringify(result.summaryScrolled));
  assert.ok(result.information.scrollTop>0,JSON.stringify(result.information));
  assert.ok(result.information.submit.top>=result.information.top.top&&result.information.submit.bottom<=result.information.top.bottom,JSON.stringify(result.information));
});

test('Calendar viewport resize, navigation collapse, language change, and month navigation retain responsive summary fit',{skip:process.platform!=='darwin'},async()=>{
  const result=webKit(`
    const states=[calendarSnapshot(5)];
    window.webkit.messageHandlers.resizeViewport.postMessage({width:830,height:758});await waitForViewport(830,758);await new Promise(r=>setTimeout(r,50));states.push(calendarSnapshot(5,false));
    document.querySelector('#workspace-sidebar-toggle').click();await new Promise(r=>setTimeout(r,50));states.push(calendarSnapshot(5,false));
    calendarHarness.language('en');await new Promise(r=>setTimeout(r,50));states.push(calendarSnapshot(5,false));
    const nextMonth=fixture(6);calendarHarness.render(nextMonth,selectedFor(nextMonth));await new Promise(r=>setTimeout(r,50));states.push(calendarSnapshot(6,false));
    window.webkit.messageHandlers.resizeViewport.postMessage({width:640,height:688});await waitForViewport(640,688);await new Promise(r=>setTimeout(r,50));states.push(calendarSnapshot(6,false));
    return JSON.stringify({states,commands});
  `,1280,720);
  const weekCounts=[5,5,5,5,6,6];
  for(const [index,state] of result.states.entries()) {
    const weeks=weekCounts[index];
    assert.equal(state.cells.length,weeks*7,JSON.stringify({index,state}));
    assert.ok(state.grid.top>=0&&state.grid.bottom<=state.height,JSON.stringify({index,state:state.grid}));
    assert.ok(Math.max(...state.cells.map((cell:any)=>cell.height))-Math.min(...state.cells.map((cell:any)=>cell.height))<1);
    if(state.width<=1000)assert.equal(state.summary.hidden,true,JSON.stringify({index,state:state.summary}));
    else assert.ok(state.summary.rect.left>=state.grid.right&&state.summary.rect.right<=state.width,JSON.stringify({index,state:state.summary}));
    assert.ok(state.panel.rect.top>=state.frame.bottom,JSON.stringify({index,state}));
    assert.ok(state.dense.visiblePreviews.length<=4);
    assert.equal(state.dense.overflowText,'+'+(7-state.dense.visiblePreviews.length),JSON.stringify({index,state:state.dense}));
  }
  assert.deepEqual(result.states.map((state:any)=>[state.width,state.height]),[[1280,720],[830,758],[830,758],[830,758],[830,758],[640,688]]);
  assert.deepEqual(result.commands.filter((item:any)=>/^(create_|edit_|update_|save_|set_)/.test(item.command)),[]);
});

for(const [width,height] of [[1280,720],[830,758]]) {
  test(`real native record states and overflow stay beside dates without covering previews at ${width}×${height}`,{skip:process.platform!=='darwin'},()=>{
    const result=webKit(`
      calendarHarness.render(sourceFixture.month,sourceFixture.selected);
      const grid=document.querySelector('#calendar-grid');
      const cells=['2026-09-09','2026-09-10','2026-09-11','2026-09-12'].map(date=>document.querySelector('[data-calendar-date="'+date+'"]'));
      return JSON.stringify({days:cells.map(cell=>({availability:cell.dataset.availability,aria:cell.getAttribute('aria-label'),marker:cell.querySelector('.calendar-day-marker').textContent,markerHidden:getComputedStyle(cell.querySelector('.calendar-day-marker')).display==='none',top:rect(cell.querySelector('.calendar-day-top')),number:rect(cell.querySelector('strong')),markerRect:rect(cell.querySelector('.calendar-day-marker')),more:cell.querySelector('.calendar-day-task-overflow').textContent,moreRect:rect(cell.querySelector('.calendar-day-task-overflow')),previews:[...cell.querySelectorAll('.calendar-day-task-summary')].map(p=>({rect:rect(p),hidden:p.hidden,name:p.textContent,state:p.dataset.taskState}))}))});
    `,width,height);
    assert.deepEqual(result.days.map((day:any)=>day.availability),['unreviewed','reviewed','error','missing']);
    assert.deepEqual(result.days.map((day:any)=>day.marker),['记','复','!','']);
    assert.equal(result.days[3].markerHidden,true);assert.ok(result.days[2].aria.includes('读取错误'));
    const dense=result.days[0],visible=dense.previews.filter((p:any)=>!p.hidden);
    assert.equal(dense.more,'+'+(7-visible.length));assert.ok(visible.length<=4);
    assert.ok(visible.some((p:any)=>p.state==='completed'));
    assert.ok(dense.markerRect.left>=dense.number.right);
    assert.ok(dense.markerRect.width<=14 && dense.markerRect.height<=14);
    assert.ok(dense.moreRect.top>=dense.top.top && dense.moreRect.bottom<=dense.top.bottom);
    assert.ok(dense.markerRect.top>=dense.top.top && dense.markerRect.bottom<=dense.top.bottom);
    assert.ok(dense.previews[0].rect.top>=dense.top.bottom);
    assert.ok(dense.moreRect.left>=dense.markerRect.right);
  });
}

test('clicking the overflow date reads the full authoritative Daily Record and all shared Tasks including cross-midnight interval',{skip:process.platform!=='darwin'},()=>{
  const result=webKit(`
    selectedView=sourceFixture.selected;calendarHarness.render(sourceFixture.month);
    document.querySelector('[data-calendar-date="2026-09-09"]').click();
    while(!calendarHarness.selected().view) await new Promise(r=>setTimeout(r,5));
    const tasks=document.querySelector('#calendar-task-list');
    const editor=tasks.querySelector('[data-task-editor="preview-0"]');
    return JSON.stringify({date:calendarHarness.selected().date,availability:document.querySelector('#calendar-summary-status').dataset.availability,copy:document.querySelector('#calendar-summary-copy').textContent,count:tasks.children.length,names:[...tasks.children].map(c=>c.textContent),start:editor.querySelector('[data-task-time]').value,endDate:editor.querySelector('[data-task-end-date]').value,endTime:editor.querySelector('[data-task-end-time]').value,commands});
  `,830,758);
  assert.equal(result.date,'2026-09-09');assert.equal(result.availability,'unreviewed');
  assert.ok(result.copy.includes('合成安排。'));assert.equal(result.count,7);
  assert.equal(result.start,'23:30');assert.equal(result.endDate,'2026-09-10');assert.equal(result.endTime,'00:45');
  assert.ok(result.names.some((name:string)=>name.includes('23:30') && name.includes('00:45')));
  assert.deepEqual(result.commands.filter((item:any)=>item.command==='read_daily_view'),[{command:'read_daily_view',args:{date:'2026-09-09'}}]);
  assert.ok(result.commands.every((item:any)=>['read_daily_view','today_view'].includes(item.command)),'date details must read the shared sources without writes');
});

test('Calendar top plus opens a selected-date draft with name focus and no bottom create form', {skip:process.platform!=='darwin'},()=>{
  const result=webKit(`
    const view=structuredClone(sourceFixture.selected);view.date='2026-09-12';view.tasks.tasks=view.tasks.tasks.map(t=>({...t,date:view.date}));
    calendarHarness.render(sourceFixture.month,view);
    const plus=document.querySelector('#calendar-new-task');if(plus)plus.click();
    const dialog=document.querySelector('#calendar-task-create-dialog');
    return JSON.stringify({present:!!plus,open:dialog?.open,date:document.querySelector('#calendar-task-create-date')?.value,focus:document.activeElement.id,bottom:!!document.querySelector('#calendar-task-panel #calendar-task-create-form'),commands});
  `);
  assert.equal(result.present,true);assert.equal(result.open,true);assert.equal(result.date,'2026-09-12');
  assert.equal(result.focus,'calendar-task-create-name');assert.equal(result.bottom,false);
  assert.equal(result.commands.length,0);
});

test('Calendar create saves the changed date through shared Task IPC and closes without changing background selection',{skip:process.platform!=='darwin'},()=>{
  const result=webKit(`
    const view=structuredClone(sourceFixture.selected);view.date='2026-09-12';view.tasks.tasks=view.tasks.tasks.map(t=>({...t,date:view.date}));
    calendarHarness.render(structuredClone(sourceFixture.month),structuredClone(view));const info=document.querySelector('.workspace-information');info.scrollTop=18;
    window.__TAURI__.core.invoke=async(command,args)=>{commands.push({command,args});if(command==='create_task'){
      const input=args.input,task={...view.tasks.tasks[0],id:input.taskId,name:input.name,content:input.content,date:input.date,time:input.time,listId:input.listId,executionEnd:input.executionEnd??null,priority:input.priority??'none',tagIds:input.tagIds??[]};
      view.tasks={...view.tasks,revision:'created-revision',tasks:[...view.tasks.tasks,task]};return view.tasks;
    }if(command==='read_daily_view'||command==='today_view')return structuredClone(view);if(command==='calendar_month')return sourceFixture.month;throw Error('Unexpected command '+command);};
    document.querySelector('#calendar-new-task').click();const form=document.querySelector('#calendar-task-create-form');
    document.querySelector('#calendar-task-create-name').value='Calendar created Task';document.querySelector('#calendar-task-create-date').value='2026-09-13';form.dispatchEvent(new Event('input',{bubbles:true}));form.requestSubmit();
    await new Promise(r=>setTimeout(r,40));
    return JSON.stringify({open:document.querySelector('#calendar-task-create-dialog').open,date:calendarHarness.selected().date,scroll:info.scrollTop,commands});
  `);
  assert.equal(result.open,false,JSON.stringify(result));assert.equal(result.date,'2026-09-12');assert.equal(result.scroll,18);
  assert.equal(result.commands.filter((c:any)=>c.command.startsWith('create')).length,1);assert.equal(result.commands[0].command,'create_task');
  assert.equal(result.commands[0].args.input.date,'2026-09-13');assert.equal(result.commands[0].args.input.name,'Calendar created Task');
});

test('uncertain Calendar creation retains a frozen original draft until readback enables an exact retry',{skip:process.platform!=='darwin'},()=>{
  const result=webKit(`
    const view=structuredClone(sourceFixture.selected);view.date='2026-09-12';calendarHarness.render(sourceFixture.month,view);
    window.__TAURI__.core.invoke=async(command,args)=>{commands.push({command,args});if(command==='create_task')throw Error('synthetic write result unknown');if(command==='tasks_view')return {...view.tasks,revision:'new-read-revision'};if(command==='read_daily_view'||command==='today_view')return structuredClone(view);if(command==='calendar_month')return sourceFixture.month;throw Error('Unexpected command '+command);};
    document.querySelector('#calendar-new-task').click();const form=document.querySelector('#calendar-task-create-form'),name=document.querySelector('#calendar-task-create-name');name.value='Retain original';form.dispatchEvent(new Event('input',{bubbles:true}));form.requestSubmit();await new Promise(r=>setTimeout(r,40));
    const frozen={value:name.value,disabled:name.disabled,open:document.querySelector('#calendar-task-create-dialog').open};
    const recheck=document.querySelector('#calendar-task-create-recheck');if(recheck)recheck.click();await new Promise(r=>setTimeout(r,40));
    const retry=document.querySelector('#calendar-task-create-retry');const ready=retry && !retry.disabled;if(ready)retry.click();await new Promise(r=>setTimeout(r,40));
    return JSON.stringify({frozen,ready,commands});
  `);
  assert.deepEqual(result.frozen,{value:'Retain original',disabled:true,open:true},JSON.stringify(result));assert.equal(result.ready,true);
  const writes=result.commands.filter((c:any)=>c.command==='create_task');assert.equal(writes.length,2);
  assert.equal(writes[0].args.input.taskId,writes[1].args.input.taskId);
  assert.equal(writes[1].args.input.expectedRevision,'new-read-revision');
  assert.equal(writes[1].args.input.name,'Retain original');
});

test('a month Task opens a compact editable overlay while selected day and background position stay unchanged',{skip:process.platform!=='darwin'},()=>{
  const result=webKit(`
    const view=structuredClone(sourceFixture.selected);view.date='2026-09-12';calendarHarness.render(sourceFixture.month,view);
    const info=document.querySelector('.workspace-information');info.scrollTop=18;
    document.querySelector('[data-calendar-task-summary="preview-0"]').click();await new Promise(r=>setTimeout(r,40));
    const dialog=document.querySelector('#calendar-task-details-dialog');const content=dialog?.querySelector('[data-task-content]');
    const opened={open:dialog?.open,date:calendarHarness.selected().date,scroll:info.scrollTop,title:dialog?.querySelector('[data-task-name]')?.value,focus:document.activeElement===content,refined:!!dialog?.querySelector('.task-refined-editor')};
    dialog?.querySelector('[data-task-editor-close]')?.click();await new Promise(r=>setTimeout(r,20));
    return JSON.stringify({opened,closed:!dialog?.open,date:calendarHarness.selected().date,scroll:info.scrollTop,commands});
  `);
  assert.equal(result.opened.open,true);assert.equal(result.opened.date,'2026-09-12');assert.equal(result.opened.scroll,18);
  assert.equal(result.opened.focus,true);assert.equal(result.opened.refined,true);
  assert.equal(result.closed,true);assert.equal(result.date,'2026-09-12');assert.equal(result.scroll,18);
  assert.equal(result.commands.some((c:any)=>(c.command==='read_daily_view'&&c.args?.date!=='2026-09-12')||/^(create_|update_|save_|set_)/.test(c.command)),false);
});

test('holiday annotations give Tasks priority, keep equal month cells and expose coverage/region switches',{skip:process.platform!=='darwin'},()=>{
  const result=webKit(`
    const month=fixture(5);month.month=6;month.days=month.days.map((d,i)=>{const at=new Date('2026-05-31T12:00:00Z');at.setUTCDate(at.getUTCDate()+i);return {...d,date:at.toISOString().slice(0,10),inMonth:at.getUTCMonth()===5,taskSummaries:i===19?Array.from({length:4},(_,k)=>({id:'preview-'+k,name:'A long important task '+k+' that must keep priority',state:'pending'})):[],taskOverflowCount:0};});
    const view=selectedFor(month);calendarHarness.render(month,view);
    const snapshot=()=>{const cell=document.querySelector('[data-calendar-date="2026-06-19"]');return {cell:rect(cell),visible:[...cell.querySelectorAll('.calendar-day-task-summary')].filter(n=>!n.hidden).length,holiday:cell.querySelector('.calendar-day-holidays')?.textContent,title:cell.title};};
    const before=snapshot(),controls=document.querySelector('#calendar-holiday-enabled');
    if(controls){controls.checked=false;controls.dispatchEvent(new Event('change',{bubbles:true}));}
    return JSON.stringify({before,after:snapshot(),controls:!!controls,regions:!!document.querySelector('#calendar-holiday-china')&&!!document.querySelector('#calendar-holiday-united-states'),coverage:document.querySelector('#calendar-holiday-coverage')?.textContent});
  `);
  assert.equal(result.controls,true);assert.equal(result.regions,true);
  assert.ok(result.before.holiday.includes('端午')&&result.before.holiday.includes('六月节'));
  assert.ok(result.before.title.includes('端午')&&result.before.title.includes('六月节'));
  assert.equal(result.before.visible,result.after.visible);assert.deepEqual(result.before.cell,result.after.cell);
  assert.ok(result.coverage.includes('2026')&&result.coverage.includes('2027'));
});

test('Calendar detail Save keeps stable identity, schedule interval and existing metadata',{skip:process.platform!=='darwin'},()=>{
  const result=webKit(`
    const view=structuredClone(sourceFixture.selected);view.date='2026-09-12';view.tasks.tags=[{id:'tag-1',name:'Keep tag'}];view.tasks.tasks[0].priority='high';view.tasks.tasks[0].tagIds=['tag-1'];view.tasks.tasks[0].parentId='preview-1';view.tasks.tasks[0].listId='work';view.tasks.folders=[{id:'projects',name:'Projects'}];view.tasks.lists.push({id:'work',name:'Work',archived:false,isSystem:false,folderId:'projects'});
    selectedView=structuredClone(view);calendarHarness.render(structuredClone(sourceFixture.month),structuredClone(view));
    window.__TAURI__.core.invoke=async(command,args)=>{commands.push({command,args});if(command==='update_task') {
      const input=args.input;selectedView.tasks={...selectedView.tasks,revision:'edited-revision',tasks:selectedView.tasks.tasks.map(t=>t.id===input.taskId?{...t,...input}:t)};return structuredClone(selectedView.tasks);
    }if(command==='read_daily_view'||command==='today_view')return structuredClone(selectedView);if(command==='calendar_month')return sourceFixture.month;throw Error('Unexpected command '+command);};
    const info=document.querySelector('.workspace-information');info.scrollTop=18;document.querySelector('[data-calendar-task-summary="preview-0"]').click();
    const dialog=document.querySelector('#calendar-task-details-dialog'),form=dialog.querySelector('form');form.querySelector('[data-task-content]').value='Calendar changed content';form.dispatchEvent(new Event('input',{bubbles:true}));form.requestSubmit();await new Promise(r=>setTimeout(r,40));
    return JSON.stringify({closed:!dialog.open,date:calendarHarness.selected().date,scroll:info.scrollTop,request:commands.find(c=>c.command==='update_task')?.args.input});
  `);
  assert.equal(result.closed,true,JSON.stringify(result));assert.equal(result.date,'2026-09-12');assert.equal(result.scroll,18);
  assert.equal(result.request.taskId,'preview-0');assert.equal(result.request.content,'Calendar changed content');
  assert.equal(result.request.date,'2026-09-09');assert.equal(result.request.time,'23:30');
  assert.deepEqual(result.request.executionEnd,{date:'2026-09-10',time:'00:45'});
  assert.equal(result.request.priority,'high');assert.deepEqual(result.request.tagIds,['tag-1']);assert.equal(result.request.parentId,'preview-1');assert.equal(result.request.listId,'work');
});

test('Calendar detail write failure leaves an editable draft and visible result without changing the selected day',{skip:process.platform!=='darwin'},()=>{
  const result=webKit(`
    const view=structuredClone(sourceFixture.selected);view.date='2026-09-12';selectedView=structuredClone(view);calendarHarness.render(sourceFixture.month,view);
    window.__TAURI__.core.invoke=async(command,args)=>{commands.push({command,args});if(command==='update_task')throw Error('synthetic failed save');if(command==='read_daily_view'||command==='today_view')return structuredClone(selectedView);if(command==='calendar_month')return sourceFixture.month;throw Error('Unexpected command '+command);};
    document.querySelector('[data-calendar-task-summary="preview-0"]').click();const dialog=document.querySelector('#calendar-task-details-dialog'),form=dialog.querySelector('form');const content=form.querySelector('[data-task-content]');content.value='Keep unsaved content';form.dispatchEvent(new Event('input',{bubbles:true}));form.requestSubmit();await new Promise(r=>setTimeout(r,40));
    return JSON.stringify({open:dialog.open,draft:content.value,disabled:content.disabled,status:dialog.querySelector('[role="status"]').textContent,date:calendarHarness.selected().date});
  `);
  assert.equal(result.open,true);assert.equal(result.draft,'Keep unsaved content');assert.equal(result.disabled,false);
  assert.ok(result.status.includes('synthetic failed save'));assert.equal(result.date,'2026-09-12');
});

test('a Calendar tag change refreshes the shared property controls without dropping its draft on Save',{skip:process.platform!=='darwin'},()=>{
  const result=webKit(`
    const view=structuredClone(sourceFixture.selected);view.date='2026-09-12';view.tasks.tags=[];selectedView=structuredClone(view);calendarHarness.render(sourceFixture.month,structuredClone(view));
    window.__TAURI__.core.invoke=async(command,args)=>{commands.push({command,args});if(command==='manage_task_tag') {selectedView.tasks={...selectedView.tasks,revision:'tag-revision',tags:[{id:args.input.tagId,name:args.input.name}]};return structuredClone(selectedView.tasks);}if(command==='update_task')return {...selectedView.tasks,revision:'task-revision',tasks:selectedView.tasks.tasks.map(t=>t.id===args.input.taskId?{...t,...args.input}:t)};if(command==='read_daily_view'||command==='today_view')return structuredClone(selectedView);if(command==='calendar_month')return sourceFixture.month;throw Error('Unexpected command '+command);};
    document.querySelector('[data-calendar-task-summary="preview-0"]').click();const dialog=document.querySelector('#calendar-task-details-dialog');let form=dialog.querySelector('form');form.querySelector('[data-task-content]').value='Draft before tag';form.dispatchEvent(new Event('input',{bubbles:true}));
    const tagName=form.querySelector('[aria-label="新标签名称"]');tagName.value='New Calendar tag';[...form.querySelectorAll('button')].find(b=>b.textContent==='创建标签').click();await new Promise(r=>setTimeout(r,40));
    form=dialog.querySelector('form');const selected=[...form.querySelectorAll('[data-task-tag-id]:checked')].map(n=>n.dataset.taskTagId);const draft=form.querySelector('[data-task-content]').value;form.requestSubmit();await new Promise(r=>setTimeout(r,40));
    return JSON.stringify({selected,draft,update:commands.find(c=>c.command==='update_task')?.args.input,tag:commands.find(c=>c.command==='manage_task_tag')?.args.input});
  `);
  assert.deepEqual(result.selected,[result.tag.tagId]);assert.equal(result.draft,'Draft before tag');
  assert.deepEqual(result.update.tagIds,[result.tag.tagId]);assert.equal(result.update.content,'Draft before tag');
});

for(const [width,height] of [[1280,800],[1280,720],[830,758],[680,560]]) {
  test(`Calendar editable and creation overlays remain reachable at ${width}×${height}`,{skip:process.platform!=='darwin'},()=>{
    const result=webKit(`
      const view=structuredClone(sourceFixture.selected);view.date='2026-09-12';selectedView=structuredClone(view);calendarHarness.render(sourceFixture.month,view);
      const info=document.querySelector('.workspace-information');info.scrollTop=18;
      document.querySelector('[data-calendar-task-summary="preview-0"]').click();const details=document.querySelector('#calendar-task-details-dialog');const content=details.querySelector('[data-task-content]');const save=details.querySelector('[type="submit"]');
      save.scrollIntoView({block:'nearest'});const hit=n=>{const r=n.getBoundingClientRect(),el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!el&&n.contains(el);};
      const edit={bounds:rect(details),contentHeight:content.offsetHeight,save:hit(save),nameCount:details.querySelectorAll('[data-task-name]').length};
      details.querySelector('[data-task-editor-close]').click();document.querySelector('#calendar-new-task').click();const create=document.querySelector('#calendar-task-create-dialog');const name=document.querySelector('#calendar-task-create-name');const add=document.querySelector('#calendar-task-create-submit');add.scrollIntoView({block:'nearest'});
      const creation={bounds:rect(create),focus:document.activeElement===name,save:hit(add),date:document.querySelector('#calendar-task-create-date').value};document.querySelector('#calendar-task-create-cancel').click();
      return JSON.stringify({edit,creation,date:calendarHarness.selected().date,scroll:info.scrollTop});
    `,width,height);
    for(const stage of [result.edit,result.creation]) {assert.ok(stage.bounds.top>=0&&stage.bounds.bottom<=height&&stage.bounds.left>=0&&stage.bounds.right<=width,JSON.stringify(stage));assert.equal(stage.save,true);}
    assert.ok(result.edit.contentHeight>=180);assert.equal(result.edit.nameCount,1);assert.equal(result.creation.focus,true);
    assert.equal(result.creation.date,'2026-09-12');assert.equal(result.date,'2026-09-12');assert.equal(result.scroll,18);
  });
}

test('Calendar exposes unavailable holiday-year coverage without changing Task or date review controls',{skip:process.platform!=='darwin'},()=>{
  const result=webKit(`
    const month=fixture(5);month.year=2028;month.month=6;month.days=month.days.map((d,i)=>{const at=new Date('2028-05-28T12:00:00Z');at.setUTCDate(at.getUTCDate()+i);return {...d,date:at.toISOString().slice(0,10),inMonth:at.getUTCMonth()===5};});const view=selectedFor(month);calendarHarness.render(month,view);
    return JSON.stringify({coverage:document.querySelector('#calendar-holiday-coverage').textContent,holidays:[...document.querySelectorAll('.calendar-day-holidays')].filter(n=>n.textContent).length,tasks:document.querySelector('#calendar-task-list').children.length,openTodayDisabled:document.querySelector('#calendar-open-day').disabled,sources:[...document.querySelectorAll('.calendar-holiday-options a')].map(a=>a.href)});
  `);
  assert.ok(result.coverage.includes('2028')&&result.coverage.includes('未提供'));assert.equal(result.holidays,0);
  assert.equal(result.tasks,7);assert.equal(result.openTodayDisabled,false);assert.equal(result.sources.length,4);
});
