import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, mkdtempSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';

function webKit(script: string): any {
  const directory = mkdtempSync(join(tmpdir(), 'pdex-evening-dom-'));
  try {
    writeFileSync(join(directory, 'index.html'), readFileSync(new URL('../../frontend/index.html', import.meta.url), 'utf8').replace(/<script[^>]*src="main.js"[^>]*><\/script>/, ''));
    writeFileSync(join(directory, 'styles.css'), readFileSync(new URL('../../frontend/styles.css', import.meta.url), 'utf8'));
    const controller = stripTypeScriptTypes(readFileSync(new URL('../../frontend/evening-review-entry.ts', import.meta.url), 'utf8')).replace(/export /g, '');
    writeFileSync(join(directory, 'check.js'), `${controller}\n${script}`);
    return JSON.parse(execFileSync('swift', [new URL('./helpers/rendered-evening-entry.swift', import.meta.url).pathname, join(directory, 'index.html'), join(directory, 'check.js')], { encoding: 'utf8', timeout: 60000 }));
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

test('Evening button captures selected past date and preserves an editable draft without form submission', { skip: process.platform !== 'darwin' }, () => {
  const result = webKit(`
    const button = document.querySelector('#today-start-review');
    const status = document.querySelector('#today-review-entry-status');
    const input = document.querySelector('#collaboration-message-draft');
    let selected = { date:'2026-09-20', isToday:false, available:true };
    let target, submissions = 0, resolve;
    const opened = new Promise(r => resolve=r);
    document.querySelector('#collaboration-composer').addEventListener('submit', e => {e.preventDefault();submissions++;});
    const entry = initializeEveningReviewEntry(button, status, () => selected, async date => { target=date; input.value='Saved unfinished draft'; resolve(); return true; }, (key, values) => key + ':' + (values?.date ?? ''));
    entry.render(); const label=button.textContent; button.click(); button.click(); selected={date:'2026-09-27',isToday:true,available:true}; await opened; await new Promise(r => setTimeout(r,10));
    return JSON.stringify({label,target,draft:input.value,submissions,status:status.textContent,disabled:button.disabled});
  `);
  assert.equal(result.label, 'today.startReviewDate:2026-09-20');
  assert.equal(result.target, '2026-09-20');
  assert.equal(result.draft, 'Saved unfinished draft');
  assert.equal(result.submissions, 0);
  assert.equal(result.status, 'today.reviewDraftPreserved:2026-09-20');
  assert.equal(result.disabled, false);
});

function productionWebKit(script: string): any {
  const directory = mkdtempSync(join(tmpdir(), 'pdex-evening-production-'));
  try {
    const root = new URL('../..', import.meta.url).pathname;
    execFileSync(join(root, 'node_modules/.bin/tsc'), ['--module', 'commonjs', '--outDir', directory], { cwd: root });
    writeFileSync(join(directory, 'styles.css'), readFileSync(new URL('../../frontend/styles.css', import.meta.url), 'utf8'));
    const mainPath = join(directory, 'main.js');
    // Isolate the confirmed DOM entry seam from unrelated application bootstrap.
    // Every entry/draft/save/navigation/render handler and imported module is real.
    writeFileSync(mainPath, readFileSync(mainPath, 'utf8').replace('void connectToApplication();', '') + `
      window.eveningHarness = {
        seed(date, session, workspace) {
          currentInterfaceLanguage='zh';
          currentTodayView={date,isToday:date==='2026-09-27',canRecord:true,baseline:{timeline:[],evidence:[]}};
          document.querySelector('#today-ready').hidden=false;
          showTodayPhase('evening');
          currentCollaborationSession=session;
          currentCollaborationWorkspace=workspace;
          currentCollaborationConnection={authenticated:true,authMode:'chatgpt',readOnlyTextTurnsAvailable:true};
          collaborationTargetDate=session?.targetDate ?? date;
          if(session) { cacheCollaborationDrafts(session); collaborationTargetDates.set(session.id,session.targetDate); }
          renderCollaborationWorkspace(); eveningReviewEntry.render();
        },
        current: () => ({session:currentCollaborationSession,target:collaborationTargetDate,destination:currentWorkspaceDestination}),
      };`);
    writeFileSync(join(directory, 'index.html'), readFileSync(new URL('../../frontend/index.html', import.meta.url), 'utf8').replace(/<script[^>]*src="main.js"[^>]*><\/script>/, ''));
    const modules = Object.fromEntries(readdirSync(directory).filter(name=>name.endsWith('.js')).map(name=>['./'+name,readFileSync(join(directory,name),'utf8')]));
    writeFileSync(join(directory, 'check.js'), `
      const modules=${JSON.stringify(modules)}; const cache={}; function require(name){if(cache[name])return cache[name];const exports={};cache[name]=exports;new Function('exports','require',modules[name])(exports,require);return exports;}
      const fixture = date => ({id:'session-'+date,title:'',createdDate:date,activityDates:[date],lastActivityAt:'2026-09-27T20:00:00-04:00',targetDate:date,runId:null,runState:'waiting',progress:'',runtimeThreadId:null,messages:[],taskOperations:[],memoryProposals:[],workHistory:[],draft:'',draftsByDate:{}});
      const sessions = []; const invocations=[];
      const pane={state:'ready',message:'Synthetic context',items:[]};
      const context=date=>({date,vaultName:'synthetic',dailyRecord:pane,tasks:pane,habits:pane});
      const workspace=date=>({date,vaultName:'synthetic',context:context(date),memory:null,sessions:sessions.filter(s=>s.activityDates.includes(date)),activeRun:null,recoveryRequired:false});
      let failSave=false;
      window.__TAURI__={core:{invoke:async (command,args) => {
        invocations.push({command,args});
        if(command==='collaboration_save_draft') {
          if(failSave) throw Error('Synthetic disk full');
          const session=sessions.find(s=>s.id===args.sessionId);session.draft=args.draft;session.draftsByDate[args.targetDate]=args.draft;return structuredClone(session);
        }
        if(command==='collaboration_prepare_evening_review') {
          let session=sessions.find(s=>s.targetDate===args.date);
          if(!session) {session=fixture(args.date);sessions.push(session);}
          const preservedDraft=!!session.draft;
          if(!preservedDraft) {session.draft=args.draft;session.draftsByDate[args.date]=args.draft;}
          return {session:structuredClone(session),preservedDraft};
        }
        if(command==='collaboration_workspace') return workspace(args.date);
        if(command==='collaboration_context') return context(args.date);
        if(command==='today_clock') return {date:'2026-09-27',time:'20:00',livedDate:'2026-09-27'};
        throw Error('Unexpected boundary command '+command);
      }}};
      require('./main.js');
      const button=document.querySelector('#today-start-review');
      const input=document.querySelector('#collaboration-message-draft');
      const status=document.querySelector('#today-review-entry-status');
      async function clickEntry() {button.click();while(button.disabled) await new Promise(r=>setTimeout(r,5));}
      ${script}
    `);
    return JSON.parse(execFileSync('swift', [new URL('./helpers/rendered-evening-entry.swift', import.meta.url).pathname, join(directory, 'index.html'), join(directory, 'check.js')], { encoding: 'utf8', timeout: 60000 }));
  } finally { rmSync(directory, {recursive:true,force:true}); }
}

test('production Evening entry navigates with selected date and authoritative pointer, then preserves unsaved edits on repeat', {skip:process.platform!=='darwin'},()=>{
  const result=productionWebKit(`
    window.eveningHarness.seed('2026-09-20',null,workspace('2026-09-20'));
    const label=button.textContent;const visible=button.getBoundingClientRect().height>0;await clickEntry();const initial=input.value;
    input.value='用户正在编辑的草稿';input.dispatchEvent(new Event('input',{bubbles:true}));
    await clickEntry();await new Promise(r=>setTimeout(r,20));
    return JSON.stringify({label,visible,initial,draft:input.value,state:window.eveningHarness.current(),notice:document.querySelector('#collaboration-review-entry-notice').textContent,sessions:sessions.length,commands:invocations.map(i=>i.command),saved:sessions[0].draft});
  `);
  assert.equal(result.label,'复盘 2026-09-20');
  assert.equal(result.visible,true);
  assert.ok(result.initial.startsWith('/retro '));
  assert.ok(result.initial.includes('dashboard://record/2026-09-20?phase=evening'));
  assert.equal(result.draft,'用户正在编辑的草稿');
  assert.equal(result.saved,'用户正在编辑的草稿');
  assert.equal(result.state.target,'2026-09-20');
  assert.equal(result.state.destination,'collaboration');
  assert.equal(result.state.session.messages.length,0);
  assert.equal(result.sessions,1);
  assert.ok(result.notice.includes('保留了已有草稿'));
  assert.ok(!result.commands.some(c=>c.includes('submit') || c.includes('evening_review_update')));
});

test('production entry retains current unsaved draft when opening another date and gives clear saved-draft continuation', {skip:process.platform!=='darwin'},()=>{
  const result=productionWebKit(`
    const current=fixture('2026-09-27');current.draft='Saved today draft';current.draftsByDate[current.targetDate]=current.draft;sessions.push(current);
    const past=fixture('2026-09-20');past.draft='已有过去日期草稿';past.draftsByDate[past.targetDate]=past.draft;sessions.push(past);
    window.eveningHarness.seed('2026-09-20',structuredClone(current),workspace('2026-09-27'));
    input.value='今天尚未保存的编辑';input.dispatchEvent(new Event('input',{bubbles:true}));
    await clickEntry();
    return JSON.stringify({draft:input.value,todaySaved:current.draft,todayTarget:current.targetDate,target:window.eveningHarness.current().target,notice:document.querySelector('#collaboration-review-entry-notice').textContent,sessions:sessions.length,messages:sessions.flatMap(s=>s.messages)});
  `);
  assert.equal(result.draft,'已有过去日期草稿');
  assert.equal(result.todaySaved,'今天尚未保存的编辑');
  assert.equal(result.todayTarget,'2026-09-27');
  assert.equal(result.target,'2026-09-20');
  assert.ok(result.notice.includes('保留了已有草稿'));
  assert.equal(result.sessions,2);
  assert.deepEqual(result.messages,[]);
});

test('production entry keeps editable text and date after a failed draft save and permits a safe retry', {skip:process.platform!=='darwin'},()=>{
  const result=productionWebKit(`
    const current=fixture('2026-09-27');sessions.push(current);
    window.eveningHarness.seed('2026-09-20',structuredClone(current),workspace('2026-09-27'));
    input.value='需要保留的未保存草稿';input.dispatchEvent(new Event('input',{bubbles:true}));failSave=true;
    await clickEntry();const failed={draft:input.value,state:window.eveningHarness.current(),status:status.textContent,sessions:sessions.length,commands:invocations.map(i=>i.command)};
    failSave=false;await clickEntry();
    return JSON.stringify({failed,retryTarget:window.eveningHarness.current().target,todaySaved:current.draft});
  `);
  assert.equal(result.failed.draft,'需要保留的未保存草稿');
  assert.equal(result.failed.state.target,'2026-09-27');
  assert.equal(result.failed.sessions,1);
  assert.ok(result.failed.status.includes('Synthetic disk full'));
  assert.ok(!result.failed.commands.includes('collaboration_prepare_evening_review'));
  assert.equal(result.retryTarget,'2026-09-20');
  assert.equal(result.todaySaved,'需要保留的未保存草稿');
});

test('production current-day entry creates an editable review draft, double clicks remain idempotent and require explicit send', {skip:process.platform!=='darwin'},()=>{
  const result=productionWebKit(`
    window.eveningHarness.seed('2026-09-27',null,workspace('2026-09-27'));
    const label=button.textContent;button.click();button.click();while(button.disabled) await new Promise(r=>setTimeout(r,5));
    const draft=input.value;input.value=draft+' 我想补充午后的情况';input.dispatchEvent(new Event('input',{bubbles:true}));
    await new Promise(r=>setTimeout(r,350));
    return JSON.stringify({label,draft,edited:input.value,saved:sessions[0].draft,sessions:sessions.length,messages:sessions[0].messages,commands:invocations.map(i=>i.command)});
  `);
  assert.equal(result.label,'开始复盘今天');
  assert.ok(result.draft.includes('dashboard://record/2026-09-27?phase=evening'));
  assert.ok(result.edited.endsWith('我想补充午后的情况'));
  assert.equal(result.saved,result.edited);
  assert.equal(result.sessions,1);
  assert.deepEqual(result.messages,[]);
  assert.ok(!result.commands.some(c=>c.includes('submit')));
});
