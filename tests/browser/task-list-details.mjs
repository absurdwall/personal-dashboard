import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

// Existing browser tooling only: provide its module path; this does not install a dependency.
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE_PATH ? pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href : 'playwright');
const root = resolve(import.meta.dirname, '../..');
const task = (id,name,time,executionEnd=null,state='pending') => ({id,name,content:null,date:'2026-10-10',time,executionEnd,listId:'inbox',priority:null,tagIds:[],
  source:{kind:'manual',reference:null},state,deletedAt:null,completion:state==='completed'?{completedOn:'2026-10-10',completedTime:'08:00',recordedAt:'2026-10-10T08:00-04:00',source:'checkbox'}:null,
  overdue:false,timePassed:false,createdAt:'2026-10-10T08:00-04:00',modifiedAt:'2026-10-10T08:00-04:00',changes:[]});
const tasks = {state:'ready',errorKind:null,message:'Synthetic Tasks',schemaVersion:3,revision:'r1',targetBinding:'synthetic-task-binding',vaultName:'Synthetic',vaultPath:'/synthetic',currentDate:'2026-10-10',
  lists:[{id:'inbox',name:'Inbox',isSystem:true,archived:false}],tags:[],tasks:[task('point','Synthetic point','09:00'),task('interval','Synthetic interval','13:00',{date:'2026-10-10',time:'14:30'},'completed')]};
const view = {state:'missing',date:'2026-10-10',isToday:true,currentTime:'09:00',canRecord:true,defaultPhase:'daytime',dailyRecordAvailability:'missing',vaultName:'Synthetic',vaultPath:'/synthetic',vaultAvailability:'available',message:'Synthetic browser IPC fixture',revision:null,targetBinding:'synthetic-record-binding',
  baseline:{availability:'missing',message:'No record',timeline:[],evidence:[]},timeline:[],evidence:[],daytime:{updates:[],shortRecords:[]},
  evening:{account:[],comparison:[],summary:[],questions:[],additions:[],corrections:[],other:[],recordSupplements:[],hasLaterRecordRevision:false},tasks,
  dayTasks:{state:'empty',message:'',planError:null,revision:null,targetBinding:null,tasks:[]},habitCorrections:{state:'missing',message:'',date:'2026-10-10',canRecord:false,completionRevision:null,completionTargetBinding:null,namesConfigurationState:'missing',habits:[]},
  timeAxis:{currentArrangement:[],confirmedFacts:[],unlocatedCurrentArrangement:[],unlocatedConfirmedFacts:[]}};

