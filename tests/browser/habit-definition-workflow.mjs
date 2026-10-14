import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

// The browser fixture replaces only the Tauri boundary. Rust workflow tests
// exercise the real selected-vault storage and new-instance readback.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE_PATH
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href
  : 'playwright');
const root=resolve(import.meta.dirname,'../..');
const livedDate='2026-10-14';

function localCell(completed=false) {
  return {
    date:livedDate,coverage:'local',status:completed?'completed':'unknown',hasRecord:completed,
    countsAsCompletion:completed,actualTimeLabel:null,localCompletionState:completed?'completed':'none',
    hasExternalCompletion:false,completionSourceLabels:completed?['Personal Dashboard']:[],details:[],localRecords:[],
  };
}

function historyCells() {
  return Array.from({length:84},(_,index)=>{
    const date=new Date(Date.UTC(2026,9,14-(83-index))).toISOString().slice(0,10);
    return {...localCell(false),date};
  });
}

function goalLabel(goal) {
  if(goal.kind==='weekly-count')return `每周 ${goal.days} 天`;
  if(goal.kind==='daily-time')return `每日 ${goal.standard}`;
  return '每日完成';
}

function habitFrom(input,{currentGoal=input.goal,pendingGoal=null,completed=false}={}) {
  const weekly=currentGoal?.kind==='weekly-count';
  const weekStart='2026-10-12';
  const weeklyPeriodStart=input.weeklyPeriodStart??(weekly&&input.startDate>weekStart?input.startDate:weekStart);
  return {
    key:input.key,name:input.name,localizedNames:input.localizedNames??{},
    isLocalDefinition:input.isLocalDefinition??true,createdLocally:input.createdLocally??true,
    emoji:input.emoji,group:input.group,startDate:input.startDate,currentGoal,pendingGoal,
    pendingGoalLabel:pendingGoal?goalLabel(pendingGoal):null,active:true,canRecordCompletion:currentGoal?.kind!=='daily-time',
    goalKind:currentGoal?.kind??'daily-count',goalLabel:goalLabel(currentGoal),weeklyTarget:weekly?currentGoal.days:null,
    completedCount:weekly?(completed?1:0):(completed?1:0),weeklyPeriodStart,
    weeklyPeriodPartial:weekly&&weeklyPeriodStart>weekStart,sourceLabels:input.sourceLabels??['Personal Dashboard'],
    coverageLabel:'本地记录；没有外部历史覆盖',goalHistory:[],today:localCell(completed),recent:[],history:historyCells(),
  };
}

function pageView(habits=[],definitionRevision=null,completionRevision=null) {
  return {
    state:'ready',message:'Synthetic browser IPC fixture',readError:null,generatedAt:'2026-10-14T09:00:00-04:00',
    currentLivedDate:livedDate,snapshotRevision:'snapshot-r1',displayRangeLabel:'2026-10-12 — 2026-10-18',
    rangeLabel:'2026-10-12 — 2026-10-18',producerLabel:'Synthetic · dashboard-local',
    completionRevision,completionTargetBinding:'test-completion-binding',definitionRevision,
    definitionTargetBinding:'test-definition-binding',namesConfigurationState:'missing',
    summary:{knownCompletions:0,targetCompletions:0,coverageNote:'本周本地完成',excludedNoGoal:0,partialWeeksExcluded:0},habits,
  };
}

