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

async function pageFixture({width=1280,extraTasks=[],clock=null,selectedDate=null}={}) {
  const server=createServer(async(req,res)=>{try {const url=new URL(req.url,'http://localhost');const file=resolve(root,'dist',url.pathname==='/'?'index.html':url.pathname.slice(1));
    if(!file.startsWith(resolve(root,'dist')+'/'))throw Error('invalid path');
    res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await readFile(file));}catch {res.statusCode=404;res.end('not found');}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width,height:758}});
  const errors=[];page.on('pageerror',error=>errors.push(String(error)));
  const fixtureView=structuredClone(view);if(clock)fixtureView.tasks.currentDate=clock.date;if(selectedDate){fixtureView.date=selectedDate;fixtureView.isToday=false;}fixtureView.tasks.tasks[0].changes=[{id:'synthetic-rename',kind:'renamed',changedAt:'2026-10-10T08:30-04:00',source:'user'}];fixtureView.tasks.tasks.push(...extraTasks);fixtureView.tasks.tasks[0].content='Full synthetic context, only visible in selected detail';fixtureView.tasks.lists.push({id:'home',name:'Home',isSystem:false,archived:false});
  await page.addInitScript(({view,clock})=>{
    window.__fixture=view;window.__calls=[];window.__failNext=null;
    window.__TAURI__={core:{invoke:async(command,args)=>{
      window.__calls.push({command,args});
      if(window.__failNext===command){window.__failNext=null;throw Error('Synthetic save failure');}
      const v=window.__fixture,t=v.tasks;
      if(['today_view','daily_view','read_daily_view'].includes(command))return structuredClone(v);
      if(command==='tasks_view')return structuredClone(t);
      if(command==='application_identity')return {productName:'Personal Dashboard'};
      if(command==='interface_language_preferences')return {interfaceLanguage:'en'};
      if(command==='set_interface_language')return {interfaceLanguage:args.interfaceLanguage};
      if(command==='today_clock')return clock ?? {date:v.date,time:v.currentTime,livedDate:v.date};
      if(command==='create_task'){
        const input=args.input;if(input.expectedRevision!==t.revision)throw Error('Synthetic revision conflict');
        if(!t.lists.some(list=>list.id===input.listId&&!list.archived))throw Error('Synthetic list unavailable');
        if(window.__holdCreate)await new Promise(resolve=>window.__releaseCreate=resolve);
        if(!t.tasks.some(x=>x.id===input.taskId))t.tasks.push({id:input.taskId,...input,source:{kind:'manual',reference:null},state:'pending',deletedAt:null,completion:null,overdue:false,timePassed:false,createdAt:'2026-10-10T09:00-04:00',modifiedAt:'2026-10-10T09:00-04:00',changes:[]});
        t.revision='r'+(Number(t.revision.slice(1))+1);
        if(window.__saveButThrow){window.__saveButThrow=false;throw Error('Synthetic lost response after save');}
        return structuredClone(t);
      }
      if(command==='set_task_state'){
        const input=args.input;const item=t.tasks.find(x=>x.id===input.taskId);item.state=input.state;item.completion=input.state==='completed'?{completedOn:'2026-10-10',completedTime:'09:00',recordedAt:'2026-10-10T09:00-04:00',source:'checkbox'}:null;t.revision='r'+(Number(t.revision.slice(1))+1);return structuredClone(t);
      }
      if(['delete_task','restore_task'].includes(command)){const item=t.tasks.find(x=>x.id===args.input.taskId);item.deletedAt=command==='delete_task'?'2026-10-10T09:00-04:00':null;t.revision='r'+(Number(t.revision.slice(1))+1);return structuredClone(t);}
      if(command==='update_task'){
        const input=args.input;if(input.expectedRevision!==t.revision)throw Error('Synthetic revision conflict');
        if(window.__holdUpdate)await new Promise(resolve=>{window.__releaseUpdate=resolve;});
        Object.assign(t.tasks.find(x=>x.id===input.taskId),input);t.revision='r'+(Number(t.revision.slice(1))+1);return structuredClone(t);
      }
      throw Error('Unsupported browser fixture boundary '+command);
    }}};
  },{view:fixtureView,clock});
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  try {
    await page.locator('[data-workspace-destination=tasks]').click();
    await page.locator('#tasks-list [data-task-editor-row=point]').waitFor({state:'visible',timeout:5000});
    assert.deepEqual(errors,[],'production page must render before pointer checks');
  } catch(error) {
    const debug = await page.evaluate(()=>({calls:window.__calls,status:document.querySelector('#today-status')?.textContent,body:document.body.innerText.slice(0,800)}));
    await browser.close(); await new Promise(r=>server.close(r));
    throw new Error(String(error)+' '+JSON.stringify({errors,debug}));
  }
  return {page,browser,server,close:async()=>{await browser.close();await new Promise(r=>server.close(r));}};
}