async function pageFixture({width=1280,extraTasks=[],tags=[]}={}) {
  const server=createServer(async(req,res)=>{try {const url=new URL(req.url,'http://localhost');const file=resolve(root,'dist',url.pathname==='/'?'index.html':url.pathname.slice(1));
    if(!file.startsWith(resolve(root,'dist')+'/'))throw Error('invalid path');
    res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await readFile(file));}catch {res.statusCode=404;res.end('not found');}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width,height:758}});
  const errors=[];page.on('pageerror',error=>errors.push(String(error)));
  const fixtureView=structuredClone(view);fixtureView.tasks.tags=structuredClone(tags);fixtureView.tasks.tasks[0].changes=[{id:'synthetic-rename',kind:'renamed',changedAt:'2026-10-10T08:30-04:00',source:'user'}];fixtureView.tasks.tasks.push(...extraTasks);fixtureView.tasks.tasks[0].content='Full synthetic context, only visible in selected detail';fixtureView.tasks.lists.push({id:'home',name:'Home',isSystem:false,archived:false});
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
        if(!t.tasks.some(x=>x.id===input.taskId))t.tasks.push({id:input.taskId,...input,priority:null,tagIds:[],source:{kind:'manual',reference:null},state:'pending',deletedAt:null,completion:null,overdue:false,timePassed:false,createdAt:'2026-10-10T09:00-04:00',modifiedAt:'2026-10-10T09:00-04:00',changes:[]});
        t.revision='r'+(Number(t.revision.slice(1))+1);return structuredClone(t);
      }
      if(command==='create_task_with_properties'){
        const input=args.input;if(input.expectedRevision!==t.revision)throw Error('Synthetic revision conflict');
        if(!t.tasks.some(x=>x.id===input.taskId))t.tasks.push({id:input.taskId,...input,priority:input.priority??null,tagIds:input.tagIds??[],source:{kind:'manual',reference:null},state:'pending',deletedAt:null,completion:null,overdue:false,timePassed:false,createdAt:'2026-10-10T09:00-04:00',modifiedAt:'2026-10-10T09:00-04:00',changes:[]});
        t.revision='r'+(Number(t.revision.slice(1))+1);return structuredClone(t);
      }
      if(command==='set_task_state'){
        const input=args.input;const item=t.tasks.find(x=>x.id===input.taskId);item.state=input.state;item.completion=input.state==='completed'?{completedOn:'2026-10-10',completedTime:'09:00',recordedAt:'2026-10-10T09:00-04:00',source:'checkbox'}:null;t.revision='r'+(Number(t.revision.slice(1))+1);return structuredClone(t);
      }
      if(['delete_task','restore_task'].includes(command)){const item=t.tasks.find(x=>x.id===args.input.taskId);item.deletedAt=command==='delete_task'?'2026-10-10T09:00-04:00':null;t.revision='r'+(Number(t.revision.slice(1))+1);return structuredClone(t);}
      if(command==='update_task'||command==='update_task_with_properties'){
        const input=args.input;if(input.expectedRevision!==t.revision)throw Error('Synthetic revision conflict');
        if(window.__holdUpdate)await new Promise(resolve=>{window.__releaseUpdate=resolve;});
        Object.assign(t.tasks.find(x=>x.id===input.taskId),input);t.revision='r'+(Number(t.revision.slice(1))+1);return structuredClone(t);
      }
      if(command==='create_task_tag'){
        const input=args.input;const existing=t.tags.find(x=>x.name.toLocaleLowerCase()===input.name.toLocaleLowerCase());
        if(!existing){t.tags.push({id:input.tagId,name:input.name});t.revision='r'+(Number(t.revision.slice(1))+1);}
        return structuredClone(t);
      }
      if(command==='rename_task_tag'){
        const input=args.input;const existing=t.tags.find(x=>x.id===input.tagId);if(existing)existing.name=input.name;
        t.revision='r'+(Number(t.revision.slice(1))+1);return structuredClone(t);
      }
      if(command==='delete_task_tag'){
        const input=args.input;t.tags=t.tags.filter(x=>x.id!==input.tagId);for(const item of t.tasks)item.tagIds=(item.tagIds??[]).filter(id=>id!==input.tagId);
        t.revision='r'+(Number(t.revision.slice(1))+1);return structuredClone(t);
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
    const check=row.locator('input[type=checkbox]');assert.ok((await row.locator('.task-completion-toggle').boundingBox()).width>=20,'completion has a clear target');
    await row.locator('.task-title-button').focus();await page.keyboard.press('Enter');
    const panel=page.locator('#task-editor-dialog-root [data-task-editor-dialog=point]');await panel.waitFor({state:'visible'});
    assert.equal(await panel.locator('[data-task-content]').inputValue(),'Full synthetic context, only visible in selected detail');
    if(process.env.PDEX_SCREENSHOT_DIR){await mkdir(process.env.PDEX_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:resolve(process.env.PDEX_SCREENSHOT_DIR,'tasks-wide.png'),fullPage:true});}
    assert.equal(await page.evaluate(()=>window.__calls.some(x=>x.command==='set_task_state')),false);
    await panel.locator('.task-change-history summary').click();assert.equal(await panel.locator('.task-change-history li').count(),1);
    await row.locator('.task-completion-toggle').click();
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point').state==='completed');
    assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='set_task_state').length),1);
    const completedCheck=page.locator('#tasks-list [data-task-editor-row=point] input[type=checkbox]');await completedCheck.focus();await page.keyboard.press('Space');
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point').state==='pending');
    assert.equal(await panel.isVisible(),true);
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
    await panel.locator('[data-task-list-disclosure] > summary').click();
    await panel.locator('[data-task-list]').selectOption('home');
    await panel.locator('button[type=submit]').click();
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.find(x=>x.id==='interval').name==='Edited range');
    const saved=await page.evaluate(()=>window.__fixture.tasks.tasks.find(x=>x.id==='interval'));
    assert.deepEqual({date:saved.date,time:saved.time,end:saved.executionEnd,state:saved.state,list:saved.listId},
      {date:'2026-10-10',time:'13:00',end:{date:'2026-10-10',time:'14:30'},state:'completed',list:'home'});
    assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='update_task_with_properties').length),1,'one save submits once');
    assert.equal(await panel.locator('[data-task-name]').inputValue(),'Edited range');
    await panel.locator('[data-task-schedule-disclosure] > summary').click();
    await panel.locator('[data-task-date]').fill('2026-10-11');await panel.locator('[data-task-time]').fill('13:15');
    await panel.locator('[data-task-end-date]').fill('2026-10-11');await panel.locator('[data-task-end-time]').fill('15:00');
    await panel.locator('button[type=submit]').click();
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.find(x=>x.id==='interval').executionEnd.time==='15:00');
    assert.equal(await page.locator('#tasks-list [data-task-editor-row=interval] .task-row-schedule').textContent(),'Sun, Oct 11 13:15 – 15:00');
  }finally{await f.close();}
});


