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

async function pageFixture({width=1280,extraTasks=[]}={}) {
  const server=createServer(async(req,res)=>{try {const url=new URL(req.url,'http://localhost');const file=resolve(root,'dist',url.pathname==='/'?'index.html':url.pathname.slice(1));
    if(!file.startsWith(resolve(root,'dist')+'/'))throw Error('invalid path');
    res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await readFile(file));}catch {res.statusCode=404;res.end('not found');}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width,height:758}});
  const errors=[];page.on('pageerror',error=>errors.push(String(error)));
  const fixtureView=structuredClone(view);fixtureView.tasks.tasks[0].changes=[{id:'synthetic-rename',kind:'renamed',changedAt:'2026-10-10T08:30-04:00',source:'user'}];fixtureView.tasks.tasks.push(...extraTasks);fixtureView.tasks.tasks[0].content='Full synthetic context, only visible in selected detail';fixtureView.tasks.lists.push({id:'home',name:'Home',isSystem:false,archived:false});
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
  },{view:fixtureView});
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
    assert.equal(saved.content,null);assert.equal(saved.date,null);assert.equal(saved.time,null);assert.equal(saved.listId,'inbox');
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
