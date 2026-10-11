import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

// Production macOS WebKit DOM/layout with only the public Tauri boundary substituted.
function probe(width:number, scenario:string, withUntimed=true, height=758) {
  const directory=mkdtempSync(join(tmpdir(),'pdex14-webkit-'));
  try {
    const root=new URL('../..',import.meta.url).pathname;
    execFileSync(join(root,'node_modules/.bin/tsc'),['--module','commonjs','--outDir',directory],{cwd:root});
    const modules=Object.fromEntries(readdirSync(directory).filter(n=>n.endsWith('.js')).map(n=>['./'+n,readFileSync(join(directory,n),'utf8')]));
    const view=JSON.parse(readFileSync(new URL('./fixtures/plan-time-views.json',import.meta.url),'utf8')).loaded;
    const base=view.timeAxis.currentArrangement[0];
    view.timeAxis.unlocatedCurrentArrangement=withUntimed ? [{...base,startMinute:null,endMinute:null,planPrecision:'unlocated',text:'Synthetic untimed plan original',period:'择机'}] : [];
    view.timeAxis.unlocatedConfirmedFacts=withUntimed ? [{...base,startMinute:null,endMinute:null,planId:null,timeEditable:false,text:'Synthetic untimed confirmed fact original',period:''}] : [];
    writeFileSync(join(directory,'index.html'),readFileSync(new URL('../../frontend/index.html',import.meta.url),'utf8').replace(/<script[^>]*src="main.js"[^>]*><\/script>/,''));
    writeFileSync(join(directory,'styles.css'),readFileSync(new URL('../../frontend/styles.css',import.meta.url),'utf8'));
    writeFileSync(join(directory,'check.js'),`
      const modules=${JSON.stringify(modules)},cache={};
      function require(n){if(cache[n])return cache[n];const e={};cache[n]=e;new Function('exports','require',modules[n])(e,require);return e;}
      const view=${JSON.stringify(view)},month=${readFileSync(new URL('./fixtures/compact-calendar-view.json',import.meta.url),'utf8')}.month,calls=[];
      window.__TAURI__={core:{invoke:async(command,args)=>{calls.push({command,args});
        if(['today_view','read_daily_view'].includes(command))return structuredClone(view);
        if(command==='calendar_month')return structuredClone(month);
        if(command==='tasks_view')return structuredClone(view.tasks);
        if(command==='application_identity')return {productName:'Synthetic Dashboard'};
        if(command==='interface_language_preferences')return {interfaceLanguage:'en'};
        if(command==='appearance_preferences')return {accent:'green',fontSize:'normal'};
        throw Error('Unexpected public command '+command);
      }}};
      require('./main.js');
      async function until(f){for(let n=0;n<200;n++){if(f())return;await new Promise(r=>setTimeout(r,2));}throw Error('DOM condition timed out '+f);}
      await until(()=>document.querySelector('#runtime-status').dataset.state==='ready'&&document.documentElement.lang==='en');
      document.querySelector('[data-today-phase="daytime"]').click();
      const region=document.querySelector('#today-unlocated-time-region'),trigger=document.querySelector('#today-unlocated-time-shortcut');
      const rect=n=>{const r=n.getBoundingClientRect();return {width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
      const side=document.querySelector('.today-side-region');
      const snapshot=()=>({side:rect(side),sideHidden:side.hidden,viewport:innerWidth,axis:rect(document.querySelector('#today-axis-scroll-surface')),nav:rect(document.querySelector('.workspace-sidebar')),region:rect(region),hidden:region.hidden,expanded:trigger.getAttribute('aria-expanded'),label:trigger.getAttribute('aria-label'),visibleText:trigger.textContent,badge:trigger.querySelector('.sidebar-toggle-count')?.textContent??null,content:region.textContent});
      ${scenario}
    `);
    return JSON.parse(execFileSync('swift',[new URL('./helpers/rendered-today-unlocated.swift',import.meta.url).pathname,join(directory,'index.html'),join(directory,'check.js'),String(width),String(height)],{encoding:'utf8',timeout:60000}));
  } finally {rmSync(directory,{recursive:true,force:true});}
}

