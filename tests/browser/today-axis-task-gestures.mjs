import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

// Existing browser tooling only: provide its module path; this does not install a dependency.
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE_PATH ? pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href : 'playwright');
const root = resolve(import.meta.dirname, '../..');
const task = (id,name,time,executionEnd=null,state='pending') => ({id,name,content:null,date:'2026-10-10',time,executionEnd,listId:'inbox',
  source:{kind:'manual',reference:null},state,deletedAt:null,completion:state==='completed'?{completedOn:'2026-10-10',completedTime:'08:00',recordedAt:'2026-10-10T08:00-04:00',source:'checkbox'}:null,
  overdue:false,timePassed:false,createdAt:'2026-10-10T08:00-04:00',modifiedAt:'2026-10-10T08:00-04:00',changes:[]});
const tasks = {state:'ready',errorKind:null,message:'Synthetic Tasks',schemaVersion:2,revision:'r1',targetBinding:'synthetic-task-binding',vaultName:'Synthetic',vaultPath:'/synthetic',currentDate:'2026-10-10',
  lists:[{id:'inbox',name:'Inbox',isSystem:true,archived:false}],tasks:[task('point','Synthetic point','09:00'),task('interval','Synthetic interval','13:00',{date:'2026-10-10',time:'14:30'},'completed')]};
const view = {state:'missing',date:'2026-10-10',isToday:true,currentTime:'09:00',canRecord:true,defaultPhase:'daytime',dailyRecordAvailability:'missing',vaultName:'Synthetic',vaultPath:'/synthetic',vaultAvailability:'available',message:'Synthetic browser IPC fixture',revision:null,targetBinding:'synthetic-record-binding',
  baseline:{availability:'missing',message:'No record',timeline:[],evidence:[]},timeline:[],evidence:[],daytime:{updates:[],shortRecords:[]},
  evening:{account:[],comparison:[],summary:[],questions:[],additions:[],corrections:[],other:[],recordSupplements:[],hasLaterRecordRevision:false},tasks,
  dayTasks:{state:'empty',message:'',planError:null,revision:null,targetBinding:null,tasks:[]},habitCorrections:{state:'missing',message:'',date:'2026-10-10',canRecord:false,completionRevision:null,completionTargetBinding:null,namesConfigurationState:'missing',habits:[]},
  timeAxis:{currentArrangement:[],confirmedFacts:[],unlocatedCurrentArrangement:[],unlocatedConfirmedFacts:[]}};

async function pageFixture(viewport={width:1280,height:1100}) {
  const server=createServer(async(req,res)=>{try {const url=new URL(req.url,'http://localhost');const file=resolve(root,'dist',url.pathname==='/'?'index.html':url.pathname.slice(1));
    if(!file.startsWith(resolve(root,'dist')+'/'))throw Error('invalid path');
    res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await readFile(file));}catch {res.statusCode=404;res.end('not found');}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport});
  const errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.addInitScript(({view})=>{
    window.__fixture=view;window.__calls=[];window.__failNext=null;
    window.__TAURI__={core:{invoke:async(command,args)=>{
      window.__calls.push({command,args});
      if(window.__failNext===command){window.__failNext=null;throw Error('Synthetic save failure');}
      const v=window.__fixture,t=v.tasks;
      if(['today_view','daily_view','read_daily_view'].includes(command))return structuredClone(v);
      if(command==='tasks_view')return structuredClone(t);
      if(command==='application_identity')return {productName:'Personal Dashboard'};
      if(command==='interface_language_preferences')return {interfaceLanguage:'en'};
      if(command==='today_clock')return {date:v.date,time:v.currentTime};
      if(command==='create_task'){
        const input=args.input;if(input.expectedRevision!==t.revision)throw Error('Synthetic revision conflict');
        if(!t.tasks.some(x=>x.id===input.taskId))t.tasks.push({id:input.taskId,...input,source:{kind:'manual',reference:null},state:'pending',deletedAt:null,completion:null,overdue:false,timePassed:false,createdAt:'2026-10-10T09:00-04:00',modifiedAt:'2026-10-10T09:00-04:00',changes:[]});
        t.revision='r'+(Number(t.revision.slice(1))+1);return structuredClone(t);
      }
      if(command==='update_task'){
        const input=args.input;if(input.expectedRevision!==t.revision)throw Error('Synthetic revision conflict');
        Object.assign(t.tasks.find(x=>x.id===input.taskId),input);t.revision='r'+(Number(t.revision.slice(1))+1);return structuredClone(t);
      }
      throw Error('Unsupported browser fixture boundary '+command);
    }}};
  },{view});
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  try {
    await page.locator('#today-axis-plot').waitFor({state:'visible',timeout:5000});
    assert.deepEqual(errors,[],'production page must render before pointer checks');
  } catch(error) {
    const debug = await page.evaluate(()=>({calls:window.__calls,status:document.querySelector('#today-status')?.textContent,body:document.body.innerText.slice(0,800)}));
    await browser.close(); await new Promise(r=>server.close(r));
    throw new Error(String(error)+' '+JSON.stringify({errors,debug}));
  }
  return {page,browser,server,close:async()=>{await browser.close();await new Promise(r=>server.close(r));}};
}

