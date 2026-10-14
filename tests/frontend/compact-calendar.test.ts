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
};
window.taskSurfaceHarness={
  render(task,view){
    currentInterfaceLanguage='en';currentTasksView=view;appShell.dataset.workspaceDestination='tasks';
    workspaceDestinationPanels.forEach(panel=>panel.hidden=panel.dataset.workspacePanel!=='tasks');
    const destination=document.querySelector('#workspace-destination-tasks');workspaceInformation.prepend(destination);
    taskEditorDialogRoot.replaceChildren();taskEditorDialogRoot.hidden=true;tasksList.replaceChildren();
    const row=taskEditor(task,true,view,'tasks',false,false,true);tasksList.append(row);
    const opened=toggleTaskEditorDetails(row.querySelector('.task-title-button'));
    return {row,opened,dialog:taskEditorDialogRoot.querySelector('[data-task-editor-dialog]')};
  },
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
      window.__TAURI__={core:{invoke:async(command,args)=>{commands.push({command,args});if(command==='read_daily_view' || command==='today_view')return selectedView;throw Error('Unexpected native command '+command);}}};
      const addWindowListener=window.addEventListener.bind(window);
      window.addEventListener=(type,listener,options)=>{if(type!=='focus')addWindowListener(type,listener,options);};
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
        const overflow=dense.querySelector('.calendar-day-task-overflow'),frame=document.querySelector('.calendar-frame'),summary=document.querySelector('.calendar-summary'),panel=document.querySelector('#calendar-task-panel'),information=document.querySelector('.workspace-information'),form=panel.querySelector('#calendar-task-create-form'),dialog=document.querySelector('#calendar-task-create-dialog'),add=document.querySelector('#calendar-add-task');
        return {width:innerWidth,height:innerHeight,frame:rect(frame),grid:rect(grid),cells:cells.map(rect),summary:{rect:rect(summary),hidden:summary.hidden||getComputedStyle(summary).display==='none',display:getComputedStyle(summary).display,scrollHeight:summary.scrollHeight,clientHeight:summary.clientHeight,text:summary.textContent},panel:{rect:rect(panel),hidden:panel.hidden,position:getComputedStyle(panel).position,scrollHeight:panel.scrollHeight,clientHeight:panel.clientHeight,tasks:panel.querySelectorAll('.calendar-task-list > *').length,formHidden:form.hidden,dialogOpen:dialog.open,submit:rect(add)},information:{rect:rect(information),scrollHeight:information.scrollHeight,clientHeight:information.clientHeight,scrollTop:information.scrollTop},dense:{rect:rect(dense),top:rect(dense.querySelector('.calendar-day-top')),number:rect(dense.querySelector('.calendar-day-top strong')),marker:rect(dense.querySelector('.calendar-day-marker')),overflowRect:rect(overflow),overflowText:overflow.textContent,overflowCount:overflow.dataset.calendarTaskOverflow,totalPreviews:all.length,visiblePreviews:visible.map(item=>({rect:rect(item),whiteSpace:getComputedStyle(item).whiteSpace,overflow:getComputedStyle(item).overflow,scroll:item.scrollWidth,client:item.clientWidth,state:item.dataset.taskState,hidden:item.hidden}))}};
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
  assert.equal(result.panel.tasks,7);assert.equal(result.panel.formHidden,false);assert.equal(result.panel.dialogOpen,false);
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
    const add=document.querySelector('#calendar-add-task');add.click();
    const createDialog=document.querySelector('#calendar-task-create-dialog'),createSubmit=document.querySelector('#calendar-task-create-submit'),createName=document.querySelector('#calendar-task-create-name');
    const creation={open:createDialog.open,date:createDialog.querySelector('#calendar-task-create-date').value,focused:document.activeElement===createName,dialog:rect(createDialog),submit:rect(createSubmit)};createDialog.close();
    information.scrollTop=information.scrollHeight;await new Promise(r=>setTimeout(r,20));
    information.scrollTop=information.scrollHeight;await new Promise(r=>setTimeout(r,20));
    const panel=document.querySelector('#calendar-task-panel'),submit=document.querySelector('#calendar-task-create-submit');
    return JSON.stringify({state,controls,creation,scrolled:{information:rect(information),scrollTop:information.scrollTop,scrollHeight:information.scrollHeight,clientHeight:information.clientHeight,panel:rect(panel),add:rect(add)}});
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
  assert.ok(result.creation.open&&result.creation.date==='2026-05-06'&&result.creation.focused,JSON.stringify(result.creation));
  assert.ok(result.creation.dialog.height<520&&result.creation.submit.bottom<=result.creation.dialog.bottom,JSON.stringify(result.creation));
  assert.ok(result.scrolled.scrollTop>0,JSON.stringify(result.scrolled));
  assert.ok(result.scrolled.panel.bottom<=result.scrolled.information.bottom+1,JSON.stringify(result.scrolled));
});