type QuickScheduleProbe = {
  hidden:boolean;
  text:string;
  labelFontSize:number;
  labelClientWidth:number;
  labelScrollWidth:number;
  title:string;
  aria:string;
  width:number;
  rects:{top:number;height:number;width:number}[];
  overflow:boolean;
  calls:{command:string}[];
};

function assertQuickSchedulePresentation(result:QuickScheduleProbe,expectedText:string|Array<string|RegExp>,expectedTitle:RegExp) {
  assert.equal(result.hidden,false);
  if(typeof expectedText==='string')assert.equal(result.text,expectedText);
  else for(const pattern of expectedText)typeof pattern==='string'?assert.equal(result.text,pattern):assert.match(result.text,pattern);
  assert.equal(result.title,result.aria);assert.match(result.title,expectedTitle);
  assert.ok(result.width>=124,JSON.stringify(result));assert.ok(result.labelFontSize>=10,JSON.stringify(result));
  assert.ok(result.labelClientWidth>=64&&result.labelScrollWidth<=result.labelClientWidth,JSON.stringify(result));assert.ok(result.rects[0].width>=40,JSON.stringify(result.rects));
  assert.ok(Math.max(...result.rects.map(r=>r.top+r.height/2))-Math.min(...result.rects.map(r=>r.top+r.height/2))<=2,JSON.stringify(result.rects));
  assert.equal(result.overflow,false);assert.deepEqual(result.calls.filter(c=>/^(create_|edit_|update_|save_|set_)/.test(c.command)),[]);
}

test('Today restores the entire existing right sidebar docked at medium width and keeps its nodes', {skip:process.platform!=='darwin'},()=>{
  const result=probe(1000,`
    const detail=region.querySelector('details');detail.open=true;
    const taskName=document.querySelector('#today-task-create-name');taskName.value='Unsaved synthetic task';
    const before=snapshot();trigger.focus();trigger.click();const opened=snapshot();
    const hasDialog=Boolean(document.querySelector('dialog[data-today-unlocated-drawer]'));
    trigger.click();const closed=snapshot();trigger.click();
    return JSON.stringify({before,opened,closed,hasDialog,sameSide:side===document.querySelector('.today-side-region'),detailKept:detail===region.querySelector('details')&&detail.open,draft:taskName.value,focus:document.activeElement===trigger,calls});
  `);
  assert.equal(result.before.sideHidden,true);
  assert.equal(result.opened.sideHidden,false);
  assert.equal(result.hasDialog,false);
  assert.ok(result.opened.side.left>=result.opened.axis.right,'sidebar is beside the axis');
  assert.ok(result.before.axis.width>result.opened.axis.width+150,'collapse releases whole column');
  assert.equal(result.closed.sideHidden,true);
  assert.equal(result.sameSide,true);assert.equal(result.detailKept,true);
  assert.equal(result.draft,'Unsaved synthetic task');assert.equal(result.focus,true);
  assert.deepEqual(result.calls.filter((c:{command:string})=>/^(create_|edit_|update_|save_|set_)/.test(c.command)),[]);
});