test('Today axis retains its overview at ticket sizes and opens a readable scrollable detail scale',async()=>{
  const fixture=await pageFixture();const {page}=fixture;
  try {
    const screenshots=process.env.PDEX21_SCREENSHOT_DIR;
    if(screenshots)await mkdir(screenshots,{recursive:true});
    for(const [width,height] of [[1280,800],[1280,720],[830,758],[680,560]]){
      await page.setViewportSize({width,height});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      await page.locator('#today-axis-scroll-surface').scrollIntoViewIfNeeded();
      if(screenshots)await page.screenshot({path:resolve(screenshots,`today-axis-${width}x${height}.png`)});
      const overview=await page.evaluate(()=>{
        const surface=document.querySelector('#today-axis-scroll-surface');
        const plot=document.querySelector('#today-axis-plot');
        const zoom=document.querySelector('#today-axis-zoom-toggle').getBoundingClientRect();
        return {scrollHeight:surface.scrollHeight,clientHeight:surface.clientHeight,scrollWidth:surface.scrollWidth,clientWidth:surface.clientWidth,
          plotHeight:plot.getBoundingClientRect().height,density:document.querySelector('#today-continuous-axis').dataset.overviewDensity,
          marker:{display:getComputedStyle(document.querySelector('.today-axis-marker-link')).display,
            statusDisplay:getComputedStyle(document.querySelector('.today-axis-marker.is-task .today-axis-marker-source-status > span:nth-child(2)')).display,
            height:document.querySelector('.today-axis-marker.is-task .today-axis-marker-link').getBoundingClientRect().height},
          expanded:[document.querySelector('#today-expand-early').getAttribute('aria-expanded'),document.querySelector('#today-expand-late').getAttribute('aria-expanded')],zoom:{width:zoom.width,height:zoom.height},scale:getComputedStyle(document.querySelector('#today-continuous-axis')).getPropertyValue('--today-axis-hour-height')};
      });
      assert.deepEqual(overview.expanded,['false','false']);
      assert.equal(overview.zoom.width,36);assert.equal(overview.zoom.height,36);
      if(overview.density==='compact'){
        assert.equal(overview.marker.display,'flex',`${width}x${height} uses a single-row marker layout: ${JSON.stringify(overview)}`);
        assert.notEqual(overview.marker.statusDisplay,'none',`${width}x${height} retains Task state in overview markers: ${JSON.stringify(overview)}`);
      }
      if(width===1280)assert.ok(overview.scrollHeight<=overview.clientHeight+2,`${width}x${height} daytime overview fits the available axis height: ${JSON.stringify(overview)}`);
      if(width===680){
        await page.locator('#today-axis-zoom-toggle').click();
        const detail=await page.evaluate(()=>({scrollHeight:document.querySelector('#today-axis-scroll-surface').scrollHeight,clientHeight:document.querySelector('#today-axis-scroll-surface').clientHeight,scale:getComputedStyle(document.querySelector('#today-continuous-axis')).getPropertyValue('--today-axis-hour-height')}));
        assert.ok(Number.parseFloat(detail.scale)>=80,JSON.stringify(detail));
        assert.ok(detail.scrollHeight>detail.clientHeight,`short screen can scroll the detail scale: ${JSON.stringify(detail)}`);
        const point=page.locator('.today-axis-marker[data-task-id="point"] .today-axis-marker-link');
        await point.scrollIntoViewIfNeeded();
        assert.ok((await point.boundingBox()).height>=60,'detail zoom expands a point Task into a readable click target');
        if(screenshots)await page.screenshot({path:resolve(screenshots,`today-axis-${width}x${height}-detail.png`)});
      }
    }
  } finally {await fixture.close();}
});
async function pointAt(page,minute,ensureVisible=true) {
  const surface=page.locator('#today-axis-scroll-surface');await surface.scrollIntoViewIfNeeded();
  return page.evaluate(({minute,ensureVisible})=>{
    const plot=document.querySelector('#today-axis-plot'),surface=document.querySelector('#today-axis-scroll-surface');
    const start=document.querySelector('#today-expand-early').getAttribute('aria-expanded')==='true'?240:360;
    const end=document.querySelector('#today-expand-late').getAttribute('aria-expanded')==='true'?1680:1440;
    const pos=()=>{const rect=plot.getBoundingClientRect();return {x:rect.right-30,y:rect.top+(minute-start)/(end-start)*rect.height};};
    if(ensureVisible){const rect=surface.getBoundingClientRect();surface.scrollTop+=pos().y-(rect.top+rect.height/2);}
    return pos();
  },{minute,ensureVisible});
}

