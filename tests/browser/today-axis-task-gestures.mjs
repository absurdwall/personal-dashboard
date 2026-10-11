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

async function pageFixture() {
  const server=createServer(async(req,res)=>{try {const url=new URL(req.url,'http://localhost');const file=resolve(root,'dist',url.pathname==='/'?'index.html':url.pathname.slice(1));
    if(!file.startsWith(resolve(root,'dist')+'/'))throw Error('invalid path');
    res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await readFile(file));}catch {res.statusCode=404;res.end('not found');}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:1100}});
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
async function pointAt(page,minute) {
  const plot=page.locator('#today-axis-plot');
  await plot.scrollIntoViewIfNeeded();
  return page.evaluate(minute=>{
    const plot=document.querySelector('#today-axis-plot');const rect=plot.getBoundingClientRect();
    const start=document.querySelector('#today-expand-early').getAttribute('aria-expanded')==='true'?240:360;
    const end=document.querySelector('#today-expand-late').getAttribute('aria-expanded')==='true'?1680:1440;
    return {x:rect.right-30,y:rect.top+(minute-start)/(end-start)*rect.height};
  },minute);
}

// Real Chromium mouse events on the production document and compiled main.ts.
// Tauri IPC is the mocked system boundary; persistence is checked in Rust workflows.
test('blank-axis pointer selection opens editable Task creation and sends exact interval',async()=>{
  const fixture=await pageFixture();const {page}=fixture;
  try {
    const start=await pointAt(page,660),end=await pointAt(page,720);
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
