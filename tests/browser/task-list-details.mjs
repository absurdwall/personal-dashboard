import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

// Existing browser tooling only: provide its module path; this does not install a dependency.
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE_PATH ? pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href : 'playwright');
const root = resolve(import.meta.dirname, '../..');
const task = (id,name,time,executionEnd=null,state='pending',priority='none',tagIds=[]) => ({id,name,content:null,date:'2026-10-10',time,executionEnd,listId:'inbox',parentTaskId:null,priority,tagIds,
  source:{kind:'manual',reference:null},state,deletedAt:null,completion:state==='completed'?{completedOn:'2026-10-10',completedTime:'08:00',recordedAt:'2026-10-10T08:00-04:00',source:'checkbox'}:null,
  overdue:false,timePassed:false,createdAt:'2026-10-10T08:00-04:00',modifiedAt:'2026-10-10T08:00-04:00',changes:[]});
const tasks = {state:'ready',errorKind:null,message:'Synthetic Tasks',schemaVersion:3,revision:'r1',targetBinding:'synthetic-task-binding',vaultName:'Synthetic',vaultPath:'/synthetic',currentDate:'2026-10-10',
  lists:[{id:'inbox',name:'Inbox',isSystem:true,archived:false,folderId:null}],folders:[],tags:[{id:'work',name:'Work'},{id:'home',name:'Home'}],tasks:[task('point','Synthetic point','09:00',null,'pending','none',[]),task('interval','Synthetic interval','13:00',{date:'2026-10-10',time:'14:30'},'completed','medium',['work'])]};
const view = {state:'missing',date:'2026-10-10',isToday:true,currentTime:'09:00',canRecord:true,defaultPhase:'daytime',dailyRecordAvailability:'missing',vaultName:'Synthetic',vaultPath:'/synthetic',vaultAvailability:'available',message:'Synthetic browser IPC fixture',revision:null,targetBinding:'synthetic-record-binding',
  baseline:{availability:'missing',message:'No record',timeline:[],evidence:[]},timeline:[],evidence:[],daytime:{updates:[],shortRecords:[]},
  evening:{account:[],comparison:[],summary:[],questions:[],additions:[],corrections:[],other:[],recordSupplements:[],hasLaterRecordRevision:false},tasks,
  dayTasks:{state:'empty',message:'',planError:null,revision:null,targetBinding:null,tasks:[]},habitCorrections:{state:'missing',message:'',date:'2026-10-10',canRecord:false,completionRevision:null,completionTargetBinding:null,namesConfigurationState:'missing',habits:[]},
  timeAxis:{currentArrangement:[],confirmedFacts:[],unlocatedCurrentArrangement:[],unlocatedConfirmedFacts:[]}};

