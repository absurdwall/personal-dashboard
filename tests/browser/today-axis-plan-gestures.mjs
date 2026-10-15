import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

// Reuse the existing browser runtime. No package/dependency is installed.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE_PATH?pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href:'playwright');
const root=resolve(import.meta.dirname,'../..');
const views=JSON.parse(await readFile(new URL('./fixtures/plan-drag-views.json',import.meta.url),'utf8'));
async function pageFixture(initial=views.loaded,responses=[]) {
  const server=createServer(async(req,res)=>{try{
    const file=resolve(root,'dist',new URL(req.url,'http://localhost').pathname.slice(1)||'index.html');
    if(!file.startsWith(resolve(root,'dist')+'/'))throw Error('invalid path');
    res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await readFile(file));
  }catch{res.statusCode=404;res.end();}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.addInitScript(({initial,responses})=>{
    window.__fixture=initial;window.__responses=responses;window.__calls=[];window.__failNext=false;window.__readbackFailure=false;
    window.__TAURI__={core:{invoke:async(command,args)=>{
      window.__calls.push({command,args});
      if(['today_view','daily_view','read_daily_view'].includes(command))return structuredClone(window.__fixture);
      if(command==='application_identity')return {productName:'Synthetic Dashboard'};
      if(command==='interface_language_preferences')return {interfaceLanguage:'en'};
      if(command==='appearance_preferences')return {accentColor:'forest',backgroundImageState:'none',backgroundImageUrl:null,cleanupWarning:null};
      if(command==='today_clock')return {livedDate:window.__fixture.date,currentTime:window.__fixture.currentTime};
      if(command==='edit_plan_time'){
        if(window.__failNext){window.__failNext=false;throw Error('Synthetic external revision conflict');}
        const next=window.__responses.shift();if(!next)throw Error('Synthetic uncertain result');
        window.__fixture=next;return window.__readbackFailure
          ? {savedRevision:next.revision,view:null,refreshError:"Document saved; synthetic readback unavailable."}
          : {savedRevision:next.revision,view:structuredClone(next),refreshError:null};
      }
      throw Error('Unexpected IPC '+command);
    }}};
  },{initial,responses});
  try{await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('#today-axis-plot').waitFor({state:'visible',timeout:5000});assert.deepEqual(errors,[]);}
  catch(error){await browser.close();await new Promise(r=>server.close(r));throw error;}
  return {page,close:async()=>{await browser.close();await new Promise(r=>server.close(r));}};
}
const marker=(page,text)=>page.locator('.today-axis-marker').filter({hasText:text}).first();
async function dragTo(page,text,desiredStart,{long=false}={}) {
  const link=marker(page,text).locator('.today-axis-marker-link');await link.scrollIntoViewIfNeeded();
  const box=await link.boundingBox();assert.ok(box);const x=box.x+box.width/2,y=box.y+box.height/2;
  const info=await page.evaluate(({y,text})=>{
    const plot=document.querySelector('#today-axis-plot'),r=plot.getBoundingClientRect();
    const start=240,end=1680;
    const original=window.__fixture.timeAxis.currentArrangement.find(e=>e.text===text).startMinute;
    return {origin:start+(y-r.top)/r.height*(end-start),start,end,original};
  },{y,text});
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,y+8);
  await page.locator('[data-axis-gesture-preview]').waitFor({state:'visible',timeout:1200});
  const targetMinute=info.origin+desiredStart-info.original;
  if(long){
    const edge=await page.locator('#today-axis-scroll-surface').boundingBox();
    await page.mouse.move(x,edge.y+edge.height-5);
    await page.waitForFunction(({targetMinute,start,end})=>{
      const p=document.querySelector('#today-axis-plot').getBoundingClientRect(),s=document.querySelector('#today-axis-scroll-surface').getBoundingClientRect();
      return p.top+(targetMinute-start)/(end-start)*p.height<s.bottom-60;
    },{targetMinute,start:info.start,end:info.end},{timeout:5000});
  }
  const targetY=await page.evaluate(({targetMinute,start,end})=>{const r=document.querySelector('#today-axis-plot').getBoundingClientRect();return r.top+(targetMinute-start)/(end-start)*r.height;},{targetMinute,start:info.start,end:info.end});
  await page.mouse.move(x,targetY,{steps:6});
  // During the transition away from the edge, one last scroll frame can run.
  // Use the current rendered position, as a user would adjust using the preview.
  const settledY=await page.evaluate(({targetMinute,start,end})=>{const r=document.querySelector('#today-axis-plot').getBoundingClientRect();return r.top+(targetMinute-start)/(end-start)*r.height;},{targetMinute,start:info.start,end:info.end});
  await page.mouse.move(x,settledY);

  const preview=await page.locator('[data-axis-gesture-preview]').evaluate(n=>({top:n.style.top,height:n.style.height,point:n.classList.contains('is-point'),label:n.textContent}));
  const scrollTop=await page.locator('#today-axis-scroll-surface').evaluate(n=>n.scrollTop);
  const callsBeforeRelease=await page.evaluate(()=>window.__calls.filter(x=>x.command==='edit_plan_time').length);
  await page.mouse.up();return {preview,scrollTop,callsBeforeRelease};
}

