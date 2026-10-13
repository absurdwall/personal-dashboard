import {mkdtempSync, readFileSync, writeFileSync, cpSync, rmSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync,spawn} from 'node:child_process';
const root=resolve(new URL('../..',import.meta.url).pathname);
const viewports=process.env.TASK_DOM_VIEWPORTS?JSON.parse(process.env.TASK_DOM_VIEWPORTS):[[1280,560],[680,560]];
const fixture=mkdtempSync(join(tmpdir(),'pdex19-dom.noindex-'));
cpSync(join(root,'dist'),fixture,{recursive:true});
const check=String.raw`
try {
 const assert=(condition,message)=>{if(!condition)throw Error(message);};
 currentWorkspaceDestination='tasks';document.querySelector('.app-shell').dataset.workspaceDestination='tasks';
 document.querySelectorAll('.workspace-destination').forEach(e=>e.hidden=e.id!=='workspace-destination-tasks');
 const task={id:'locale-task',name:'Synthetic locale task',content:'Original',date:'2026-10-13',time:'18:00',executionEnd:null,parentId:null,listId:'inbox',priority:'none',tagIds:[],source:{kind:'manual',reference:null},state:'pending',deletedAt:null,completion:null,overdue:false,timePassed:false,createdAt:'2026-10-13',modifiedAt:'2026-10-13',changes:[]};
 const view={state:'ready',message:'',schemaVersion:3,revision:'r1',targetBinding:'synthetic-locale',vaultName:'Synthetic',vaultPath:'/synthetic',currentDate:'2026-10-13',folders:[{id:'folder',name:'原始文件夹'}],lists:[{id:'inbox',name:'Inbox',isSystem:true,archived:false},{id:'list',name:'工作',isSystem:false,archived:false,folderId:'folder'}],tags:[{id:'tag',name:'用户标签'}],tasks:[task,{...task,id:'parent',name:'用户父任务'}]};
 renderTasks(view);document.querySelector('[data-task-editor-open="locale-task"]').click();
 let form=document.querySelector('form[data-task-editor="locale-task"]');
 for(const [selector,value] of [['[data-task-content]','保留用户内容'],['[data-task-priority]','high'],['[data-task-parent]','parent']]){const input=form.querySelector(selector);input.value=value;input.dispatchEvent(new Event('change',{bubbles:true}));}
 const tag=form.querySelector('[data-task-tag-id]');tag.checked=true;tag.dispatchEvent(new Event('change',{bubbles:true}));
 form.querySelector('[data-i18n-aria-label="tasks.refinementNewTagName"]').value='未保存标签';
 document.querySelector('[data-i18n-aria-label="tasks.refinementNewFolderName"]').value='未保存文件夹';
 setCopyError(tasksStatus,'tasks.loadFailed','Error: 找不到标签；未写入。');
 applyInterfaceLanguage('en');
 assert(form.querySelector('[data-task-priority]')?.value==='high','Translating captions must not destroy priority select');
 for(const language of ['en','zh','en']){
  renderInterfaceLanguage({interfaceLanguage:language});
  form=document.querySelector('form[data-task-editor="locale-task"]');
  assert(form.querySelector('[data-task-priority]')?.value==='high','Language switch preserves priority control and draft');
  assert(form.querySelector('[data-task-content]')?.value==='保留用户内容','Language switch preserves content');
  assert(form.querySelector('[data-task-parent]')?.value==='parent'&&form.querySelector('[data-task-tag-id]')?.checked,'Language switch preserves tag and parent draft');
  assert(form.querySelector('[data-i18n-aria-label="tasks.refinementNewTagName"]').value==='未保存标签','Language switch preserves new tag draft');
  assert(document.querySelector('[data-i18n-aria-label="tasks.refinementNewFolderName"]').value==='未保存文件夹','Language switch preserves folder draft');
  assert(tasksStatus.dataset.i18nError==='Error: 找不到标签；未写入。','Raw Task diagnostic retained');
  assert(language==='en'?tasksStatus.textContent.includes('Tag was not found'):tasksStatus.textContent.includes('找不到标签'),'Retained Task status follows locale');
  assert(form.querySelector('[data-i18n="tasks.refinementPriority"]').textContent===(language==='en'?'Priority':'优先级'),'Fixed caption follows locale');
 }
 window.webkit.messageHandlers.result.postMessage({ok:true,width:innerWidth,height:innerHeight,scenario:'retained Task draft and diagnostics through three language switches'});
}catch(error){window.webkit.messageHandlers.result.postMessage({ok:false,error:String(error)});}
`;
writeFileSync(join(fixture,'main.js'),readFileSync(join(fixture,'main.js'),'utf8').replace('void connectToApplication();','')+'\n'+check);
const {createServer}=await import('node:http');
const {pathToFileURL}=await import('node:url');
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href);
const server=createServer((req,res)=>{try{const path=join(fixture,req.url==='/'?'index.html':req.url.split('?')[0]);res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.html')?'text/html':'text/css');res.end(readFileSync(path));}catch{res.statusCode=404;res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 for(const [width,height] of viewports){
  const page=await browser.newPage({viewport:{width,height}});
  await page.addInitScript(()=>{window.webkit={messageHandlers:{result:{postMessage:result=>window.__result=result}}};});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(()=>window.__result,{},{timeout:5000});
  const result=await page.evaluate(()=>window.__result);console.log(JSON.stringify(result));
  if(!result.ok)process.exitCode=1;
  await page.close();
 }
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));rmSync(fixture,{recursive:true,force:true});}