async function pageFixture(initial=pageView()) {
  const server=createServer(async(req,res)=>{try{
    const file=resolve(root,'dist',new URL(req.url,'http://localhost').pathname.slice(1)||'index.html');
    if(!file.startsWith(resolve(root,'dist')+'/'))throw Error('invalid path');
    res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');
    res.end(await readFile(file));
  }catch{res.statusCode=404;res.end();}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  page.setDefaultTimeout(5000);
  const errors=[];page.on('pageerror',error=>errors.push(String(error.stack??error)));
  await page.addInitScript(({initial})=>{
    window.__view=initial;window.__calls=[];window.__definitionRevision=0;window.__completionRevision=0;
    window.__interfaceLanguage='zh';
    const labelForGoal=goal=>goal.kind==='weekly-count'?`每周 ${goal.days} 天`
      :goal.kind==='daily-time'?`每日 ${goal.standard}`:'每日完成';
    const makeCell=(completed,date='2026-10-14')=>({
      date,coverage:'local',status:completed?'completed':'unknown',hasRecord:completed,
      countsAsCompletion:completed,actualTimeLabel:null,localCompletionState:completed?'completed':'none',
      hasExternalCompletion:false,completionSourceLabels:completed?['Personal Dashboard']:[],details:[],localRecords:[],
    });
    const makeHistory=()=>Array.from({length:84},(_,index)=>{
      const date=new Date(Date.UTC(2026,9,14-(83-index))).toISOString().slice(0,10);
      return makeCell(false,date);
    });
    const makeHabit=(input,{currentGoal=input.goal,pendingGoal=null,completed=false}={})=>({
      key:input.key,name:input.name,localizedNames:input.localizedNames??{},
      isLocalDefinition:input.isLocalDefinition??true,createdLocally:input.createdLocally??true,
      emoji:input.emoji,group:input.group,startDate:input.startDate,currentGoal,pendingGoal,
      pendingGoalLabel:pendingGoal?labelForGoal(pendingGoal):null,active:true,canRecordCompletion:currentGoal?.kind!=='daily-time',
      goalKind:currentGoal?.kind??'daily-count',goalLabel:labelForGoal(currentGoal),
      weeklyTarget:currentGoal?.kind==='weekly-count'?currentGoal.days:null,completedCount:completed?1:0,
      weeklyPeriodStart:input.weeklyPeriodStart??(currentGoal?.kind==='weekly-count'&&input.startDate>'2026-10-12'?input.startDate:'2026-10-12'),
      weeklyPeriodPartial:currentGoal?.kind==='weekly-count'&&(input.weeklyPeriodPartial??(input.startDate>'2026-10-12')),
      sourceLabels:input.sourceLabels??['Personal Dashboard'],coverageLabel:'本地记录；没有外部历史覆盖',goalHistory:[],
      today:makeCell(completed),recent:[],history:makeHistory(),
    });
    const makeView=(habits,definitionRevision,completionRevision)=>{
      const comparable=habits.filter(habit=>habit.goalKind==='weekly-count'&&!habit.weeklyPeriodPartial);
      return {
      state:'ready',message:'Synthetic browser IPC fixture',readError:null,generatedAt:'2026-10-14T09:00:00-04:00',
      currentLivedDate:'2026-10-14',snapshotRevision:'snapshot-r1',displayRangeLabel:'2026-10-12 — 2026-10-18',
      rangeLabel:'2026-10-12 — 2026-10-18',producerLabel:'Synthetic · dashboard-local',completionRevision,
      completionTargetBinding:'test-completion-binding',definitionRevision,definitionTargetBinding:'test-definition-binding',
      namesConfigurationState:'missing',summary:{
        knownCompletions:comparable.reduce((sum,habit)=>sum+(habit.completedCount??0),0),
        targetCompletions:comparable.reduce((sum,habit)=>sum+(habit.weeklyTarget??0),0),
        coverageNote:'本周本地完成',excludedNoGoal:0,
        partialWeeksExcluded:habits.filter(habit=>habit.goalKind==='weekly-count'&&habit.weeklyPeriodPartial).length,
      },habits,
    };};
    window.__TAURI__={core:{invoke:async(command,args)=>{
      window.__calls.push({command,args});
      if(command==='application_identity')return {productName:'Personal Dashboard'};
      if(command==='interface_language_preferences')return {interfaceLanguage:window.__interfaceLanguage};
      if(command==='set_interface_language'){
        window.__interfaceLanguage=args.interfaceLanguage;
        return {interfaceLanguage:window.__interfaceLanguage};
      }
      if(command==='appearance_preferences')return {accentColor:'forest',backgroundImageState:'none',backgroundImageUrl:null,cleanupWarning:null};
      if(command==='habit_snapshot')return structuredClone(window.__view);
      if(command==='save_habit_definition'){
        const input=args.input;
        const existing=window.__view.habits.find(habit=>habit.key===input.key);
        const keepsGoal=existing&&JSON.stringify(input.goal)===JSON.stringify(existing.currentGoal);
        const habit=existing
          ? {...makeHabit({...input,key:existing.key,localizedNames:existing.localizedNames,
              isLocalDefinition:true,createdLocally:existing.createdLocally,sourceLabels:existing.sourceLabels,
              weeklyPeriodStart:existing.weeklyPeriodStart,weeklyPeriodPartial:existing.weeklyPeriodPartial},
              {currentGoal:existing.currentGoal,pendingGoal:keepsGoal?null:input.goal,completed:existing.today.countsAsCompletion}),
              today:existing.today,recent:existing.recent,history:existing.history}
          : makeHabit(input);
        window.__view.habits=existing
          ? window.__view.habits.map(item=>item.key===input.key?habit:item)
          : [...window.__view.habits,habit];
        window.__definitionRevision+=1;
        window.__view=makeView(window.__view.habits,`definition-r${window.__definitionRevision}`,window.__view.completionRevision);
        return structuredClone(window.__view);
      }
      if(command==='set_local_habit_completion'){
        const input=args.input;
        window.__view.habits=window.__view.habits.map(habit=>habit.key===input.habitKey
          ? {...habit,today:makeCell(input.completed),completedCount:input.completed?1:0}
          : habit);
        window.__completionRevision+=1;
        window.__view=makeView(window.__view.habits,window.__view.definitionRevision,`completion-r${window.__completionRevision}`);
        return structuredClone(window.__view);
      }
      throw Error('Unexpected IPC '+command);
    }}};
  },{initial});
  try{
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator('[data-workspace-destination=habits]').click();
    await page.locator('#add-habit').waitFor({state:'visible',timeout:5000});
    await page.waitForFunction(()=>window.__calls.some(call=>call.command==='habit_snapshot'));
    assert.deepEqual(errors,[],'production Habits page must render without browser errors');
  }catch(error){
    const debug=await page.evaluate(()=>({calls:window.__calls,body:document.body.innerText.slice(0,800)}));
    await browser.close();await new Promise(r=>server.close(r));
    throw new Error(String(error)+' '+JSON.stringify({errors,debug}));
  }
  return {page,errors,close:async()=>{await browser.close();await new Promise(r=>server.close(r));}};
}

test('Habits create, goal controls, edit and immediate local check-in use the saved readback',async()=>{
  const fixture=await pageFixture();const {page,errors}=fixture;
  try{
    await page.locator('#add-habit').click();
    const form=page.locator('#habit-definition-form');
    await form.waitFor({state:'visible'});
    assert.equal(await page.locator('#habit-definition-start-date').inputValue(),livedDate);
    await page.locator('#habit-definition-name').fill('Evening reading');
    const frequency=page.locator('#habit-definition-frequency');
    await frequency.selectOption('weekly-count');
    assert.equal(await page.locator('[data-habit-definition-weekly]').isVisible(),true);
    assert.equal(await page.locator('label[data-habit-definition-time]').isVisible(),false);
    await page.locator('#habit-definition-weekly-days').fill('3');
    await frequency.selectOption('daily-time');
    assert.equal(await page.locator('[data-habit-definition-weekly]').isVisible(),false);
    assert.equal(await page.locator('label[data-habit-definition-time]').isVisible(),true);
    assert.equal(await page.locator('[data-habit-definition-relation]').isVisible(),true);
    await page.locator('#habit-definition-time').fill('22:45');
    await page.locator('#habit-definition-relation').selectOption('next-day');
    await frequency.selectOption('weekly-count');
    await page.locator('#habit-definition-emoji').fill('📖');
    await page.locator('#habit-definition-group').fill('Evening');
    await page.locator('#habit-definition-submit').click();
    await page.waitForFunction(()=>window.__calls.some(call=>call.command==='save_habit_definition'))
      .catch(async()=>{throw new Error(JSON.stringify(await page.evaluate(()=>({
        calls:window.__calls,form:document.querySelector('#habit-definition-form')?.outerHTML,
        status:document.querySelector('#habit-definition-status')?.textContent,
        validity:document.querySelector('#habit-definition-form')?.checkValidity(),
      }))));});
    await page.locator('.habit-snapshot-row').filter({hasText:'Evening reading'}).waitFor({state:'visible'})
      .catch(async()=>{throw new Error(JSON.stringify(await page.evaluate(()=>({
        calls:window.__calls,view:window.__view,body:document.body.innerText.slice(-1200),
        readyHidden:document.querySelector('#habits-ready')?.hidden,
        rows:[...document.querySelectorAll('.habit-snapshot-row')].map(row=>row.outerHTML.slice(0,500)),
      }))));});

    const createCall=await page.evaluate(()=>window.__calls.find(call=>call.command==='save_habit_definition'));
    assert.equal(createCall.args.input.mode,'create');
    assert.equal(createCall.args.input.goal.kind,'weekly-count');
    assert.equal(createCall.args.input.goal.days,3);
    const key=createCall.args.input.key;
    const check=page.locator(`input[data-habit-completion-key="${key}"]`);
    await check.waitFor({state:'visible'});
    assert.equal(await check.isDisabled(),false,'created Habit is immediately checkable from readback');
    assert.match(await page.locator(`.habit-snapshot-row[data-habit-key="${key}"]`).innerText(),/部分周.*从 2026-10-14 起.*完整周目标 3 天/);
    assert.match(await page.locator('#habits-summary-total').innerText(),/0\s*\/\s*0/);
    assert.match(await page.locator('#habits-summary-note').innerText(),/1 个部分周未纳入完整周合计/);
    await check.click();
    await page.waitForFunction(()=>window.__calls.some(call=>call.command==='set_local_habit_completion'));
    assert.equal(await check.isChecked(),true,'completion readback updates the existing Habits row');
    assert.match(await page.locator('#habits-summary-total').innerText(),/0\s*\/\s*0/);

    await page.locator(`button[data-habit-edit="${key}"]`).click();
    assert.equal(await page.locator('#habit-definition-name').inputValue(),'Evening reading');
    assert.equal(await page.locator('#habit-definition-start-date').inputValue(),livedDate);
    assert.equal(await page.locator('#habit-definition-weekly-days').inputValue(),'3');
    await page.locator('#habit-definition-cancel').click();
    await page.locator(`.habit-snapshot-row[data-habit-key="${key}"]`).click({button:'right'});
    await form.waitFor({state:'visible'});
    assert.equal(await page.locator('#habit-definition-name').inputValue(),'Evening reading');
    await page.locator('#habit-definition-name').fill('Evening reading · revised');
    await page.locator('#habit-definition-weekly-days').fill('5');
    await page.locator('#habit-definition-submit').click();
    const revisedRow=page.locator('.habit-snapshot-row').filter({hasText:'Evening reading · revised'});
    await revisedRow.waitFor({state:'visible'});
    assert.match(await revisedRow.innerText(),/📖/);
    assert.match(await revisedRow.innerText(),/Evening/);
    assert.match(await revisedRow.innerText(),/每周 5 天/,'readback surfaces the pending next-cycle goal');
    const edits=await page.evaluate(()=>window.__calls.filter(call=>call.command==='save_habit_definition'));
    assert.equal(edits.length,2);
    assert.equal(edits[1].args.input.mode,'edit');
    assert.equal(edits[1].args.input.key,key,'editing preserves stable identity');
    assert.equal(edits[1].args.input.goal.days,5);
    assert.deepEqual(errors,[],'create, completion and edit interactions produce no browser errors');
  }finally{await fixture.close();}
});

test('partial weekly progress is explicit in Chinese and English and excluded from comparable total',async()=>{
  const partial=habitFrom({
    key:'local-partial-week',name:'Walk',startDate:'2026-10-14',
    goal:{kind:'weekly-count',days:5},weeklyPeriodStart:'2026-10-14',weeklyPeriodPartial:true,
  });
  partial.completedCount=1;
  partial.history=historyCells().map(cell=>cell.date===livedDate?{...cell,countsAsCompletion:true}:cell);
  const initial=pageView([partial]);
  initial.summary={knownCompletions:0,targetCompletions:0,coverageNote:'本周本地完成',excludedNoGoal:0,partialWeeksExcluded:1};
  const fixture=await pageFixture(initial);const {page,errors}=fixture;
  try{
    const row=page.locator('.habit-snapshot-row[data-habit-key="local-partial-week"]');
    await row.waitFor({state:'visible'});
    assert.match(await row.innerText(),/部分周.*从 2026-10-14 起.*完整周目标 5 天/);
    assert.match(await page.locator('#habits-summary-total').innerText(),/0\s*\/\s*0/);
    assert.match(await page.locator('#habits-summary-note').innerText(),/1 个部分周未纳入完整周合计/);
    await page.locator('#workspace-language').click();
    await page.waitForFunction(()=>window.__calls.some(call=>call.command==='set_interface_language'&&call.args.interfaceLanguage==='en'));
    await page.waitForFunction(()=>window.__interfaceLanguage==='en');
    assert.match(await row.innerText(),/Partial week.*since 2026-10-14.*full-week target 5 days/);
    assert.match(await page.locator('#habits-summary-note').innerText(),/Partial weeks excluded from the comparable full-week total: 1/);
    assert.deepEqual(errors,[],'language switching rerenders the partial-week row without browser errors');
  }finally{await fixture.close();}
});

test('a local source-Habit name takes precedence over localizedNames and edit prefill',async()=>{
  const source=habitFrom({
    key:'exercise',name:'Source exercise',isLocalDefinition:false,createdLocally:false,
    localizedNames:{zh:'锻炼',en:'Exercise'},sourceLabels:['TickTick'],
    goal:{kind:'weekly-count',days:3},
  });
  source.today={...localCell(false),status:'completed',hasExternalCompletion:true,
    details:[{sourceLabel:'TickTick',note:'source evidence preserved'}]};
  const fixture=await pageFixture(pageView([source]));const {page,errors}=fixture;
  try{
    const row=page.locator('.habit-snapshot-row[data-habit-key="exercise"]');
    await row.waitFor({state:'visible'});
    assert.match(await row.innerText(),/锻炼/,'the untouched source uses the current-language name');
    await page.locator('button[data-habit-edit="exercise"]').click();
    const name=page.locator('#habit-definition-name');
    assert.equal(await name.inputValue(),'锻炼','edit form starts with the name the user sees');
    await name.fill('力量散步');
    await page.locator('#habit-definition-submit').click();
    await page.waitForFunction(()=>window.__calls.some(call=>call.command==='save_habit_definition'));
    await page.waitForFunction(()=>document.querySelector('.habit-snapshot-row[data-habit-key="exercise"]')?.innerText.includes('力量散步'));
    assert.match(await row.innerText(),/力量散步/);
    assert.deepEqual(await page.evaluate(()=>{
      const habit=window.__view.habits.find(item=>item.key==='exercise');
      return {name:habit.name,localizedNames:habit.localizedNames,sourceLabels:habit.sourceLabels,today:habit.today};
    }),{
      name:'力量散步',localizedNames:{zh:'锻炼',en:'Exercise'},sourceLabels:['TickTick'],
      today:{...localCell(false),status:'completed',hasExternalCompletion:true,
        details:[{sourceLabel:'TickTick',note:'source evidence preserved'}]},
    });
    await page.locator('#workspace-language').click();
    await page.waitForFunction(()=>window.__calls.some(call=>call.command==='set_interface_language'&&call.args.interfaceLanguage==='en'));
    await page.waitForFunction(()=>window.__interfaceLanguage==='en');
    assert.match(await row.innerText(),/力量散步/,'the local name remains visible in English');
    await page.locator('button[data-habit-edit="exercise"]').click();
    assert.equal(await name.inputValue(),'力量散步','edit form prefills the persisted local name');
    assert.deepEqual(errors,[],'localized-name editing and language switching produce no browser errors');
  }finally{await fixture.close();}
});