test('production plan drag previews morning-to-evening movement, edge-scrolls and preserves original non-quarter duration',async()=>{
  const fixture=await pageFixture(views.loaded,[views.moved]);const {page}=fixture;
  try{
    await page.setViewportSize({width:1280,height:760});
    const interaction=await dragTo(page,'Synthetic drag range',1080,{long:true});
    await page.waitForFunction(()=>window.__calls.some(x=>x.command==='edit_plan_time'),null,{timeout:1500});
    const input=await page.evaluate(()=>window.__calls.find(x=>x.command==='edit_plan_time').args.input);
    assert.deepEqual([input.startMinute,input.endMinute,input.precision],[1080,1204,'exactRange']);
    assert.equal(interaction.callsBeforeRelease,0);assert.ok(interaction.scrollTop>0);assert.equal(interaction.preview.point,false);assert.equal(interaction.preview.label,'18:00–20:04');
    assert.equal(input.planId,views.loaded.timeAxis.currentArrangement[0].planId);assert.equal(input.expectedRevision,views.loaded.revision);
    assert.equal(await marker(page,'Synthetic drag range').locator('.today-axis-marker-time').textContent(),'18:00–20:04');
    assert.equal(await page.evaluate(()=>window.__calls.some(x=>['save_daily_plan','update_task','set_task_state'].includes(x.command))),false);
  }finally{await fixture.close();}
});

test('a damaged Task source does not block independent plan gestures or enable Task writes',async()=>{
  const initial=structuredClone(views.loaded);initial.tasks.state='error';initial.tasks.targetBinding=null;initial.tasks.message='Synthetic damaged Task source';
  const fixture=await pageFixture(initial,[views.moved]);const {page}=fixture;
  try{
    const empty=await page.locator('#today-axis-scroll-surface').boundingBox();
    const plot=await page.locator('#today-axis-plot').boundingBox();
    await page.mouse.move(plot.x+plot.width-30,empty.y+empty.height/2);
    await page.mouse.down();await page.mouse.move(plot.x+plot.width-30,empty.y+empty.height/2+30);await page.mouse.up();
    assert.equal(await page.locator('dialog[data-axis-task-create]').count(),0,'bad Task source must not acquire a blank selection');
    await dragTo(page,'Synthetic drag range',1080,{long:true});
    await page.waitForFunction(()=>window.__calls.some(x=>x.command==='edit_plan_time'),null,{timeout:1500});
    assert.equal(await page.evaluate(()=>window.__calls.some(x=>['update_task','create_task'].includes(x.command))),false);
  }finally{await fixture.close();}
});