async function pageFixture({width=1280,extraTasks=[],tags}={}) {
  const server=createServer(async(req,res)=>{try {const url=new URL(req.url,'http://localhost');const file=resolve(root,'dist',url.pathname==='/'?'index.html':url.pathname.slice(1));
    if(!file.startsWith(resolve(root,'dist')+'/'))throw Error('invalid path');
    res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await readFile(file));}catch {res.statusCode=404;res.end('not found');}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width,height:758}});
  const errors=[];page.on('pageerror',error=>errors.push(String(error)));
  const fixtureView=structuredClone(view);if(tags)fixtureView.tasks.tags=structuredClone(tags);fixtureView.tasks.tasks[0].changes=[{id:'synthetic-rename',kind:'renamed',changedAt:'2026-10-10T08:30-04:00',source:'user'}];fixtureView.tasks.tasks.push(...extraTasks);fixtureView.tasks.tasks[0].content='Full synthetic context, only visible in selected detail';fixtureView.tasks.lists.push({id:'home',name:'Home',isSystem:false,archived:false,folderId:null});
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
      if(command==='today_clock')return {date:v.date,time:v.currentTime,livedDate:v.date};
      if(command==='create_task'){
        const input=args.input;if(input.expectedRevision!==t.revision)throw Error('Synthetic revision conflict');
        if(!t.tasks.some(x=>x.id===input.taskId))t.tasks.push({id:input.taskId,...input,parentTaskId:null,source:{kind:'manual',reference:null},state:'pending',deletedAt:null,completion:null,overdue:false,timePassed:false,createdAt:'2026-10-10T09:00-04:00',modifiedAt:'2026-10-10T09:00-04:00',changes:[]});
        t.revision='r'+(Number(t.revision.slice(1))+1);return structuredClone(t);
      }
      if(command==='create_task_subtask'){
        const {task:input,parentTaskId}=args.input;if(input.expectedRevision!==t.revision)throw Error('Synthetic revision conflict');
        if(!t.tasks.some(x=>x.id===input.taskId))t.tasks.push({id:input.taskId,...input,parentTaskId,source:{kind:'manual',reference:null},state:'pending',deletedAt:null,completion:null,overdue:false,timePassed:false,createdAt:'2026-10-10T09:00-04:00',modifiedAt:'2026-10-10T09:00-04:00',changes:[]});
        t.revision='r'+(Number(t.revision.slice(1))+1);return structuredClone(t);
      }
      if(command==='set_task_parent'){
        const input=args.input;if(input.expectedRevision!==t.revision)throw Error('Synthetic revision conflict');
        const item=t.tasks.find(x=>x.id===input.taskId);item.parentTaskId=input.parentTaskId;item.changes.push({id:input.changeId,kind:'parent-changed',changedAt:'2026-10-10T09:00-04:00',source:'user'});
        t.revision='r'+(Number(t.revision.slice(1))+1);return structuredClone(t);
      }
      if(command==='create_task_folder'){
        const input=args.input;if(input.expectedRevision!==t.revision)throw Error('Synthetic revision conflict');
        if(!t.folders.some(x=>x.id===input.folderId))t.folders.push({id:input.folderId,name:input.name});
        t.revision='r'+(Number(t.revision.slice(1))+1);return structuredClone(t);
      }
      if(command==='rename_task_folder'){
        const input=args.input;if(input.expectedRevision!==t.revision)throw Error('Synthetic revision conflict');
        t.folders.find(x=>x.id===input.folderId).name=input.name;t.revision='r'+(Number(t.revision.slice(1))+1);return structuredClone(t);
      }
      if(command==='delete_task_folder'){
        const input=args.input;if(input.expectedRevision!==t.revision)throw Error('Synthetic revision conflict');
        t.folders=t.folders.filter(x=>x.id!==input.folderId);for(const list of t.lists)if(list.folderId===input.folderId)list.folderId=null;
        t.revision='r'+(Number(t.revision.slice(1))+1);return structuredClone(t);
      }
      if(command==='create_task_list_in_folder'){
        const input=args.input;if(input.expectedRevision!==t.revision)throw Error('Synthetic revision conflict');
        if(!t.lists.some(x=>x.id===input.listId))t.lists.push({id:input.listId,name:input.name,isSystem:false,archived:false,folderId:input.folderId});
        t.revision='r'+(Number(t.revision.slice(1))+1);return structuredClone(t);
      }
      if(command==='set_task_list_folder'){
        const input=args.input;if(input.expectedRevision!==t.revision)throw Error('Synthetic revision conflict');
        t.lists.find(x=>x.id===input.listId).folderId=input.folderId;t.revision='r'+(Number(t.revision.slice(1))+1);return structuredClone(t);
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
      if(command==='update_task_with_properties'){
        const input=args.input;if(input.expectedRevision!==t.revision)throw Error('Synthetic revision conflict');
        if(window.__holdUpdate)await new Promise(resolve=>{window.__releaseUpdate=resolve;});
        const item=t.tasks.find(x=>x.id===input.taskId);for(const key of ['name','content','date','time','executionEnd','listId','priority','tagIds'])if(key in input)item[key]=input[key];
        t.revision='r'+(Number(t.revision.slice(1))+1);return structuredClone(t);
      }
      if(command==='create_task_tag'){
        const input=args.input;if(input.expectedRevision!==t.revision)throw Error('Synthetic revision conflict');
        if(!t.tags.some(x=>x.id===input.tagId))t.tags.push({id:input.tagId,name:input.name});
        t.revision='r'+(Number(t.revision.slice(1))+1);return structuredClone(t);
      }
      if(command==='rename_task_tag'){
        const input=args.input;if(input.expectedRevision!==t.revision)throw Error('Synthetic revision conflict');
        t.tags.find(x=>x.id===input.tagId).name=input.name;t.revision='r'+(Number(t.revision.slice(1))+1);return structuredClone(t);
      }
      if(command==='delete_task_tag'){
        const input=args.input;if(input.expectedRevision!==t.revision)throw Error('Synthetic revision conflict');
        t.tags=t.tags.filter(x=>x.id!==input.tagId);for(const item of t.tasks)item.tagIds=item.tagIds.filter(id=>id!==input.tagId);
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

async function openMore(panel){
  const more=panel.locator('details[data-task-more]');
  if(!(await more.evaluate(el=>el.open)))await more.locator(':scope > summary').click();
}

// Production document, real click/keyboard input. Only Tauri IPC is replaced.
test('Tasks compact rows select one full detail while completion stays independent',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    const row=page.locator('#tasks-list [data-task-editor-row=point]');
    assert.equal(await row.locator('.task-row-content').count(),0,'full content belongs in detail');
    assert.equal(await row.locator('[data-task-delete]').count(),0,'secondary operations belong in detail');
    const check=row.locator('input[type=checkbox]');
    const hitArea=await check.evaluate(input=>({width:input.getBoundingClientRect().width,inset:getComputedStyle(input.parentElement,'::before').left}));
    assert.ok(hitArea.width>=15&&Number.parseFloat(hitArea.inset)<=-4,'completion keeps the existing expanded hit area');
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

test('opening an existing Task puts the insertion point in Content',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    const row=page.locator('#tasks-list [data-task-editor-row=point]');
    await row.locator('.task-title-button').click();
    const panel=page.locator('[data-task-editor-dialog=point]');
    const content=panel.locator('[data-task-content]');
    assert.equal(await content.evaluate(el=>el===document.activeElement),true,'existing Task opens ready for Content');
  } finally { await f.close(); }
});

test('the selected Task name is directly editable once at the top of the detail',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    await page.locator('#tasks-list [data-task-editor-row=point] .task-title-button').click();
    const panel=page.locator('[data-task-editor-dialog=point]');
    const title=panel.locator('.task-editor-title[data-task-name]');
    assert.equal(await title.count(),1);
    assert.equal(await title.inputValue(),'Synthetic point');
    assert.equal(await panel.locator('h3').count(),0,'the task name is not repeated as a static heading');
    assert.ok((await title.evaluate(el=>Number.parseFloat(getComputedStyle(el).fontSize)))>=16,'editable title keeps heading emphasis');
    assert.ok((await title.evaluate(el=>Number.parseInt(getComputedStyle(el).fontWeight,10)))>=600,'editable title remains bold');
  } finally { await f.close(); }
});