// Real Chromium mouse events on the production document and compiled main.ts.
// Tauri IPC is the mocked system boundary; persistence is checked in Rust workflows.
test('blank-axis pointer selection opens editable Task creation and sends exact interval',async()=>{
  const fixture=await pageFixture();const {page}=fixture;
  try {
    const start=await pointAt(page,660),end=await pointAt(page,720,false);
    await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:8});await page.mouse.up();
    const dialog=page.locator('dialog[data-axis-task-create]');
    assert.equal(await dialog.count(),1,'blank selection must open the real Task creation editor');
    await dialog.locator('[data-task-name]').fill('Synthetic selected task');
    assert.equal(await dialog.locator('[data-task-date]').inputValue(),'2026-10-10');
    assert.equal(await dialog.locator('[data-task-time]').inputValue(),'11:00');
    assert.equal(await dialog.locator('[data-task-end-time]').inputValue(),'12:00');
    await dialog.locator('button[type=submit]').click();
    await page.waitForFunction(()=>window.__calls.some(x=>x.command==='create_task'));
    const call=await page.evaluate(()=>window.__calls.find(x=>x.command==='create_task'));
    assert.equal(call.args.input.time,'11:00');assert.deepEqual(call.args.input.executionEnd,{date:'2026-10-10',time:'12:00'});
    assert.equal(await page.evaluate(()=>window.__calls.some(x=>['save_daily_plan','edit_plan_time'].includes(x.command))),false);
  } finally {await fixture.close();}
});

async function dragTask(page,id,deltaMinutes) {
  const marker=page.locator(`.today-axis-marker[data-task-id="${id}"] .today-axis-marker-link`);
  await marker.scrollIntoViewIfNeeded();const box=await marker.boundingBox();assert.ok(box);
  const scale=await page.evaluate(()=>{
    const start=document.querySelector('#today-expand-early').getAttribute('aria-expanded')==='true'?240:360;
    const end=document.querySelector('#today-expand-late').getAttribute('aria-expanded')==='true'?1680:1440;
    return document.querySelector('#today-axis-plot').getBoundingClientRect().height/(end-start);
  });
  const x=box.x+box.width/2,y=box.y+box.height/2;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+deltaMinutes*scale,{steps:10});await page.mouse.up();
}
test('production Task pointer moves preserve point/range semantics and explicit completion state',async()=>{
  const fixture=await pageFixture();const {page}=fixture;
  try {
    await dragTask(page,'point',90);
    await page.waitForFunction(()=>window.__calls.some(x=>x.command==='update_task'),null,{timeout:1500});
    const point=await page.evaluate(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point'));
    assert.equal(point.time,'10:30');assert.equal(point.executionEnd,null);assert.equal(point.state,'pending');
    await dragTask(page,'interval',120);
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.find(x=>x.id==='interval').time==='15:00',null,{timeout:1500});
    const interval=await page.evaluate(()=>window.__fixture.tasks.tasks.find(x=>x.id==='interval'));
    assert.equal(interval.time,'15:00');assert.deepEqual(interval.executionEnd,{date:'2026-10-10',time:'16:30'});assert.equal(interval.state,'completed');
    assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='update_task').length),2);
    assert.equal(await page.evaluate(()=>window.__calls.some(x=>['save_daily_plan','edit_plan_time','set_task_state'].includes(x.command))),false);
  } finally {await fixture.close();}
});