test('name-only top quick create confirms, clears and keeps focus for the next task',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    const quick=page.locator('#task-quick-name');
    await quick.waitFor({state:'visible',timeout:1200});
    const box=await quick.boundingBox();assert.ok(box.y<758,'quick input is in the visible list header');
    await quick.fill('Quick first');await quick.press('Enter');
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.some(t=>t.name==='Quick first'));
    await page.waitForFunction(()=>document.querySelector('#task-quick-name').value==='');
    assert.equal(await quick.evaluate(el=>el===document.activeElement),true);
    const saved=await page.evaluate(()=>window.__fixture.tasks.tasks.find(t=>t.name==='Quick first'));
    assert.equal(saved.content,null);assert.equal(saved.date,'2026-10-10');assert.equal(saved.time,null);assert.equal(saved.listId,'inbox');
    await quick.fill('Quick second');await page.locator('#task-quick-submit').click();
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.some(t=>t.name==='Quick second'));
    assert.equal(await page.evaluate(()=>window.__fixture.tasks.tasks.filter(t=>t.name.startsWith('Quick')).length),2);
  } finally {await f.close();}
});

test('New Task opens a focused viewport modal, optional fields survive and Escape returns focus without saving',async()=>{
  const f=await pageFixture({extraTasks:Array.from({length:45},(_,i)=>task('pending-'+i,'Pending '+i,null))});const {page}=f;
  try {
    await page.locator('#task-new').click();
    const dialog=page.locator('#task-create-dialog');await dialog.waitFor({state:'visible',timeout:1200});
    assert.equal(await page.locator('#task-create-name').evaluate(el=>el===document.activeElement),true);
    const box=await dialog.boundingBox();assert.ok(box.y>=0&&box.y+box.height<=758,'modal stays within current viewport');
    await page.locator('#task-create-name').fill('Cancelled draft');await page.locator('#task-create-content').fill('Optional detail');
    await page.locator('#task-create-name').press('Escape');
    assert.equal(await dialog.isVisible(),false);assert.equal(await page.locator('#task-new').evaluate(el=>el===document.activeElement),true);
    assert.equal(await page.evaluate(()=>window.__calls.some(x=>x.command==='create_task')),false);
    await page.locator('#task-new').click();assert.equal(await page.locator('#task-create-name').inputValue(),'');
    await page.locator('#task-create-name').fill('Full modal');await page.locator('#task-create-content').fill('Context');
    await page.locator('#task-create-list').selectOption('home');await page.locator('#task-create-date').fill('2026-10-11');
    await page.locator('#task-create-time').fill('12:00');await page.locator('#task-create-submit').click();
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.some(t=>t.name==='Full modal'));
    const saved=await page.evaluate(()=>window.__fixture.tasks.tasks.find(t=>t.name==='Full modal'));
    assert.equal(saved.content,'Context');assert.equal(saved.listId,'home');assert.equal(saved.date,'2026-10-11');assert.equal(saved.time,'12:00');
    assert.equal(await dialog.isVisible(),false);
  } finally {await f.close();}
});

test('quick create uses the actual list or Today lived date and rejects whitespace and composition Enter',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    const quick=page.locator('#task-quick-name');
    await quick.fill('   ');await quick.press('Enter');
    assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='create_task').length),0);
    await quick.fill('中文组词');
    await quick.evaluate(el=>{el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true}));el.form.requestSubmit();});
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='create_task').length),0,'composition-confirmation cannot save');
    await quick.evaluate(el=>el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true})));
    await page.locator('#tasks-list-scopes [data-task-scope="list:home"]').click();
    await quick.fill('Home quick');await quick.press('Enter');
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.some(t=>t.name==='Home quick'));
    assert.equal(await page.evaluate(()=>window.__fixture.tasks.tasks.find(t=>t.name==='Home quick').listId),'home');
    await page.locator('#tasks-list-scopes [data-task-scope=today]').click();
    await quick.fill('Today quick');await quick.press('Enter');
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.some(t=>t.name==='Today quick'));
    const saved=await page.evaluate(()=>window.__fixture.tasks.tasks.find(t=>t.name==='Today quick'));
    assert.equal(saved.listId,'inbox');assert.equal(saved.date,'2026-10-10');assert.equal(saved.time,null);
    await page.locator('#tasks-list .task-title-button').filter({hasText:'Today quick'}).waitFor({state:'visible'});
    await page.locator('#task-new').click();assert.equal(await page.locator('#task-create-date').inputValue(),'2026-10-10');
    await page.locator('#task-create-name').fill('Modal composition');
    await page.locator('#task-create-name').evaluate(el=>{el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));el.form.requestSubmit();});
    assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='create_task').length),2);
    await page.locator('#task-create-name').evaluate(el=>el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true})));
    await page.locator('#task-create-cancel').click();
  } finally {await f.close();}
});

test('failed quick save freezes the original payload, rereads before explicit retry and creates once',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    const quick=page.locator('#task-quick-name');await quick.fill('Original retry 中文');
    await page.evaluate(()=>window.__failNext='create_task');await quick.press('Enter');
    await page.waitForFunction(()=>document.querySelector('#tasks-status').textContent.includes('Synthetic save failure'));
    assert.equal(await quick.inputValue(),'Original retry 中文');assert.equal(await quick.isDisabled(),true,'uncertain original draft is frozen');
    assert.equal(await page.locator('#task-quick-submit').isDisabled(),true);
    await page.locator('#task-quick-recheck').click();
    await page.waitForFunction(()=>!document.querySelector('#task-quick-retry').disabled);
    assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='create_task').length),1,'read alone never replays');
    await page.locator('#task-quick-retry').click();
    await page.waitForFunction(()=>document.querySelector('#task-quick-name').value==='');
    const attempts=await page.evaluate(()=>window.__calls.filter(x=>x.command==='create_task').map(x=>x.args.input));
    assert.equal(attempts.length,2);assert.deepEqual(attempts[0],attempts[1],'guarded retry uses exactly the original stable payload');
    assert.equal(await page.evaluate(()=>window.__fixture.tasks.tasks.filter(t=>t.name==='Original retry 中文').length),1);
    assert.equal(await quick.evaluate(el=>el===document.activeElement),true);
  } finally {await f.close();}
});