test('narrow Task detail stays below the list, preserves drafts between selections and returns focus',async()=>{
  const f=await pageFixture({width:830});const {page}=f;
  try {
    const row=page.locator('#tasks-list [data-task-editor-row=point]');
    await row.locator('.task-row-schedule').click();
    let panel=page.locator('[data-task-editor-dialog=point]');
    assert.equal(await page.locator('#task-editor-dialog-root [data-task-editor-dialog]:visible').count(),1);
    const [listBox,panelBox]=await Promise.all([page.locator('.tasks-content').boundingBox(),panel.boundingBox()]);
    assert.ok(panelBox.y>=listBox.y+listBox.height-1,'detail sits below list at narrow width');
    assert.ok(panelBox.x>=0&&panelBox.x+panelBox.width<=830,'detail fits the window');
    for (const selector of ['#task-filter','#task-priority-filter','#task-priority-sort','#task-tag-filter']) {
      const filterBox=await page.locator(selector).boundingBox();
      assert.ok(filterBox.x>=0&&filterBox.x+filterBox.width<=830,`${selector} stays visible at narrow width`);
    }
    if(process.env.PDEX_SCREENSHOT_DIR){await mkdir(process.env.PDEX_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:resolve(process.env.PDEX_SCREENSHOT_DIR,'tasks-narrow.png'),fullPage:true});}
    await panel.locator('[data-task-content]').fill('Unsaved protected draft');
    await page.locator('#task-filter').selectOption('all');
    await page.locator('#tasks-list .task-ended-history > summary').click();
    await page.locator('#tasks-list [data-task-editor-row=interval] .task-title-button').click();
    assert.equal(await page.locator('#task-editor-dialog-root [data-task-editor-dialog]:visible').count(),1);
    await row.locator('.task-title-button').click();
    assert.equal(await panel.locator('[data-task-content]').inputValue(),'Unsaved protected draft');
    await panel.locator('[data-task-editor-close]').click();
    assert.equal(await page.locator('#task-editor-dialog-root').isVisible(),false);
    await page.waitForFunction(()=>document.activeElement?.matches('#tasks-list [data-task-editor-row=point] .task-title-button'));
    assert.equal(await row.locator('.task-title-button').evaluate(el=>el===document.activeElement),true);
    assert.equal(await page.evaluate(()=>window.__calls.some(x=>['set_task_state','update_task','update_task_with_properties'].includes(x.command))),false);
  }finally{await f.close();}
});

