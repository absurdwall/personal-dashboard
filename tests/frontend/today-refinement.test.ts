import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { readFileSync, mkdtempSync, writeFileSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
const directory=mkdtempSync(join(tmpdir(),'pdex-today-production-'));
after(()=>rmSync(directory,{recursive:true,force:true}));
const root=new URL('../..',import.meta.url).pathname;
execFileSync(join(root,'node_modules/.bin/tsc'),['--module','commonjs','--outDir',directory],{cwd:root});
const shippedMain=readFileSync(join(directory,'main.js'),'utf8');
const main=shippedMain.replace('void connectToApplication();','')+`
window.todayHarness={render(view){currentInterfaceLanguage='zh';currentWorkspaceDestination='today';appShell.dataset.workspaceDestination='today';workspaceDestinationPanels.forEach(p=>p.hidden=p.dataset.workspacePanel!=='today');renderToday(view);showTodayPhase('daytime');todayAxisFollowState='reading';},state(){return {fresh:todayPresentationFresh,today:todayOperationCount,tasks:taskOperationCount,plan:currentTodayView?.timeAxis.currentArrangement};}};`;
writeFileSync(join(directory,'main.js'),main);
const modules=Object.fromEntries(readdirSync(directory).filter(n=>n.endsWith('.js')).map(n=>['./'+n,readFileSync(join(directory,n),'utf8')]));
const views=JSON.parse(readFileSync(new URL('./fixtures/plan-time-views.json',import.meta.url),'utf8'));
const setup=`const modules=${JSON.stringify(modules)},cache={};function require(name){if(cache[name])return cache[name];const exports={};cache[name]=exports;new Function('exports','require',modules[name])(exports,require);return exports;}
window.probeCalls=[];window.probeView=${JSON.stringify(views.loaded)};window.__TAURI__={core:{invoke:async(command,args)=>{probeCalls.push({command,args});if(command==='edit_plan_time'){probeView=structuredClone(probeView);const e=probeView.timeAxis.currentArrangement.find(e=>e.planId===args.input.planId);e.period='约16:00';e.planPrecision='approximatePoint';e.startMinute=args.input.startMinute;e.endMinute=args.input.endMinute;probeView.revision='readback-revision';return {savedRevision:probeView.revision,view:probeView,refreshError:null};}if(['read_daily_view','today_view'].includes(command))return probeView;throw Error('Unexpected IPC '+command);}}};require('./main.js');todayHarness.render(probeView);`;
writeFileSync(join(directory,'index.html'),readFileSync(new URL('../../frontend/index.html',import.meta.url),'utf8').replace(/<script[^>]*src="main.js"[^>]*><\/script>/,'').replace('</body>',`<script>${setup}</script></body>`));
writeFileSync(join(directory,'styles.css'),readFileSync(new URL('../../frontend/styles.css',import.meta.url),'utf8'));
const server=createServer((req,res)=>{try{const path=join(directory,req.url==='/'?'index.html':req.url!.slice(1));res.setHeader('Content-Type',path.endsWith('.css')?'text/css':'text/html');res.end(readFileSync(path));}catch{res.statusCode=404;res.end();}});
await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
after(()=>server.close());
const playwrightModule=process.env.PDEX_PLAYWRIGHT_MODULE ?? join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const chromium=existsSync(playwrightModule)?(await import(playwrightModule)).chromium:null;
const browserTest=(name:string,run:any)=>test(name,{skip:!chromium},run);
async function browser(width:number,height:number,probe:(page:any)=>Promise<void>){const b=await chromium.launch({channel:'chrome',headless:true});try{const page=await b.newPage({viewport:{width,height}});await page.goto('http://127.0.0.1:'+(server.address() as any).port+'/');await probe(page);}finally{await b.close();}}
for(const [width,height] of [[1280,800],[1280,720 ]])browserTest(`production Today overview fits 06–24 at ${width}×${height}`,async()=>browser(width,height,async page=>{
  const result=await page.evaluate(()=>{const surface=document.querySelector('#today-axis-scroll-surface')!,plot=document.querySelector('#today-axis-plot')!,r=surface.getBoundingClientRect(),p=plot.getBoundingClientRect();return {surface:{top:r.top,bottom:r.bottom,height:r.height},plot:{top:p.top,bottom:p.bottom,height:p.height},scroll:surface.scrollHeight,client:surface.clientHeight,ticks:[...document.querySelectorAll('.today-hour-tick')].filter(t=>!(t as HTMLElement).hidden).map(t=>t.getAttribute('data-minute')),broad:[...document.querySelectorAll('.today-axis-marker-time')].map(t=>t.textContent)};});
  assert.ok(result.plot.bottom<=result.surface.bottom,JSON.stringify(result));assert.ok(result.surface.bottom<=height,JSON.stringify(result));assert.ok(result.ticks.includes('360')&&result.ticks.includes('1440'));assert.ok(result.broad.includes('下午'));assert.ok(result.broad.every((s:string)=>!s.includes('约13:00')));
}));
for(const [width,height] of [[1280,800],[1280,720],[830,758],[680,560 ]])browserTest(`real browser pointer moves a broad arrangement only after dragging at ${width}×${height}`,async()=>browser(width,height,async page=>{
  const marker=page.locator('.today-axis-marker').filter({hasText:'Review the draft'});
  await marker.scrollIntoViewIfNeeded();
  await marker.locator('.today-axis-marker-link').click();
  await page.locator('dialog.plan-time-editor[open]').waitFor();
  assert.equal(await page.evaluate(()=>window.probeCalls.filter(c=>c.command==='edit_plan_time').length),0,'opening must not rewrite afternoon');
  await page.locator('dialog.plan-time-editor button').filter({hasText:'关闭'}).click();
  // Fine zoom changes only presentation and gives short range operations readable targets.
  await page.locator('#today-axis-zoom').click();
  if(width>=1000)await page.locator('#today-axis-zoom').click();
  await marker.scrollIntoViewIfNeeded();
  const geometry=await page.evaluate(()=>{const plot=document.querySelector('#today-axis-plot')!.getBoundingClientRect();const card=[...document.querySelectorAll('.today-axis-marker')].find(e=>e.textContent?.includes('Review the draft'))!.getBoundingClientRect();return {x:card.left+card.width/2,y:card.top+card.height/2,delta:plot.height*180/1080};});
  await page.evaluate(()=>{window.pointerLog=[];for(const type of ["pointerdown","pointermove","pointerup"])document.addEventListener(type,e=>window.pointerLog.push({type,x:e.clientX,y:e.clientY,target:e.target.className}),true);});
  await page.mouse.move(geometry.x,geometry.y);await page.mouse.down();
  if(width>=1000)await page.mouse.move(geometry.x,geometry.y+geometry.delta,{steps:12});
  else {await page.mouse.move(geometry.x,geometry.y+6);await page.mouse.wheel(0,geometry.delta-6);await page.waitForTimeout(80);await page.mouse.move(geometry.x+1,geometry.y+6);}
  await page.mouse.up();
  await page.waitForTimeout(300);
  const debug=await page.evaluate(()=>({log:window.pointerLog,calls:window.probeCalls,state:todayHarness.state(),status:document.querySelector("#today-axis-edit-status")?.textContent,preview:document.querySelector(".today-axis-gesture-preview")?.textContent}));
  assert.ok(debug.calls.some(c=>c.command==='edit_plan_time'),JSON.stringify({geometry,debug}));
  const result=await page.evaluate(()=>({edits:window.probeCalls.filter(c=>c.command==='edit_plan_time'),label:[...document.querySelectorAll('.today-axis-marker-time')].map(e=>e.textContent),dialog:Boolean(document.querySelector('dialog[open]'))}));
  assert.equal(result.edits.length,1);assert.deepEqual([result.edits[0].args.input.precision,result.edits[0].args.input.startMinute,result.edits[0].args.input.endMinute],['approximatePoint',960,null]);assert.ok(result.label.includes('约16:00'));assert.equal(result.dialog,false);
}));
browserTest('Today Task marker opens Content-first nearby editor and saves without background movement or bottom duplicate',async()=>browser(1280,720,async page=>{
  await page.evaluate(()=>{
    const task={id:'today-task',name:'Synthetic timed Task',content:'Complete synthetic content',date:probeView.date,time:'16:00',executionEnd:{date:probeView.date,time:'16:45'},listId:'work',state:'pending',priority:'high',tagIds:['review'],parentId:'parent',createdAt:'2026-08-10T08:00-04:00',modifiedAt:'2026-08-10T08:00-04:00',deletedAt:null,completion:null,changes:[],source:{kind:'manual',reference:null},overdue:false,timePassed:false};
    probeView.tasks={...probeView.tasks,state:'ready',revision:'task-revision',tasks:[{...task,id:'parent',name:'Undated parent',date:null,time:null,executionEnd:null,parentId:null,listId:'inbox',tagIds:[]},task],tags:[{id:'review',name:'Review'}],folders:[{id:'projects',name:'Projects'}],lists:[{id:'inbox',name:'Inbox',isSystem:true,archived:false,folderId:null},{id:'work',name:'Work',isSystem:false,archived:false,folderId:'projects'}]};todayHarness.render(probeView);
    const previous=window.__TAURI__.core.invoke;window.__TAURI__.core.invoke=async(command,args)=>{if(command!=='update_task')return previous(command,args);probeCalls.push({command,args});probeView={...probeView,tasks:{...probeView.tasks,revision:'saved-task-revision',tasks:probeView.tasks.tasks.map(t=>t.id===args.input.taskId?{...t,...args.input}:t)}};return structuredClone(probeView.tasks);};
  });
  const marker=page.locator('[data-task-id="today-task"] .today-axis-marker-link');const before=await page.evaluate(()=>({outer:document.querySelector('.workspace-information')!.scrollTop,axis:document.querySelector('#today-axis-scroll-surface')!.scrollTop}));
  await marker.click();await page.locator('dialog[data-today-task-details][open]').waitFor();
  const content=page.locator('dialog[data-today-task-details] [data-task-content]');assert.equal(await content.inputValue(),'Complete synthetic content');
  await content.fill('Updated complete content');await page.locator('dialog[data-today-task-details] button[type=submit]').click();await page.waitForTimeout(250);assert.equal(await page.locator('dialog[data-today-task-details]').count(),0,JSON.stringify(await page.evaluate(()=>({status:document.querySelector('[data-today-task-details-status]')?.textContent,calls:probeCalls,valid:document.querySelector('dialog form')?.checkValidity()}))));
  const after=await page.evaluate(()=>({outer:document.querySelector('.workspace-information')!.scrollTop,axis:document.querySelector('#today-axis-scroll-surface')!.scrollTop,bottom:document.querySelector('#today-timed-details')!.querySelectorAll('[data-task-id]').length,task:probeView.tasks.tasks.find(t=>t.id==='today-task'),input:probeCalls.find(c=>c.command==='update_task')?.args.input}));
  assert.equal(after.outer,before.outer);assert.equal(after.axis,before.axis);assert.equal(after.bottom,0);assert.equal(after.task.content,'Updated complete content');assert.equal(after.input.expectedRevision,'task-revision');assert.equal(after.task.parentId,'parent');assert.equal(after.task.listId,'work');assert.equal(after.task.priority,'high');assert.deepEqual(after.task.tagIds,['review']);assert.deepEqual(after.task.executionEnd,{date:after.task.date,time:'16:45'});assert.equal(after.input.parentId,'parent');assert.equal(after.input.listId,'work');assert.equal(after.input.priority,'high');assert.deepEqual(after.input.tagIds,['review']);
}));
for(const [width,height] of [[1280,800],[1280,720],[830,758],[680,560]])test(`native WebKit production cards remain selectable and bounded at ${width}×${height}`,{skip:process.platform!=='darwin'},()=>{
  const script=join(directory,`wk-${width}-${height}.js`);writeFileSync(script,`await new Promise(r=>setTimeout(r,40));const plot=document.querySelector('#today-axis-plot'),surface=document.querySelector('#today-axis-scroll-surface'),rect=e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height,width:r.width};};return JSON.stringify({plot:rect(plot),surface:rect(surface),cards:[...plot.querySelectorAll('.today-axis-marker')].map(e=>({rect:rect(e),text:e.textContent,hit:e.querySelector('.today-axis-marker-link').getBoundingClientRect().height,overflow:getComputedStyle(e.querySelector('.today-axis-marker-title')).textOverflow})),writes:probeCalls.filter(c=>c.command==='edit_plan_time').length});`);
  const result=JSON.parse(execFileSync('swift',[new URL('./helpers/rendered-today-unlocated.swift',import.meta.url).pathname,join(directory,'index.html'),script,String(width),String(height)],{encoding:'utf8',timeout:60000}));
  assert.equal(result.writes,0);assert.equal(result.cards.length,2);for(const card of result.cards){assert.ok(card.hit>=28,JSON.stringify(result));assert.ok(card.rect.left>=result.plot.left&&card.rect.right<=result.plot.right,JSON.stringify(result));}if(width>=1000)assert.ok(result.plot.bottom<=result.surface.bottom&&result.surface.bottom<=height,JSON.stringify(result));
});
browserTest('plan cancellation captures only the selected Current arrangement source and revision',async()=>browser(1280,720,async page=>{
  await page.evaluate(()=>{const previous=window.__TAURI__.core.invoke;window.__TAURI__.core.invoke=async(command,args)=>{if(command!=='cancel_plan_entry')return previous(command,args);probeCalls.push({command,args});probeView=structuredClone(probeView);probeView.timeAxis.currentArrangement=probeView.timeAxis.currentArrangement.filter(e=>e.planId!==args.input.planId);probeView.revision='cancel-readback';return {savedRevision:'cancel-readback',view:probeView,refreshError:null};};});
  await page.locator('.today-axis-marker').filter({hasText:'Review the draft'}).locator('.today-axis-marker-link').click();
  await page.locator('dialog.plan-time-editor button').filter({hasText:'取消这项安排'}).click({timeout:2000});
  await page.locator('dialog.plan-time-editor').waitFor({state:'detached'});
  const result=await page.evaluate(()=>({call:probeCalls.find(c=>c.command==='cancel_plan_entry'),labels:[...document.querySelectorAll('.today-axis-marker-title')].map(e=>e.textContent)}));
  assert.equal(result.call.args.input.planId,views.loaded.timeAxis.currentArrangement[1].planId);assert.equal(result.call.args.input.expectedRevision,views.loaded.revision);assert.equal(result.labels.length,1);assert.ok(result.labels[0].includes('Prepare the project brief'));
}));
browserTest('real pointer precise move preserves duration, Escape restores position, and a small displacement stays a click',async()=>browser(1280,720,async page=>{
  await page.evaluate(view=>{probeView=structuredClone(view);todayHarness.render(probeView);},views.exact);
  const marker=page.locator('.today-axis-marker').filter({hasText:'Prepare the project brief'});
  const geometry=await marker.boundingBox();const plot=await page.locator('#today-axis-plot').boundingBox();const x=geometry!.x+geometry!.width/2,y=geometry!.y+geometry!.height/2,delta=plot!.height*120/1080;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+delta,{steps:4});await page.keyboard.press('Escape');await page.mouse.up();
  assert.equal(await page.evaluate(()=>probeCalls.filter(c=>c.command==='edit_plan_time').length),0);assert.equal(await page.locator('.today-axis-gesture-preview').count(),0);
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+3);await page.mouse.up();await page.locator('dialog.plan-time-editor[open]').waitFor();await page.locator('dialog.plan-time-editor button').filter({hasText:'关闭'}).click();
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+delta,{steps:4});await page.mouse.up();
  await page.waitForFunction(()=>probeCalls.some(c=>c.command==='edit_plan_time'));
  const input=await page.evaluate(()=>probeCalls.find(c=>c.command==='edit_plan_time').args.input);assert.deepEqual([input.precision,input.startMinute,input.endMinute],['exactRange',1020,1080]);assert.equal(await page.locator('dialog[open]').count(),0);
}));
browserTest('blank pointer range opens Task creation without a write, and fine mode preserves edge scrolling and Escape',async()=>browser(1280,720,async page=>{
  const plot=await page.locator('#today-axis-plot').boundingBox();const x=plot!.x+12,y=plot!.y+plot!.height*120/1080;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+plot!.height*90/1080,{steps:4});await page.mouse.up();
  await page.locator('dialog[data-axis-task-create][open]').waitFor();assert.equal(await page.evaluate(()=>probeCalls.some(c=>c.command==='create_task')),false);await page.keyboard.press('Escape');
  await page.locator('#today-axis-zoom').click();const surface=await page.locator('#today-axis-scroll-surface').boundingBox();const before=await page.locator('#today-axis-scroll-surface').evaluate(e=>e.scrollTop);
  await page.mouse.move(x,surface!.y+surface!.height-24);await page.mouse.down();await page.mouse.move(x,surface!.y+surface!.height-10);await page.waitForTimeout(150);const after=await page.locator('#today-axis-scroll-surface').evaluate(e=>e.scrollTop);await page.keyboard.press('Escape');await page.mouse.up();
  assert.ok(after>before);assert.equal(await page.locator('.today-axis-gesture-preview,dialog[open]').count(),0);assert.equal(await page.evaluate(()=>probeCalls.some(c=>c.command==='create_task')),false);
}));
browserTest('failed broad drag retains original placement, proposed draft and qualified reread rather than saved ghost',async()=>browser(1280,720,async page=>{
  await page.evaluate(()=>{const previous=window.__TAURI__.core.invoke;window.__TAURI__.core.invoke=async(command,args)=>{if(command==='edit_plan_time'){probeCalls.push({command,args});throw Error('synthetic revision conflict');}return previous(command,args);};});
  const marker=page.locator('.today-axis-marker').filter({hasText:'Review the draft'}),box=await marker.boundingBox(),plot=await page.locator('#today-axis-plot').boundingBox();const x=box!.x+box!.width/2,y=box!.y+box!.height/2;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+plot!.height*180/1080,{steps:6});await page.mouse.up();await page.locator('dialog.plan-time-editor[open]').waitFor();
  assert.equal(await marker.locator('.today-axis-marker-time').textContent(),'下午');assert.equal(await page.locator('dialog.plan-time-editor input[type=time]').first().inputValue(),'16:00');assert.equal(await page.locator('.today-axis-gesture-preview').count(),0);assert.ok((await page.locator('dialog.plan-time-editor [role=status]').textContent()).includes('synthetic revision conflict'));
}));
browserTest('lived-day edge disclosures count existing items and reveal complete boundaries without writes',async()=>browser(1280,720,async page=>{
  await page.evaluate(()=>{probeView=structuredClone(probeView);const base=probeView.timeAxis.currentArrangement[0];probeView.timeAxis.currentArrangement.push({...base,planId:'early-source',planPrecision:'exactPoint',period:'05:00',startMinute:300,text:'Synthetic early entry'},{...base,planId:'late-source',planPrecision:'exactRange',period:'01:00–03:45',startMinute:1500,endMinute:1665,text:'Synthetic late entry'});todayHarness.render(probeView);});
  assert.ok((await page.locator('#today-expand-early').textContent()).includes('1 项'));assert.ok((await page.locator('#today-expand-late').textContent()).includes('1 项'));assert.equal(await page.locator('.today-axis-marker').filter({hasText:'Synthetic early entry'}).count(),0);
  await page.locator('#today-expand-early').click();await page.locator('#today-expand-late').click();assert.equal(await page.locator('.today-axis-marker').filter({hasText:'Synthetic early entry'}).count(),1);assert.equal(await page.locator('.today-axis-marker').filter({hasText:'Synthetic late entry'}).count(),1);
  const ticks=await page.locator('.today-hour-tick').evaluateAll(elements=>elements.filter(e=>!(e as HTMLElement).hidden).map(e=>e.getAttribute('data-minute')));assert.ok(ticks.includes('240')&&ticks.includes('1680'));assert.equal(await page.evaluate(()=>probeCalls.some(c=>['edit_plan_time','cancel_plan_entry'].includes(c.command))),false);
}));
browserTest('real pointer end handle edits only the end of an exact arrangement',async()=>browser(1280,720,async page=>{
  await page.evaluate(view=>{probeView=structuredClone(view);todayHarness.render(probeView);},views.exact);
  const handle=page.locator('.today-axis-marker').filter({hasText:'Prepare the project brief'}).locator('[data-axis-resize]'),box=await handle.boundingBox(),plot=await page.locator('#today-axis-plot').boundingBox();const x=box!.x+box!.width/2,y=box!.y+box!.height/2;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+plot!.height*60/1080,{steps:4});await page.mouse.up();await page.waitForFunction(()=>probeCalls.some(c=>c.command==='edit_plan_time'));
  const input=await page.evaluate(()=>probeCalls.find(c=>c.command==='edit_plan_time').args.input);assert.deepEqual([input.startMinute,input.endMinute,input.precision],[900,1020,'exactRange']);assert.equal(await page.locator('dialog[open]').count(),0);
}));
browserTest('real pointer Task range preserves length and edits only Task storage',async()=>browser(1280,720,async page=>{
  await page.evaluate(()=>{
    const task={id:'drag-task',name:'Synthetic independent Task range',content:'Keep content',date:probeView.date,time:'16:00',executionEnd:{date:probeView.date,time:'16:45'},listId:'inbox',state:'pending',priority:'high',tagIds:['tag-keep'],parentId:null,createdAt:'2026-08-10T08:00-04:00',modifiedAt:'2026-08-10T08:00-04:00',deletedAt:null,completion:null,changes:[],source:{kind:'manual',reference:null},overdue:false,timePassed:false};probeView={...probeView,tasks:{...probeView.tasks,state:'ready',revision:'drag-task-revision',tasks:[task],tags:[{id:'tag-keep',name:'Keep tag'}]}};todayHarness.render(probeView);
    const previous=window.__TAURI__.core.invoke;window.__TAURI__.core.invoke=async(command,args)=>{if(command!=='update_task')return previous(command,args);probeCalls.push({command,args});probeView={...probeView,tasks:{...probeView.tasks,revision:'drag-task-saved',tasks:probeView.tasks.tasks.map(t=>t.id===args.input.taskId?{...t,...args.input}:t)}};return structuredClone(probeView.tasks);};
  });
  const marker=page.locator('[data-task-id="drag-task"] .today-axis-marker-link'),box=await marker.boundingBox(),plot=await page.locator('#today-axis-plot').boundingBox(),x=box!.x+box!.width/2,y=box!.y+box!.height/2;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+plot!.height*60/1080,{steps:4});await page.mouse.up();await page.waitForFunction(()=>probeCalls.some(c=>c.command==='update_task'));
  const result=await page.evaluate(()=>({input:probeCalls.find(c=>c.command==='update_task').args.input,task:probeView.tasks.tasks[0],planWrites:probeCalls.filter(c=>['edit_plan_time','cancel_plan_entry'].includes(c.command)).length}));assert.equal(result.input.time,'17:00');assert.deepEqual(result.input.executionEnd,{date:'2026-08-10',time:'17:45'});assert.equal(result.planWrites,0);assert.equal(result.task.priority,'high');assert.deepEqual(result.task.tagIds,['tag-keep']);assert.equal(await page.locator('dialog[open]').count(),0);
}));