test('selected-day summary and task controls remain reachable in their own scroll areas below a full month',{skip:process.platform!=='darwin'},()=>{
  const result=webKit(`
    const initial=calendarSnapshot(5),information=document.querySelector('.workspace-information'),summary=document.querySelector('.calendar-summary');
    const lastSummary=summary.querySelector('.calendar-daily-plan-preview li:last-child');
    summary.scrollTop=summary.scrollHeight;await new Promise(r=>setTimeout(r,20));
    const summaryScrolled={top:rect(summary),last:rect(lastSummary),scrollTop:summary.scrollTop,scrollHeight:summary.scrollHeight,clientHeight:summary.clientHeight};
    information.scrollTop=information.scrollHeight;await new Promise(r=>setTimeout(r,20));
    const panel=document.querySelector('#calendar-task-panel'),lastTask=panel.querySelector('.calendar-task-list > .task-row:last-child');
    return JSON.stringify({initial,summaryScrolled,information:{top:rect(information),scrollTop:information.scrollTop,scrollHeight:information.scrollHeight,clientHeight:information.clientHeight,panel:rect(panel),lastTask:rect(lastTask)}});
  `);
  assert.ok(result.initial.grid.bottom<=720,JSON.stringify(result.initial.grid));
  assert.ok(result.initial.panel.rect.top>=result.initial.frame.bottom,JSON.stringify(result.initial));
  assert.ok(result.initial.panel.tasks===7&&result.initial.panel.formHidden===false&&result.initial.panel.dialogOpen===false,JSON.stringify(result.initial.panel));
  assert.ok(result.initial.information.scrollHeight>result.initial.information.clientHeight,JSON.stringify(result.initial.information));
  assert.ok(result.initial.information.rect.top+result.initial.information.scrollHeight+1>=result.initial.panel.rect.bottom,JSON.stringify(result.initial));
  assert.ok(result.summaryScrolled.scrollHeight>result.summaryScrolled.clientHeight);
  assert.ok(result.summaryScrolled.last.top>=result.summaryScrolled.top.top&&result.summaryScrolled.last.bottom<=result.summaryScrolled.top.bottom,JSON.stringify(result.summaryScrolled));
  assert.ok(result.information.scrollTop>0,JSON.stringify(result.information));
  assert.ok(result.information.lastTask.top>=result.information.top.top&&result.information.lastTask.bottom<=result.information.top.bottom+1,JSON.stringify(result.information));
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
    document.querySelector('button.calendar-day-top[data-calendar-date="2026-09-09"]').click();
    while(!calendarHarness.selected().view) await new Promise(r=>setTimeout(r,5));
    const tasks=document.querySelector('#calendar-task-list');
    tasks.querySelector('button[data-task-editor-open="preview-0"]').click();
    const editor=document.querySelector('#calendar-task-editor-dialog-root [data-task-editor="preview-0"]');
    return JSON.stringify({date:calendarHarness.selected().date,availability:document.querySelector('#calendar-summary-status').dataset.availability,copy:document.querySelector('#calendar-summary-copy').textContent,count:tasks.children.length,names:[...tasks.children].map(c=>c.textContent),schedule:editor.querySelector('.task-row-meta').textContent,start:editor.querySelector('[data-task-time]').value,endDate:editor.querySelector('[data-task-end-date]').value,endTime:editor.querySelector('[data-task-end-time]').value,commands});
  `,830,758);
  assert.equal(result.date,'2026-09-09');assert.equal(result.availability,'unreviewed');
  assert.ok(result.copy.includes('合成安排。'));assert.equal(result.count,7);
  assert.equal(result.start,'23:30');assert.equal(result.endDate,'2026-09-10');assert.equal(result.endTime,'00:45');
  assert.ok(result.schedule.includes('23:30') && result.schedule.includes('00:45'));
  assert.deepEqual(result.commands.filter((item:any)=>item.command==='read_daily_view'),[{command:'read_daily_view',args:{date:'2026-09-09'}}]);
  assert.ok(result.commands.every((item:any)=>['read_daily_view','today_view'].includes(item.command)),'date details must read the shared sources without writes');
});

test('Calendar task previews open a compact editor without selecting another date; create uses the selected date in one modal',{skip:process.platform!=='darwin'},()=>{
  const result=webKit(`
    const month=structuredClone(sourceFixture.month),view=structuredClone(sourceFixture.selected);
    const other=month.days.find(day=>day.date==='2026-09-10');
    other.taskSummaries=[{id:'preview-0',name:'Preview task',state:'pending'}];other.taskOverflowCount=0;
    calendarHarness.render(month,view);
    const beforeScroll=document.querySelector('.workspace-information').scrollTop;
    document.querySelector('[data-calendar-task-summary="preview-0"]').click();await new Promise(r=>setTimeout(r,20));
    const editDialog=document.querySelector('#calendar-task-editor-dialog-root [data-task-editor-dialog="preview-0"]');
    const content=editDialog.querySelector('[data-task-content]'),contentLabel=content.closest('label'),caption=contentLabel.querySelector('span');
    const afterPreview={selected:calendarHarness.selected().date,gridSelected:document.querySelector('.calendar-day[data-calendar-date="2026-09-09"]').dataset.selected!==undefined,
      open:!document.querySelector('#calendar-task-editor-dialog-root').hidden&&!editDialog.hidden,
      name:editDialog.querySelector('[data-task-name]').value,scroll:document.querySelector('.workspace-information').scrollTop,
      focusedContent:document.activeElement===content,contentHeight:content.getBoundingClientRect().height,captionBottom:caption.getBoundingClientRect().bottom,
      contentTop:content.getBoundingClientRect().top,contentIsCaptionSibling:contentLabel.children[0]===caption&&contentLabel.children[1]===content,
      contentOutline:getComputedStyle(content).outlineWidth,editorCompact:editDialog.querySelector('[data-task-editor]').classList.contains('task-editor-compact')};
    document.querySelector('#calendar-task-editor-dialog-root [data-task-editor-close]').click();
    const add=document.querySelector('#calendar-add-task');add.click();
    const createDialog=document.querySelector('#calendar-task-create-dialog'),name=document.querySelector('#calendar-task-create-name'),date=document.querySelector('#calendar-task-create-date');
    const creation={open:createDialog.open,selected:calendarHarness.selected().date,date:date.value,focused:document.activeElement===name,dateEditable:!date.disabled};
    date.value='2026-09-12';date.dispatchEvent(new Event('change',{bubbles:true}));
    const editedDate=date.value,selectedAfterDateEdit=calendarHarness.selected().date;
    document.querySelector('#calendar-task-create-cancel').click();
    return JSON.stringify({beforeScroll,afterPreview,creation,editedDate,selectedAfterDateEdit,closed:!createDialog.open,commands});
  `,830,758);
  assert.equal(result.afterPreview.selected,'2026-09-09');
  assert.equal(result.afterPreview.gridSelected,true);
  assert.equal(result.afterPreview.open,true);
  assert.equal(result.afterPreview.name,'合成任务 0 完整长标题');
  assert.equal(result.afterPreview.scroll,result.beforeScroll);
  assert.equal(result.afterPreview.focusedContent,true,JSON.stringify(result.afterPreview));
  assert.ok(result.afterPreview.contentHeight>=128,JSON.stringify(result.afterPreview));
  assert.ok(result.afterPreview.contentTop-result.afterPreview.captionBottom>=5,JSON.stringify(result.afterPreview));
  assert.equal(result.afterPreview.contentIsCaptionSibling,true);
  assert.notEqual(result.afterPreview.contentOutline,'0px');
  assert.notEqual(result.afterPreview.contentOutline,'none');
  assert.equal(result.afterPreview.editorCompact,true);
  assert.deepEqual(result.creation,{open:true,selected:'2026-09-09',date:'2026-09-09',focused:true,dateEditable:true});
  assert.equal(result.editedDate,'2026-09-12');assert.equal(result.selectedAfterDateEdit,'2026-09-09');
  assert.equal(result.closed,true);
  assert.equal(result.commands.filter((item:any)=>item.command==='read_daily_view').length,0);
  assert.equal(result.commands.filter((item:any)=>/^(create_|edit_|update_|save_|set_)/.test(item.command)).length,0);
});

test('Calendar keeps list and schedule fields directly expanded and clear actions follow the draft until Cancel',{skip:process.platform!=='darwin'},()=>{
  const result=webKit(`
    const month=structuredClone(sourceFixture.month),view=structuredClone(sourceFixture.selected);
    view.tasks.lists.push({id:'project',name:'Project',isSystem:false,archived:false});
    calendarHarness.render(month,view);
    const before=Object.fromEntries(['preview-0','preview-1'].map(id=>[id,structuredClone(view.tasks.tasks.find(task=>task.id===id))]));
    const open=id=>{
      document.querySelector('#calendar-task-list [data-task-editor-open="'+id+'"]').click();
      return document.querySelector('#calendar-task-editor-dialog-root [data-task-editor="'+id+'"]');
    };
    const change=(input,value)=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));};

    const timed=open('preview-0');
    const list=timed.querySelector('[data-task-list]');change(list,'project');
    const date=timed.querySelector('[data-task-date]');change(date,'2026-09-12');
    change(timed.querySelector('[data-task-time]'),'08:15');
    const endDate=timed.querySelector('[data-task-end-date]');endDate.value='2026-09-12';endDate.dispatchEvent(new Event('input',{bubbles:true}));
    const endTime=timed.querySelector('[data-task-end-time]');endTime.value='09:45';endTime.dispatchEvent(new Event('input',{bubbles:true}));
    const scheduleValues=form=>Object.fromEntries(['[data-task-date]','[data-task-time]','[data-task-end-date]','[data-task-end-time]'].map(selector=>[selector,form.querySelector(selector).value]));
    const directFieldsVisible=form=>{
      const fields=['[data-task-list]','[data-task-date]','[data-task-time]','[data-task-end-date]','[data-task-end-time]'].map(selector=>form.querySelector(selector));
      return fields.every(field=>field.closest('details')===null&&field.getBoundingClientRect().width>0&&field.getBoundingClientRect().height>0);
    };
    const afterEndInput={schedule:scheduleValues(timed),directFieldsVisible:directFieldsVisible(timed),
      clearEndVisible:!timed.querySelector('[data-task-clear-end]').hidden,clearScheduleVisible:!timed.querySelector('[data-task-clear-timed-schedule]').hidden};
    endDate.dispatchEvent(new Event('change',{bubbles:true}));endTime.dispatchEvent(new Event('change',{bubbles:true}));
    const beforeClearEnd={list:list.value,schedule:scheduleValues(timed),directFieldsVisible:directFieldsVisible(timed),
      clearEndVisible:!timed.querySelector('[data-task-clear-end]').hidden,clearScheduleVisible:!timed.querySelector('[data-task-clear-timed-schedule]').hidden,
      duplicateSummaries:timed.querySelectorAll('[data-task-list-summary],[data-task-schedule-summary]').length};
    timed.querySelector('[data-task-clear-end]').click();
    const afterClearEnd={schedule:scheduleValues(timed),
      clearEndHidden:timed.querySelector('[data-task-clear-end]').hidden,clearScheduleVisible:!timed.querySelector('[data-task-clear-timed-schedule]').hidden,
      directFieldsVisible:directFieldsVisible(timed)};
    const buttons=[...timed.querySelectorAll('.task-editor-footer-actions > button')].map(button=>button.getBoundingClientRect().height);
    timed.querySelector('[data-task-editor-close]').click();
    const afterTimedCancel=view.tasks.tasks.find(task=>task.id==='preview-0');

    const untimed=open('preview-1');
    const untimedDate=untimed.querySelector('[data-task-date]');change(untimedDate,'2026-09-14');
    change(untimed.querySelector('[data-task-time]'),'10:30');
    change(untimed.querySelector('[data-task-end-date]'),'2026-09-14');
    change(untimed.querySelector('[data-task-end-time]'),'11:45');
    const beforeClearSchedule={schedule:scheduleValues(untimed),directFieldsVisible:directFieldsVisible(untimed),
      clearEndVisible:!untimed.querySelector('[data-task-clear-end]').hidden,clearScheduleVisible:!untimed.querySelector('[data-task-clear-timed-schedule]').hidden,
      duplicateSummaries:untimed.querySelectorAll('[data-task-list-summary],[data-task-schedule-summary]').length,date:untimedDate.value};
    untimed.querySelector('[data-task-clear-timed-schedule]').click();
    const afterClearSchedule={schedule:scheduleValues(untimed),
      clearEndHidden:untimed.querySelector('[data-task-clear-end]').hidden,clearScheduleHidden:untimed.querySelector('[data-task-clear-timed-schedule]').hidden,
      directFieldsVisible:directFieldsVisible(untimed)};
    untimed.querySelector('[data-task-editor-close]').click();
    const afterUntimedCancel=view.tasks.tasks.find(task=>task.id==='preview-1');
    return JSON.stringify({before,afterTimedCancel,afterUntimedCancel,afterEndInput,beforeClearEnd,afterClearEnd,beforeClearSchedule,afterClearSchedule,buttons,commands});
  `,830,758);
  assert.deepEqual(result.afterEndInput,{schedule:{'[data-task-date]':'2026-09-12','[data-task-time]':'08:15','[data-task-end-date]':'2026-09-12','[data-task-end-time]':'09:45'},directFieldsVisible:true,clearEndVisible:true,clearScheduleVisible:true});
  assert.deepEqual(result.beforeClearEnd,{list:'project',schedule:{'[data-task-date]':'2026-09-12','[data-task-time]':'08:15','[data-task-end-date]':'2026-09-12','[data-task-end-time]':'09:45'},directFieldsVisible:true,clearEndVisible:true,clearScheduleVisible:true,duplicateSummaries:0});
  assert.deepEqual(result.afterClearEnd,{schedule:{'[data-task-date]':'2026-09-12','[data-task-time]':'08:15','[data-task-end-date]':'','[data-task-end-time]':''},clearEndHidden:true,clearScheduleVisible:true,directFieldsVisible:true});
  assert.deepEqual(result.beforeClearSchedule,{schedule:{'[data-task-date]':'2026-09-14','[data-task-time]':'10:30','[data-task-end-date]':'2026-09-14','[data-task-end-time]':'11:45'},directFieldsVisible:true,clearEndVisible:true,clearScheduleVisible:true,duplicateSummaries:0,date:'2026-09-14'});
  assert.deepEqual(result.afterClearSchedule,{schedule:{'[data-task-date]':'2026-09-14','[data-task-time]':'','[data-task-end-date]':'','[data-task-end-time]':''},clearEndHidden:true,clearScheduleHidden:true,directFieldsVisible:true});
  assert.equal(result.buttons.length,2);assert.ok(result.buttons.every((height:number)=>height===result.buttons[0]&&height>=30),JSON.stringify(result.buttons));
  assert.deepEqual(result.afterTimedCancel,result.before['preview-0']);
  assert.deepEqual(result.afterUntimedCancel,result.before['preview-1']);
  assert.deepEqual(result.commands.filter((item:any)=>/^(create_|edit_|update_|save_|set_)/.test(item.command)),[]);
});

test('Tasks opens directly on spaced Content and leaves Add subtask visible beside the collapsed relationship disclosure',{skip:process.platform!=='darwin'},()=>{
  const result=webKit(`
    const task={id:'synthetic-parent',name:'Synthetic parent task',content:'Synthetic editable context stays in its own content field.',date:'2026-10-14',time:'09:30',executionEnd:null,priority:'medium',tagIds:[],parentTaskId:null,listId:'inbox',source:{kind:'manual',reference:null},state:'pending',deletedAt:null,completion:null,overdue:false,timePassed:false,createdAt:'2026-10-01T12:00:00Z',modifiedAt:'2026-10-01T12:00:00Z',changes:[]};
    const view={state:'ready',message:'',schemaVersion:1,revision:'synthetic-revision',targetBinding:'synthetic-vault',vaultName:'Synthetic Vault',vaultPath:'/tmp/Synthetic Vault',currentDate:'2026-10-14',lists:[{id:'inbox',name:'Inbox',isSystem:true,archived:false}],folders:[],tags:[],tasks:[task]};
    const mounted=taskSurfaceHarness.render(task,view),content=mounted.dialog.querySelector('[data-task-content]'),caption=content.closest('label').querySelector('span'),parent=mounted.dialog.querySelector('[data-task-parent-disclosure]'),add=mounted.dialog.querySelector('.task-form-grid > [data-task-add-child]');
    const bounds=rect(add),hit=document.elementFromPoint(bounds.left+bounds.width/2,bounds.top+bounds.height/2);
    return JSON.stringify({opened:mounted.opened,focusedContent:document.activeElement===content,content:rect(content),caption:rect(caption),contentIsCaptionSibling:content.closest('label').children[0]===caption&&content.closest('label').children[1]===content,outline:getComputedStyle(content).outlineWidth,add:rect(add),addVisible:!add.hidden&&bounds.top>=0&&bounds.bottom<=innerHeight&&bounds.height>0,addPointerHit:Boolean(hit&&add.contains(hit)),addInsideParentDisclosure:parent.contains(add),parentDisclosureOpen:parent.open,modal:rect(mounted.dialog)});
  `,969,723);
  assert.equal(result.opened,true);
  assert.equal(result.focusedContent,true);
  assert.ok(result.content.height>=128,JSON.stringify(result));
  assert.ok(result.content.top-result.caption.bottom>=5,JSON.stringify(result));
  assert.equal(result.contentIsCaptionSibling,true);
  assert.ok(parseFloat(result.outline)>0,JSON.stringify(result));
  assert.equal(result.addVisible,true,JSON.stringify(result));
  assert.equal(result.addPointerHit,true,JSON.stringify(result));
  assert.equal(result.addInsideParentDisclosure,false);
  assert.equal(result.parentDisclosureOpen,false);
});

test('Calendar holiday controls persist region preferences without writing task or Daily Record data',{skip:process.platform!=='darwin'},()=>{
  const result=webKit(`
    calendarHarness.render(sourceFixture.month,sourceFixture.selected);
    const unitedStates=document.querySelector('#calendar-holidays-united-states');
    unitedStates.checked=true;unitedStates.dispatchEvent(new Event('change',{bubbles:true}));
    const dateCell=()=>document.querySelector('[data-calendar-date="2026-09-07"].calendar-day');
    const holidayRow=dateCell().querySelector('.calendar-day-holidays');
    const before={holiday:holidayRow.textContent,visible:!holidayRow.hidden};
    unitedStates.checked=false;unitedStates.dispatchEvent(new Event('change',{bubbles:true}));
    const saved=JSON.parse(localStorage.getItem('personal-dashboard.calendar-holidays.v1'));
    const afterRegionChange={text:dateCell().querySelector('.calendar-day-holidays').textContent,checked:unitedStates.checked};
    calendarHarness.language('en');
    const afterLanguageChange={checked:document.querySelector('#calendar-holidays-united-states').checked,stored:JSON.parse(localStorage.getItem('personal-dashboard.calendar-holidays.v1'))};
    return JSON.stringify({before,saved,afterRegionChange,afterLanguageChange,selected:calendarHarness.selected().date,commands});
  `,830,758);
  assert.ok(result.before.holiday.includes('劳动节')&&result.before.visible,JSON.stringify(result.before));
  assert.deepEqual(result.saved,{enabled:true,china:true,unitedStates:false});
  assert.deepEqual(result.afterRegionChange,{text:'',checked:false});
  assert.equal(result.afterLanguageChange.checked,false);
  assert.deepEqual(result.afterLanguageChange.stored,result.saved);
  assert.equal(result.selected,'2026-09-09');
  assert.equal(result.commands.filter((item:any)=>/^(create_|edit_|update_|save_|set_)/.test(item.command)).length,0);
});
