import assert from 'node:assert/strict';
import test from 'node:test';
import {probe} from './helpers/complete-page.ts';

// Exercise the shipped page and its navigation/refresh controls in macOS WebKit.
// IPC is the public boundary here; real canonical Task writes and process reopen
// are covered by the packaged task-saved-readback acceptance scenario.
test('Task refresh and navigation show saved values rather than an older editor', {skip:process.platform !== 'darwin'}, () => {
  const result = probe(969, `
    const task={id:'saved-readback',name:'Original task',content:'Original content',date:view.date,time:'10:00',
      executionEnd:null,listId:'inbox',parentTaskId:null,priority:null,tagIds:[],state:'pending',deletedAt:null,
      completion:null,source:{kind:'manual',reference:null},changes:[]};
    responses.tasks_view={...view.tasks,state:'ready',revision:'revision-1',tasks:[task]};
    const navigate=async(destination)=>{document.querySelector('[data-workspace-destination="'+destination+'"]').click();
      await until(()=>document.querySelector('.app-shell').dataset.workspaceDestination===destination);};
    const open=async()=>{await until(()=>document.querySelector('[data-task-editor-open="saved-readback"]'));
      document.querySelector('#tasks-list [data-task-editor-open="saved-readback"]').click();
      await until(()=>document.querySelector('#task-editor-dialog-root:not([hidden]) [data-task-name]'));};
    const read=()=>Object.fromEntries(['name','content','date','time'].map(field=>[field,
      document.querySelector('#task-editor-dialog-root [data-task-'+field+']').value]));
    const edit=(field,value)=>{const input=document.querySelector('#task-editor-dialog-root [data-task-'+field+']');
      input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));};
    const refresh=async()=>{const before=calls.filter(c=>c.command==='tasks_view').length;
      document.querySelector('#refresh-tasks').click();
      await until(()=>calls.filter(c=>c.command==='tasks_view').length>before);
      await new Promise(r=>setTimeout(r,20));};
    await navigate('tasks');await open();
    const semantics={role:document.querySelector('#task-editor-dialog-root [data-task-editor-dialog]').getAttribute('role'),modal:document.querySelector('#task-editor-dialog-root [data-task-editor-dialog]').getAttribute('aria-modal')};
    edit('content','Unsaved content');
    responses.tasks_view={...responses.tasks_view,revision:'revision-2',tasks:[{...task,name:'Saved replacement',content:'Saved content'}]};
    await refresh();await open();const replacement=read();
    edit('content','Another unsaved value');
    responses.tasks_view={...responses.tasks_view,revision:'revision-3',tasks:[{...task,name:'Saved replacement',content:null,time:null}]};
    await refresh();await open();const cleared=read();
    // Even an untouched form used to be retained by stashing it on departure.
    await navigate('today');
    responses.tasks_view={...responses.tasks_view,revision:'revision-4',tasks:[{...task,name:'Latest persisted task',content:'Saved after departure',time:'11:25'}]};
    await navigate('tasks');await open();const untouched=read();
    edit('name','Unsaved task name');edit('content','Do not retain this editor');
    await navigate('today');await navigate('tasks');await open();const returned=read();
    return JSON.stringify({semantics,replacement,cleared,untouched,returned,errors:window.probeErrors});
  `);
  assert.deepEqual(result.semantics,{role:'group',modal:null},'a docked detail must leave navigation and refresh exposed to assistive technology');
  assert.deepEqual(result.replacement,{name:'Saved replacement',content:'Saved content',date:'2026-08-10',time:'10:00'});
  assert.deepEqual(result.cleared,{name:'Saved replacement',content:'',date:'2026-08-10',time:''});
  const latest={name:'Latest persisted task',content:'Saved after departure',date:'2026-08-10',time:'11:25'};
  assert.deepEqual(result.untouched,latest);
  assert.deepEqual(result.returned,latest);
  assert.deepEqual(result.errors,[]);
});

test('saving a Daily Record note reloads open Today Task fields from canonical values', {skip:process.platform !== 'darwin'}, () => {
  const result = probe(969, `
    const form=()=>document.querySelector('[data-task-editor="note-refresh-task"][data-task-surface="today"]');
    await until(()=>document.querySelector('[data-task-editor-open="note-refresh-task"]'));
    document.querySelector('[data-task-editor-open="note-refresh-task"]').click();
    await until(()=>form()&&!form().hidden);
    const edit=form().querySelector('[data-task-content]');edit.value='UNSAVED stale Task content';edit.dispatchEvent(new Event('input',{bubbles:true}));
    document.querySelector('#today-evening-content').value='Independent unsent Daily Record review';
    const latest=structuredClone(view);latest.tasks={...view.tasks,revision:'task-revision-new',tasks:[{...view.tasks.tasks[0],content:'LATEST canonical Task content'}]};
    const invoke=window.__TAURI__.core.invoke;
    window.__TAURI__.core.invoke=async(command,args)=>{
      if(command==='add_dated_note'){calls.push({command,args});return latest;}
      return invoke(command,args);
    };
    document.querySelector('#today-daytime-content').value='Synthetic Daily Record note';
    document.querySelector('#today-daytime-content').dispatchEvent(new Event('input',{bubbles:true}));
    document.querySelector('#save-daytime-update').click();
    await until(()=>calls.some(call=>call.command==='add_dated_note'));
    await new Promise(resolve=>setTimeout(resolve,30));
    const taskForm=form();if(taskForm?.hidden)document.querySelector('[data-task-editor-open="note-refresh-task"]').click();
    return JSON.stringify({content:form()?.querySelector('[data-task-content]').value,review:document.querySelector('#today-evening-content').value,note:document.querySelector('#today-daytime-content').value,errors:window.probeErrors});
  `,true,758,{},`
    view.tasks={...view.tasks,state:'ready',revision:'task-revision-old',tasks:[{id:'note-refresh-task',name:'Daily note refresh Task',content:'Original canonical Task content',date:view.date,time:'10:00',executionEnd:null,listId:'inbox',parentTaskId:null,priority:null,tagIds:[],state:'pending',deletedAt:null,completion:null,source:{kind:'manual',reference:null},changes:[]}]};
  `);
  assert.equal(result.content,'LATEST canonical Task content');
  assert.equal(result.review,'Independent unsent Daily Record review');
  assert.equal(result.note,'');
  assert.deepEqual(result.errors,[]);
});