test('parent selection, direct children, and detach save the existing Task identity',async()=>{
  const parent=task('parent-task','Plan the release',null);
  parent.date='2026-10-15';
  const f=await pageFixture({extraTasks:[parent]});const {page}=f;
  try {
    await page.locator('#tasks-list [data-task-editor-row=point] .task-title-button').click();
    let panel=page.locator('[data-task-editor-dialog=point]');
    const parents=panel.locator('details[data-task-parent-details]');
    await parents.locator(':scope > summary').click();
    await parents.locator('[data-task-parent-select]').selectOption('parent-task');
    await parents.locator('[data-task-parent-save]').click();
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point').parentTaskId==='parent-task',null,{timeout:900});
    assert.equal(await page.evaluate(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point').id),'point');

    await page.locator('#tasks-list [data-task-editor-row=parent-task] .task-title-button').click();
    panel=page.locator('[data-task-editor-dialog=parent-task]');
    assert.equal(await panel.locator('[data-task-focus-child=point]').count(),1,'the parent lists its direct child');
    await panel.locator('details[data-task-parent-details] > summary').click();
    await panel.locator('[data-task-focus-child=point]').click();
    panel=page.locator('[data-task-editor-dialog=point]');
    await panel.locator('details[data-task-parent-details] > summary').click();
    await panel.locator('[data-task-parent-select]').selectOption('');
    await panel.locator('[data-task-parent-save]').click();
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point').parentTaskId===null,null,{timeout:900});
    assert.equal(await page.evaluate(()=>window.__fixture.tasks.tasks.length),3,'associating and detaching do not copy or delete Tasks');
  } finally { await f.close(); }
});

test('adding a subtask creates a separately scheduled Task under the selected parent',async()=>{
  const parent=task('parent-task','Plan the release',null);
  parent.date='2026-10-15';parent.time='16:30';parent.listId='home';
  const f=await pageFixture({extraTasks:[parent]});const {page}=f;
  try {
    await page.locator('#tasks-list [data-task-editor-row=parent-task] .task-title-button').click();
    const panel=page.locator('[data-task-editor-dialog=parent-task]');
    await panel.locator('details[data-task-parent-details] > summary').click();
    await panel.locator('[data-task-add-subtask]').click();
    assert.equal(await page.locator('#task-quick-parent-context').isVisible(),true);
    assert.equal(await page.locator('#task-quick-list').inputValue(),'home','the child may start in the parent list but keeps an explicit list selector');
    await page.locator('#task-quick-name').fill('Check one source');
    await page.locator('#task-quick-submit').click();
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.some(x=>x.name==='Check one source'&&x.parentTaskId==='parent-task'));
    const child=await page.evaluate(()=>window.__fixture.tasks.tasks.find(x=>x.name==='Check one source'));
    assert.notEqual(child.id,'parent-task');
    assert.equal(child.listId,'home');
    assert.equal(child.date,'2026-10-10','the child uses the current date context rather than the parent date');
    assert.equal(child.time,null);
    assert.equal(await page.locator('[data-task-editor-dialog=parent-task] [data-task-focus-child]').count(),1);
  } finally { await f.close(); }
});

test('ending an unconfirmed subtask attempt clears its parent before the next quick-add',async()=>{
  const parent=task('parent-task','Plan the release',null);
  const f=await pageFixture({extraTasks:[parent]});const {page}=f;
  try {
    await page.locator('#tasks-list [data-task-editor-row=parent-task] .task-title-button').click();
    const panel=page.locator('[data-task-editor-dialog=parent-task]');
    await panel.locator('details[data-task-parent-details] > summary').click();
    await panel.locator('[data-task-add-subtask]').click();
    await page.locator('#task-quick-name').fill('Unconfirmed child');
    await page.evaluate(()=>window.__failNext='create_task_subtask');
    await page.locator('#task-quick-submit').click();
    await page.waitForFunction(()=>document.querySelector('#task-quick-recovery')?.hidden===false);
    await page.locator('#task-quick-recheck').click();
    await page.waitForFunction(()=>document.querySelector('#task-quick-end-attempt')?.disabled===false);
    await page.locator('#task-quick-end-attempt').click();
    assert.equal(await page.locator('#task-quick-parent-context').isVisible(),false,'ending the uncertain child submission leaves normal quick-add mode');

    await page.locator('#task-quick-name').fill('Independent task');
    await page.locator('#task-quick-submit').click();
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.some(x=>x.name==='Independent task'));
    const saved=await page.evaluate(()=>window.__fixture.tasks.tasks.find(x=>x.name==='Independent task'));
    assert.equal(saved.parentTaskId,null,'the next quick-add is not accidentally attached to the prior parent');
  } finally { await f.close(); }
});