test('modal interval failure retains every original field and changed revision retries only after readback',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    await page.locator('#task-new').click();
    await page.locator('#task-create-name').fill('Frozen original modal');await page.locator('#task-create-content').fill('Original context');
    await page.locator('#task-create-list').selectOption('home');await page.locator('#task-create-date').fill('2026-10-10');
    await page.locator('#task-create-time').fill('23:30');
    await page.locator('#task-create-end-date').waitFor({state:'visible',timeout:1200});
    await page.locator('#task-create-end-date').fill('2026-10-11');await page.locator('#task-create-end-time').fill('00:30');
    await page.evaluate(()=>window.__failNext='create_task');await page.locator('#task-create-submit').click();
    await page.waitForFunction(()=>document.querySelector('#task-create-status').textContent.includes('Synthetic save failure'));
    assert.equal(await page.locator('#task-create-content').inputValue(),'Original context');
    assert.equal(await page.locator('#task-create-name').isDisabled(),true);assert.equal(await page.locator('#task-create-end-time').isDisabled(),true);
    await page.locator('#task-create-cancel').click();await page.locator('#task-new').click();
    assert.equal(await page.locator('#task-create-name').inputValue(),'Frozen original modal','closing preserves uncertain original draft');
    await page.evaluate(()=>window.__fixture.tasks.revision='r2');await page.locator('#task-create-recheck').click();
    await page.waitForFunction(()=>!document.querySelector('#task-create-retry').disabled);
    await page.locator('#task-create-retry').click();await page.waitForFunction(()=>!document.querySelector('#task-create-dialog').open);
    const attempts=await page.evaluate(()=>window.__calls.filter(x=>x.command==='create_task').map(x=>x.args.input));
    assert.equal(attempts.length,2);assert.equal(attempts[1].expectedRevision,'r2');
    assert.deepEqual({...attempts[0],expectedRevision:'r2'},attempts[1]);assert.deepEqual(attempts[1].executionEnd,{date:'2026-10-11',time:'00:30'});
    assert.equal(await page.evaluate(()=>window.__fixture.tasks.tasks.filter(t=>t.name==='Frozen original modal').length),1);
  } finally {await f.close();}
});


test('saved response loss confirms by readback without replay',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    const quick=page.locator('#task-quick-name');await quick.fill('Saved once');
    await page.evaluate(()=>window.__saveButThrow=true);await quick.press('Enter');
    await page.waitForFunction(()=>document.querySelector('#tasks-status').textContent.includes('Synthetic lost response'));
    assert.equal(await quick.inputValue(),'Saved once');assert.equal(await page.locator('#task-new').isDisabled(),true);
    await page.locator('#task-quick-recheck').click();await page.waitForFunction(()=>document.querySelector('#task-quick-name').value==='');
    assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='create_task').length),1,'readback confirms the saved identity without replay');
    assert.equal(await page.evaluate(()=>window.__fixture.tasks.tasks.filter(t=>t.name==='Saved once').length),1);
  } finally {await f.close();}
});


test('pending quick and modal writes block double submission and modal cancellation until confirmation',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    const quick=page.locator('#task-quick-name');await quick.fill('Held quick');await page.evaluate(()=>window.__holdCreate=true);
    await quick.press('Enter');await page.waitForFunction(()=>Boolean(window.__releaseCreate));
    assert.equal(await quick.isDisabled(),true);assert.equal(await page.locator('#task-quick-submit').isDisabled(),true);
    await page.locator('#task-quick-form').evaluate(form=>form.requestSubmit());
    assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='create_task').length),1);
    await page.evaluate(()=>{window.__holdCreate=false;window.__releaseCreate();});
    await page.waitForFunction(()=>document.querySelector('#task-quick-name').value==='');
    await page.locator('#task-new').click();await page.locator('#task-create-name').fill('Held modal');
    await page.evaluate(()=>{window.__releaseCreate=null;window.__holdCreate=true;});await page.locator('#task-create-submit').click();
    await page.waitForFunction(()=>Boolean(window.__releaseCreate));
    assert.equal(await page.locator('#task-create-name').isDisabled(),true);assert.equal(await page.locator('#task-create-cancel').isDisabled(),true);
    await page.keyboard.press('Escape');assert.equal(await page.locator('#task-create-dialog').isVisible(),true);
    await page.locator('#task-create-form').evaluate(form=>form.requestSubmit());
    assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='create_task').length),2);
    await page.evaluate(()=>{window.__holdCreate=false;window.__releaseCreate();});
    await page.waitForFunction(()=>!document.querySelector('#task-create-dialog').open);
    assert.equal(await page.evaluate(()=>window.__fixture.tasks.tasks.filter(t=>t.name.startsWith('Held')).length),2);
  } finally {await f.close();}
});


