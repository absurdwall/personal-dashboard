import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE_PATH
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href
  : 'playwright');
const root=resolve(import.meta.dirname,'../..');
const livedDate='2026-10-14';
const historyDates=['2026-10-12','2026-10-13','2026-10-14'];

function cell(date,status,completed=false) {
  const observation=status==='completed'
    ? {kind:'observation',sourceLabel:'Synthetic source',status:'completed',evidence:'check-in',observedAt:`${date}T08:00:00-04:00`,note:null}
    : status==='notDone'
      ? {kind:'observation',sourceLabel:'Synthetic source',status:'not-done',evidence:'check-in',observedAt:`${date}T18:00:00-04:00`,note:null}
      : {kind:'noRecord'};
  return {
    date,coverage:status==='unknown'?'unknown':'complete',status,hasRecord:status!=='unknown',
    countsAsCompletion:completed,actualTimeLabel:null,localCompletionState:'none',hasExternalCompletion:completed,
    completionSourceLabels:completed?['Synthetic source']:[],details:status==='unknown'?[]:[observation],localRecords:[],
  };
}

function makeHabit(active=true) {
  return {
    key:'local-reading',name:'Evening reading',localizedNames:{},isLocalDefinition:true,localNameOverride:false,
    createdLocally:true,emoji:'📖',group:'Evening',startDate:'2026-10-12',
    currentGoal:{kind:'daily-count'},pendingGoal:null,pendingGoalLabel:null,active,canRecordCompletion:true,
    goalKind:'daily-count',goalLabel:'每日完成',weeklyTarget:null,completedCount:null,weeklyPeriodStart:null,
    weeklyPeriodPartial:false,sourceLabels:['Synthetic source'],coverageLabel:'Complete synthetic evidence',goalHistory:[],
    today:cell(livedDate,'notDone'),recent:historyDates.map(date=>cell(date,date==='2026-10-14'?'notDone':'completed',date!=='2026-10-14')),
    history:historyDates.map(date=>cell(date,date==='2026-10-14'?'notDone':'completed',date!=='2026-10-14')),
  };
}

function makeView(active=true,revision='definition-r1') {
  return {
    state:'ready',message:'Synthetic browser IPC fixture',readError:null,generatedAt:'2026-10-14T09:00:00-04:00',
    currentLivedDate:livedDate,snapshotRevision:'snapshot-r1',displayRangeLabel:'2026-10-12 — 2026-10-14',
    rangeLabel:'2026-10-12 — 2026-10-14',producerLabel:'Synthetic · local fixture',completionRevision:'completion-r1',
    completionTargetBinding:'completion-binding',definitionRevision:revision,definitionTargetBinding:'definition-binding',
    namesConfigurationState:'missing',summary:{knownCompletions:2,targetCompletions:3,coverageNote:'Synthetic source',
      excludedNoGoal:0,partialWeeksExcluded:0},habits:[makeHabit(active)],
  };
}