test('empty folders require a list, aggregate without copying Tasks, and keep quick-add destination explicit',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    await page.locator('#task-new-list').click();
    await page.locator('#task-folder-create-name').fill('Projects');
    await page.locator('#task-folder-create-form').evaluate(form=>form.requestSubmit());
    await page.waitForFunction(()=>window.__fixture.tasks.folders.some(x=>x.name==='Projects'));
    const folderId=await page.evaluate(()=>window.__fixture.tasks.folders.find(x=>x.name==='Projects').id);
    await page.locator('#tasks-list-management-close').click();

    const scope=page.locator(`[data-task-scope="folder:${folderId}"]`);
    const toggle=page.locator(`[data-task-folder-toggle="${folderId}"]`);
    await toggle.click();
    assert.equal(await scope.getAttribute('aria-selected'),'false','the arrow only expands the folder');
    await scope.click();
    assert.match(await page.locator('#tasks-empty').innerText(),/no lists yet/i);
    assert.equal(await page.locator('#task-quick-form').isVisible(),false,'there is no implicit Inbox fallback');
    await page.locator('[data-task-create-list-for-folder]').click();
    assert.equal(await page.locator('#task-list-create-folder').inputValue(),folderId);
    await page.locator('#task-list-create-name').fill('Launch');
    await page.locator('#task-list-create-form').evaluate(form=>form.requestSubmit());
    await page.waitForFunction(id=>window.__fixture.tasks.lists.some(x=>x.folderId===id&&x.name==='Launch'),folderId);
    const listId=await page.evaluate(id=>window.__fixture.tasks.lists.find(x=>x.folderId===id).id,folderId);
    assert.equal(await page.locator('#task-quick-form').isVisible(),true);
    assert.equal(await page.locator('#task-quick-list').inputValue(),listId,'folder quick-add has a concrete target list');

    await page.locator('#task-quick-name').fill('Prepare launch notes');
    await page.locator('#task-quick-submit').click();
    await page.waitForFunction(id=>window.__fixture.tasks.tasks.some(x=>x.name==='Prepare launch notes'&&x.listId===id),listId);
    const saved=await page.evaluate(id=>window.__fixture.tasks.tasks.find(x=>x.name==='Prepare launch notes'&&x.listId===id),listId);
    assert.equal(saved.id.length>0,true);
    assert.equal(await page.locator('.task-folder-aggregate > h4').innerText(),'Launch');
    assert.equal(await page.locator(`#tasks-list [data-task-editor-row="${saved.id}"]`).count(),1);

    await toggle.click();
    assert.equal(await scope.getAttribute('aria-selected'),'true','collapsing navigation does not leave the folder summary');
    assert.equal(await page.locator(`[data-task-scope="list:${listId}"]`).count(),0);

    assert.equal(await page.locator('#tasks-list-management-panel').isVisible(),true,'the list manager remains available after creating a folder list');
    await page.locator(`[data-task-folder-delete="${folderId}"]`).click();
    await page.waitForFunction(id=>!window.__fixture.tasks.folders.some(x=>x.id===id),folderId);
    const ungrouped=await page.evaluate(id=>({
      list:window.__fixture.tasks.lists.find(x=>x.id===id),
      task:window.__fixture.tasks.tasks.find(x=>x.name==='Prepare launch notes'),
    }),listId);
    assert.equal(ungrouped.list.folderId,null,'deleting a folder ungroups its list');
    assert.equal(ungrouped.task.id,saved.id,'the existing Task identity survives folder deletion');
    assert.equal(await page.locator(`#tasks-list [data-task-editor-row="${saved.id}"]`).count(),1,'the task remains visible once');
  } finally { await f.close(); }
});

test('Content opens as a generously sized writing area in the Tasks detail',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    await page.locator('#tasks-list [data-task-editor-row=point] .task-title-button').click();
    const content=page.locator('[data-task-editor-dialog=point] [data-task-content]');
    assert.ok((await content.boundingBox()).height>=100,'Content is larger than the compact two-line baseline');
  } finally { await f.close(); }
});

