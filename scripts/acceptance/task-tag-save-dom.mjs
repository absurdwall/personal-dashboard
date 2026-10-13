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
 const assert=(condition,message)=>{if(!condition)throw new Error(message);};
 currentWorkspaceDestination='tasks';document.querySelector('.app-shell').dataset.workspaceDestination='tasks';
 document.querySelectorAll('.workspace-destination').forEach(e=>e.hidden=e.id!=='workspace-destination-tasks');
 const task={id:'tag-save-task',name:'Synthetic cancel 18',content:'Original content',date:'2026-10-13',time:'18:00',executionEnd:{date:'2026-10-13',time:'18:45'},listId:'inbox',priority:'none',tagIds:[],source:{kind:'manual',reference:null},state:'pending',deletedAt:null,completion:null,overdue:false,timePassed:false,createdAt:'2026-10-13T08:00-04:00',modifiedAt:'2026-10-13T08:00-04:00',changes:[]};
 const base={state:'ready',message:'',schemaVersion:3,revision:'r1',targetBinding:'synthetic-tag-save',vaultName:'Synthetic',vaultPath:'/synthetic',currentDate:'2026-10-13',lists:[{id:'inbox',name:'Inbox',isSystem:true,archived:false}],tags:[],tasks:[task]};
 const waitFor=async(predicate)=>{for(let n=0;n<50&&!predicate();n++)await Promise.resolve();return predicate();};
 const outcomes=[];
 for(const [createTag,cancelTime,endOnly] of [[false,false,false],[false,true,false],[false,false,true],[true,false,false],[true,true,false]]) {
   const trace=[];let storage=structuredClone(base);taskEditDrafts.clear();taskOperationIds.clear();selectedTaskDetailId=null;taskScope='all';taskStateScope='all';
   window.__TAURI__={core:{invoke:async(command,args)=>{
     trace.push({command,input:args?.input});
     if(command==='manage_task_tag') {storage={...storage,revision:'r2',tags:[{id:args.input.tagId,name:args.input.name}]};return structuredClone(storage);}
     if(command==='update_task') {storage={...storage,revision:'r3',tasks:[{...task,...args.input,id:task.id}]};return structuredClone(storage);}
     throw new Error('Unexpected command '+command);
   }}};
   renderTasks(storage);document.querySelector('[data-task-editor-open]').click();
   let form=document.querySelector('form[data-task-editor]');
   const content=form.querySelector('[data-task-content]');content.value='Edited through Task editor';content.dispatchEvent(new Event('input',{bubbles:true}));
   const priority=form.querySelector('[data-task-priority]');priority.value='high';priority.dispatchEvent(new Event('change',{bubbles:true}));
   if(createTag) {
      const tagInput=form.querySelector('input[aria-label="新标签名称"]');tagInput.value='Synthetic Review';
      Array.from(form.querySelectorAll('button')).find(button=>button.textContent==='创建标签').click();
      assert(await waitFor(()=>storage.tags.length===1&&taskOperationCount===0),'Tag create must complete before Task Save');
      form=document.querySelector('form[data-task-editor]');
   }
   if(cancelTime)form.querySelector('[data-task-cancel-time]').click();if(endOnly)form.querySelector('[data-task-clear-end]').click();form.querySelector('[data-task-schedule-panel]').open=false;
   const validBefore=form.checkValidity();const invalidEvents=[];form.addEventListener('invalid',event=>invalidEvents.push({type:event.target.type,value:event.target.value,message:event.target.validationMessage}),true);const liveBefore=form.isConnected;const ownerBefore=form.querySelector('button[type=submit]').form===form;const events=[];form.addEventListener('submit',()=>events.push('submit'));form.querySelector('button[type=submit]').addEventListener('click',event=>events.push('click'));
   form.querySelector('button[type=submit]').click();
   await waitFor(()=>trace.some(item=>item.command==='update_task'));
   const invalid=Array.from(form.elements).filter(element=>element.willValidate&&!element.validity.valid).map(element=>({type:element.type,value:element.value,disabled:element.disabled,dataset:element.dataset,validationMessage:element.validationMessage}));
   outcomes.push({createTag,cancelTime,endOnly,validBefore,invalidEvents,commands:trace.map(item=>item.command),invalid,saveDisabled:form.querySelector('button[type=submit]').disabled,events,status:tasksStatus?.textContent,state:tasksStatus?.dataset.state,operationCount:taskOperationCount,liveBefore,ownerBefore,liveAfter:form.isConnected});
   if(!trace.some(item=>item.command==='update_task'))continue;
   const update=trace.find(item=>item.command==='update_task').input;
   assert(update.content==='Edited through Task editor'&&update.priority==='high'&&(!cancelTime||update.time===null&&update.executionEnd===null),'Task Save must submit edited content, priority and date-preserving cancellation');
   assert(update.date==='2026-10-13','Task Save must retain date');
   if(endOnly)assert(update.time==='18:00'&&update.executionEnd===null,'Clearing only the end retains start time and remains submittable');
   if(createTag)assert(update.tagIds.length===1&&update.expectedRevision==='r2','Tag-created draft must save association with its rebased revision');
   await waitFor(()=>taskOperationCount===0);
   const savedForm=document.querySelector('form[data-task-editor]');
   for(const label of [t("tasks.schedule"),"移动到清单","添加子任务","关联父任务"]){const action=Array.from(savedForm.querySelectorAll('[data-task-more] button')).find(button=>button.textContent===label);assert(action&&!action.disabled,'More action remains available after Save: '+label);}
   outcomes.at(-1).tagControlsDisabled=Array.from(savedForm.querySelectorAll('.task-tags-picker input[type=text],.task-tags-picker button')).filter(element=>element.disabled).length;
 }
 assert(outcomes.every(outcome=>outcome.commands.includes('update_task')),'Task Save invocation matrix '+JSON.stringify(outcomes));
 assert(outcomes.every(outcome=>outcome.tagControlsDisabled===0),'Tag management controls reenable after writes '+JSON.stringify(outcomes));
 const restoredForm=document.querySelector('form[data-task-editor]');
 const changedPriority=restoredForm.querySelector('[data-task-priority]');changedPriority.value='low';changedPriority.dispatchEvent(new Event('change',{bubbles:true}));
 const changedTag=restoredForm.querySelector('[data-task-tag-id]');changedTag.checked=false;changedTag.dispatchEvent(new Event('change',{bubbles:true}));
 restoredForm.querySelector('[data-task-editor-close]').click();document.querySelector('[data-task-editor-open]').click();
 assert(changedPriority.closest('details').querySelector('summary').textContent===changedPriority.selectedOptions[0].textContent,'Cancel resets priority summary as well as field');
 assert(changedTag.closest('details').querySelector('summary').textContent==='Synthetic Review','Cancel resets tag summary as well as selections');
 window.webkit.messageHandlers.result.postMessage({ok:true,width:innerWidth,height:innerHeight,outcomes});
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
  let height=CGFloat(Int(CommandLine.arguments[4])!)
  window=NSWindow(contentRect:NSRect(x:0,y:0,width:width,height:height),styleMask:[.titled],backing:.buffered,defer:false)
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
 for(const [width,height] of viewports) {
  const r=spawnSync('swift',[join(fixture,'dom.swift'),fixture,String(width),port,String(height)],{encoding:'utf8',timeout:45000});
  process.stdout.write(r.stdout??'');process.stderr.write(r.stderr??'');if(r.status!==0)process.exitCode=1;
 }
} finally {server.kill();rmSync(fixture,{recursive:true,force:true});}