for(const width of [640,830,1000,1280]) {
  test(`main navigation at ${width}px collapses and restores its side column across all destinations`, {skip:process.platform!=='darwin'},()=>{
    const result=probe(width,`
      const toggle=document.querySelector('#workspace-sidebar-toggle'),nav=document.querySelector('.workspace-sidebar'),main=document.querySelector('.workspace-shell');
      if(!toggle)throw Error('Sidebar toggle missing');
      const rows=[];
      for(const destination of ['today','tasks','calendar','habits','collaboration']) {
        document.querySelector('[data-workspace-destination="'+destination+'"].destination-button').click();
        await new Promise(r=>setTimeout(r,15));
        const restored={nav:rect(nav),main:rect(main),expanded:toggle.getAttribute('aria-expanded'),labels:[...nav.querySelectorAll('.destination-button > span:not(.destination-icon)')].map(label=>({rect:rect(label),button:rect(label.closest('button')),clip:getComputedStyle(label).clip}))};
        toggle.focus();toggle.click();const collapsed={navHidden:nav.hidden,main:rect(main),expanded:toggle.getAttribute('aria-expanded'),trigger:rect(toggle)};
        toggle.click();rows.push({destination,restored,collapsed,again:rect(nav),focused:document.activeElement===toggle,overflow:document.documentElement.scrollWidth>innerWidth});
      }
      toggle.click();document.querySelector('#workspace-settings').click();
      return JSON.stringify({rows,retainedCollapsed:nav.hidden&&toggle.getAttribute('aria-expanded')==='false',calls});
    `);
    for(const row of result.rows) {
      assert.equal(row.restored.expanded,'true');
      for(const label of row.restored.labels){assert.ok(label.rect.width>20&&label.rect.height>8,'restored navigation labels must be visible');assert.equal(label.clip,'auto');assert.ok(label.rect.right<=label.button.right,'navigation labels fit their button');}
      if(width===640)for(let i=1;i<row.restored.labels.length;i++)assert.ok(row.restored.labels[i].button.top>row.restored.labels[i-1].button.top,'narrow side navigation is one vertical column');
      assert.ok(row.restored.nav.width>=130&&row.restored.nav.height>400,JSON.stringify(row));
      assert.ok(row.restored.nav.right<=row.restored.main.left,'restored navigation stays on the left');
      assert.equal(row.collapsed.navHidden,true);assert.equal(row.collapsed.expanded,'false');
      assert.ok(row.collapsed.main.width>row.restored.main.width+120,'collapse frees its column');
      assert.ok(row.collapsed.trigger.width>0&&row.collapsed.trigger.left>=0);
      assert.equal(row.again.width,row.restored.nav.width);assert.equal(row.focused,true);assert.equal(row.overflow,false,JSON.stringify(row));
    }
    assert.equal(result.retainedCollapsed,true);
    assert.deepEqual(result.calls.filter((c:{command:string})=>/^(create_|edit_|update_|save_|set_)/.test(c.command)),[]);
    console.log('Navigation geometry '+width+':',JSON.stringify(result.rows));
  });
}

for(const width of [640,830,1000,1088,1280]) {
  test(`Calendar summary is right-docked above 1000px and hidden below without changing its data at ${width}px`, {skip:process.platform!=='darwin'},()=>{
    const result=probe(width,`
      document.querySelector('[data-workspace-destination="calendar"].destination-button').click();
      await until(()=>document.querySelectorAll('#calendar-grid [data-calendar-date]').length>0);
      await until(()=>document.querySelector('#calendar-open-day').disabled===false);
      const toggle=document.querySelector('#calendar-summary-toggle'),summary=document.querySelector('#calendar-summary'),grid=document.querySelector('#calendar-grid');
      const cells=[...grid.children],selected=grid.querySelector('[data-selected]'),content=summary.textContent,form=document.querySelector('#calendar-task-create-name');form.value='Retained Calendar draft';
      const before={summary:rect(summary),grid:rect(grid),display:getComputedStyle(summary).display};
      return JSON.stringify({before,togglePresent:Boolean(toggle),summaryHidden:summary.hidden,contentKept:content===summary.textContent,cellsKept:cells.every((c,i)=>grid.children[i]===c),selectionKept:selected===grid.querySelector('[data-selected]'),draft:form.value,dialog:summary.closest('dialog')!==null,overflow:document.documentElement.scrollWidth>innerWidth,calls});
    `,true,720);
    const visible=width>1000;
    assert.equal(result.togglePresent,false);assert.equal(result.summaryHidden,false);
    assert.equal(result.before.display,visible?'block':'none');
    assert.equal(result.dialog,false);assert.equal(result.contentKept,true);assert.equal(result.cellsKept,true);assert.equal(result.selectionKept,true);
    assert.equal(result.draft,'Retained Calendar draft');assert.equal(result.overflow,false,JSON.stringify(result));
    if(visible)assert.ok(result.before.summary.left>=result.before.grid.right&&result.before.summary.right<=width&&result.before.summary.width>80,JSON.stringify(result.before));
    else assert.equal(result.before.summary.width,0,'narrow summary must not stack below the month');
    assert.ok(result.before.grid.width>100,JSON.stringify(result.before));
    assert.deepEqual(result.calls.filter((c:{command:string})=>/^(create_|edit_|update_|save_|set_)/.test(c.command)),[]);
  });
}