test('list and schedule edits begin as compact summaries of their saved values',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    await page.locator('#tasks-list [data-task-editor-row=point] .task-title-button').click();
    const panel=page.locator('[data-task-editor-dialog=point]');
    const list=panel.locator('details[data-task-list-details]');
    const schedule=panel.locator('details[data-task-schedule-details]');
    assert.equal(await list.count(),1);
    assert.equal(await schedule.count(),1);
    assert.equal(await list.evaluate(el=>el.open),false);
    assert.equal(await schedule.evaluate(el=>el.open),false);
    assert.match(await list.locator('summary').innerText(),/Inbox/);
    assert.match(await schedule.locator('summary').innerText(),/Oct 10.*09:00/);
  } finally { await f.close(); }
});

test('priority and multiple tags save through the Task identity and read back',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    await page.locator('#tasks-list [data-task-editor-row=point] .task-title-button').click();
    const panel=page.locator('[data-task-editor-dialog=point]');
    await panel.locator('details[data-task-priority-details] > summary').click();
    const priority=panel.locator('select[data-task-priority]');
    const tags=panel.locator('details[data-task-tags-details]');
    assert.equal(await priority.inputValue(),'none','old Tasks default to no priority');
    await priority.selectOption('high');
    await tags.locator(':scope > summary').click();
    await tags.locator('input[data-task-tag-id=work]').check();
    await tags.locator('input[data-task-tag-id=home]').check();
    await panel.locator('button[type=submit]').click();
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point').priority==='high');
    const saved=await page.evaluate(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point'));
    assert.equal(saved.id,'point');
    assert.equal(saved.priority,'high');
    assert.deepEqual(saved.tagIds,['home','work']);
    const call=await page.evaluate(()=>window.__calls.find(x=>x.command==='update_task_with_properties'));
    assert.equal(call.args.input.taskId,'point');
    assert.equal(call.args.input.priority,'high');
    assert.deepEqual(call.args.input.tagIds,['home','work']);
  }finally{await f.close();}
});