async function resizeEnd(page,text,minute) {
  const handle=marker(page,text).locator('[data-axis-resize]');await handle.scrollIntoViewIfNeeded();
  const box=await handle.boundingBox();assert.ok(box);const x=box.x+box.width/2,y=box.y+box.height/2;
  const info=await page.evaluate(minute=>{
    const r=document.querySelector('#today-axis-plot').getBoundingClientRect();
    const start=240,end=1680;
    return {y:r.top+(minute-start)/(end-start)*r.height};
  },minute);
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x,info.y,{steps:8});
  const label=await page.locator('[data-axis-gesture-preview]').textContent();await page.mouse.up();return label;
}
test('production end boundary changes only the end, while clicking it opens the existing editor',async()=>{
  const fixture=await pageFixture(views.moved,[views.resized]);const {page}=fixture;
  try{
    const preview=await resizeEnd(page,'Synthetic drag range',1245);
    await page.waitForFunction(()=>window.__calls.some(x=>x.command==='edit_plan_time'),null,{timeout:1500});
    const input=await page.evaluate(()=>window.__calls.find(x=>x.command==='edit_plan_time').args.input);
    assert.deepEqual([input.startMinute,input.endMinute,input.precision],[1080,1245,'exactRange']);assert.equal(preview,'18:00–20:45');
    await marker(page,'Synthetic drag range').locator('[data-axis-resize]').click();
    const dialog=page.locator('dialog.plan-time-editor');await dialog.waitFor({state:'visible'});
    assert.deepEqual(await dialog.locator('input[type=time]').evaluateAll(inputs=>inputs.map(input=>input.value)),['18:00','20:45']);
    assert.equal(await dialog.locator('select').inputValue(),'exactRange');
    assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='edit_plan_time').length),1);
  }finally{await fixture.close();}
});

test('production broad-plan and exact-point drags remain points and use distinct precision',async()=>{
  const fixture=await pageFixture(views.resized,[views.fuzzy,views.point]);const {page}=fixture;
  try{
    assert.equal(await marker(page,'Synthetic fuzzy drag').locator('[data-axis-resize]').count(),0);
    const fuzzy=await dragTo(page,'Synthetic fuzzy drag',1275,{long:true});
    await page.waitForFunction(()=>window.__calls.filter(x=>x.command==='edit_plan_time').length===1,null,{timeout:1500});
    assert.equal(fuzzy.preview.point,true);assert.equal(fuzzy.preview.label,'Around 21:15');
    assert.equal(await marker(page,'Synthetic fuzzy drag').locator('.today-axis-marker-time').textContent(),'Around 21:15');
    assert.equal(await marker(page,'Synthetic point drag').locator('[data-axis-resize]').count(),0);
    const point=await dragTo(page,'Synthetic point drag',1335,{long:true});
    await page.waitForFunction(()=>window.__calls.filter(x=>x.command==='edit_plan_time').length===2,null,{timeout:1500});
    assert.equal(point.preview.point,true);assert.equal(point.preview.label,'22:15');
    const inputs=await page.evaluate(()=>window.__calls.filter(x=>x.command==='edit_plan_time').map(x=>x.args.input));
    assert.deepEqual(inputs.map(input=>[input.startMinute,input.endMinute,input.precision]),[[1275,null,'approximatePoint'],[1335,null,'exactPoint']]);
  }finally{await fixture.close();}
});


test('a rejected plan drag restores the saved card and retains the attempted values without replay',async()=>{
  const fixture=await pageFixture(views.loaded,[views.moved]);const {page}=fixture;
  try{
    await page.evaluate(()=>{window.__failNext=true;});
    await dragTo(page,'Synthetic drag range',1080,{long:true});
    const dialog=page.locator('dialog.plan-time-editor');await dialog.waitFor({state:'visible'});
    assert.match(await dialog.locator('[role=status]').textContent(),/Synthetic external revision conflict/);
    assert.equal(await marker(page,'Synthetic drag range').locator('.today-axis-marker-time').textContent(),'08:07–10:11');
    assert.deepEqual(await dialog.locator('input[type=time]').evaluateAll(inputs=>inputs.map(input=>input.value)),['18:00','20:04']);
    assert.equal(await dialog.locator('button[type=submit]').isDisabled(),true);
    assert.equal(await dialog.locator('select').isDisabled(),true);
    assert.equal(await dialog.locator('input[type=time]').evaluateAll(inputs=>inputs.every(input=>input.disabled)),true);
    await dialog.getByRole('button',{name:'Read record again'}).click();
    await page.waitForFunction(()=>window.__calls.filter(x=>['today_view','daily_view','read_daily_view'].includes(x.command)).length>=2);
    assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='edit_plan_time').length),1);
    assert.deepEqual(await dialog.locator('input[type=time]').evaluateAll(inputs=>inputs.map(input=>input.value)),['18:00','20:04']);
    await dialog.getByRole('button',{name:'Save time'}).click();
    await dialog.waitFor({state:'hidden'});
    assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='edit_plan_time').length),2);
  }finally{await fixture.close();}
});