test('failed verification and conflicting saved identity keep the original draft locked without replay',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    const quick=page.locator('#task-quick-name');await quick.fill('Unknown original');
    await page.evaluate(()=>window.__failNext='create_task');await quick.press('Enter');
    await page.waitForFunction(()=>document.querySelector('#tasks-status').textContent.includes('Synthetic save failure'));
    await page.evaluate(()=>window.__failNext='tasks_view');await page.locator('#task-quick-recheck').click();
    await page.waitForFunction(()=>!document.querySelector('#task-quick-recheck').disabled);
    assert.equal(await quick.inputValue(),'Unknown original');assert.equal(await page.locator('#task-quick-retry').isDisabled(),true);
    await page.evaluate(()=>{const input=window.__calls.find(x=>x.command==='create_task').args.input;window.__fixture.tasks.tasks.push({...input,id:input.taskId,name:'Later changed task',executionEnd:null});});
    await page.locator('#task-quick-recheck').click();await page.waitForFunction(()=>document.querySelector('#tasks-status').textContent.includes('different values'));
    assert.equal(await quick.isDisabled(),true);assert.equal(await page.locator('#task-quick-retry').isDisabled(),true);
    assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='create_task').length),1);
  } finally {await f.close();}
});


test('authoritative absence permits explicit ending of the old invalid-list submission and a fresh Inbox task',async()=>{
  for (const kind of ['archived','deleted']) {
    const f=await pageFixture();const {page}=f;
    try {
      await page.locator('#tasks-list-scopes [data-task-scope="list:home"]').click();
      const quick=page.locator('#task-quick-name');await quick.fill('Original unavailable list');
      await page.evaluate(kind=>{const t=window.__fixture.tasks;if(kind==='archived')t.lists.find(l=>l.id==='home').archived=true;else t.lists=t.lists.filter(l=>l.id!=='home');},kind);
      await quick.press('Enter');await page.waitForFunction(()=>document.querySelector('#tasks-status').textContent.includes('Synthetic list unavailable'));
      assert.match(await page.locator('#tasks-status').textContent(),/Save result unconfirmed/);
      assert.doesNotMatch(await page.locator('#tasks-status').textContent(),/Task not saved/);
      await page.locator('#task-quick-end-attempt').waitFor({state:'visible',timeout:1200});
      assert.equal(await page.locator('#task-quick-end-attempt').isDisabled(),true,'uncertain attempt cannot be ended before readback');
      await page.locator('#task-quick-recheck').click();await page.waitForFunction(()=>!document.querySelector('#task-quick-end-attempt').disabled);
      assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='create_task').length),1);
      await page.locator('#task-quick-end-attempt').click();
      await page.locator('#tasks-list-scopes [data-task-scope=inbox]').click();
      const record=page.locator('#task-create-ended-attempts details').last();await record.locator('summary').click();
      assert.match(await record.textContent(),/Original unavailable list/,'original submission remains reviewable');
      await quick.fill('Fresh valid Inbox task');await quick.press('Enter');await page.waitForFunction(()=>window.__fixture.tasks.tasks.some(t=>t.name==='Fresh valid Inbox task'));
      await page.waitForFunction(()=>document.querySelector('#task-quick-name').value==='');
      const attempts=await page.evaluate(()=>window.__calls.filter(x=>x.command==='create_task').map(x=>x.args.input));
      assert.equal(attempts.length,2);assert.notEqual(attempts[0].taskId,attempts[1].taskId);assert.equal(attempts[1].listId,'inbox');
      assert.equal(await page.locator('#task-new').isDisabled(),false);
      assert.equal(await page.evaluate(()=>window.__fixture.tasks.tasks.some(t=>t.id===window.__calls.find(x=>x.command==='create_task').args.input.taskId)),false);
    } finally {await f.close();}
  }
});

test('lost response plus external rename can end the confirmed conflict, view unchanged existing task and create another',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    const quick=page.locator('#task-quick-name');await quick.fill('Original saved request');
    await page.evaluate(()=>window.__saveButThrow=true);await quick.press('Enter');
    await page.waitForFunction(()=>document.querySelector('#tasks-status').textContent.includes('Synthetic lost response'));
    assert.equal(await page.evaluate(()=>window.__fixture.tasks.tasks.filter(t=>t.name==='Original saved request').length),1);
    assert.match(await page.locator('#tasks-status').textContent(),/Save result unconfirmed/);
    assert.doesNotMatch(await page.locator('#tasks-status').textContent(),/Task not saved/);
    await page.evaluate(()=>window.__failNext='tasks_view');await page.locator('#task-quick-recheck').click();
    await page.waitForFunction(()=>!document.querySelector('#task-quick-recheck').disabled);
    assert.match(await page.locator('#tasks-status').textContent(),/Save result unconfirmed/,'failed readback cannot claim the already saved task was not saved');
    assert.equal(await page.locator('#task-quick-end-attempt').isDisabled(),true);
    const existing=await page.evaluate(()=>{const id=window.__calls.find(x=>x.command==='create_task').args.input.taskId;const task=window.__fixture.tasks.tasks.find(t=>t.id===id);task.name='Externally renamed saved task';task.content='Concurrent retained context';window.__fixture.tasks.revision='r3';return structuredClone(task);});
    await page.locator('#task-quick-recheck').click();await page.waitForFunction(()=>document.querySelector('#tasks-status').textContent.includes('different values'));
    assert.equal(await page.locator('#task-quick-retry').isDisabled(),true);
    await page.locator('#task-quick-end-attempt').click();
    assert.equal(await page.locator('#task-new').isDisabled(),false);
    const record=page.locator('#task-create-ended-attempts details').last();await record.locator('summary').click();
    assert.match(await record.textContent(),/Original saved request/);
    await record.getByRole('button',{name:'View existing task',exact:true}).waitFor({state:'visible',timeout:1200});
    await record.getByRole('button',{name:'View existing task',exact:true}).click();
    const panel=page.locator(`[data-task-editor-dialog="${existing.id}"]`);await panel.waitFor({state:'visible'});
    assert.equal(await panel.locator('[data-task-name]').inputValue(),'Externally renamed saved task');
    assert.equal(await panel.locator('[data-task-content]').inputValue(),'Concurrent retained context');
    assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='create_task').length),1,'ending or viewing does not replay');
    await quick.fill('Another task after conflict');await quick.press('Enter');
    await page.waitForFunction(()=>document.querySelector('#task-quick-name').value==='');
    const attempts=await page.evaluate(()=>window.__calls.filter(x=>x.command==='create_task').map(x=>x.args.input));
    assert.equal(attempts.length,2);assert.notEqual(attempts[0].taskId,attempts[1].taskId);
    assert.deepEqual(await page.evaluate(id=>window.__fixture.tasks.tasks.find(t=>t.id===id),existing.id),existing,'original saved task remains exactly unchanged');
    assert.equal(await page.evaluate(()=>window.__fixture.tasks.tasks.filter(t=>t.name==='Another task after conflict').length),1);
    assert.equal(await page.evaluate(()=>window.__calls.some(x=>['update_task','delete_task','set_task_state'].includes(x.command))),false);
  } finally {await f.close();}
});