test('tag creation, duplicate reuse, rename, selection removal and deletion keep stable identity',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    await page.locator('#tasks-list [data-task-editor-row=point] .task-title-button').click();
    let panel=page.locator('[data-task-editor-dialog=point]');
    await panel.locator('details[data-task-tags-details] > summary').click();
    const newTag=panel.locator('[data-task-tag-new]');
    await newTag.fill('   ');await panel.locator('[data-task-tag-create]').click();
    assert.equal(await page.evaluate(()=>window.__calls.some(x=>x.command==='create_task_tag')),false,'blank tag names do not write');
    await newTag.fill('Personal');await panel.locator('[data-task-tag-create]').click();
    await page.waitForFunction(()=>window.__fixture.tasks.tags.some(x=>x.name==='Personal'));
    const tagId=await page.evaluate(()=>window.__fixture.tasks.tags.find(x=>x.name==='Personal').id);
    panel=page.locator('[data-task-editor-dialog=point]');
    await panel.locator('details[data-task-tags-details] > summary').click();
    await panel.locator('[data-task-tag-new]').fill('personal');await panel.locator('[data-task-tag-create]').click();
    await page.waitForFunction(()=>document.querySelector('[data-task-tag-new]')?.value==='');
    assert.equal(await page.evaluate(()=>window.__fixture.tasks.tags.filter(x=>x.name.toLowerCase()==='personal').length),1,'same-name creation reuses the stable tag');
    assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='create_task_tag').length),1,'duplicate reuse avoids a second create');
    panel=page.locator('[data-task-editor-dialog=point]');
    assert.equal(await panel.locator(`input[data-task-tag-id="${tagId}"]`).isChecked(),true,'reused tag is selected in the Task draft');
    await panel.locator('button[type=submit]').click();
    await page.waitForFunction(id=>window.__fixture.tasks.tasks.find(x=>x.id==='point').tagIds.includes(id),tagId);
    assert.equal(await page.evaluate(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point').id),'point','properties remain on the original Task');

    panel=page.locator('[data-task-editor-dialog=point]');
    await panel.locator('details[data-task-tags-details] > summary').click();
    await panel.locator(`input[data-task-tag-id="${tagId}"]`).uncheck();
    await panel.locator('button[type=submit]').click();
    await page.waitForFunction(id=>!window.__fixture.tasks.tasks.find(x=>x.id==='point').tagIds.includes(id),tagId);
    assert.equal(await page.evaluate(id=>window.__fixture.tasks.tags.some(x=>x.id===id),tagId),true,'removing a Task selection keeps the shared tag definition');

    panel=page.locator('[data-task-editor-dialog=point]');
    await panel.locator('details[data-task-tags-details] > summary').click();
    await panel.locator(`input[data-task-tag-id="${tagId}"]`).check();
    await panel.locator('button[type=submit]').click();
    await page.waitForFunction(id=>window.__fixture.tasks.tasks.find(x=>x.id==='point').tagIds.includes(id),tagId);

    panel=page.locator('[data-task-editor-dialog=point]');
    await panel.locator('details[data-task-tags-details] > summary').click();
    await panel.locator('details[data-task-tag-management] > summary').click();
    await panel.locator(`[data-task-tag-name="${tagId}"]`).fill('Personal focus');
    await panel.locator(`[data-task-tag-rename="${tagId}"]`).click();
    await page.waitForFunction(id=>window.__fixture.tasks.tags.find(x=>x.id===id)?.name==='Personal focus',tagId);
    assert.deepEqual(await page.evaluate(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point').tagIds),[tagId],'rename preserves the Task association');

    panel=page.locator('[data-task-editor-dialog=point]');
    await panel.locator('details[data-task-tags-details] > summary').click();
    await panel.locator('details[data-task-tag-management] > summary').click();
    await panel.locator(`[data-task-tag-delete="${tagId}"]`).click();
    await page.waitForFunction(id=>!window.__fixture.tasks.tags.some(x=>x.id===id),tagId);
    const remaining=await page.evaluate(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point'));
    assert.equal(remaining.id,'point','deleting a tag does not delete its Task');
    assert.deepEqual(remaining.tagIds,[],'deleting a tag only removes its association');
  }finally{await f.close();}
});

test('priority sort is stable and priority/tag filters compose without persisting view state',async()=>{
  const tags=[{id:'shared',name:'Shared'}];
  const extraTasks=[
    {...task('high-home','High home',null),listId:'home',priority:'high',tagIds:['shared']},
    {...task('high-inbox','High inbox',null),priority:'high',tagIds:['shared']},
    {...task('medium','Medium',null),priority:'medium',tagIds:['shared']},
    {...task('low','Low',null),priority:'low',tagIds:['shared']},
    {...task('none','None',null),priority:'none',tagIds:[]},
  ];
  const f=await pageFixture({tags,extraTasks});const {page}=f;
  try {
    const original=await page.locator('#tasks-list > [data-task-editor-row]').evaluateAll(rows=>rows.map(row=>row.dataset.taskEditorRow));
    assert.deepEqual(original,['point','high-home','high-inbox','medium','low','none'],'default order is retained');
    await page.locator('#task-sort-order').selectOption('priority');
    let ids=await page.locator('#tasks-list > [data-task-editor-row]').evaluateAll(rows=>rows.map(row=>row.dataset.taskEditorRow));
    assert.deepEqual(ids,['high-home','high-inbox','medium','low','point','none'],'priority ties retain their prior order');
    await page.locator('#task-priority-filter').selectOption('high');
    await page.locator('#task-tag-filter').selectOption('shared');
    ids=await page.locator('#tasks-list > [data-task-editor-row]').evaluateAll(rows=>rows.map(row=>row.dataset.taskEditorRow));
    assert.deepEqual(ids,['high-home','high-inbox'],'priority and tag filters combine across list membership');
    assert.equal(await page.locator('#tasks-list-scopes [aria-selected=true]').getAttribute('data-task-scope'),'all','property filters preserve list scope');
    await page.locator('#task-priority-filter').selectOption('all');
    ids=await page.locator('#tasks-list > [data-task-editor-row]').evaluateAll(rows=>rows.map(row=>row.dataset.taskEditorRow));
    assert.deepEqual(ids,['high-home','high-inbox','medium','low'],'single-tag filter includes matching tasks from multiple lists');
    assert.equal(await page.evaluate(()=>window.__calls.some(x=>['update_task_with_properties','create_task_tag','rename_task_tag','delete_task_tag','set_task_state'].includes(x.command))),false,'sorting and filtering never write Tasks');
  }finally{await f.close();}
});

test('row context menu opens the same compact More actions and property shortcuts',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    const row=page.locator('#tasks-list [data-task-editor-row=point]');
    await row.locator('.task-title-button').click();
    const panel=page.locator('[data-task-editor-dialog=point]');
    await openMore(panel);
    const menuActions=await panel.locator('[data-task-more] [data-task-state-action], [data-task-more] [data-task-delete], [data-task-more] [data-collaboration-task-id]').evaluateAll(nodes=>nodes.map(node=>node.dataset.taskStateAction??(node.hasAttribute('data-task-delete')?'delete':'discuss')).sort());
    assert.deepEqual(menuActions,['abandoned','completed','delete','discuss'],'More contains the available state, delete and Codex actions');
    await panel.locator('details[data-task-more] > summary').click();
    await row.click({button:'right'});
    const reopened=page.locator('[data-task-editor-dialog=point]');
    await page.waitForFunction(()=>document.querySelector('[data-task-editor-dialog="point"] [data-task-more]')?.open===true);
    const rightClickActions=await reopened.locator('[data-task-more] [data-task-state-action], [data-task-more] [data-task-delete], [data-task-more] [data-collaboration-task-id]').evaluateAll(nodes=>nodes.map(node=>node.dataset.taskStateAction??(node.hasAttribute('data-task-delete')?'delete':'discuss')).sort());
    assert.deepEqual(rightClickActions,menuActions,'right-click exposes the same action set');
    await reopened.locator('[data-task-open-property=schedule]').click();
    assert.equal(await reopened.locator('details[data-task-schedule-details]').evaluate(el=>el.open),true,'schedule shortcut opens the existing schedule disclosure');
    await reopened.locator('[data-task-open-property=list]').click();
    assert.equal(await reopened.locator('details[data-task-list-details]').evaluate(el=>el.open),true,'move-list shortcut opens the existing list disclosure');
    await reopened.locator('[data-task-open-property=parent]').click();
    assert.equal(await reopened.locator('details[data-task-parent-details]').evaluate(el=>el.open),true,'parent shortcut opens the same parent/subtask editor');
  }finally{await f.close();}
});