async function pageFixture(viewport={width:1280,height:800}) {
  const server=createServer(async(req,res)=>{try {
    const file=resolve(root,'dist',new URL(req.url,'http://localhost').pathname.slice(1)||'index.html');
    if(!file.startsWith(resolve(root,'dist')+'/'))throw Error('invalid path');
    res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');
    res.end(await readFile(file));
  }catch{res.statusCode=404;res.end('not found');}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport});
  page.setDefaultTimeout(5000);
  const errors=[];page.on('pageerror',error=>errors.push(String(error.stack??error)));
  await page.addInitScript(({initial})=>{
    const livedDate='2026-10-14';
    const historyDates=['2026-10-12','2026-10-13','2026-10-14'];
    window.__view=initial;window.__calls=[];window.__interfaceLanguage='zh';window.__lifecycleWrites=[];
    window.__canonicalRecords=[
      {habitKey:'local-reading',livedDate:'2026-10-12',state:'completed',recordedCompletedAt:'2026-10-12T08:00:00-04:00',modifiedAt:'2026-10-12T08:00:00-04:00',changes:[]},
      {habitKey:'local-reading',livedDate:'2026-10-13',state:'completed',recordedCompletedAt:'2026-10-13T08:00:00-04:00',modifiedAt:'2026-10-13T08:00:00-04:00',changes:[]},
    ];
    const historicalCells=()=>[
      { ...window.__view.habits[0].history.find(cell=>cell.date==='2026-10-12'),status:'completed',coverage:'complete',hasRecord:true,countsAsCompletion:true,details:[{kind:'observation',sourceLabel:'Synthetic source',status:'completed',observedAt:'2026-10-12T08:00:00-04:00'}] },
      { ...window.__view.habits[0].history.find(cell=>cell.date==='2026-10-13'),status:'completed',coverage:'complete',hasRecord:true,countsAsCompletion:true,details:[{kind:'observation',sourceLabel:'Synthetic source',status:'completed',observedAt:'2026-10-13T08:00:00-04:00'}] },
      { ...window.__view.habits[0].history.find(cell=>cell.date==='2026-10-14'),status:'notDone',coverage:'complete',hasRecord:true,countsAsCompletion:false,details:[{kind:'observation',sourceLabel:'Synthetic source',status:'not-done',observedAt:'2026-10-14T18:00:00-04:00'}] },
    ];
    const historyView=dates=>{
      const selected=dates.filter(date=>historyDates.includes(date));
      const context={
        key:'local-reading',name:'Evening reading',localizedNames:{},isLocalDefinition:true,createdLocally:true,
        sourceExists:true,sourceActive:window.__view.habits[0].active,startDate:window.__historyStartOverride??'2026-10-12',active:window.__view.habits[0].active,
        currentGoal:{kind:'daily-count'},baseGoal:{kind:'daily-count'},sourceGoalHistory:[{weekOf:'2026-10-12',goal:{kind:'daily-count'}}],
        goalRevisions:[],lifecycleChanges:window.__view.habits[0].active?[]:[{kind:'deactivated',effectiveOn:'2026-10-14',changedAt:'2026-10-14T12:00:00-04:00'}],
      };
      return {
        domain:'habits',fromDate:dates[0],toDate:dates.at(-1),currentLivedDate:livedDate,requestedDates:dates,
        canonical:{state:'ready',revision:window.__view.completionRevision,targetBinding:'completion-binding',
          records:window.__canonicalRecords.filter(record=>selected.includes(record.livedDate)),
          earliestLivedDateByHabit:{'local-reading':'2026-10-12'}},
        projection:{state:'ready',message:'Synthetic projection',generatedAt:'2026-10-14T09:00:00-04:00',
          rangeLabel:'2026-10-12 — 2026-10-14',displayRangeLabel:'2026-10-12 — 2026-10-14',producerLabel:'Synthetic source',
          habits:[{key:'local-reading',history:historicalCells().filter(cell=>selected.includes(cell.date))}]},
        projectionRevision:'snapshot-r1',catalogState:'ready',catalogRevision:window.__view.definitionRevision,
        definitionTargetBinding:'definition-binding',habitContexts:[context],coverage:'Synthetic bounded evidence',
      };
    };
    const historyStatistics=habitKey=>{
      const hasToday=window.__canonicalRecords.some(record=>record.habitKey===habitKey&&record.livedDate===livedDate&&record.state==='completed');
      const metric=(value,precision='at-least',unit='days')=>({value,precision,unit});
      const month=metric(hasToday?3:2,hasToday?'confirmed':'at-least');
      const highest=metric(2,'at-least');
      return {
        habitKey,stats:{month,allTime:month,currentStreak:highest,highestStreak:highest,
          highestStreakByUnit:{days:highest,weeks:null},coverageFrom:window.__historyStartOverride??'2026-10-12',
          coverageTo:livedDate,coverageIsComplete:false},
        historicalGoals:[{effectiveOn:'2026-10-12',effectiveThrough:null,goal:{kind:'daily-count'},source:'start'}],
        rangeFrom:window.__historyStartOverride??'2026-10-12',rangeTo:livedDate,currentLivedDate:livedDate,
        canonicalState:'ready',canonicalRevision:window.__view.completionRevision,projectionState:'ready',
        projectionRevision:'snapshot-r1',catalogRevision:window.__view.definitionRevision,
        definitionTargetBinding:'definition-binding',coverage:'Synthetic bounded evidence',
      };
    };
    window.__TAURI__={core:{invoke:async(command,args)=>{
      window.__calls.push({command,args});
      if(command==='application_identity')return {productName:'Personal Dashboard'};
      if(command==='interface_language_preferences')return {interfaceLanguage:window.__interfaceLanguage};
      if(command==='set_interface_language'){
        window.__interfaceLanguage=args.interfaceLanguage;return {interfaceLanguage:window.__interfaceLanguage};
      }
      if(command==='appearance_preferences')return {accentColor:'forest',backgroundImageState:'none',backgroundImageUrl:null,cleanupWarning:null};
      if(command==='habit_snapshot')return structuredClone(window.__view);
      if(command==='read_habit_completion_history')return historyView(args.dates);
      if(command==='read_habit_history_statistics')return historyStatistics(args.habitKey);
      if(command==='save_habit_definition')return structuredClone(window.__view);
      if(command==='set_local_habit_completion'){
        const input=args.input;const existing=window.__canonicalRecords.find(record=>record.habitKey===input.habitKey&&record.livedDate===input.livedDate);
        if(input.completed){
          const record={habitKey:input.habitKey,livedDate:input.livedDate,state:'completed',recordedCompletedAt:`${input.livedDate}T19:00:00-04:00`,modifiedAt:`${input.livedDate}T19:00:00-04:00`,changes:[]};
          if(existing)Object.assign(existing,record);else window.__canonicalRecords.push(record);
          window.__view.habits=window.__view.habits.map(habit=>habit.key===input.habitKey?{...habit,today:{...habit.today,status:'completed',hasRecord:true,countsAsCompletion:true,localCompletionState:'completed'}}:habit);
        }else if(existing){existing.state='withdrawn';existing.recordedCompletedAt=null;}
        window.__view.completionRevision='completion-r2';
        return structuredClone(window.__view);
      }
      if(command==='set_habit_lifecycle'){
        const input=args.input;window.__lifecycleWrites.push(structuredClone(input));
        window.__view.habits=window.__view.habits.map(habit=>habit.key===input.habitKey?{...habit,active:input.active}:habit);
        window.__view.definitionRevision='definition-r2';
        return structuredClone(window.__view);
      }
      throw Error('Unexpected IPC '+command);
    }}};
  },{initial:makeView()});
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.locator('[data-workspace-destination=habits]').click();
  await page.waitForFunction(()=>window.__calls.some(call=>call.command==='habit_snapshot'));
  await page.locator('#habits-ready').waitFor({state:'visible'});
  assert.deepEqual(errors,[],'production Habits page renders without browser errors');
  return {page,errors,close:async()=>{await browser.close();await new Promise(r=>server.close(r));}};
}