test('Tasks filters and selected detail stay inside a 680px viewport',async()=>{
  const f=await pageFixture({width:680});const {page}=f;
  try {
    await page.locator('#tasks-list [data-task-editor-row=point] .task-title-button').click();
    const panel=page.locator('[data-task-editor-dialog=point]');
    const panelBox=await panel.boundingBox();
    assert.ok(panelBox.x>=0&&panelBox.x+panelBox.width<=680,'detail fits the narrow window');
    for (const selector of ['#task-filter','#task-priority-filter','#task-priority-sort','#task-tag-filter']) {
      const filterBox=await page.locator(selector).boundingBox();
      assert.ok(filterBox.x>=0&&filterBox.x+filterBox.width<=680,`${selector} stays visible at 680px`);
    }
    if(process.env.PDEX_SCREENSHOT_DIR){await mkdir(process.env.PDEX_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:resolve(process.env.PDEX_SCREENSHOT_DIR,'tasks-680.png'),fullPage:true});}
  }finally{await f.close();}
});

test('failed detail save retains selection and endpoints for an explicit refreshed retry',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    await page.locator('#task-filter').selectOption('completed');
    await page.locator('#tasks-list [data-task-editor-row=interval] .task-title-button').click();
    const panel=page.locator('[data-task-editor-dialog=interval]');
    await panel.locator('[data-task-name]').fill('Retry draft');
    await page.evaluate(()=>window.__failNext='update_task_with_properties');await panel.locator('button[type=submit]').click();
    await page.waitForFunction(()=>document.querySelector('#tasks-status').textContent.includes('Synthetic save failure'));
    assert.equal(await panel.locator('[data-task-name]').inputValue(),'Retry draft');
    assert.equal(await panel.locator('[data-task-end-time]').inputValue(),'14:30');
    assert.equal(await page.evaluate(()=>window.__fixture.tasks.tasks.find(x=>x.id==='interval').name),'Synthetic interval');
    await page.locator('#refresh-tasks').click();await page.waitForFunction(()=>!document.querySelector('#refresh-tasks').disabled);
    assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='update_task_with_properties').length),1,'refresh does not replay');
    await panel.locator('button[type=submit]').click();
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.find(x=>x.id==='interval').name==='Retry draft');
    const attempts=await page.evaluate(()=>window.__calls.filter(x=>x.command==='update_task_with_properties').map(x=>x.args.input));
    assert.equal(attempts[0].changeId,attempts[1].changeId);assert.deepEqual(attempts[1].executionEnd,{date:'2026-10-10',time:'14:30'});
  }finally{await f.close();}
});

test('selected detail More retains abandon, restore, delete and historical pagination',async()=>{
  const extraTasks=Array.from({length:35},(_,i)=>task('history-'+i,'Historical '+i,'13:00',null,'completed'));
  const f=await pageFixture({extraTasks});const {page}=f;
  try {
    await page.locator('#tasks-list [data-task-editor-row=point] .task-title-button').click();
    let panel=page.locator('[data-task-editor-dialog=point]');
    await panel.locator('[data-task-more] > summary').click();
    await panel.locator('[data-task-state-action=abandoned]').click();
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point').state==='abandoned');
    assert.equal(await page.locator('#tasks-list [data-task-editor-row=point] input[type=checkbox]').isDisabled(),true,'abandoned Task is not a completion toggle');
    panel=page.locator('[data-task-editor-dialog=point]');
    await panel.locator('[data-task-more] > summary').click();
    await panel.locator('[data-task-more] button[data-task-state-action=pending]').click();
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point').state==='pending');
    panel=page.locator('[data-task-editor-dialog=point]');
    await panel.locator('[data-task-more] > summary').click();
    await panel.locator('[data-task-delete]').click();
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point').deletedAt!==null);
    await page.locator('#task-filter').selectOption('deleted');
    await page.locator('#tasks-list [data-task-editor-row=point] .task-title-button').click();
    panel=page.locator('[data-task-editor-dialog=point]');
    await panel.locator('[data-task-more] > summary').click();
    await panel.locator('[data-task-restore]').click();
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point').deletedAt===null);
    await page.locator('#task-filter').selectOption('completed');
    assert.equal(await page.locator('#tasks-list [data-task-editor-row]').count(),30);
    await page.getByRole('button',{name:'Show more · 6'}).click();
    assert.equal(await page.locator('#tasks-list [data-task-editor-row]').count(),36);
    await page.locator('#tasks-list [data-task-editor-row=history-34] .task-title-button').click();
    assert.equal(await page.locator('[data-task-editor-dialog=history-34]').isVisible(),true);
  }finally{await f.close();}
});