test('modal verified absence can end its retained submission with readable recovery actions and return to new creation',async()=>{
  const f=await pageFixture({width:830});const {page}=f;
  try {
    await page.locator('#task-new').click();await page.locator('#task-create-name').fill('Ended modal draft');await page.locator('#task-create-content').fill('Retained exact context');
    await page.evaluate(()=>window.__failNext='create_task');await page.locator('#task-create-submit').click();
    await page.waitForFunction(()=>document.querySelector('#task-create-status').textContent.includes('Save result unconfirmed'));
    assert.equal(await page.locator('#task-create-end-attempt').isDisabled(),true);
    const geometry=await page.locator('#task-create-form .task-form-actions').evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));
    assert.ok(geometry.scroll<=geometry.client+1,'all recovery controls fit the modal width');
    await page.locator('#task-create-recheck').click();await page.waitForFunction(()=>!document.querySelector('#task-create-end-attempt').disabled);
    await page.locator('#task-create-end-attempt').click();assert.equal(await page.locator('#task-create-dialog').isVisible(),false);
    assert.equal(await page.locator('#task-new').evaluate(el=>document.activeElement===el),true);
    const record=page.locator('#task-create-ended-attempts details').last();await record.locator('summary').click();
    assert.match(await record.textContent(),/Retained exact context/);
    await page.locator('#task-new').click();assert.equal(await page.locator('#task-create-name').inputValue(),'');assert.equal(await page.locator('#task-create-content').inputValue(),'');
    await page.locator('#task-create-name').fill('New modal operation');await page.locator('#task-create-submit').click();await page.waitForFunction(()=>!document.querySelector('#task-create-dialog').open);
    const attempts=await page.evaluate(()=>window.__calls.filter(x=>x.command==='create_task').map(x=>x.args.input));
    assert.equal(attempts.length,2);assert.notEqual(attempts[0].taskId,attempts[1].taskId);
    assert.equal(await page.evaluate(()=>window.__fixture.tasks.tasks.filter(t=>t.name==='New modal operation').length),1);
  } finally {await f.close();}
});