test('quick add stays one row and saves its selected list and schedule',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    const form=page.locator('#task-quick-form');
    assert.equal(await form.isVisible(),true);
    assert.equal(await page.locator('#task-quick-list').inputValue(),'inbox','All defaults to Inbox');
    assert.equal(await page.locator('#task-quick-date').inputValue(),'2026-10-10','quick-add keeps the existing current-date context');
    const shape=await form.evaluate(node=>({display:getComputedStyle(node).display,children:[...node.children].map(child=>child.getBoundingClientRect().top)}));
    assert.equal(shape.display,'flex');
    assert.equal(shape.children.length,4,'name, list, schedule and submit remain in one compact form');
    assert.ok(Math.max(...shape.children)-Math.min(...shape.children)<2,'quick-add controls share one row');
    await page.locator('#tasks-list-scopes [data-task-scope="list:home"]').click();
    assert.equal(await page.locator('#task-quick-list').inputValue(),'home','a list view defaults to its own Task list');
    await page.locator('#task-quick-schedule').click();
    await page.locator('#task-quick-date').fill('2026-10-12');
    await page.locator('#task-quick-time').fill('10:30');
    await page.locator('#task-quick-schedule-apply').click();
    await page.locator('#task-quick-name').fill('Quick scheduled Task');
    await form.locator('button[type=submit]').click();
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.some(x=>x.name==='Quick scheduled Task'));
    const saved=await page.evaluate(()=>window.__fixture.tasks.tasks.find(x=>x.name==='Quick scheduled Task'));
    assert.equal(saved.listId,'home');
    assert.equal(saved.date,'2026-10-12');
    assert.equal(saved.time,'10:30');
  }finally{await f.close();}
});

test('the schedule disclosure keeps start and end together and explains overnight end dates',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    await page.locator('#tasks-list [data-task-editor-row=point] .task-title-button').click();
    const schedule=page.locator('[data-task-editor-dialog=point] details[data-task-schedule-details]');
    await schedule.locator('summary').click();
    const date=schedule.locator('[data-task-date]');
    const time=schedule.locator('[data-task-time]');
    const endDate=schedule.locator('[data-task-end-date]');
    const endTime=schedule.locator('[data-task-end-time]');
    const clear=schedule.locator('[data-task-clear-end]');
    assert.equal(await date.isVisible(),true);
    assert.equal(await time.isVisible(),true);
    assert.equal(await endDate.isVisible(),true);
    assert.equal(await endTime.isVisible(),true);
    assert.equal(await clear.isVisible(),false,'an empty end does not show a clear action');

    await time.fill('23:30');
    await endDate.fill('2026-10-11');
    await endTime.fill('00:15');
    assert.equal(await clear.isVisible(),true,'clear appears once an end is present');
    assert.match(await schedule.locator('summary').innerText(),/Oct 10.*23:30.*Oct 11.*00:15/);
    await clear.click();
    assert.equal(await endDate.inputValue(),'');
    assert.equal(await endTime.inputValue(),'');
    assert.equal(await date.inputValue(),'2026-10-10','clearing the end keeps the start date');
    assert.equal(await time.inputValue(),'23:30','clearing the end keeps the start time');
    assert.equal(await clear.isVisible(),false);
  } finally { await f.close(); }
});

test('Save and Cancel share one action row and Cancel discards the Task draft',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    const row=page.locator('#tasks-list [data-task-editor-row=point]');
    await row.locator('.task-title-button').click();
    const panel=page.locator('[data-task-editor-dialog=point]');
    const footer=panel.locator('.task-editor-footer');
    assert.equal(await footer.locator('button[type=submit]').count(),1);
    assert.equal(await footer.locator('[data-task-editor-close]').count(),1,'Cancel sits beside Save');
    assert.equal(await panel.locator('button[data-task-editor-close]').count(),1);
    assert.match(await footer.locator('[data-task-editor-close]').getAttribute('class'),/secondary-button/);

    await panel.locator('[data-task-content]').fill('Unsaved note must be discarded');
    await footer.locator('[data-task-editor-close]').click();
    await row.locator('.task-title-button').click();
    assert.equal(await panel.locator('[data-task-content]').inputValue(),'Full synthetic context, only visible in selected detail');
    assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='update_task').length),0,'Cancel never submits');
  } finally { await f.close(); }
});

