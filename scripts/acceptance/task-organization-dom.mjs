import {mkdtempSync, readFileSync, writeFileSync, cpSync, rmSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync,spawn} from 'node:child_process';
const root=resolve(new URL('../..',import.meta.url).pathname);
const fixture=mkdtempSync(join(tmpdir(),'pdex20-dom.noindex-'));
cpSync(join(root,'dist'),fixture,{recursive:true});
const check=String.raw`
try {
 const assert=(condition,message)=>{if(!condition)throw new Error(message);};
 currentWorkspaceDestination='tasks';document.querySelector('.app-shell').dataset.workspaceDestination='tasks';
 document.querySelectorAll('.workspace-destination').forEach(e=>e.hidden=e.id!=='workspace-destination-tasks');
 let calls=0;window.__TAURI__={core:{invoke:async()=>{calls++;throw new Error('Unexpected organization write');}}};
 const task=(id,parentId,listId,date)=>({id,parentId,name:id,content:'Independent '+id,date,time:null,executionEnd:null,listId,priority:'none',tagIds:[],source:{kind:'manual',reference:null},state:'pending',deletedAt:null,completion:null,overdue:false,timePassed:false,createdAt:'2026-10-13T08:00-04:00',modifiedAt:'2026-10-13T08:00-04:00',changes:[]});
 const view={state:'ready',message:'',schemaVersion:3,revision:'r1',targetBinding:'synthetic-organization',vaultName:'Synthetic',vaultPath:'/synthetic',currentDate:'2026-10-13',tags:[],folders:[{id:'projects',name:'Projects'},{id:'empty',name:'Empty'}],lists:[{id:'inbox',name:'Inbox',isSystem:true,archived:false,folderId:null},{id:'work',name:'Work',isSystem:false,archived:false,folderId:'projects'},{id:'home',name:'Home',isSystem:false,archived:false,folderId:'projects'},{id:'archive',name:'Archived',isSystem:false,archived:true,folderId:'projects'}],tasks:[task('parent',null,'work','2026-10-13'),task('grandchild','child','work','2026-10-15'),task('child','parent','home','2026-10-14'),task('archived-task',null,'archive','2026-10-13')]};
 view.tasks[0].priority='high';taskScope='all';renderTasks(view);
 const ids=Array.from(tasksList.querySelectorAll('[data-task-editor-row]'),row=>row.dataset.taskEditorRow);
 assert(JSON.stringify(ids)===JSON.stringify(['parent','child','grandchild']),'All hierarchy follows stable direct relationships without archived work');
 assert(tasksList.querySelector('[data-task-editor-row="grandchild"]').dataset.taskDepth==='2','Grandchild has second level');
 const bounds=tasksList.getBoundingClientRect();for(const row of tasksList.querySelectorAll('[data-task-editor-row]')) {const rect=row.getBoundingClientRect();assert(rect.left>=bounds.left-1&&rect.right<=bounds.right+1,'Nested rows stay inside the compact list');assert(row.scrollWidth<=row.clientWidth+1,'Nested rows do not horizontally clip their content');}
 document.querySelector('[data-task-editor-open="parent"]').click();
 let form=document.querySelector('form[data-task-editor="parent"]');
 assert(form.querySelector('[data-task-parent]'),'Task detail has a real parent selector');
 assert(form.querySelectorAll('[data-task-related-child]').length===1,'Parent lists only direct children');
 document.querySelector('#task-priority-filter').value='high';document.querySelector('#task-priority-filter').dispatchEvent(new Event('change',{bubbles:true}));
 form=document.querySelector('form[data-task-editor="parent"]');form.querySelector('[data-task-related-child="child"]').click();
 assert(selectedTaskDetailId==='child','Direct child opens its same identity across lists');
 form=document.querySelector('form[data-task-editor="child"]');
 assert(form&&!form.closest('[data-task-editor-dialog]').hidden,'Opening a child reveals it despite an incompatible property filter');
 const parentSelect=form.querySelector('[data-task-parent]');assert(parentSelect.value==='parent','Child parent reads saved identity');
 assert(!Array.from(parentSelect.options).some(option=>option.value==='child'||option.value==='grandchild'),'Invalid self/descendant choices hidden');
 parentSelect.value='';parentSelect.dispatchEvent(new Event('change',{bubbles:true}));
 form.querySelector('[data-task-editor-close]').click();document.querySelector('[data-task-editor-open="child"]').click();
 assert(parentSelect.value==='parent','Cancel restores parent association');
 form.querySelector('[data-task-add-child]').click();
 assert(taskCreateDialog.open&&taskCreateForm.querySelector('[data-task-parent]').value==='child','Add subtask stages an ordinary new Task with parent identity');
 assert(taskCreateDate.value==='','Task-list entry date context does not inherit parent date');
 assert(taskCreateList.value==='home','Add child default list comes from parent but is editable');
 taskCreateDialog.close();
 taskScope='all';renderTasks(view);
 const arrow=document.querySelector('[data-task-folder-toggle="projects"]');arrow.click();assert(taskScope==='all','Arrow expands without selecting folder');
 assert(document.querySelector('[data-task-folder-lists="projects"]')&&!document.querySelector('[data-task-folder-lists="projects"]').hidden,'Folder reveals its active list entries');
 document.querySelector('[data-task-scope="folder:projects"]').click();
 assert(taskScope==='folder:projects','Folder name selects aggregate scope');
 const groups=Array.from(tasksList.querySelectorAll('[data-task-list-group]'),group=>group.dataset.taskListGroup);assert(JSON.stringify(groups)===JSON.stringify(['work','home']),'Folder aggregate groups by original active lists');
 assert(!tasksList.querySelector('[data-task-editor-row="archived-task"]'),'Expanding folder never revives archived list');
 const targets=Array.from(document.querySelector('#task-quick-list').options,option=>option.value);assert(JSON.stringify(targets)===JSON.stringify(['work','home']),'Folder quick add has explicit in-folder list choices');
 document.querySelector('[data-task-scope="folder:empty"]').click();
 assert(taskQuickSubmit.disabled&&taskNewButton.disabled,'Empty folder cannot create into an implicit Inbox');
 assert(document.querySelector('[data-task-folder-empty]')?.textContent.includes('先建清单'),'Empty folder explains list prerequisite');
 assert(calls===0,'Parent/folder selection and drafts do not implicitly write');
 const requests=[];let storage=structuredClone(view);let revision=1;
 const settle=async()=>{for(let step=0;step<100&&taskOperationCount;step++)await Promise.resolve();assert(taskOperationCount===0,'Organization operation settles');};
 window.__TAURI__.core.invoke=async(command,args)=>{
   const input=args.input;requests.push({command,input});
   if(command==='manage_task_folder') {
     if(input.action==='create')storage.folders.push({id:input.folderId,name:input.name});
     if(input.action==='rename')storage.folders.find(folder=>folder.id===input.folderId).name=input.name;
     if(input.action==='delete'){storage.folders=storage.folders.filter(folder=>folder.id!==input.folderId);for(const list of storage.lists)if(list.folderId===input.folderId)list.folderId=null;}
   } else if(command==='move_task_list_to_folder')storage.lists.find(list=>list.id===input.listId).folderId=input.folderId;
   else if(command==='update_task')storage.tasks=storage.tasks.map(task=>task.id===input.taskId?{...task,...input}:task);
   else throw new Error('Unexpected command '+command);
   storage.revision='r'+(++revision);return structuredClone(storage);
 };
 taskNewListButton.click();
 let management=document.querySelector('#tasks-lists-management');management.querySelector('input[aria-label="新文件夹名称"]').value='Generated';management.querySelector('[data-task-create-folder]').click();await settle();
 const generated=storage.folders.find(folder=>folder.name==='Generated');assert(generated,'Create folder action reaches its business request and readback');
 management=document.querySelector('#tasks-lists-management');let folderName=management.querySelector('input[aria-label="文件夹名称 · Generated"]');folderName.value='Renamed';folderName.parentElement.querySelector('button').click();await settle();
 assert(storage.folders.find(folder=>folder.id===generated.id).name==='Renamed','Rename preserves folder identity');
 management=document.querySelector('#tasks-lists-management');const work=management.querySelector('form[data-task-list-editor="work"]');work.querySelector('[data-task-list-folder]').value=generated.id;Array.from(work.querySelectorAll('button')).find(button=>button.textContent==='应用分组').click();await settle();
 assert(storage.lists.find(list=>list.id==='work').folderId===generated.id,'Move list uses explicit folder identity');
 management=document.querySelector('#tasks-lists-management');folderName=management.querySelector('input[aria-label="文件夹名称 · Renamed"]');Array.from(folderName.parentElement.querySelectorAll('button')).find(button=>button.textContent==='删除文件夹').click();await settle();
 assert(storage.lists.find(list=>list.id==='work').folderId===null&&storage.tasks.length===4,'Delete folder readback retains lists and Tasks');
 assert(Array.from(document.querySelectorAll('#tasks-lists-management input,#tasks-lists-management select,#tasks-lists-management button')).every(control=>!control.disabled),'Organization controls release after their own writes');
 taskScope='all';selectedTaskDetailId=null;renderTasks(storage);document.querySelector('[data-task-editor-open="child"]').click();
 const savedChildForm=document.querySelector('form[data-task-editor="child"]');const savedParent=savedChildForm.querySelector('[data-task-parent]');savedParent.value='';savedParent.dispatchEvent(new Event('change',{bubbles:true}));savedChildForm.querySelector('button[type=submit]').click();await settle();
 const parentUpdate=requests.find(request=>request.command==='update_task');assert(parentUpdate&&parentUpdate.input.parentId===null&&parentUpdate.input.taskId==='child','Actual Save submits explicit unlink for the existing child identity');
 assert(parentUpdate.input.date==='2026-10-14'&&parentUpdate.input.listId==='home'&&parentUpdate.input.priority==='none','Relationship Save retains independent Task properties');
 const currentChild=document.querySelector('form[data-task-editor="child"]');assert(currentChild.querySelector('[data-task-parent]').value==='', 'Relationship readback reopens without parent');
 assert(Array.from(currentChild.querySelectorAll('[data-task-more] button')).filter(button=>['添加子任务','关联父任务'].includes(button.textContent)).every(button=>!button.disabled),'Parent menu actions release after own Save');
 window.webkit.messageHandlers.result.postMessage({ok:true,width:innerWidth,commands:requests.map(request=>request.command)});
} catch(error) {window.webkit.messageHandlers.result.postMessage({ok:false,error:String(error)});}
`;
writeFileSync(join(fixture,'main.js'),readFileSync(join(fixture,'main.js'),'utf8').replace('void connectToApplication();','')+'\n'+check);
writeFileSync(join(fixture,'dom.swift'),String.raw`
import AppKit
import WebKit
import Foundation
class Runner:NSObject,WKScriptMessageHandler,WKNavigationDelegate {
 let app=NSApplication.shared
 var window:NSWindow!
 func run() {
  let config=WKWebViewConfiguration();config.userContentController.add(self,name:"result")
  config.userContentController.addUserScript(WKUserScript(source:"window.addEventListener('error',e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:e.message+' '+e.filename+':'+e.lineno}));window.addEventListener('unhandledrejection',e=>window.webkit.messageHandlers.result.postMessage({ok:false,error:String(e.reason)}));",injectionTime:.atDocumentStart,forMainFrameOnly:true))
  let width=CGFloat(Int(CommandLine.arguments[2])!)
  window=NSWindow(contentRect:NSRect(x:0,y:0,width:width,height:560),styleMask:[.titled],backing:.buffered,defer:false)
  let web=WKWebView(frame:window.contentView!.bounds,configuration:config);web.navigationDelegate=self;window.contentView=web
  web.load(URLRequest(url:URL(string:"http://127.0.0.1:"+CommandLine.arguments[3]+"/index.html")!))
  DispatchQueue.main.asyncAfter(deadline:.now()+20){print("WebKit DOM timeout");exit(2)}
  app.run()
 }
 func userContentController(_ userContentController:WKUserContentController,didReceive message:WKScriptMessage){
  let body=message.body as! [String:Any];let data=try! JSONSerialization.data(withJSONObject:body,options:[.sortedKeys]);print(String(data:data,encoding:.utf8)!);exit((body["ok"] as? Bool)==true ? 0:1)
 }
}
let runner=Runner();runner.run()
`);
const portFile=join(fixture,'port');
const server=spawn('python3',['-u','-c',"from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler;from functools import partial;import sys;server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=sys.argv[1]));open(sys.argv[2],'w').write(str(server.server_port));server.serve_forever()",fixture,portFile],{stdio:'ignore'});
for(let attempts=0;!existsSync(portFile)&&attempts<100;attempts++)await new Promise(r=>setTimeout(r,20));
if(!existsSync(portFile)){server.kill();rmSync(fixture,{recursive:true,force:true});throw new Error('Local DOM fixture server failed');}
const port=readFileSync(portFile,'utf8');
try {
 for(const width of [1280,680]) {
  const r=spawnSync('swift',[join(fixture,'dom.swift'),fixture,String(width),port],{encoding:'utf8',timeout:45000});
  process.stdout.write(r.stdout??'');process.stderr.write(r.stderr??'');if(r.status!==0)process.exitCode=1;
 }
} finally {server.kill();rmSync(fixture,{recursive:true,force:true});}