test('deliberate detail entry preserves the Today list and local lifecycle reads back',async()=>{
  const fixture=await pageFixture();const {page,errors}=fixture;
  try {
    const row=page.locator('.habit-snapshot-row[data-habit-key="local-reading"]');
    await row.locator('button[data-habit-expand]').click();
    assert.equal(await row.locator('.habit-history').isVisible(),true,'existing inline 12-week disclosure still works');
    await row.locator('button[data-habit-open]').click();
    await page.locator('#habit-detail-view').waitFor({state:'visible'});
    await page.waitForFunction(()=>['ready','error'].includes(document.querySelector('#habit-detail-status').dataset.state));
    assert.equal(await page.locator('#habit-detail-status').getAttribute('data-state'),'ready',JSON.stringify(await page.evaluate(()=>({calls:window.__calls,status:document.querySelector('#habit-detail-status')?.outerHTML,body:document.querySelector('#habit-detail-view')?.innerText}))));
    assert.equal(await page.locator('.habits-week-summary').isVisible(),true,'weekly summary remains beside the detail');
    assert.equal(await page.locator('#habits-today-default').isHidden(),true,'detail replaces only the Today-side content');
    assert.match(await page.locator('#habit-detail-month').innerText(),/至少 2 天/);
    assert.match(await page.locator('#habit-detail-current-streak').innerText(),/至少 2 天/,'open current day does not break the active streak');
    assert.match(await page.locator('#habit-detail-historical-goals').innerText(),/每日完成/,'backend historical goal segments are presented in the detail');
    assert.match(await page.locator('#habit-detail-coverage').innerText(),/2026-10-12.*2026-10-14/);
    assert.equal(await page.locator('#habit-detail-record-list .habit-detail-record').count(),3);
    const pageCalls=await page.evaluate(()=>window.__calls.filter(call=>call.command==='read_habit_completion_history'));
    const statisticsCalls=await page.evaluate(()=>window.__calls.filter(call=>call.command==='read_habit_history_statistics'));
    assert.ok(statisticsCalls.length>=1,'the Rust statistics application seam supplies detail metrics');
    assert.ok(statisticsCalls.every(call=>call.args.habitKey==='local-reading'));
    assert.ok(pageCalls.length>=1);
    assert.ok(pageCalls.every(call=>call.args.dates.length<=366));
    assert.ok(pageCalls.every(call=>call.args.dates.every((date,index)=>index===0||date===new Date(Date.parse(call.args.dates[index-1]+'T00:00:00Z')+86400000).toISOString().slice(0,10))));

    const checkIn=page.locator('#habit-detail-checkin input[data-habit-completion-key="local-reading"]');
    await checkIn.check();
    await page.waitForFunction(()=>window.__calls.some(call=>call.command==='set_local_habit_completion'));
    await page.waitForFunction(()=>document.querySelector('#habit-detail-month').textContent==='3 天');
    assert.equal(await page.locator('#habit-detail-record-list .habit-detail-record').count(),3,'saved Today completion appears in the refreshed history');

    await page.locator('#habit-detail-edit').click();
    assert.equal(await page.locator('#habit-definition-name').inputValue(),'Evening reading','detail reuses the shared definition editor');
    await page.locator('#habit-definition-cancel').click();
    await page.locator('#habit-detail-back').click();
    assert.equal(await row.locator('.habit-history').isVisible(),true,'back restores the same expanded Today list');
    await row.locator('button[data-habit-open]').click();
    await page.waitForFunction(()=>document.querySelector('#habit-detail-status').dataset.state==='ready');
    await page.locator('#habit-detail-lifecycle').click();
    await page.waitForFunction(()=>window.__lifecycleWrites.length===1);
    assert.equal(await page.evaluate(()=>window.__lifecycleWrites[0].active),false);
    assert.equal(await page.evaluate(()=>window.__lifecycleWrites[0].expectedRevision),'definition-r1');
    await page.waitForFunction(()=>window.__view.habits[0].active===false);
    await page.waitForTimeout(100);
    assert.equal(await page.locator('#habits-inactive').evaluate(node=>node.hidden),false,JSON.stringify({...(await page.evaluate(()=>({calls:window.__calls,active:window.__view.habits[0].active,readyHidden:document.querySelector('#habits-ready').hidden,defaultHidden:document.querySelector('#habits-today-default').hidden,inactive:document.querySelector('#habits-inactive').outerHTML,status:document.querySelector('#habit-detail-status').outerHTML}))),errors}));

    await page.locator('#habit-detail-back').click();
    assert.equal(await page.locator('#habit-detail-view').isHidden(),true);
    assert.equal(await page.locator('#habits-inactive').isHidden(),false);
    await page.locator('#habits-inactive summary').click();
    await page.locator('#habits-inactive-list [data-habit-lifecycle-active="true"]').click();
    await page.waitForFunction(()=>window.__lifecycleWrites.length===2&&window.__view.habits[0].active===true);
    assert.equal(await page.evaluate(()=>window.__lifecycleWrites[1].active),true,'inactive entry has a direct restore control');
    assert.deepEqual(errors,[],'detail, edit, deactivate and restore produce no browser errors');
  } finally {await fixture.close();}
});