for(const width of [640,830,1000,1088,1280]) {
  test(`Today complete sidebar at ${width}px restores beside the axis without a floating surface`, {skip:process.platform!=='darwin'},()=>{
    const result=probe(width,`
      const initial=snapshot();
      if(trigger.getAttribute('aria-expanded')==='true')trigger.click();const collapsed=snapshot();
      trigger.click();const expanded=snapshot();
      return JSON.stringify({initial,collapsed,expanded,trigger:rect(trigger),title:trigger.title,name:trigger.getAttribute('aria-label'),dialogs:[...document.querySelectorAll('dialog[open]')].length,overflow:document.documentElement.scrollWidth>innerWidth});
    `);
    assert.equal(result.initial.sideHidden,width<=1024);
    assert.equal(result.collapsed.sideHidden,true);assert.equal(result.expanded.sideHidden,false);
    assert.ok(result.collapsed.axis.width>result.expanded.axis.width+150);
    assert.ok(result.expanded.side.left>=result.expanded.axis.right,'right sidebar stays docked');
    assert.ok(result.expanded.side.right<=width&&result.expanded.axis.width>=160,JSON.stringify(result));
    assert.equal(result.dialogs,0);assert.equal(result.overflow,false);
    assert.match(result.title,/Hide Today sidebar/);assert.equal(result.title,result.name);
    assert.match(result.name,/2 untimed items/);assert.equal(result.expanded.visibleText.trim(),"");assert.equal(result.expanded.badge,null);
    assert.ok(result.trigger.right<=width);
    console.log('Today docked geometry '+width+':',JSON.stringify(result));
  });
}

test('Today manual intent, axis/sidebar reading position and expanded details survive resize', {skip:process.platform!=='darwin'},()=>{
  const result=probe(1280,`
    const surface=document.querySelector('#today-axis-scroll-surface');surface.scrollTop=80;const axisScroll=surface.scrollTop;
    const info=document.querySelector('.workspace-information'),detail=region.querySelector('details');detail.open=true;
    trigger.click();trigger.click();
    async function resize(width){window.webkit.messageHandlers.resizeViewport.postMessage({width,height:758});await until(()=>innerWidth===width);window.dispatchEvent(new Event('resize'));await new Promise(r=>setTimeout(r,25));}
    await resize(1000);const medium=snapshot();await resize(640);const narrow=snapshot();await resize(1280);const wide=snapshot();
    info.scrollTop=2000;const reading=info.scrollTop;trigger.click();snapshot();await new Promise(r=>setTimeout(r,20));trigger.click();
    const preserved={axis:surface.scrollTop,reading:info.scrollTop,detail:detail===region.querySelector('details')&&detail.open};
    document.querySelector('[data-today-phase="morning"]').click();document.querySelector('[data-today-phase="daytime"]').click();
    await resize(1000);const reset=snapshot();
    return JSON.stringify({medium,narrow,wide,preserved,axisScroll,reading,reset,calls});
  `);
  assert.equal(result.medium.sideHidden,false);assert.equal(result.narrow.sideHidden,false);assert.equal(result.wide.sideHidden,false);
  assert.equal(result.preserved.axis,result.axisScroll);assert.ok(result.axisScroll>0);assert.equal(result.preserved.detail,true);
  assert.ok(result.reading>0,"workspace reading position must be real");assert.equal(result.preserved.reading,result.reading);
  assert.equal(result.reset.sideHidden,true);
  assert.deepEqual(result.calls.filter((c:{command:string})=>/^(create_|edit_|update_|save_|set_)/.test(c.command)),[]);
});