test('ended Inbox submission follows current interface language while the original custom list name is retained',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    const quick=page.locator('#task-quick-name');
    for (const [name,scope] of [['Original Inbox','inbox'],['Original user list','list:home']]) {
      await page.locator(`#tasks-list-scopes [data-task-scope="${scope}"]`).click();
      await quick.fill(name);await page.evaluate(()=>window.__failNext='create_task');await quick.press('Enter');
      await page.waitForFunction(()=>!document.querySelector('#task-quick-recheck').disabled&&!document.querySelector('#task-quick-recovery').hidden);
      await page.locator('#task-quick-recheck').click();await page.waitForFunction(()=>!document.querySelector('#task-quick-end-attempt').disabled);
      await page.locator('#task-quick-end-attempt').click();
    }
    let inbox=page.locator('#task-create-ended-attempts details').filter({hasText:'Original Inbox'});
    let custom=page.locator('#task-create-ended-attempts details').filter({hasText:'Original user list'});
    await inbox.locator('summary').click();assert.equal(await inbox.locator('dd').filter({hasText:/^Inbox$/}).count(),1);
    await page.locator('#workspace-language').click();await page.waitForFunction(()=>document.documentElement.lang==='zh-CN');
    inbox=page.locator('#task-create-ended-attempts details').filter({hasText:'Original Inbox'});
    custom=page.locator('#task-create-ended-attempts details').filter({hasText:'Original user list'});
    await inbox.locator('summary').click();await custom.locator('summary').click();
    assert.equal(await inbox.locator('dd').filter({hasText:/^收集箱$/}).count(),1,'reserved system Inbox uses the current catalog');
    assert.equal(await inbox.locator('dd').filter({hasText:/^Inbox$/}).count(),0);
    assert.equal(await custom.locator('dd').filter({hasText:/^Home$/}).count(),1,'user-owned list name stays verbatim');
    assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='create_task').length),2,'switching language never replays ended submissions');
  } finally {await f.close();}
});

 test('compact quick schedule defaults to the application lived day and saves tomorrow plus time',async()=>{
 const f=await pageFixture({clock:{date:'2026-10-11',time:'01:45',livedDate:'2026-10-10'}}); const {page}=f;
 try {
 const quick=page.locator('#task-quick-name'); await quick.fill('Local lived default');await quick.press('Enter');
 await page.waitForFunction(()=>window.__fixture.tasks.tasks.some(t=>t.name==='Local lived default'));
 assert.equal(await page.evaluate(()=>window.__fixture.tasks.tasks.find(t=>t.name==='Local lived default').date),'2026-10-10');
 await page.locator('#tasks-list-scopes [data-task-scope=today]').click();
 await page.locator('#tasks-list .task-title-button').filter({hasText:'Local lived default'}).waitFor({state:'visible',timeout:1500});
 await page.locator('#task-quick-schedule').click();
 await page.locator('#task-quick-tomorrow').click();await page.locator('#task-quick-time').fill('15:30');await page.locator('#task-quick-schedule-apply').click();
 await quick.fill('Scheduled quick');await quick.press('Enter');
 await page.waitForFunction(()=>window.__fixture.tasks.tasks.some(t=>t.name==='Scheduled quick'));
 const saved=await page.evaluate(()=>window.__fixture.tasks.tasks.find(t=>t.name==='Scheduled quick'));
 assert.equal(saved.date,'2026-10-11');assert.equal(saved.time,'15:30');
 assert.equal(await quick.evaluate(el=>el===document.activeElement),true);
 } finally {await f.close();}
 });

 test('Today compact entry freezes unknown original schedule and rereads before one guarded retry',async()=>{
 const f=await pageFixture();const {page}=f;
 try {
 await page.locator('[data-workspace-destination=today]').click();
 const name=page.locator('#today-task-create-name');await name.waitFor({state:'visible'});
 await name.fill('Today original 中文');await page.locator('#today-task-create-schedule').click();
 await page.locator('#today-task-create-tomorrow').click();await page.locator('#today-task-create-time').fill('16:45');await page.locator('#today-task-create-schedule-apply').click();
 await page.evaluate(()=>window.__failNext='create_task');await name.press('Enter');
 await page.waitForFunction(()=>document.querySelector('#today-task-status').textContent.includes('Synthetic save failure'));
 assert.equal(await name.isDisabled(),true,'unknown result must freeze original input');
 assert.equal(await page.locator('#today-task-create-schedule').isDisabled(),true);
 assert.match(await page.locator('#today-task-status').textContent(),/unconfirmed/i);
 await page.evaluate(()=>window.__fixture.tasks.revision='r2');await page.locator('#today-task-create-recheck').click();
 await page.waitForFunction(()=>!document.querySelector('#today-task-create-retry').disabled);
 await page.locator('#today-task-create-retry').click();await page.waitForFunction(()=>document.querySelector('#today-task-create-name').value==='');
 const attempts=await page.evaluate(()=>window.__calls.filter(x=>x.command==='create_task').map(x=>x.args.input));
 assert.equal(attempts.length,2);assert.deepEqual({...attempts[0],expectedRevision:'r2'},attempts[1]);
 assert.equal(attempts[1].date,'2026-10-11');assert.equal(attempts[1].time,'16:45');
 assert.equal(await name.evaluate(el=>el===document.activeElement),true);
 assert.equal(await page.locator('#today-task-create-date').inputValue(),'2026-10-10');
 } finally {await f.close();}
 });

 test('both compact rows fit supported widths and picker Escape cancels without a Task write',async()=>{
 for (const width of [640,830,1000,1280]) {
 const f=await pageFixture({width});const {page}=f;
 try {
 for (const [prefix,destination] of [['task-quick','tasks'],['today-task-create','today']]) {
 await page.locator(`button[data-workspace-destination=${destination}]`).click();
 if(destination==='today' && await page.locator('#today-unlocated-time-shortcut').isVisible()) {if(await page.locator('#today-unlocated-time-shortcut').getAttribute('aria-expanded')==='false')await page.locator('#today-unlocated-time-shortcut').click();}
 const name=page.locator(`#${prefix}-name`),schedule=page.locator(`#${prefix}-schedule`),add=page.locator(`#${prefix}-submit`);
 await name.scrollIntoViewIfNeeded(); const boxes=await Promise.all([name,schedule,add].map(x=>x.boundingBox()));
 assert.ok(boxes.every(x=>Math.abs((x.y+x.height/2)-(boxes[0].y+boxes[0].height/2))<2),'name/schedule/Add remain one row '+width+' '+prefix);
 assert.ok(boxes[2].x+boxes[2].width<=width,'row does not overflow '+width);
 await name.fill('Preserved compact draft');await schedule.click();await page.locator(`#${prefix}-tomorrow`).click();
 const picker=await page.locator(`#${prefix}-schedule-picker`).boundingBox();
 assert.ok(picker.x>=0&&picker.x+picker.width<=width&&picker.y>=0&&picker.y+picker.height<=758,'picker stays inside current viewport '+width+' '+prefix+' '+JSON.stringify(picker));
 await page.locator(`#${prefix}-time`).press('Escape');
 assert.equal(await page.locator(`#${prefix}-schedule-picker`).isVisible(),false);assert.equal(await schedule.evaluate(el=>el===document.activeElement),true);
 assert.equal(await name.inputValue(),'Preserved compact draft');
 }
 assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='create_task').length),0);
 } finally {await f.close();}
 }
 });
 test('historical Today compact create keeps selected lived date and optional content/list without assuming a time',async()=>{
 const f=await pageFixture({selectedDate:'2026-09-08',clock:{date:'2026-10-11',time:'10:00',livedDate:'2026-10-11'}});const {page}=f;
 try {
 await page.locator('[data-workspace-destination=today]').click();const name=page.locator('#today-task-create-name');await name.fill('Historical selected day');
 await page.locator('.task-compact-details summary').click();await page.locator('#today-task-create-content').fill('Retained optional context');await page.locator('#today-task-create-list').selectOption('home');
 await name.press('Enter');await page.waitForFunction(()=>window.__fixture.tasks.tasks.some(t=>t.name==='Historical selected day'));
 const saved=await page.evaluate(()=>window.__fixture.tasks.tasks.find(t=>t.name==='Historical selected day'));
 assert.equal(saved.date,'2026-09-08');assert.equal(saved.time,null);assert.equal(saved.content,'Retained optional context');assert.equal(saved.listId,'home');
 assert.equal(await name.evaluate(el=>el===document.activeElement),true);assert.equal(await page.locator('#today-task-create-date').inputValue(),'2026-09-08');
 } finally {await f.close();}
 });

 test('Today explicit no-date choice survives read-only refresh before naming and continuous create resets selected-day default',async()=>{
 const f=await pageFixture();const {page}=f;
 try {
 await page.locator('[data-workspace-destination=today]').click();await page.locator('#today-task-create-schedule').click();await page.locator('#today-task-create-undated').click();await page.locator('#today-task-create-schedule-apply').click();
 await page.locator('#refresh-today').click();await page.waitForFunction(()=>!document.querySelector('#refresh-today').disabled);
 assert.equal(await page.locator('#today-task-create-date').inputValue(),'','explicit undated schedule cannot revert on read-only refresh');
 const name=page.locator('#today-task-create-name');await name.fill('Explicit undated Today task');await name.press('Enter');
 await page.waitForFunction(()=>window.__fixture.tasks.tasks.some(t=>t.name==='Explicit undated Today task'));
 const saved=await page.evaluate(()=>window.__fixture.tasks.tasks.find(t=>t.name==='Explicit undated Today task'));assert.equal(saved.date,null);assert.equal(saved.time,null);
 assert.equal(await page.locator('#today-task-create-date').inputValue(),'2026-10-10');assert.equal(await name.evaluate(el=>el===document.activeElement),true);
 } finally {await f.close();}
 });

 test('Today saved response loss is resolved by readback without replay; confirmed conflict can explicitly end with original draft retained',async()=>{
 const f=await pageFixture();const {page}=f;
 try {
 await page.locator('[data-workspace-destination=today]').click();const name=page.locator('#today-task-create-name');
 await name.fill('Today saved once');await page.evaluate(()=>window.__saveButThrow=true);await name.press('Enter');
 await page.waitForFunction(()=>document.querySelector('#today-task-status').textContent.includes('Synthetic lost response'));
 assert.equal(await name.isDisabled(),true);await page.locator('#today-task-create-recheck').click();await page.waitForFunction(()=>document.querySelector('#today-task-create-name').value==='');
 assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='create_task').length),1);
 await name.fill('Today conflict original');await page.evaluate(()=>window.__saveButThrow=true);await name.press('Enter');await page.waitForFunction(()=>document.querySelector('#today-task-status').textContent.includes('Synthetic lost response'));
 await page.evaluate(()=>window.__failNext='tasks_view');await page.locator('#today-task-create-recheck').click();await page.waitForFunction(()=>!document.querySelector('#today-task-create-recheck').disabled);
 assert.equal(await page.locator('#today-task-create-end-attempt').isDisabled(),true);assert.match(await page.locator('#today-task-status').textContent(),/unconfirmed/i);
 const original=await page.evaluate(()=>{const x=window.__fixture.tasks.tasks.find(t=>t.name==='Today conflict original');x.name='Externally renamed Today';x.content='Retained external content';window.__fixture.tasks.revision='r4';return structuredClone(x);});
 await page.locator('#today-task-create-recheck').click();await page.waitForFunction(()=>!document.querySelector('#today-task-create-end-attempt').disabled);
 assert.equal(await page.locator('#today-task-create-retry').isDisabled(),true);await page.locator('#today-task-create-end-attempt').click();
 await page.locator('#today-task-create-ended-attempts summary').click();assert.match(await page.locator('#today-task-create-ended-attempts').textContent(),/Today conflict original/);
 await name.fill('Today fresh identity');await name.press('Enter');await page.waitForFunction(()=>document.querySelector('#today-task-create-name').value==='');
 const attempts=await page.evaluate(()=>window.__calls.filter(x=>x.command==='create_task').map(x=>x.args.input));assert.equal(attempts.length,3);assert.notEqual(attempts[1].taskId,attempts[2].taskId);
 assert.deepEqual(await page.evaluate(id=>window.__fixture.tasks.tasks.find(t=>t.id===id),original.id),original);
 } finally {await f.close();}
 });
 test('Today blank/composition/pending safeguards protect one create and retain the compact entry draft',async()=>{
 const f=await pageFixture();const {page}=f;
 try {
 await page.locator('[data-workspace-destination=today]').click();const name=page.locator('#today-task-create-name');
 await name.fill('  ');await name.press('Enter');assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='create_task').length),0);
 await name.fill('中文输入草稿');await name.evaluate(el=>{el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));el.form.requestSubmit();});
 assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='create_task').length),0);
 await name.evaluate(el=>el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true})));
 await page.evaluate(()=>window.__holdCreate=true);await name.press('Enter');await page.waitForFunction(()=>Boolean(window.__releaseCreate));
 assert.equal(await name.isDisabled(),true);assert.equal(await page.locator('#today-task-create-schedule').isDisabled(),true);assert.equal(await page.locator('#today-task-create-submit').isDisabled(),true);
 await page.locator('#today-task-create-form').evaluate(form=>form.requestSubmit());assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='create_task').length),1);
 await page.evaluate(()=>{window.__holdCreate=false;window.__releaseCreate();});await page.waitForFunction(()=>document.querySelector('#today-task-create-name').value==='');
 assert.equal(await name.evaluate(el=>el===document.activeElement),true);
 } finally {await f.close();}
 });