test('Today Task remains on its shared record after using a different Tasks list scope',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    await page.locator('#tasks-list-scopes [data-task-scope="list:home"]').click();
    await page.locator('[data-workspace-destination=today]').click();
    await page.locator('.today-axis-marker[data-task-id=point] .today-axis-marker-link').click();
    const todayTask=page.locator('#today-task-scheduled [data-task-editor-row=point]');
    await todayTask.locator('.task-title-button').click();
    assert.equal(await todayTask.locator('form[data-task-editor]').isVisible(),true);
    assert.equal(await todayTask.locator('[data-task-content]').inputValue(),'Full synthetic context, only visible in selected detail');
    assert.equal(await page.evaluate(()=>window.__calls.some(x=>['set_task_state','update_task','update_task_with_properties'].includes(x.command))),false);
  }finally{await f.close();}
});


test('selected detail freezes all edit controls until the submitted save finishes',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    await page.locator('#task-filter').selectOption('completed');
    await page.locator('#tasks-list [data-task-editor-row=interval] .task-title-button').click();
    const panel=page.locator('[data-task-editor-dialog=interval]');
    await panel.locator('[data-task-name]').fill('Pending save');
    await panel.locator('[data-task-list-disclosure] > summary').click();
    await panel.locator('[data-task-schedule-disclosure] > summary').click();
    await page.evaluate(()=>window.__holdUpdate=true);await panel.locator('button[type=submit]').click();
    await page.waitForFunction(()=>Boolean(window.__releaseUpdate));
    assert.equal(await panel.locator('[data-task-list]').isDisabled(),true,'list edits cannot change an in-flight payload');
    assert.equal(await panel.getByRole('button',{name:'Clear execution end'}).isDisabled(),true,'end clear cannot change an in-flight payload');
    await page.evaluate(()=>window.__releaseUpdate());
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.find(x=>x.id==='interval').name==='Pending save');
  }finally{await f.close();}
});