test('revision conflict restores the saved card and an explicit retry preserves concurrent content',async()=>{
  const fixture=await pageFixture();const {page}=fixture;
  try {
    await page.evaluate(()=>{const tasks=window.__fixture.tasks;tasks.revision='r2';const point=tasks.tasks.find(x=>x.id==='point');point.name='External rename';point.content='External content';});
    await dragTask(page,'point',60);
    const dialog=page.locator('dialog[data-axis-task-recovery]');await dialog.waitFor({state:'visible'});
    assert.equal(await page.evaluate(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point').time),'09:00');
    assert.equal(await page.locator('.today-axis-marker[data-task-id="point"] .today-axis-marker-time').textContent(),'09:00');
    await dialog.locator('[data-axis-task-recheck]').click();
    await dialog.locator('[data-axis-task-retry]').waitFor({state:'visible'});
    await page.waitForFunction(()=>!document.querySelector('[data-axis-task-retry]').disabled);
    assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='update_task').length),1,'rereading must never replay automatically');
    await dialog.locator('[data-axis-task-retry]').click();
    await dialog.waitFor({state:'hidden'});
    const saved=await page.evaluate(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point'));
    assert.equal(saved.time,'10:00');assert.equal(saved.name,'External rename');assert.equal(saved.content,'External content');assert.equal(saved.executionEnd,null);
  } finally {await fixture.close();}
});

test('failed selection save retains editable endpoints and reuses its stable Task identity',async()=>{
  const fixture=await pageFixture();const {page}=fixture;
  try {
    const start=await pointAt(page,660),end=await pointAt(page,720,false);
    await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:6});await page.mouse.up();
    const dialog=page.locator('dialog[data-axis-task-create]');await dialog.locator('[data-task-name]').fill('Synthetic retry');
    await page.evaluate(()=>window.__failNext='create_task');await dialog.locator('button[type=submit]').click();
    await page.waitForFunction(()=>document.querySelector('[data-axis-task-status]').textContent.includes('Synthetic save failure'));
    assert.equal(await dialog.locator('[data-task-time]').inputValue(),'11:00');assert.equal(await dialog.locator('[data-task-end-time]').inputValue(),'12:00');
    assert.equal(await page.evaluate(()=>window.__fixture.tasks.tasks.length),2);
    await dialog.getByRole('button',{name:'Refresh tasks',exact:true}).click();
    await page.waitForFunction(()=>!document.querySelector('dialog[data-axis-task-create] button[type=submit]').disabled);
    await dialog.locator('[data-task-end-time]').fill('12:15');await dialog.locator('button[type=submit]').click();await dialog.waitFor({state:'hidden'});
    const attempts=await page.evaluate(()=>window.__calls.filter(x=>x.command==='create_task').map(x=>x.args.input));
    assert.equal(attempts.length,2);assert.equal(attempts[0].taskId,attempts[1].taskId);
    const saved=await page.evaluate(()=>window.__fixture.tasks.tasks.find(x=>x.name==='Synthetic retry'));
    assert.deepEqual(saved.executionEnd,{date:'2026-10-10',time:'12:15'});assert.equal(await page.evaluate(()=>window.__fixture.tasks.tasks.length),3);
  } finally {await fixture.close();}
});

test('an axis Task opens the nearby reused editor and save preserves scroll after readback',async()=>{
  const fixture=await pageFixture();const {page}=fixture;
  try {
    await page.locator('#today-axis-zoom-toggle').click();
    const surface=page.locator('#today-axis-scroll-surface');
    const marker=page.locator('.today-axis-marker[data-task-id="point"] .today-axis-marker-link');
    await marker.scrollIntoViewIfNeeded();
    const before=await surface.evaluate(node=>node.scrollTop);
    await marker.click();
    const editor=page.locator('dialog[data-axis-task-editor="point"]');
    await editor.waitFor({state:'visible'});
    assert.equal(await page.locator('#today-timed-details details[open]').count(),0,'Tasks are not repeated in the lower axis details');
    assert.ok(await editor.evaluate(node=>{const r=node.getBoundingClientRect(),m=document.querySelector('.today-axis-marker[data-task-id="point"] .today-axis-marker-link').getBoundingClientRect();return r.left<m.right+8&&r.right>m.left-8&&r.top<innerHeight&&r.bottom>0;}),'editor stays near its Task marker and in the window');
    assert.equal(await surface.evaluate(node=>node.scrollTop),before,'opening the editor retains the axis scroll position');
    await editor.locator('[data-task-name]').fill('Synthetic point edited');
    await editor.locator('button[type=submit]').click();
    await editor.waitFor({state:'hidden'});
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point').name==='Synthetic point edited');
    assert.equal(await surface.evaluate(node=>node.scrollTop),before,'confirmed save and marker rerender retain the axis scroll position');
    const saved=await page.evaluate(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point'));
    assert.equal(saved.name,'Synthetic point edited');
    assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='update_task').length),1);
  } finally {await fixture.close();}
});