browserTest('presentation resize and zoom retain expanded untimed reading nodes without writes',async()=>browser(1280,720,async page=>{
  await page.evaluate(()=>{
    probeView=structuredClone(probeView);
    const entry=probeView.timeAxis.currentArrangement.shift();
    probeView.timeAxis.unlocatedCurrentArrangement=[{...entry,startMinute:null,endMinute:null,period:'择机',planPrecision:'unlocated'}];
    probeView.timeAxis.unlocatedConfirmedFacts=[{...entry,startMinute:null,endMinute:null,planId:null,timeEditable:false,text:'Independent untimed fact'}];
    todayHarness.render(probeView);
  });
  await page.waitForTimeout(100);
  await page.evaluate(()=>{
    window.retainedArrangement=document.querySelector('#today-current-arrangement-unlocated details');
    window.retainedFact=document.querySelector('#today-confirmed-facts-unlocated details');
    retainedArrangement.open=true;retainedFact.open=true;
    window.dispatchEvent(new Event('resize'));
  });
  await page.waitForTimeout(80);
  const preserved=()=>page.evaluate(()=>({arrangement:retainedArrangement===document.querySelector('#today-current-arrangement-unlocated details')&&retainedArrangement.open,fact:retainedFact===document.querySelector('#today-confirmed-facts-unlocated details')&&retainedFact.open,writes:probeCalls.filter(call=>/^(create_|edit_|update_|save_|set_|cancel_)/.test(call.command)).length}));
  assert.deepEqual(await preserved(),{arrangement:true,fact:true,writes:0});
  await page.locator('#today-axis-zoom').click();
  for(const [width,height] of [[830,758],[680,560],[1280,800],[1280,720]]) {
    await page.setViewportSize({width,height});await page.waitForTimeout(80);
    assert.deepEqual(await preserved(),{arrangement:true,fact:true,writes:0});
  }
  const refreshed=await page.evaluate(()=>{
    probeView=structuredClone(probeView);probeView.timeAxis.unlocatedCurrentArrangement[0].text='Authoritative refreshed reading';todayHarness.render(probeView);
    const current=document.querySelector('#today-current-arrangement-unlocated details');return {replaced:current!==retainedArrangement,text:current.textContent};
  });
  assert.equal(refreshed.replaced,true);assert.match(refreshed.text,/Authoritative refreshed reading/);
}));