test('Cancel restores saved priority and tags before a later unrelated Task save',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    const row=page.locator('#tasks-list [data-task-editor-row=point]');
    await row.locator('.task-title-button').click();
    const panel=page.locator('[data-task-editor-dialog=point]');
    const priority=panel.locator('select[data-task-priority]');
    const tags=panel.locator('details[data-task-tags-details]');
    await panel.locator('details[data-task-priority-details] > summary').click();
    await priority.selectOption('high');
    await tags.locator(':scope > summary').click();
    await panel.locator('input[data-task-tag-id=work]').check();
    await panel.locator('[data-task-editor-close]').click();

    await row.locator('.task-title-button').click();
    assert.equal(await priority.inputValue(),'none','Cancel restores the saved priority');
    assert.equal(await panel.locator('input[data-task-tag-id=work]').isChecked(),false,'Cancel restores the saved tag selection');
    await panel.locator('[data-task-content]').fill('A later unrelated edit');
    await panel.locator('button[type=submit]').click();
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point').content==='A later unrelated edit');

    const saved=await page.evaluate(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point'));
    assert.equal(saved.priority,'none','the later content save does not submit canceled priority');
    assert.deepEqual(saved.tagIds,[],'the later content save does not submit canceled tags');
  } finally { await f.close(); }
});


test('selected detail edits one Task and preserves unmodified endpoints and identity',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    await page.locator('#task-filter').selectOption('completed');
    await page.locator('#tasks-list [data-task-editor-row=interval] .task-title-button').click();
    const panel=page.locator('[data-task-editor-dialog=interval]');
    await panel.locator('[data-task-name]').fill('Edited range');
    await panel.locator('[data-task-content]').fill('Changed content');
    await panel.locator('details[data-task-list-details] > summary').click();
    await panel.locator('[data-task-list]').selectOption('home');
    await panel.locator('button[type=submit]').click();
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.find(x=>x.id==='interval').name==='Edited range');
    const saved=await page.evaluate(()=>window.__fixture.tasks.tasks.find(x=>x.id==='interval'));
    assert.deepEqual({date:saved.date,time:saved.time,end:saved.executionEnd,state:saved.state,list:saved.listId},
      {date:'2026-10-10',time:'13:00',end:{date:'2026-10-10',time:'14:30'},state:'completed',list:'home'});
    assert.equal(await page.evaluate(()=>window.__calls.filter(x=>x.command==='update_task_with_properties').length),1,'one save submits once');
    assert.equal(await panel.locator('[data-task-name]').inputValue(),'Edited range');
    await panel.locator('details[data-task-schedule-details] > summary').click();
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
    assert.equal(await row.locator('.task-title-button').evaluate(el=>el===document.activeElement),true);
    assert.equal(await page.evaluate(()=>window.__calls.some(x=>['set_task_state','update_task'].includes(x.command))),false);
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

test('selected detail retains abandon, restore, delete and historical pagination',async()=>{
  const extraTasks=Array.from({length:35},(_,i)=>task('history-'+i,'Historical '+i,'13:00',null,'completed'));
  const f=await pageFixture({extraTasks});const {page}=f;
  try {
    await page.locator('#tasks-list [data-task-editor-row=point] .task-title-button').click();
    let panel=page.locator('[data-task-editor-dialog=point]');
    await openMore(panel);
    await panel.locator('[data-task-state-action=abandoned]').click();
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point').state==='abandoned');
    assert.equal(await page.locator('#tasks-list [data-task-editor-row=point] input[type=checkbox]').isDisabled(),true,'abandoned Task is not a completion toggle');
    await panel.locator('button[data-task-state-action=pending]').click();
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point').state==='pending');
    await openMore(panel);
    await panel.locator('[data-task-delete]').click();
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.find(x=>x.id==='point').deletedAt!==null);
    await page.locator('#task-filter').selectOption('deleted');
    await page.locator('#tasks-list [data-task-editor-row=point] .task-title-button').click();
    await openMore(panel);
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


test('Today Task details stay available after a different Tasks list scope',async()=>{
  const f=await pageFixture();const {page}=f;
  try {
    await page.locator('#tasks-list-scopes [data-task-scope="list:home"]').click();
    await page.locator('[data-workspace-destination=today]').click();
    const marker=page.locator('.today-axis-marker[data-task-id=point]');
    await marker.locator('.today-axis-marker-link').click();
    const detail=page.locator('#today-timed-details details[open]');
    await detail.first().waitFor({state:'visible',timeout:1500});
    assert.equal(await detail.count(),1);
    assert.match(await detail.innerText(),/Synthetic point/);
    assert.equal(await marker.getAttribute('data-task-id'),'point','the clicked Today marker uses the stable Task ID');
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
    await panel.locator('details[data-task-list-details] > summary').click();
    await panel.locator('details[data-task-schedule-details] > summary').click();
    await page.evaluate(()=>window.__holdUpdate=true);await panel.locator('button[type=submit]').click();
    await page.waitForFunction(()=>Boolean(window.__releaseUpdate));
    assert.equal(await panel.locator('[data-task-list]').isDisabled(),true,'list edits cannot change an in-flight payload');
    assert.equal(await panel.getByRole('button',{name:'Clear execution end'}).isDisabled(),true,'end clear cannot change an in-flight payload');
    await page.evaluate(()=>window.__releaseUpdate());
    await page.waitForFunction(()=>window.__fixture.tasks.tasks.find(x=>x.id==='interval').name==='Pending save');
  }finally{await f.close();}
});