test('Today aside control is beside its heading and keeps the existing docked control behavior', {skip:process.platform!=='darwin'},()=>{
  const result=probe(1280,`
    const movedTrigger=document.querySelector('#today-unlocated-time-shortcut'),heading=document.querySelector('#today-daytime-heading');
    const before={trigger:rect(movedTrigger),heading:rect(heading),row:rect(movedTrigger.closest('.today-region-heading')),inHeading:Boolean(movedTrigger.closest('.today-region-heading')),expanded:movedTrigger.getAttribute('aria-expanded')};
    movedTrigger.focus();movedTrigger.click();
    return JSON.stringify({before,expanded:movedTrigger.getAttribute('aria-expanded'),focused:document.activeElement===movedTrigger,sideHidden:document.querySelector('.today-side-region').hidden,calls});
  `);
  assert.equal(result.before.inHeading,true);
  assert.ok(result.before.trigger.left>=result.before.heading.right,JSON.stringify(result.before));
  assert.ok(result.before.trigger.right<=result.before.row.right,JSON.stringify(result.before));
  assert.ok(result.before.trigger.top<=result.before.heading.top+result.before.heading.height+8,JSON.stringify(result.before));
  assert.notEqual(result.expanded,result.before.expanded);assert.equal(result.focused,true);
  assert.equal(result.sideHidden,result.expanded==='false');
  assert.deepEqual(result.calls.filter((c:{command:string})=>/^(create_|edit_|update_|save_|set_)/.test(c.command)),[]);
});

for (const width of [640, 681, 700]) {
  test(`toolbar keeps its brand, navigation toggle and trailing controls in one row at ${width}px`, {skip:process.platform!=='darwin'},()=>{
    const result=probe(width,`
      const toolbar=document.querySelector('.product-toolbar'),brand=toolbar.querySelector('.product-toolbar-brand'),divider=toolbar.querySelector('.product-toolbar-divider'),toggle=toolbar.querySelector('#workspace-sidebar-toggle'),actions=toolbar.querySelector('.product-toolbar-actions');
      const bounds=node=>{if(!node)return null;const r=node.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,top:r.top,bottom:r.bottom,height:r.height}};
      const controls=['workspace-settings','workspace-language','workspace-more'].map(id=>({id,rect:bounds(document.getElementById(id))}));
      return JSON.stringify({viewport:innerWidth,toolbar:bounds(toolbar),brand:bounds(brand),brandName:bounds(brand.querySelector('.product-toolbar-name')),divider:bounds(divider),toggle:bounds(toggle),actions:bounds(actions),controls,hasDivider:Boolean(divider),overflow:document.documentElement.scrollWidth>innerWidth,order:[...toolbar.children].map(node=>node.className||node.id)});
    `);
    assert.equal(result.hasDivider,true,JSON.stringify(result));
    assert.equal(result.toolbar.width,result.viewport,JSON.stringify(result));
    assert.ok(result.brand.left>=0&&result.brand.left<=20,JSON.stringify(result));
    assert.ok(result.brand.right<=result.divider.left&&result.divider.right<=result.toggle.left&&result.toggle.right<=result.actions.left,JSON.stringify(result));
    assert.ok(result.toggle.width>=30,JSON.stringify(result));
    assert.ok(result.actions.left<=result.controls[0].rect.left&&result.controls[0].rect.right<=result.controls[1].rect.left,JSON.stringify(result));
    assert.ok(result.controls[1].rect.right<=result.controls[2].rect.left&&result.controls[2].rect.right<=result.actions.right,JSON.stringify(result));
    assert.ok(result.brandName.height<=result.brand.height&&result.brandName.right<=result.divider.left,JSON.stringify(result));
    assert.ok(result.toolbar.left>=0&&result.toolbar.right<=result.viewport,JSON.stringify(result));
    assert.equal(result.overflow,false,JSON.stringify(result));
  });
}