test('selected Task has one editable title, focuses Content, and Cancel discards without saving',async()=>{
  const longTags=Array.from({length:12},(_,i)=>({id:`tag-${i}`,name:`Long label ${i} ${'context '.repeat(8)}`}));
  const f=await pageFixture({tags:longTags,extraTasks:[]});const {page}=f;
  try {
    const row=page.locator('#tasks-list [data-task-editor-row=point]');
    await row.locator('.task-title-button').click();
    const panel=page.locator('#task-editor-dialog-root [data-task-editor-dialog=point]');
    assert.equal(await panel.locator('[data-task-name]').count(),1,'the selected detail has a single editable title');
    assert.equal(await panel.locator('h3').count(),0,'the detail does not repeat the Task title');
    assert.equal(await panel.locator('[data-task-content]').evaluate(el=>el===document.activeElement),true,'opening focuses Content');
    assert.equal(await panel.locator('[data-task-list-disclosure]').getAttribute('open'),null);
    assert.equal(await panel.locator('[data-task-schedule-disclosure]').getAttribute('open'),null);
    assert.equal(await panel.locator('[data-task-properties-disclosure]').getAttribute('open'),null);
    assert.equal(await panel.locator('.task-editor-footer-actions > button').count(),2,'Cancel and Save share one footer row');
    assert.ok((await panel.locator('[data-task-content]').boundingBox()).height>=110,'Content is larger than the compact baseline');
    await panel.locator('[data-task-name]').fill('Discarded title');
    await panel.locator('[data-task-content]').fill('Discarded content');
    await panel.locator('[data-task-editor-close]').click();
    assert.equal(await page.evaluate(()=>window.__calls.some(x=>x.command==='update_task_with_properties')),false,'Cancel does not submit');
    assert.equal(await page.evaluate(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point').name),'Synthetic point');
    await row.locator('.task-title-button').click();
    assert.equal(await panel.locator('[data-task-name]').inputValue(),'Synthetic point','reopening discards the canceled title');
    assert.equal(await panel.locator('[data-task-content]').inputValue(),'Full synthetic context, only visible in selected detail');
  }finally{await f.close();}
});

test('priority and tags save only on Save, read back, and keep Save visible with long tag values',async()=>{
  const tags=[{id:'tag-old',name:'Old tag'},{id:'tag-work',name:'Work'}].concat(
    Array.from({length:12},(_,i)=>({id:`long-${i}`,name:`Long label ${i} ${'context '.repeat(8)}`})),
  );
  const f=await pageFixture({tags});const {page}=f;
  try {
    await page.locator('#tasks-list [data-task-editor-row=point] .task-title-button').click();
    const panel=page.locator('[data-task-editor-dialog=point]');
    await panel.locator('[data-task-properties-disclosure] > summary').click();
    await panel.locator('[data-task-priority]').selectOption('high');
    await panel.locator('input[data-task-tag-choice][value=tag-old]').uncheck();
    await panel.locator('input[data-task-tag-choice][value=tag-work]').check();
    const saveBox=await panel.locator('button[type=submit]').boundingBox();
    assert.ok(saveBox.y+saveBox.height<=758,'the sticky Save action remains within the normal viewport');
    assert.equal(await page.evaluate(()=>window.__calls.some(x=>x.command==='update_task_with_properties')),false,'property edits remain drafts until Save');
    await panel.locator('button[type=submit]').click();
    await page.waitForFunction(()=>{
      const saved=window.__fixture.tasks.tasks.find(x=>x.id==='point');
      return saved.priority==='high'&&saved.tagIds.length===1&&saved.tagIds[0]==='tag-work';
    });
    const request=await page.evaluate(()=>window.__calls.find(x=>x.command==='update_task_with_properties').args.input);
    assert.equal(request.priority,'high');assert.deepEqual(request.tagIds,['tag-work']);
    assert.equal(await panel.locator('[data-task-priority]').inputValue(),'high','the rendered panel reads back the saved value');
    assert.equal(await panel.locator('input[data-task-tag-choice][value=tag-work]').isChecked(),true);
  }finally{await f.close();}
});

test('tag create, duplicate reuse, rename, selection and delete preserve Task identity',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    await page.locator('#tasks-list [data-task-editor-row=point] .task-title-button').click();
    let panel=page.locator('[data-task-editor-dialog=point]');
    await panel.locator('[data-task-properties-disclosure] > summary').click();
    const name=panel.locator('[data-task-tag-new]');
    await name.fill('Personal');await panel.locator('[data-task-tag-create]').click();
    await page.waitForFunction(()=>window.__fixture.tasks.tags.some(x=>x.name==='Personal'));
    const tagId=await page.evaluate(()=>window.__fixture.tasks.tags.find(x=>x.name==='Personal').id);
    panel=page.locator('[data-task-editor-dialog=point]');
    await panel.locator('[data-task-properties-disclosure] > summary').click();
    await panel.locator('[data-task-tag-new]').fill('personal');await panel.locator('[data-task-tag-create]').click();
    await page.waitForFunction(()=>document.querySelector('[data-task-tag-new]')?.value==='');
    assert.equal(await page.evaluate(()=>window.__fixture.tasks.tags.filter(x=>x.name.toLowerCase()==='personal').length),1,'same-name creation reuses the stable tag');
    panel=page.locator('[data-task-editor-dialog=point]');
    await panel.locator('[data-task-properties-disclosure] > summary').click();
    await panel.locator(`input[data-task-tag-choice][value="${tagId}"]`).check();
    await panel.locator('button[type=submit]').click();
    await page.waitForFunction(id=>window.__fixture.tasks.tasks.find(x=>x.id==='point').tagIds.includes(id),tagId);
    panel=page.locator('[data-task-editor-dialog=point]');
    await panel.locator('[data-task-properties-disclosure] > summary').click();
    await panel.locator(`[data-task-tag-rename-begin="${tagId}"]`).click();
    await panel.locator(`[data-task-tag-rename="${tagId}"]`).fill('Personal focus');
    await panel.locator(`[data-task-tag-rename-save="${tagId}"]`).click();
    await page.waitForFunction(id=>window.__fixture.tasks.tags.some(x=>x.id===id&&x.name==='Personal focus'),tagId);
    assert.deepEqual(await page.evaluate(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point').tagIds),[tagId],'rename preserves the association');
    page.once('dialog',dialog=>dialog.accept());
    panel=page.locator('[data-task-editor-dialog=point]');
    await panel.locator('[data-task-properties-disclosure] > summary').click();
    await panel.locator(`[data-task-tag-delete="${tagId}"]`).click();
    await page.waitForFunction(id=>!window.__fixture.tasks.tags.some(x=>x.id===id),tagId);
    assert.deepEqual(await page.evaluate(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point').tagIds),[],'deleting a tag removes only its association');
    assert.equal(await page.evaluate(()=>window.__fixture.tasks.tasks.some(x=>x.id==='point')),true,'the Task remains');
  }finally{await f.close();}
});

test('priority sorting and a tag filter compose across lists without replacing Task scope',async()=>{
  const tags=[{id:'shared',name:'Shared'}];
  const extraTasks=[
    {...task('high-home','High home',null),listId:'home',priority:'high',tagIds:['shared']},
    {...task('high-inbox','High inbox',null),priority:'high',tagIds:['shared']},
    {...task('medium','Medium',null),priority:'medium',tagIds:['shared']},
    {...task('low','Low',null),priority:'low',tagIds:['shared']},
    {...task('none','None',null),priority:null,tagIds:[]},
  ];
  const f=await pageFixture({tags,extraTasks});const {page}=f;
  try {
    await page.locator('#task-priority-sort').selectOption('priority');
    let ids=await page.locator('#tasks-list > [data-task-editor-row]').evaluateAll(rows=>rows.map(row=>row.dataset.taskEditorRow));
    assert.deepEqual(ids,['high-home','high-inbox','medium','low','point','none'],'sort is high-to-none and stable within each priority');
    await page.locator('#task-priority-filter').selectOption('high');
    await page.locator('#task-tag-filter').selectOption('shared');
    ids=await page.locator('#tasks-list > [data-task-editor-row]').evaluateAll(rows=>rows.map(row=>row.dataset.taskEditorRow));
    assert.deepEqual(ids,['high-home','high-inbox'],'priority and tag filters compose across list membership');
    assert.equal(await page.locator('#tasks-list-scopes [aria-selected=true]').getAttribute('data-task-scope'),'all','property filters do not change the list scope');
    await page.locator('#task-priority-filter').selectOption('none');
    assert.equal(await page.locator('#tasks-list > [data-task-editor-row]').count(),0,'the no-priority filter is a single tier');
    assert.equal(await page.locator('#tasks-list-scopes [aria-selected=true]').getAttribute('data-task-scope'),'all');
  }finally{await f.close();}
});

test('right-click opens More actions and canceling timed schedule preserves the Task date',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    const row=page.locator('#tasks-list [data-task-editor-row=point]');
    await row.click({button:'right'});
    let panel=page.locator('[data-task-editor-dialog=point]');
    const more=panel.locator('[data-task-more]');
    assert.equal(await more.getAttribute('open'),'');
    for(const [selector,label] of [
      ['button[data-task-open-schedule]','schedule'],['button[data-task-open-list]','move list'],
      ['button[data-task-state-action=completed]','complete'],['button[data-task-state-action=abandoned]','abandon'],
      ['button[data-task-delete]','delete'],['button[data-collaboration-task-id]','discuss'],
    ]) assert.equal(await more.locator(selector).count(),1,`More contains ${label}`);
    await more.locator('summary').click();
    await more.locator('summary').click();
    assert.equal(await more.locator('button[data-task-open-schedule]').count(),1,'right-click and More reveal the same action list');
    await page.locator('#task-filter').selectOption('completed');
    await page.locator('#tasks-list [data-task-editor-row=interval] .task-title-button').click();
    panel=page.locator('[data-task-editor-dialog=interval]');
    await panel.locator('[data-task-more] > summary').click();
    await panel.locator('[data-task-more] button[data-task-open-schedule]').click();
    const schedule=panel.locator('[data-task-schedule-disclosure]');
    assert.equal(await schedule.getAttribute('open'),'');
    await panel.locator('[data-task-clear-timed-schedule]').click();
    assert.equal(await panel.locator('[data-task-date]').inputValue(),'2026-10-10');
    assert.equal(await panel.locator('[data-task-time]').inputValue(),'');
    assert.equal(await panel.locator('[data-task-end-date]').inputValue(),'');
    assert.equal(await panel.locator('[data-task-end-time]').inputValue(),'');
    await panel.locator('button[type=submit]').click();
    await page.waitForFunction(()=>{
      const saved=window.__fixture.tasks.tasks.find(x=>x.id==='interval');
      return saved.date==='2026-10-10'&&saved.time===null&&saved.executionEnd===null;
    });
    assert.equal(await page.locator('#tasks-list [data-task-editor-row=interval] .task-row-schedule').textContent(),'Sat, Oct 10');
  }finally{await f.close();}
});

test('Task quick add stays one line and sets date, destination list and properties before saving',async()=>{
  const f=await pageFixture({tags:[{id:'shared',name:'Shared'}]});const {page}=f;
  try {
    const quick=page.locator('#task-quick-form');
    const quickBox=await quick.boundingBox();
    assert.ok(quickBox.height<=40,'the persistent quick-add row remains one line');
    await page.locator('#task-quick-name').fill('Prepared task');
    await page.locator('#task-quick-schedule').click();
    await page.locator('#task-quick-date').fill('2026-10-11');
    await page.locator('#task-quick-time').fill('11:30');
    await page.locator('#task-quick-schedule-apply').click();
    await quick.locator('.task-quick-properties > summary').click();
    await page.locator('#task-quick-list').selectOption('home');
    await page.locator('#task-quick-priority').selectOption('medium');
    await page.locator('#task-quick-tag-choices input[data-task-tag-choice][value=shared]').check();
    await page.locator('#task-quick-submit').click();
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.some(x=>x.name==='Prepared task'),undefined,{timeout:3000}).catch(async(error)=>{
      const debug=await page.evaluate(()=>({calls:window.__calls,status:document.querySelector('#tasks-status')?.textContent,quick:document.querySelector('#task-quick-name')?.value,fields:[...document.querySelectorAll('#task-quick-form input,#task-quick-form select')].map(x=>[x.id,x.value,x.disabled])}));
      throw new Error(`${error} ${JSON.stringify(debug)}`);
    });
    const saved=await page.evaluate(()=>window.__fixture.tasks.tasks.find(x=>x.name==='Prepared task'));
    assert.deepEqual({date:saved.date,time:saved.time,listId:saved.listId,priority:saved.priority,tagIds:saved.tagIds},
      {date:'2026-10-11',time:'11:30',listId:'home',priority:'medium',tagIds:['shared']});
    assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='create_task_with_properties').length),1);
  }finally{await f.close();}
});