for (const [prefix,destination] of [['task-quick','tasks'],['today-task-create','today']]) {
 test(prefix+' picker buttons honor keyboard activation and cancel',async()=>{
 const f=await pageFixture();const {page}=f;
 try {
 await page.locator(`button[data-workspace-destination=${destination}]`).click();
 if(destination==='today'&&await page.locator('#today-unlocated-time-shortcut').getAttribute('aria-expanded')==='false')await page.locator('#today-unlocated-time-shortcut').click();
 await page.locator(`#${prefix}-schedule`).click();await page.locator(`#${prefix}-tomorrow`).focus();await page.keyboard.press('Enter');
 assert.equal(await page.locator(`#${prefix}-date`).inputValue(),'2026-10-11');
 assert.equal(await page.locator(`#${prefix}-schedule-picker`).isVisible(),true);
 await page.locator(`#${prefix}-schedule-cancel`).focus();await page.keyboard.press('Enter');
 assert.equal(await page.locator(`#${prefix}-date`).inputValue(),'2026-10-10');
 assert.equal(await page.locator(`#${prefix}-schedule-picker`).isVisible(),false);
 }finally{await f.close();}
 });
 test(prefix+' confirmed keyboard save invalidates an open picker transaction',async()=>{
 const f=await pageFixture();const {page}=f;
 try {
 await page.locator(`button[data-workspace-destination=${destination}]`).click();
 if(destination==='today'&&await page.locator('#today-unlocated-time-shortcut').getAttribute('aria-expanded')==='false')await page.locator('#today-unlocated-time-shortcut').click();
 const name=page.locator(`#${prefix}-name`);
 await page.locator(`#${prefix}-schedule`).click();await page.locator(`#${prefix}-tomorrow`).click();await page.locator(`#${prefix}-schedule-apply`).click();
 await name.fill('Keyboard open picker '+prefix);await page.locator(`#${prefix}-schedule`).click();await page.locator(`#${prefix}-date`).fill('2026-10-12');
 await name.focus();await name.press('Enter');await page.waitForFunction(({prefix})=>document.querySelector(`#${prefix}-name`).value==='',{prefix});
 assert.equal(await page.locator(`#${prefix}-schedule-picker`).isVisible(),false);
 assert.equal(await page.locator(`#${prefix}-date`).inputValue(),'2026-10-10');
 await name.fill('Next default '+prefix);await name.press('Enter');await page.waitForFunction(({prefix})=>window.__fixture.tasks.tasks.some(t=>t.name==='Next default '+prefix),{prefix});
 assert.equal(await page.evaluate(prefix=>window.__fixture.tasks.tasks.find(t=>t.name==='Next default '+prefix).date,prefix),'2026-10-10');
 }finally{await f.close();}
 });
}

 test('schedule transactions close across destination and Vault changes without restoring old values',async()=>{
 const f=await pageFixture();const {page}=f;
 try {
 await page.locator('#task-quick-schedule').click();await page.locator('#task-quick-tomorrow').click();
 await page.locator('button[data-workspace-destination=today]').click();
 assert.equal(await page.locator('#task-quick-schedule-picker').isVisible(),false);
 await page.locator('#today-task-create-schedule').click();await page.locator('#today-task-create-tomorrow').click();
 await page.locator('button[data-workspace-destination=tasks]').click();
 assert.equal(await page.locator('#today-task-create-schedule-picker').isVisible(),false);
 await page.locator('#task-quick-schedule').click();await page.locator('#task-quick-date').fill('2026-10-12');
 await page.evaluate(()=>window.__fixture.tasks.targetBinding='synthetic-new-vault');await page.locator('#refresh-tasks').click();
 await page.waitForFunction(()=>document.querySelector('#task-quick-date').value==='2026-10-10');
 assert.equal(await page.locator('#task-quick-schedule-picker').isVisible(),false);
 await page.locator('#task-quick-name').fill('New binding default');await page.locator('#task-quick-name').press('Enter');
 await page.waitForFunction(()=>window.__fixture.tasks.tasks.some(t=>t.name==='New binding default'));
 assert.equal(await page.evaluate(()=>window.__fixture.tasks.tasks.find(t=>t.name==='New binding default').date),'2026-10-10');
 }finally{await f.close();}
 });