// Full production boot deliberately reads Today before the stored language.
// Only native IPC is replaced; this catches startup relocalization after data rendering.
const boundaryBootView=structuredClone(views.loaded);
const boundaryBase=boundaryBootView.timeAxis.currentArrangement[0];
boundaryBootView.timeAxis.currentArrangement.push({...boundaryBase,planId:'boot-early',period:'04:30',planPrecision:'exactPoint',startMinute:270,text:'Synthetic early boundary'},{...boundaryBase,planId:'boot-overnight',period:'23:30–00:45',planPrecision:'exactRange',startMinute:1410,endMinute:1485,text:'Synthetic overnight boundary'});
const bootTask=JSON.parse(readFileSync(new URL('./fixtures/compact-calendar-view.json',import.meta.url),'utf8')).selected.tasks.tasks[0];
boundaryBootView.tasks={...boundaryBootView.tasks,state:'ready',revision:'boundary-task-revision',tasks:[{...bootTask,id:'boot-early-task',date:boundaryBootView.date,time:'05:15',executionEnd:null}],tags:[],folders:[]};
const bootIPC=`const previous=window.__TAURI__.core.invoke;window.__TAURI__.core.invoke=async(command,args)=>{if(command==='application_identity')return {productName:'Synthetic full boot Dashboard'};if(command==='interface_language_preferences'){await new Promise(r=>setTimeout(r,80));return {interfaceLanguage:'en'};}if(command==='set_interface_language')return {interfaceLanguage:args.interfaceLanguage};if(command==='appearance_preferences')return {accentColor:'forest',backgroundImageState:'none',backgroundImageUrl:null,cleanupWarning:null,calendarHolidays:{enabled:true,china:true,unitedStates:true}};return previous(command,args);};require('./main.js');`;
const bootSetup=setup.replace(JSON.stringify(modules),JSON.stringify({...modules,'./main.js':shippedMain})).replace(JSON.stringify(views.loaded),JSON.stringify(boundaryBootView)).replace("require('./main.js');todayHarness.render(probeView);",bootIPC);
writeFileSync(join(directory,'boundary-boot.html'),readFileSync(new URL('../../frontend/index.html',import.meta.url),'utf8').replace(/<script[^>]*src="main.js"[^>]*><\/script>/,'').replace('</body>',`<script>${bootSetup}</script></body>`));
const bootScenario=`for(let n=0;n<100;n++){if(document.documentElement.lang==='en'&&document.querySelector('#runtime-status')?.dataset.state==='ready')break;await new Promise(r=>setTimeout(r,20));}const labels=()=>['today-expand-early','today-expand-late'].map(id=>document.getElementById(id).textContent);const english=labels();document.querySelector('#workspace-language').click();for(let n=0;n<100&&document.documentElement.lang!=='zh-CN';n++)await new Promise(r=>setTimeout(r,10));const chinese=labels();document.querySelector('#today-expand-early').click();document.querySelector('#today-expand-late').click();const expanded=labels();document.querySelector('#workspace-language').click();for(let n=0;n<100&&document.documentElement.lang!=='en';n++)await new Promise(r=>setTimeout(r,10));return JSON.stringify({english,chinese,expanded,again:labels(),writes:probeCalls.filter(c=>['edit_plan_time','cancel_plan_entry','update_task','create_task'].includes(c.command)).length});`;
function assertBootCounts(result:any){assert.deepEqual(result.english,['04:00–06:00 · Expand · 2 item(s)','Next day 00:00–04:00 · Expand · 1 item(s)']);assert.deepEqual(result.chinese,['04:00–06:00 · 展开 · 2 项','次日 00:00–04:00 · 展开 · 1 项']);assert.deepEqual(result.expanded,['04:00–06:00 · 收起 · 2 项','次日 00:00–04:00 · 收起 · 1 项']);assert.deepEqual(result.again,['04:00–06:00 · Collapse · 2 item(s)','Next day 00:00–04:00 · Collapse · 1 item(s)']);assert.equal(result.writes,0);}
test('full production boot and language switches retain localized lived-day boundary counts',{skip:'Acceptance delegated by user; full-boot regression pending harness verification'},async()=>browser(1280,800,async page=>{await page.goto('http://127.0.0.1:'+(server.address() as any).port+'/boundary-boot.html');assertBootCounts(JSON.parse(await page.evaluate(`async()=>{${bootScenario}}`)));}));
test('native WebKit full production boot keeps boundary counts through language and disclosure changes',{skip:'Acceptance delegated by user; full-boot regression pending harness verification'},()=>{const script=join(directory,'boundary-boot-check.js');writeFileSync(script,bootScenario);const result=JSON.parse(execFileSync('swift',[new URL('./helpers/rendered-today-unlocated.swift',import.meta.url).pathname,join(directory,'boundary-boot.html'),script,'1280','800'],{encoding:'utf8',timeout:60000}));assertBootCounts(result);});
