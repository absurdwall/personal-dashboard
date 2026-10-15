const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const clone=value=>structuredClone(value);
let canonical,commands=[],failures=[],details=[],pointerEvents=0;

window.__TAURI__={core:{invoke:async(command,args)=>{
  commands.push({command,args});
  if(command==='tasks_view')return clone(canonical);
  if(command==='update_task_with_properties'){
    if(window.__failUpdate)throw Error('Synthetic update failure');
    const input=args.input,task=canonical.tasks[0];
    for(const key of ['name','content','date','time','executionEnd','listId','priority','tagIds','parentTaskId'])
      if(key in input)task[key]=clone(input[key]);
    canonical.revision='synthetic-'+commands.length;
    return clone(canonical);
  }
  throw Error('Unexpected synthetic IPC '+command);
}}};
const addWindowListener=window.addEventListener.bind(window);
window.addEventListener=(type,listener,options)=>{if(type!=='focus')addWindowListener(type,listener,options);};
require('./main.js');

const rect=node=>{const value=node.getBoundingClientRect();return {left:value.left,right:value.right,top:value.top,bottom:value.bottom,width:value.width,height:value.height};};
const requireThat=(value,message,detail={})=>{if(!value)throw Object.assign(Error(message),{detail});};
async function resize(width,height){
  window.webkit.messageHandlers.resizeViewport.postMessage({width,height});
  for(let i=0;i<100;i++){
    if(innerWidth===width&&innerHeight===height){await delay(25);return;}
    await delay(10);
  }
  throw Error('Synthetic WKWebView resize timed out');
}
async function pointer(node,dispatch=true){
  requireThat(node,'Missing pointer target');
  node.scrollIntoView({block:node.matches('[data-task-editor-close]')?'nearest':'center',inline:'nearest'});
  await delay(12);
  const bounds=rect(node),x=(bounds.left+bounds.right)/2,y=(bounds.top+bounds.bottom)/2,hit=document.elementFromPoint(x,y);
  const report={target:node.outerHTML.slice(0,250),rect:bounds,hit:hit?.outerHTML.slice(0,250),viewport:[innerWidth,innerHeight]};
  requireThat(bounds.width>0&&bounds.height>0&&x>=0&&x<innerWidth&&y>=0&&y<innerHeight,'Pointer target outside viewport',report);
  requireThat(hit&&(hit===node||node.contains(hit)),'Pointer target intercepted',report);
  requireThat(!node.disabled,'Pointer target disabled',report);
  for(const type of dispatch?['pointerdown','mousedown','pointerup','mouseup','click']:[]){
    const event=type.startsWith('pointer')
      ? new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:1,pointerType:'mouse',isPrimary:true,clientX:x,clientY:y,button:0,buttons:type==='pointerdown'?1:0})
      : new MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0,buttons:type==='mousedown'?1:0});
    hit.dispatchEvent(event);
    pointerEvents++;
  }
  await delay(15);
  return report;
}
function syntheticView(){
  return {state:'ready',message:'',schemaVersion:4,revision:'synthetic-0',targetBinding:'synthetic-vault',vaultName:'Synthetic Vault',vaultPath:'/tmp/Synthetic Vault',currentDate:'2026-10-14',lists:[{id:'inbox',name:'Inbox',isSystem:true,archived:false}],folders:[],tags:[{id:'synthetic-tag',name:'Synthetic label'}],tasks:[{id:'synthetic-task',name:'Synthetic task with a deliberately long full title across the list',content:'Synthetic initial content. '.repeat(20),date:'2026-10-14',time:'09:30',executionEnd:null,priority:'medium',tagIds:[],parentTaskId:null,listId:'inbox',source:{kind:'manual',reference:null},state:'pending',deletedAt:null,completion:null,overdue:false,timePassed:false,createdAt:'2026-10-01T12:00:00Z',modifiedAt:'2026-10-01T12:00:00Z',changes:[]}]};
}
const form=()=>document.querySelector('#task-editor-dialog-root [data-task-editor="synthetic-task"]');
const editorHidden=()=>document.querySelector('#task-editor-dialog-root').hidden;
async function open(){
  await pointer(document.querySelector('#tasks-list [data-task-editor-open="synthetic-task"]'));
  requireThat(form()&&!form().closest('[data-task-editor-dialog]').hidden,'Task editor did not open');
}
function setDraft(field,value){
  const input=form().querySelector(field);
  input.value=value;
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.dispatchEvent(new Event('change',{bubbles:true}));
}
async function settle(){
  await Promise.race([window.cancelHarness.wait(),delay(1800).then(()=>{throw Error('Synthetic pending-write fixture timed out');})]);
  await delay(20);
}
const countWrites=()=>commands.filter(call=>/^update_|^create_|^save_|^set_/.test(call.command)).length;