test('Today quick schedule shows its current date and time within the existing row', {skip:process.platform!=='darwin'},()=>{
  const result=probe(640,`
    const date=document.querySelector('#today-task-create-date'),time=document.querySelector('#today-task-create-time'),button=document.querySelector('#today-task-create-schedule'),form=document.querySelector('#today-task-create-form');
    if(trigger.getAttribute('aria-expanded')!=='true')trigger.click();
    date.value='2026-08-10';date.dispatchEvent(new Event('change',{bubbles:true}));time.value='09:30';time.dispatchEvent(new Event('change',{bubbles:true}));
    const rects=[document.querySelector('#today-task-create-name'),button,document.querySelector('#today-task-create-submit')].map(node=>{const r=node.getBoundingClientRect();return {top:r.top,height:r.height,width:r.width}});
    const label=button.querySelector('.task-schedule-label');
    return JSON.stringify({hidden:form.hidden,text:label?.textContent?.trim(),labelFontSize:parseFloat(getComputedStyle(label).fontSize),labelClientWidth:label.clientWidth,labelScrollWidth:label.scrollWidth,title:button.title,aria:button.getAttribute('aria-label'),width:rects[1].width,rects,overflow:document.documentElement.scrollWidth>innerWidth,calls});
  `);
  assertQuickSchedulePresentation(result,['Today · 09:30'],/Aug 10.*09:30/);
});

test('Tasks quick schedule shows its current date and time within the existing row', {skip:process.platform!=='darwin'},()=>{
  const result=probe(640,`
    document.querySelector('[data-workspace-destination="tasks"].destination-button').click();
    const date=document.querySelector('#task-quick-date'),time=document.querySelector('#task-quick-time'),button=document.querySelector('#task-quick-schedule'),form=document.querySelector('#task-quick-form');
    const name=document.querySelector('#task-quick-name'),submit=document.querySelector('#task-quick-submit');
    form.hidden=false;date.disabled=false;time.disabled=false;button.disabled=false;name.disabled=false;submit.disabled=false;
    date.value='2026-08-10';date.dispatchEvent(new Event('change',{bubbles:true}));time.value='09:30';time.dispatchEvent(new Event('change',{bubbles:true}));
    const nodes=[name,button,submit];
    const rects=nodes.map(node=>{const r=node.getBoundingClientRect();return {top:r.top,height:r.height,width:r.width}}),label=button.querySelector('.task-schedule-label');
    return JSON.stringify({hidden:form.hidden,text:label?.textContent?.trim(),labelFontSize:parseFloat(getComputedStyle(label).fontSize),labelClientWidth:label.clientWidth,labelScrollWidth:label.scrollWidth,title:button.title,aria:button.getAttribute('aria-label'),width:rects[1].width,rects,overflow:document.documentElement.scrollWidth>innerWidth,calls});
  `);
  assertQuickSchedulePresentation(result,[/09:30/,/Today|Aug 10/],/Aug 10.*09:30/);
});

test('Today zero untimed count retains an icon-only, accessible sidebar entry', {skip:process.platform!=='darwin'},()=>{
  const result=probe(1000,`const before=snapshot();trigger.focus();trigger.click();return JSON.stringify({before,after:snapshot(),triggerHidden:trigger.hidden,focus:document.activeElement===trigger});`,false);
  assert.equal(result.before.sideHidden,true);assert.equal(result.triggerHidden,false);
  assert.equal(result.after.sideHidden,false);assert.equal(result.after.hidden,true);
  assert.match(result.after.label,/0 untimed items/);assert.equal(result.after.visibleText.trim(),"");assert.equal(result.after.badge,null);assert.equal(result.focus,true);
});
