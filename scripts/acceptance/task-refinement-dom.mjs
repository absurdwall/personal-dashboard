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
 document.getElementById('workspace-destination-tasks').hidden=false;
 document.querySelectorAll('.workspace-destination').forEach(e=>e.hidden=e.id!=='workspace-destination-tasks');
 let calls=0;window.__TAURI__={core:{invoke:async()=>{calls++;throw new Error('Unexpected write');}}};
 const task={id:'dom-task',name:'Readable title',content:'Existing content',date:'2026-10-13',time:'18:00',executionEnd:{date:'2026-10-13',time:'18:45'},listId:'inbox',priority:'high',tagIds:[],source:{kind:'manual',reference:null},state:'pending',deletedAt:null,completion:null,overdue:false,timePassed:false,createdAt:'2026-10-13T08:00-04:00',modifiedAt:'2026-10-13T08:00-04:00',changes:[]};
 const view={state:'ready',message:'',schemaVersion:3,revision:'r1',targetBinding:'synthetic-dom',vaultName:'Synthetic',vaultPath:'/synthetic',currentDate:'2026-10-13',lists:[{id:'inbox',name:'Inbox',isSystem:true,archived:false}],tags:[],tasks:[task]};
 renderTasks(view);
 document.querySelector('[data-task-editor-open]').click();
 const form=document.querySelector('form[data-task-editor]');
 const content=form.querySelector('[data-task-content]');
 assert(document.activeElement===content,'Existing Task must focus Content');
 assert(form.querySelectorAll('[data-task-name]').length===1&&!form.querySelector('h3'),'One editable title only');
 assert(getComputedStyle(content).minHeight==='180px','Content must have larger reading height');
 const save=form.querySelector('[type=submit]');const cancel=form.querySelector('[data-task-editor-close]');
 assert(save.parentElement===cancel.parentElement,'Save and Cancel share footer');
 content.value='Cancelled draft';content.dispatchEvent(new Event('input',{bubbles:true}));
 cancel.click();document.querySelector('[data-task-editor-open]').click();
 assert(form.querySelector('[data-task-content]').value==='Existing content','Cancel discards draft');
 const properties=form.querySelector('[data-task-schedule-panel]');
 assert(properties&&!properties.open,'Schedule begins as compact visible value');
 properties.open=true;properties.open=false;
 assert(document.querySelector('#task-create-form [data-task-priority]'),'New Task can choose priority');
 form.querySelector('[data-task-cancel-time]').click();
 assert(form.querySelector('[data-task-date]').value==='2026-10-13'&&form.querySelector('[data-task-time]').value===''&&form.querySelector('[data-task-end-time]').value==='','Cancel arrangement clears time/end and retains date');
 assert(form.querySelector('[data-task-clear-end]').hidden,'No constant clear-end control without an end');
 cancel.click();document.querySelector('[data-task-editor-open]').click();
 const row=document.querySelector('[data-task-editor-row]');row.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:80,clientY:100}));
 assert(form.querySelector('[data-task-more]').open,'Row right-click opens shared More action collection');
 assert(form.querySelector('[data-task-state-action][data-task-state-task]'),'More exposes the same Task state operation');
 const quick=document.querySelector('#task-quick-form');assert(quick.querySelector('#task-quick-list'),'Quick add chooses target list before creation');
 const contentBox=content.getBoundingClientRect();assert(contentBox.width>0&&contentBox.right<=innerWidth+1,'Narrow editor fits actual viewport');

 assert(calls===0,'Collapsing properties and Cancel must not save');
 content.value='Draft before external edit';content.dispatchEvent(new Event('input',{bubbles:true}));
 const external={...view,revision:'r2',tasks:[{...task,priority:'low'}]};renderTasks(external);
 let submittedRevision=null;window.__TAURI__.core.invoke=async(command,args)=>{submittedRevision=args.input.expectedRevision;throw new Error('External revision conflict');};
 const currentForm=document.querySelector('form[data-task-editor]');
 const result=await updateTask('dom-task',currentForm,'tasks');
 assert(submittedRevision==='r1','Retained draft must not silently overwrite an external revision');
 assert(result===false&&currentForm.querySelector('[data-task-content]').value==='Draft before external edit','Conflict preserves draft and does not report success');
 window.webkit.messageHandlers.result.postMessage({ok:true,width:innerWidth,height:innerHeight});
} catch(error) { window.webkit.messageHandlers.result.postMessage({ok:false,error:String(error)}); }
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