for(const scenario of selectedCases){
  const record={...scenario};
  try{
    await resize(scenario.width,scenario.height);
    canonical=syntheticView();commands=[];window.__failUpdate=false;
    window.cancelHarness.init(clone(canonical),scenario.nav);
    await delay(20);
    await open();

    if(scenario.height===560){
      setDraft('[data-task-content]','Synthetic unsaved short-window draft');
      await pointer(form().querySelector('[data-task-more] > summary'));
      const moreSummary=form().querySelector('[data-task-more] > summary');
      const menuPanel=form().querySelector('[data-task-more] .task-more-menu-panel');
      const anchorBounds=rect(moreSummary),panelBounds=rect(menuPanel);
      const verticalGap=Math.min(Math.abs(panelBounds.bottom-anchorBounds.top),Math.abs(panelBounds.top-anchorBounds.bottom));
      record.moreMenuAnchor=anchorBounds;
      record.moreMenuPanel=panelBounds;
      requireThat(panelBounds.left>=0&&panelBounds.right<=innerWidth&&panelBounds.top>=0&&panelBounds.bottom<=innerHeight,
        'More menu panel fell outside the viewport',{anchorBounds,panelBounds,viewport:[innerWidth,innerHeight]});
      requireThat(panelBounds.right>=anchorBounds.left&&panelBounds.left<=anchorBounds.right&&verticalGap<12,
        'More menu panel no longer tracks its More control',{anchorBounds,panelBounds,verticalGap});
      const menuItems=[...form().querySelectorAll('[data-task-more] .task-more-menu-item')];
      record.moreMenuItems=[];
      for(const item of menuItems)record.moreMenuItems.push(await pointer(item,false));
      requireThat(menuItems.length===5,'More menu did not retain its existing actions');
      await pointer(menuItems[0]);
      requireThat(form().querySelector('[data-task-schedule-disclosure]').open,'More menu did not open Schedule');
      const cancel=form().querySelector('[data-task-editor-close]');
      record.moreOpenCancel=await pointer(cancel);
      requireThat(editorHidden(),'Cancel did not exit after More menu interaction');
      requireThat(countWrites()===0,'Cancel issued a synthetic write');
      requireThat(window.cancelHarness.draft()===undefined,'Cancel retained the discarded draft');
      details.push({...record,passed:true});
      continue;
    }

    const disclosure=form().querySelector('[data-task-properties-disclosure]');
    await pointer(disclosure.querySelector('summary'));
    const tag=form().querySelector('input[data-task-tag-choice]');
    await pointer(tag);
    requireThat(tag.checked,'Synthetic label did not toggle');
    await pointer(form().querySelector('button[type="submit"]'));
    await settle();
    requireThat(canonical.tasks[0].tagIds.includes('synthetic-tag'),'Synthetic label was not saved');
    record.afterSaveCancelDisabled=form().querySelector('[data-task-editor-close]').disabled;
    requireThat(!record.afterSaveCancelDisabled,'Cancel stayed disabled after the verified write settled');

    const writesBefore=countWrites(),saved=JSON.stringify(canonical);
    setDraft('[data-task-content]','Synthetic unsaved follow-up draft');
    setDraft('[data-task-name]','Synthetic unsaved follow-up name');
    for(const item of form().querySelectorAll('.task-property-disclosure'))if(!item.open)await pointer(item.querySelector('summary'));
    form().scrollTop=form().scrollHeight;
    await resize(scenario.width>760?759:969,scenario.height);
    await delay(20);
    await pointer(form().querySelector('[data-task-editor-close]'));
    requireThat(editorHidden(),'Cancel did not return to the prior list after save and resize');
    requireThat(JSON.stringify(canonical)===saved,'Cancel changed the synthetic source after a prior save');
    requireThat(countWrites()===writesBefore,'Cancel sent another mutation IPC');
    requireThat(window.cancelHarness.draft()===undefined,'Cancel retained the unsaved follow-up draft');
    await open();
    requireThat(form().querySelector('[data-task-content]').value!=='Synthetic unsaved follow-up draft','Discarded draft reappeared after reopen');
    await pointer(form().querySelector('[data-task-editor-close]'));
    details.push({...record,passed:true});
  }catch(error){
    failures.push({...record,message:error.message,detail:error.detail});
    details.push({...record,passed:false});
    document.querySelector('[data-synthetic-blocker]')?.remove();
  }
}

// A failed write remains an editable draft until Cancel discards it; Cancel itself never writes.
try{
  await resize(969,723);
  canonical=syntheticView();commands=[];window.__failUpdate=true;
  window.cancelHarness.init(clone(canonical),true);
  await delay(20);await open();
  setDraft('[data-task-name]','Synthetic failed-save draft');
  const tag=form().querySelector('input[data-task-tag-choice]');
  await pointer(form().querySelector('[data-task-properties-disclosure] summary'));
  await pointer(tag);await pointer(form().querySelector('button[type="submit"]'));await settle();
  requireThat(JSON.stringify(canonical.tasks[0].tagIds)==='[]','Failed update changed the synthetic source');
  requireThat(Boolean(window.cancelHarness.draft()),'Failed update did not retain the draft for review');
  requireThat(!form().querySelector('[data-task-editor-close]').disabled,'Cancel stayed disabled after failed write settled');
  const writesBefore=countWrites();
  await pointer(form().querySelector('[data-task-editor-close]'));
  requireThat(editorHidden(),'Cancel did not close after failed save');
  requireThat(countWrites()===writesBefore,'Cancel issued a write after failed save');
  requireThat(window.cancelHarness.draft()===undefined,'Cancel did not discard the failed-save draft');
  details.push({scenario:'failed-save-draft-discard',passed:true});
}catch(error){
  failures.push({scenario:'failed-save-draft-discard',message:error.message,detail:error.detail});
  details.push({scenario:'failed-save-draft-discard',passed:false});
}

return JSON.stringify({cases:details.length,passed:details.filter(item=>item.passed).length,failures,pointerEvents,details});