test('detail remains compact and usable at the ticket viewport sizes',async()=>{
  const fixture=await pageFixture();const {page}=fixture;
  try {
    await page.evaluate(()=>window.__historyStartOverride='2024-01-01');
    await page.locator('.habit-snapshot-row[data-habit-key="local-reading"] [data-habit-open]').click();
    await page.locator('#habit-detail-status').waitFor({state:'visible'});
    await page.waitForFunction(()=>['ready','error'].includes(document.querySelector('#habit-detail-status').dataset.state));
    assert.equal(await page.locator('#habit-detail-status').getAttribute('data-state'),'ready',JSON.stringify(await page.evaluate(()=>({calls:window.__calls,status:document.querySelector('#habit-detail-status')?.outerHTML}))));
    const output=process.env.PDEX25_SCREENSHOT_DIR;
    const historyCalls=await page.evaluate(()=>window.__calls.filter(call=>call.command==='read_habit_completion_history'));
    assert.equal(historyCalls.length,4,'a multi-year lifetime is read in three bounded pages after the overview');
    assert.ok(historyCalls.slice(1).every(call=>call.args.dates.length<=366));
    assert.equal(await page.locator('#habit-detail-coverage').innerText().then(text=>text.includes('2024-01-01')),true);
    if(output)await mkdir(output,{recursive:true});
    for(const [width,height] of [[1280,800],[1280,720],[830,758],[680,560]]){
      await page.setViewportSize({width,height});
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const layout=await page.evaluate(()=>{
        const detail=document.querySelector('#habit-detail-view').getBoundingClientRect();
        const stats=document.querySelector('.habit-detail-stats').getBoundingClientRect();
        const action=document.querySelector('#habit-detail-lifecycle').getBoundingClientRect();
        return {viewport:innerWidth,bodyScrollWidth:document.documentElement.scrollWidth,detailWidth:detail.width,
          statsWidth:stats.width,statsColumns:getComputedStyle(document.querySelector('.habit-detail-stats')).gridTemplateColumns,
          actionWidth:action.width,summaryVisible:!document.querySelector('.habits-week-summary').hidden,
          detailVisible:!document.querySelector('#habit-detail-view').hidden};
      });
      assert.equal(layout.bodyScrollWidth<=width,true,`${width}x${height} has no horizontal viewport overflow: ${JSON.stringify(layout)}`);
      assert.equal(layout.detailVisible,true);assert.equal(layout.summaryVisible,true);
      assert.ok(layout.actionWidth<100,`${width}x${height} keeps lifecycle action quiet and compact`);
      if(output){
        await page.locator('#habit-detail-heading').scrollIntoViewIfNeeded();
        assert.equal(await page.locator('#habit-detail-heading').isVisible(),true,`${width}x${height} shows the detail heading in the captured viewport`);
        await page.screenshot({path:resolve(output,`pdex-25-habits-${width}x${height}.png`)});
      }
      if(width===680){
        await page.locator('#habit-detail-record-list').scrollIntoViewIfNeeded();
        assert.equal(await page.locator('#habit-detail-record-list .habit-detail-record').first().isVisible(),true,'narrow detail content is reachable by page scroll');
        if(output)await page.screenshot({path:resolve(output,'pdex-25-habits-680x560-history.png')});
      }
    }
  } finally {await fixture.close();}
});