test('a saved plan with failed readback reports the saved state and refreshes without replay',async()=>{
  const fixture=await pageFixture(views.loaded,[views.moved]);const {page}=fixture;
  try{
    await page.evaluate(()=>{window.__readbackFailure=true;});
    await dragTo(page,'Synthetic drag range',1080,{long:true});
    const dialog=page.locator('dialog.plan-time-editor');await dialog.waitFor({state:'visible'});
    assert.match(await dialog.locator('[role=status]').textContent(),/Document saved/);
    assert.match(await page.locator('#today-axis-edit-status').textContent(),/Document saved/);
    assert.deepEqual(await dialog.locator('input[type=time]').evaluateAll(inputs=>inputs.map(input=>input.value)),['18:00','20:04']);
    await dialog.getByRole('button',{name:'Read record again'}).click();
    await page.waitForFunction(()=>[...document.querySelectorAll('.today-axis-marker')].some(marker=>marker.textContent.includes('Synthetic drag range')&&marker.querySelector('.today-axis-marker-time')?.textContent==='18:00–20:04'));
    assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='edit_plan_time').length),1);
    await dialog.waitFor({state:'hidden'});
  }finally{await fixture.close();}
});


test('confirmed facts are read-only and canceling a plan preview leaves persistence untouched',async()=>{
  const fixture=await pageFixture();const {page}=fixture;
  try{
    const fact=marker(page,'Synthetic confirmed event');assert.equal(await fact.locator('[data-axis-resize]').count(),0);
    const factLink=fact.locator('.today-axis-marker-link');await factLink.scrollIntoViewIfNeeded();
    const box=await factLink.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
    await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y+box.height/2+50);await page.mouse.up();
    assert.equal(await page.locator('[data-axis-gesture-preview]').count(),0);
    assert.equal(await page.locator('dialog[open]').count(),0);
    const link=marker(page,'Synthetic drag range').locator('.today-axis-marker-link');await link.scrollIntoViewIfNeeded();
    const plan=await link.boundingBox();await page.mouse.move(plan.x+plan.width/2,plan.y+plan.height/2);
    await page.mouse.down();await page.mouse.move(plan.x+plan.width/2,plan.y+plan.height/2+40);
    await page.locator('[data-axis-gesture-preview]').waitFor({state:'visible'});
    await page.keyboard.press('Escape');await page.mouse.up();
    assert.equal(await page.locator('[data-axis-gesture-preview]').count(),0);
    assert.equal(await page.evaluate(()=>window.__calls.some(x=>['edit_plan_time','update_task','create_task'].includes(x.command))),false);
    assert.equal(await marker(page,'Synthetic drag range').locator('.today-axis-marker-time').textContent(),'08:07–10:11');
  }finally{await fixture.close();}
});

test('an end boundary before the plan start is a visible failure and never persists',async()=>{
  const fixture=await pageFixture();const {page}=fixture;
  try{
    await resizeEnd(page,'Synthetic drag range',480);
    assert.match(await page.locator('#today-axis-edit-status').textContent(),/Nothing saved/);
    assert.equal(await page.locator('[data-axis-gesture-preview]').count(),0);
    assert.equal(await page.evaluate(()=>window.__calls.some(x=>x.command==='edit_plan_time')),false);
    assert.equal(await marker(page,'Synthetic drag range').locator('.today-axis-marker-time').textContent(),'08:07–10:11');
  }finally{await fixture.close();}
});
