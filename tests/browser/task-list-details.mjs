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
  const fixtureView=structuredClone(view);fixtureView.tasks.tasks.push(...extraTasks);fixtureView.tasks.tasks[0].content='Full synthetic context, only visible in selected detail';fixtureView.tasks.lists.push({id:'home',name:'Home',isSystem:false,archived:false});
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
      if(command==='set_task_state'){
        const input=args.input;const item=t.tasks.find(x=>x.id===input.taskId);item.state=input.state;item.completion=input.state==='completed'?{completedOn:'2026-10-10',completedTime:'09:00',recordedAt:'2026-10-10T09:00-04:00',source:'checkbox'}:null;t.revision='r'+(Number(t.revision.slice(1))+1);return structuredClone(t);
      }
      if(command==='update_task'){
        const input=args.input;if(input.expectedRevision!==t.revision)throw Error('Synthetic revision conflict');
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

// Production document, real click/keyboard input. Only Tauri IPC is replaced.
test('Tasks compact rows select one full detail while completion stays independent',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    const row=page.locator('#tasks-list [data-task-editor-row=point]');
    assert.equal(await row.locator('.task-row-content').count(),0,'full content belongs in detail');
    assert.equal(await row.locator('[data-task-delete]').count(),0,'secondary operations belong in detail');
    const check=row.locator('input[type=checkbox]');assert.ok((await check.boundingBox()).width>=20,'completion has a clear target');
    await row.locator('.task-title-button').focus();await page.keyboard.press('Enter');
    const panel=page.locator('#task-editor-dialog-root [data-task-editor-dialog=point]');await panel.waitFor({state:'visible'});
    assert.equal(await panel.locator('[data-task-content]').inputValue(),'Full synthetic context, only visible in selected detail');
    assert.equal(await page.evaluate(()=>window.__calls.some(x=>x.command==='set_task_state')),false);
    await check.check();
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point').state==='completed');
    assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='set_task_state').length),1);
  }finally{await f.close();}
});


test('selected detail edits one Task and preserves unmodified endpoints and identity',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    await page.locator('#task-filter').selectOption('completed');
    await page.locator('#tasks-list [data-task-editor-row=interval] .task-title-button').click();
    const panel=page.locator('[data-task-editor-dialog=interval]');
    await panel.locator('[data-task-name]').fill('Edited range');
    await panel.locator('[data-task-content]').fill('Changed content');
    await panel.locator('[data-task-list]').selectOption('home');
    await panel.locator('button[type=submit]').click();
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.find(x=>x.id==='interval').name==='Edited range');
    const saved=await page.evaluate(()=>window.__fixture.tasks.tasks.find(x=>x.id==='interval'));
    assert.deepEqual({date:saved.date,time:saved.time,end:saved.executionEnd,state:saved.state,list:saved.listId},
      {date:'2026-10-10',time:'13:00',end:{date:'2026-10-10',time:'14:30'},state:'completed',list:'home'});
    assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='update_task').length),1,'one save submits once');
    assert.equal(await panel.locator('[data-task-name]').inputValue(),'Edited range');
    await panel.locator('[data-task-time]').fill('13:15');await panel.locator('[data-task-end-time]').fill('15:00');
    await panel.locator('button[type=submit]').click();
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.find(x=>x.id==='interval').executionEnd.time==='15:00');
    assert.equal(await page.locator('#tasks-list [data-task-editor-row=interval] .task-row-schedule').textContent(),'Sat, Oct 10 13:15 – 15:00');
  }finally{await f.close();}
});