test('closing an axis Task editor discards no saved data and returns focus without scrolling',async()=>{
  const fixture=await pageFixture();const {page}=fixture;
  try {
    await page.locator('#today-axis-zoom-toggle').click();
    const surface=page.locator('#today-axis-scroll-surface');
    const marker=page.locator('.today-axis-marker[data-task-id="point"] .today-axis-marker-link');
    await marker.scrollIntoViewIfNeeded();
    const before=await surface.evaluate(node=>node.scrollTop);
    await marker.click();
    const editor=page.locator('dialog[data-axis-task-editor="point"]');await editor.waitFor({state:'visible'});
    await editor.locator('[data-task-name]').fill('Unsubmitted draft');
    await page.keyboard.press('Escape');await editor.waitFor({state:'hidden'});
    assert.equal(await surface.evaluate(node=>node.scrollTop),before);
    assert.equal(await page.evaluate(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point').name),'Synthetic point');
    assert.equal(await page.evaluate(()=>window.__calls.some(x=>['update_task','create_task'].includes(x.command))),false);
    assert.equal(await marker.evaluate(node=>document.activeElement===node),true,'focus returns to the marker without moving the viewport');
  } finally {await fixture.close();}
});

test('an overnight pointer selection retains both natural dates and fifteen-minute snapping',async()=>{
  const fixture=await pageFixture();const {page}=fixture;
  try {
    await page.locator('#today-expand-late').click();
    const start=await pointAt(page,1412),end=await pointAt(page,1472,false);
    await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:8});await page.mouse.up();
    const dialog=page.locator('dialog[data-axis-task-create]');await dialog.waitFor({state:'visible'});
    assert.equal(await dialog.locator('[data-task-date]').inputValue(),'2026-10-10');
    assert.equal(await dialog.locator('[data-task-time]').inputValue(),'23:30');
    assert.equal(await dialog.locator('[data-task-end-date]').inputValue(),'2026-10-11');
    assert.equal(await dialog.locator('[data-task-end-time]').inputValue(),'00:30');
    await dialog.locator('[data-task-name]').fill('Synthetic overnight selection');await dialog.locator('button[type=submit]').click();await dialog.waitFor({state:'hidden'});
    const saved=await page.evaluate(()=>window.__fixture.tasks.tasks.find(x=>x.name==='Synthetic overnight selection'));
    assert.equal(saved.date,'2026-10-10');assert.deepEqual(saved.executionEnd,{date:'2026-10-11',time:'00:30'});
    assert.equal(await page.locator(`.today-axis-marker[data-task-id="${saved.id}"] .today-axis-marker-time`).textContent(),'23:30–2026-10-11 · 00:30');
  } finally {await fixture.close();}
});

test('held pointer scrolls the inner axis and Escape removes its preview without a write',async()=>{
  const fixture=await pageFixture();const {page}=fixture;
  try {
    await page.locator('#today-axis-zoom-toggle').click();
    const start=await pointAt(page,660);const surface=page.locator('#today-axis-scroll-surface');
    const rect=await surface.boundingBox();assert.ok(rect);
    const before=await surface.evaluate(node=>node.scrollTop);
    await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x,rect.y+rect.height-5,{steps:8});
    await page.waitForFunction(before=>document.querySelector('#today-axis-scroll-surface').scrollTop>before+40,before,{timeout:3000});
    assert.equal(await page.locator('[data-axis-gesture-preview]').count(),1);
    await page.keyboard.press('Escape');await page.mouse.up();
    assert.equal(await page.locator('[data-axis-gesture-preview]').count(),0);
    assert.equal(await page.locator('dialog[data-axis-task-create]').count(),0);
    assert.equal(await page.evaluate(()=>window.__calls.some(x=>['create_task','update_task'].includes(x.command))),false);
  } finally {await fixture.close();}
});

test('out-of-bounds Task movement is rejected without truncating or changing the saved point',async()=>{
  const fixture=await pageFixture();const {page}=fixture;
  try {
    await dragTask(page,'point',1400);
    assert.equal(await page.evaluate(()=>window.__calls.some(x=>x.command==='update_task')),false);
    assert.equal(await page.evaluate(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point').time),'09:00');
    assert.match(await page.locator('#today-task-status').textContent(),/outside 04:00/);
    assert.equal(await page.locator('#today-axis-edit-status').count(),1,'invalid drag feedback belongs beside the visible axis');
    assert.match(await page.locator('#today-axis-edit-status').textContent(),/outside 04:00/);
    assert.equal(await page.locator('[data-axis-gesture-preview]').count(),0);
  } finally {await fixture.close();}
});
