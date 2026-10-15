import assert from "node:assert/strict";
import test, { after } from "node:test";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const output = mkdtempSync(join(tmpdir(), "pdex-shared-axis-"));
after(() => rmSync(output, { recursive: true, force: true }));
execFileSync(join(root, "node_modules/.bin/tsc"), ["--outDir", output], { cwd: root });
const main = readFileSync(join(output, "main.js"), "utf8");
const slice = (from: string, to: string) => main.slice(main.indexOf(from), main.indexOf(to, main.indexOf(from)));
const fn = (name: string) => { const rest = main.slice(main.search(new RegExp(`function ${name}\\(`))); return rest.slice(0, /^}\n/m.exec(rest)!.index + 2); };
let probe: string | null = null;
function render(check: string, width = 830, height = 758): any {
  if (!probe) { probe = join(output, "webkit"); execFileSync("swiftc", [join(root, "tests/frontend/helpers/rendered-today-layout.swift"), "-o", probe], { timeout: 60000 }); }
  writeFileSync(join(output, "index.html"), readFileSync(join(root, "frontend/index.html"), "utf8").replace(/<script[^]*?<\/script>/g, ""));
  copyFileSync(join(root, "frontend/styles.css"), join(output, "styles.css"));
  const bindings = ["todayTimeline:today-baseline-timeline", "todayContinuousAxis:today-continuous-axis", "todayHourTicks:today-hour-ticks", "todayTimedEvents:today-timed-events", "todayTimedDurations:today-timed-duration", "todayTimedDetails:today-timed-details", "todayTimedEmpty:today-timed-empty", "todayCurrentArrangementUnlocated:today-current-arrangement-unlocated", "todayConfirmedFactsUnlocated:today-confirmed-facts-unlocated", "todayCurrentTime:today-current-time", "todayLocateNowButton:today-locate-now", "todayUnlocatedTimeRegion:today-unlocated-time-region", "todayUnlocatedTimeShortcut:today-unlocated-time-shortcut", "todaySideRegion:today-side-region", "todayAxisScrollSurface:today-axis-scroll-surface", "todayAxisTaskPopup:today-axis-task-popup", "todayAxisTaskPopupHeading:today-axis-task-popup-heading", "todayAxisTaskPopupContent:today-axis-task-popup-content", "todayAxisTaskPopupStatus:today-axis-task-popup-status", "todayAxisTaskPopupClose:today-axis-task-popup-close", "todayAxisFactPopup:today-axis-fact-popup", "todayAxisFactPopupHeading:today-axis-fact-popup-heading", "todayAxisFactPopupContent:today-axis-fact-popup-content", "todayAxisFactPopupClose:today-axis-fact-popup-close"].map(binding => { const [name,id] = binding.split(":"); return `const ${name} = document.getElementById('${id}');`; }).join("\n");
  const pure = ["today-time-axis", "task-presentation", "interface-language"].map(name => readFileSync(join(output, `${name}.js`), "utf8").replaceAll("export ", "")).join("\n");
  const script = `(() => {
    document.getElementById('workspace-destination-today').hidden = false;
    document.getElementById('today-ready').hidden = false;
    document.getElementById('today-phase-daytime').hidden = false;
    document.getElementById('today-phase-morning').hidden = true;
    document.getElementById('today-handoff').hidden = true;
    ${pure}
    ${bindings}
      ${main.slice(main.indexOf('const todayUnlocatedNarrow ='), main.indexOf('todayUnlocatedTimeShortcut?.addEventListener("click"'))}
    const workspaceInformation = document.querySelector('.workspace-information');
    let todayAxisFactPopupOpener = null;
    let todayAxisFollowState = 'following', currentInterfaceLanguage = 'en', currentWorkspaceDestination = 'today', programmaticTodayAxisScrollUntil = 0;
    const t = (key, values) => interfaceCopy(key, 'en', values);
    const setCopy = (node,key,values) => { node.textContent = t(key,values); node.dataset.i18n = key; };
    ${fn('taskStateCopyKey')}
    const entry = (text,startMinute,endMinute=null) => ({text,startMinute,endMinute,period:null,sourceDate:'2026-10-01',continuesFromPreviousDay:false,continuesIntoNextDay:false});
    let currentTodayView = {date:'2026-10-01',isToday:true,currentTime:'12:00',tasks:{lists:[],tasks:[{id:'same-task',listId:'inbox',name:'Task at 08:30',date:'2026-10-01',time:'08:30',state:'pending',timePassed:true,deletedAt:null}]},timeAxis:{currentArrangement:[entry('08:00–10:00 Plan',480,600),entry('14:00 Plan alone',840)],confirmedFacts:[entry('08:30 Fact',510)],unlocatedCurrentArrangement:[],unlocatedConfirmedFacts:[]}};
    ${slice('function todayTimelineItem(', 'function todayEvidenceGroup(')}
    ${slice('function scrollTodayAxisToNow(', 'function scheduleTodayAxisFollowScroll(')}
    ${fn('adjustTodayAxisZoom')}
    ${main.slice(main.lastIndexOf('document.getElementById("today-axis-zoom-out")'), main.indexOf('todayAxisTaskPopupClose?.addEventListener'))}
    renderTodayTimeAxis(currentTodayView);
    const rect = node => { const r=node.getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}; };
    ${check}
  })()`;
  writeFileSync(join(output, "check.js"), script);
  return JSON.parse(execFileSync(probe, [join(output, "index.html"), join(output, "check.js"), String(width), String(height)], { encoding: "utf8", timeout: 60000 }));
}

test("plans, point Tasks and facts share a scale with separate clickable collision columns and full-width solitary cards", { skip: process.platform !== "darwin" }, () => {
  for (const [width,height] of [[1280,720], [830,758], [680,758]]) {
    const result = render(`
      const markers=[...todayTimedEvents.querySelectorAll('li')];
      const cluster=markers.filter(m=>m.dataset.stackId===markers[0].dataset.stackId);
      let openedTask='';
      openTodayAxisTaskPopup=id=>{openedTask=id;};
      const solitary=markers.find(m=>m.querySelector('.today-axis-marker-link').dataset.axisItemText==='14:00 Plan alone');
      const clicks=cluster.map(m=>{
        const action=m.querySelector('.today-axis-marker-link');
        const target=action.getAttribute('href') ? document.querySelector(action.getAttribute('href')) : null;
        action.click();
        const editor=document.querySelector('dialog.plan-time-editor[open]');
        const fact=m.classList.contains('is-fact');
        const outcome={task:m.dataset.taskId||'',fact,editable:Boolean(m.dataset.planId),detail:Boolean(target?.open),
          factPopup:todayAxisFactPopup.open,editor:Boolean(editor),taskPopup:openedTask};
        editor?.close();
        if(fact)closeTodayAxisFactPopup(false);
        todayAxisTaskPopup?.close();
        return outcome;
      });
      return JSON.stringify({cluster:cluster.map(rect),solo:rect(solitary),plot:rect(document.querySelector('.today-axis-plot')),clicks,sources:cluster.map(m=>m.querySelector('.today-axis-marker-source-status').textContent),scales:todayContinuousAxis.querySelectorAll('.today-hour-scale').length,viewportHeight:window.innerHeight});
    `, width, height);
    assert.equal(result.viewportHeight,height);
    assert.equal(result.scales, 1);
    assert.equal(result.cluster.length, 3);
    const ordered = result.cluster.toSorted((a: any,b: any) => a.left-b.left);
    ordered.slice(1).forEach((r: any,i: number) => assert.ok(r.left >= ordered[i].right - 0.5, `viewport ${width}: collision targets cannot cover one another: ${JSON.stringify(result)}`));
    assert.ok(result.solo.width >= result.plot.width - 12, "unconflicted card uses the row");
    assert.equal(result.clicks.length,3);
    for(const click of result.clicks) {
      if (click.task) {
        assert.equal(click.taskPopup,click.task);
        assert.equal(click.editor,false);
        assert.equal(click.detail,false);
      } else if (click.editable) {
        assert.equal(click.editor,true);
        assert.equal(click.detail,false);
      } else if(click.fact) {
        assert.equal(click.editor,false);
        assert.equal(click.detail,false);
        assert.equal(click.factPopup,true);
      } else {
        assert.equal(click.editor,false);
        assert.equal(click.detail,true);
      }
    }
    assert.ok(result.sources.some((s:string)=>s.includes('arrangement')));
    assert.ok(result.sources.some((s:string)=>s.includes('fact')));
    assert.ok(result.sources.some((s:string)=>s.includes('Task')));
  }
});

test("read-only arrangement markers use semantic titles while full arrangement and fact text stays reachable", { skip: process.platform !== "darwin" }, () => {
  const result = render(`
    currentTodayView={...currentTodayView,tasks:{lists:[],tasks:[]},timeAxis:{
      currentArrangement:[
        {...entry('Prepare brief; keep the complete source note A',510),title:'Prepare brief',planPrecision:'exactPoint'},
        {...entry('Prepare brief; keep the complete source note B',530),title:'Prepare brief',planPrecision:'exactPoint'}
      ],
      confirmedFacts:[entry('10:30 Confirmed fact; retain the complete evidence',630)],
      unlocatedCurrentArrangement:[],unlocatedConfirmedFacts:[]
    }};
    renderTodayTimeAxis(currentTodayView);
    const markers=[...todayTimedEvents.querySelectorAll('.today-axis-marker')];
    const details=[...todayTimedDetails.querySelectorAll('details')];
    const before={titles:markers.map(marker=>marker.querySelector('.today-axis-marker-title').textContent),
      fullSourceText:markers.map(marker=>marker.querySelector('.today-axis-marker-link').dataset.axisItemText),
      arrangementDetails:details.filter(detail=>detail.id.startsWith('today-axis-arrangement-')).map(detail=>detail.querySelector(':scope > p').textContent),
      factDetails:details.filter(detail=>detail.id.startsWith('today-axis-facts-')).map(detail=>detail.querySelector(':scope > p').textContent),
      editableControls:details.flatMap(detail=>[...detail.querySelectorAll('button')]).length,
      detailsVisible:!todayTimedDetails.hidden};
    markers[0].querySelector('.today-axis-marker-link').click();
    markers[2].querySelector('.today-axis-marker-link').click();
    const factPopup={open:todayAxisFactPopup.open,text:todayAxisFactPopup.textContent};
    closeTodayAxisFactPopup(false);
    return JSON.stringify({...before,opened:details.map(detail=>detail.open),factPopup});
  `);
  assert.deepEqual(result.titles, ["Prepare brief", "Prepare brief", "10:30 Confirmed fact; retain the complete evidence"]);
  assert.deepEqual(result.fullSourceText, [
    "Prepare brief; keep the complete source note A",
    "Prepare brief; keep the complete source note B",
    "10:30 Confirmed fact; retain the complete evidence",
  ]);
  assert.deepEqual(result.arrangementDetails, [
    "Prepare brief; keep the complete source note A",
    "Prepare brief; keep the complete source note B",
  ]);
  assert.deepEqual(result.factDetails, []);
  assert.equal(result.editableControls, 0);
  assert.equal(result.detailsVisible, true);
  assert.deepEqual(result.opened, [true, false]);
  assert.equal(result.factPopup.open, true);
  assert.ok(result.factPopup.text.includes("10:30 Confirmed fact; retain the complete evidence"));
});

test("clicking a confirmed fact opens its full read-only anchored popup and returns focus on close", { skip: process.platform !== "darwin" }, () => {
  const result = render(`
    const factText='00:15 Confirmed evidence with the full source wording. ' + 'Additional fact detail remains available. '.repeat(90);
    const fact={...entry(factText,1455),sourceDate:'2026-10-01'};
    currentTodayView={...currentTodayView,date:'2026-10-01',tasks:{lists:[],tasks:[]},timeAxis:{
      currentArrangement:[],confirmedFacts:[fact],unlocatedCurrentArrangement:[],unlocatedConfirmedFacts:[]}};
    renderTodayTimeAxis(currentTodayView);
    const opener=todayTimedEvents.querySelector('.today-axis-marker-link');
    const surface=todayAxisScrollSurface;
    surface.scrollTop=surface.scrollHeight;
    const axisScroll=surface.scrollTop;
    opener.click();
    positionTodayAxisFactPopup();
    const popup=todayAxisFactPopup;
    const popupBounds=popup.getBoundingClientRect();
    const opened={open:popup.open,text:popup.textContent,details:todayTimedDetails.querySelectorAll('details').length,
      rect:{left:popupBounds.left,right:popupBounds.right,top:popupBounds.top,bottom:popupBounds.bottom},viewport:[window.innerWidth,window.innerHeight],
      scrollHeight:popup.scrollHeight,clientHeight:popup.clientHeight,axisScroll};
    popup.scrollTop=80;
    const independentScroll={popup:popup.scrollTop,axis:surface.scrollTop};
    todayAxisFactPopupClose.click();
    const close={open:popup.open,focus:document.activeElement===opener};
    opener.click();
    popup.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
    const escape={open:popup.open,focus:document.activeElement===opener};
    return JSON.stringify({opened,independentScroll,close,escape,factText});
  `);
  assert.equal(result.opened.open, true);
  assert.match(result.opened.text, /2026-10-02 00:15/);
  assert.match(result.opened.text, /Source date: 2026-10-01/);
  assert.match(result.opened.text, /Confirmed fact/);
  assert.ok(result.opened.text.includes(result.factText));
  assert.equal(result.opened.details, 0, 'facts no longer open in the lower layout-spanning detail section');
  assert.ok(result.opened.rect.left >= 0 && result.opened.rect.top >= 0);
  assert.ok(result.opened.rect.right <= result.opened.viewport[0] && result.opened.rect.bottom <= result.opened.viewport[1]);
  assert.ok(result.opened.scrollHeight > result.opened.clientHeight);
  assert.ok(result.independentScroll.popup > 0);
  assert.equal(result.independentScroll.axis, result.opened.axisScroll);
  assert.deepEqual(result.close, {open:false,focus:true});
  assert.deepEqual(result.escape, {open:false,focus:true});
});

test("the Daytime axis shows the complete lived day at a fixed hour scale and scrolls independently", { skip: process.platform !== "darwin" }, () => {
  for (const [width, height] of [[1280, 720], [830, 758], [680, 560]]) {
    const result = render(`
      currentTodayView={...currentTodayView,date:'2026-10-02',tasks:{lists:[],tasks:[]},timeAxis:{
        currentArrangement:[entry('04:00 earliest plan',240),entry('03:59 next-day plan',1679)],
        confirmedFacts:[],unlocatedCurrentArrangement:[],unlocatedConfirmedFacts:[]}};
      renderTodayTimeAxis(currentTodayView);
      const markers=[...todayTimedEvents.querySelectorAll('.today-axis-marker')];
      const labels=[...todayHourTicks.querySelectorAll('.today-hour-tick')].map(node=>node.textContent);
      const surface=todayAxisScrollSurface, outerBefore=workspaceInformation.scrollTop;
      const before=markers.map(marker=>marker.getBoundingClientRect().top);
      surface.scrollTop=380;
      const afterScroll=markers.map(marker=>marker.getBoundingClientRect().top);
      const plot=document.querySelector('.today-axis-plot'),bounds=axisBounds();
      return JSON.stringify({labels,markerLabels:markers.map(marker=>marker.querySelector('.today-axis-marker-time').textContent),
        plotHeight:plot.getBoundingClientRect().height,bounds,fullSurface:surface.scrollHeight>surface.clientHeight,
        innerScroll:surface.scrollTop,outerBefore,outerAfter:workspaceInformation.scrollTop,before,afterScroll,
        controls:Boolean(document.getElementById('today-expand-early')||document.getElementById('today-expand-late'))});
    `, width, height);
    assert.deepEqual(result.bounds, [240, 1680]);
    assert.equal(result.controls, false);
    assert.equal(result.labels[0], '04:00');
    assert.equal(result.labels.at(-1), '04:00');
    assert.deepEqual(result.markerLabels, ['04:00', '03:59 · 2026-10-03']);
    assert.equal(result.plotHeight, 432);
    assert.equal(result.fullSurface, true, `viewport ${width}×${height} keeps the plot independently scrollable`);
    assert.ok(result.innerScroll > 0);
    assert.equal(result.outerAfter, result.outerBefore);
    assert.ok(Math.abs(result.before[0] - result.afterScroll[0] - result.innerScroll) < 2, JSON.stringify(result));
    assert.ok(Math.abs(result.before[1] - result.afterScroll[1] - result.innerScroll) < 2, JSON.stringify(result));
  }
});

test("Morning shows the same current arrangement as Daytime without a baseline source panel", { skip: process.platform !== "darwin" }, () => {
  const result = render(`
    const morning=document.getElementById('today-phase-morning'); morning.hidden=false; document.getElementById('today-phase-daytime').hidden=true;
    const list=document.getElementById('today-baseline-timeline');
    const block=(period,title,detail=null)=>({period,title,detail});
    const axis=(period,text,startMinute,planPrecision,endMinute=null)=>({...entry(text,startMinute,endMinute),period,title:text,planPrecision});
    const timeline=[
      block('12:00','午餐'),
      block('稍后','待定'),
      block('23:00–次日01:00','跨午夜安排'),
      block('次日 00:15','夜间复核'),
      block('下午','保持宽泛'),
      block('08:15','服药'),
      block('08:15','早餐'),
      block('约 14:00','散步'),
      block('19:00','晚餐'),
      block('未定','之后再说')
    ];
    currentTodayView={...currentTodayView,timeline,timeAxis:{
      currentArrangement:[
        axis('12:00','午餐',720,'exactPoint'),
        axis('23:00–次日01:00','跨午夜安排',1380,'exactRange',1500),
        axis('次日 00:15','夜间复核',1455,'exactPoint'),
        axis('下午','保持宽泛',780,'broad'),
        axis('08:15','服药',495,'exactPoint'),
        axis('08:15','早餐',495,'exactPoint'),
        axis('约 14:00','散步',840,'approximatePoint'),
        axis('19:00','晚餐',1140,'exactPoint')
      ],
      confirmedFacts:[],
      unlocatedCurrentArrangement:[axis('稍后','待定',null,'unlocated'),axis('未定','之后再说',null,'unlocated')],
      unlocatedConfirmedFacts:[]
    }};
    const before=JSON.stringify({timeline:currentTodayView.timeline,timeAxis:currentTodayView.timeAxis});
    renderTodayTimeline(currentTodayView);
    const order=[...list.querySelectorAll('.today-timeline-item h4')].map(node=>node.textContent);
    const after=JSON.stringify({timeline:currentTodayView.timeline,timeAxis:currentTodayView.timeAxis});
    return JSON.stringify({order,unchanged:before===after,text:list.textContent,display:getComputedStyle(list.firstElementChild).display,axes:morning.querySelectorAll('.today-continuous-axis').length,source:morning.querySelector('.section-label').textContent,heading:morning.querySelector('h3').textContent,label:list.getAttribute('aria-label'),baselineStatus:document.getElementById('today-baseline-status')});
  `);
  assert.deepEqual(result.order, ['服药','早餐','午餐','散步','晚餐','跨午夜安排','夜间复核','待定','保持宽泛','之后再说']);
  assert.equal(result.unchanged, true, 'display ordering never mutates the source arrangement or axis evidence');
  assert.equal(result.display, 'block');
  assert.equal(result.axes, 0);
  assert.match(result.source, /当天当前计划/);
  assert.equal(result.heading, '当前安排');
  assert.equal(result.baselineStatus, null);
  assert.doesNotMatch(result.label, /时间线/);
  assert.match(main, /renderTodayTimeline\(view\)/);
  assert.match(main, /const evidence = view\.evidence/);
});

test("Morning associates duplicate arrangement labels with distinct source-ordered times before sorting", { skip: process.platform !== "darwin" }, () => {
  const result = render(`
    const duplicate=(sourceKey)=>({period:'下午',title:'重复安排',detail:'保留相同原文',sourceKey});
    const axis=(startMinute)=>({...entry('重复安排 保留相同原文',startMinute),period:'下午',title:'重复安排',planPrecision:'exactPoint'});
    currentTodayView={...currentTodayView,timeline:[duplicate('first'),duplicate('second'),duplicate('third')],timeAxis:{
      currentArrangement:[axis(840),axis(480),axis(480)],confirmedFacts:[],unlocatedCurrentArrangement:[],unlocatedConfirmedFacts:[]}};
    const before=JSON.stringify({timeline:currentTodayView.timeline,timeAxis:currentTodayView.timeAxis});
    const rendered=[];
    const original=todayTimelineItem;
    todayTimelineItem=block=>{rendered.push(block.sourceKey);return document.createElement('li');};
    renderTodayTimeline(currentTodayView);
    todayTimelineItem=original;
    const after=JSON.stringify({timeline:currentTodayView.timeline,timeAxis:currentTodayView.timeAxis});
    return JSON.stringify({rendered,unchanged:before===after});
  `);
  assert.deepEqual(result.rendered, ['second','third','first']);
  assert.equal(result.unchanged, true, 'duplicate matching and display sorting leave source objects untouched');
});

test("next-day live time stays concise and hour ticks do not repeat the date", { skip: process.platform !== "darwin" }, () => {
  const result = render(`
    currentTodayView={...currentTodayView,date:'2026-10-01',isToday:true,currentTime:'01:03',tasks:{lists:[],tasks:[]},timeAxis:{currentArrangement:[entry('01:00 next-day plan',1500)],confirmedFacts:[],unlocatedCurrentArrangement:[],unlocatedConfirmedFacts:[]}};
    renderTodayTimeAxis(currentTodayView);
    const nextTick=todayHourTicks.querySelector('.today-hour-tick[data-minute="1500"]');
    return JSON.stringify({time:todayCurrentTime.textContent,dateTime:todayCurrentTime.dateTime,tickText:nextTick?.textContent,tickHasDate:Boolean(nextTick?.querySelector('small'))});
  `);
  assert.equal(result.time, 'Next day 01:03');
  assert.equal(result.dateTime, '2026-10-02T01:03');
  assert.equal(result.tickText, '01:00');
  assert.equal(result.tickHasDate, false);
});

test("Locate now targets the inner timeline viewport while preserving the surrounding page", { skip: process.platform !== "darwin" }, () => {
  const result = render(`
    todayAxisScrollSurface.scrollTop=900;
    const outer=workspaceInformation.scrollTop;
    todayLocateNowButton.addEventListener('click',()=>scrollTodayAxisToNow());todayLocateNowButton.click();
    return JSON.stringify({now:rect(todayCurrentTime),viewport:rect(todayAxisScrollSurface),outer,after:workspaceInformation.scrollTop,follow:todayAxisFollowState});
  `);
  assert.equal(result.after, result.outer);
  assert.equal(result.follow, 'following');
  assert.ok(result.now.top >= result.viewport.top && result.now.bottom <= result.viewport.bottom, `now is actually in the inner viewport: ${JSON.stringify(result)}`);
});

test("dense collisions remain readable by scrolling the timeline horizontally instead of shrinking targets", { skip: process.platform !== "darwin" }, () => {
  const result=render(`
    currentTodayView={...currentTodayView,tasks:{lists:[],tasks:[]},timeAxis:{currentArrangement:Array.from({length:6},(_,i)=>entry('08:30 Plan '+i,510)),confirmedFacts:[],unlocatedCurrentArrangement:[],unlocatedConfirmedFacts:[]}};
    renderTodayTimeAxis(currentTodayView);
    return JSON.stringify({cards:[...todayTimedEvents.querySelectorAll('li')].map(rect),viewport:todayAxisScrollSurface.clientWidth,content:todayAxisScrollSurface.scrollWidth});
  `,680);
  assert.ok(result.cards.every((r:any)=>r.width>=130),`reading targets retain a useful width: ${JSON.stringify(result)}`);
  assert.ok(result.content>result.viewport);
});

test("temporary collision columns reuse space after an interval ends instead of adding a fixed column", { skip: process.platform !== "darwin" }, () => {
  const result=render(`
    currentTodayView={...currentTodayView,tasks:{lists:[],tasks:[]},timeAxis:{currentArrangement:[entry('08:00–10:00 A',480,600),entry('09:00–11:00 B',540,660),entry('10:00–12:00 C',600,720)],confirmedFacts:[],unlocatedCurrentArrangement:[],unlocatedConfirmedFacts:[]}};
    renderTodayTimeAxis(currentTodayView); return JSON.stringify([...todayTimedEvents.querySelectorAll('li')].map(rect));
  `);
  assert.ok(Math.abs(result[0].left-result[2].left)<1, "A and C do not overlap and can share a column");
  assert.ok(result[1].left>=result[0].right-0.5 || result[0].left>=result[1].right-0.5);
  assert.ok(result[1].left>=result[2].right-0.5 || result[2].left>=result[1].right-0.5);
});

test("after-midnight cards keep their date, title and source readable within their own collision target", { skip: process.platform !== "darwin" }, () => {
  const result=render(`
    currentTodayView={...currentTodayView,date:'2026-10-02',isToday:false,currentTime:null,tasks:{lists:[],tasks:[]},timeAxis:{currentArrangement:[entry('01:30 Long planned activity',1530)],confirmedFacts:[entry('01:30 Recorded activity',1530)],unlocatedCurrentArrangement:[],unlocatedConfirmedFacts:[]}};
    renderTodayTimeAxis(currentTodayView);
    return JSON.stringify([...todayTimedEvents.querySelectorAll('li')].map(m=>({card:rect(m.querySelector('.today-axis-marker-link')),title:rect(m.querySelector('.today-axis-marker-title')),time:rect(m.querySelector('.today-axis-marker-time')),source:rect(m.querySelector('.today-axis-marker-source-status')),label:m.querySelector('.today-axis-marker-time').textContent})));
  `);
  assert.equal(result.length,2);
  for(const r of result){
    assert.match(r.label,/2026-10-03/);
    assert.ok(r.title.width>=80 && r.title.height>=10,`title remains readable: ${JSON.stringify(r)}`);
    assert.ok(r.time.right<=r.card.right+1 && r.source.bottom<=r.card.bottom+1,`date and provenance fit the target: ${JSON.stringify(r)}`);
  }
});

test("advancing the clock keeps plans, pending Tasks and confirmed facts distinct", { skip: process.platform !== "darwin" }, () => {
  const result=render(`
    updateTodayTimeAxisClock(currentTodayView,'23:59');
    return JSON.stringify({plans:todayTimedEvents.querySelectorAll('.is-arrangement').length,facts:todayTimedEvents.querySelectorAll('.is-fact').length,completed:todayTimedEvents.querySelectorAll('.is-task.is-completed').length,pending:todayTimedEvents.querySelector('.is-task .today-axis-marker-source-status').textContent});
  `);
  assert.equal(result.plans,2);
  assert.equal(result.facts,1);
  assert.equal(result.completed,0);
  assert.match(result.pending,/Pending/);
});

test("the Today axis keeps the accepted zoomed-window geometry in smaller viewports", { skip: process.platform !== "darwin" }, () => {
  const check = `
    const surface=todayAxisScrollSurface, plot=document.querySelector('.today-axis-plot');
    const hourHeight=()=>plot.getBoundingClientRect().height/24;
    const initial={surfaceClientWidth:surface.clientWidth,surfaceScrollWidth:surface.scrollWidth,surfaceClientHeight:surface.clientHeight,surfaceScrollHeight:surface.scrollHeight,plotWidth:plot.getBoundingClientRect().width,hourHeight:hourHeight()};
    document.getElementById('today-axis-zoom-in').click();
    const zoomedHourHeight=hourHeight();
    document.getElementById('today-axis-zoom-out').click();
    return JSON.stringify({...initial,zoomedHourHeight,restoredHourHeight:hourHeight()});
  `;
  const measurements = [[1914,1518],[1280,800],[1280,720],[830,758],[680,560]].map(([width,height]) => ({
    viewport:[width,height],
    ...render(check,width,height),
  }));
  const reference = measurements[0];
  assert.ok(Math.abs(reference.plotWidth - 580) < 0.5,`580px preserves the zoomed-window track (raw natural measurement 578.47px): ${JSON.stringify(reference)}`);
  assert.equal(reference.hourHeight,18,`large-window reference is 18px per hour: ${JSON.stringify(reference)}`);
  for (const measurement of measurements) {
    assert.equal(measurement.hourHeight,reference.hourHeight,`hour height stays at the large-window reference: ${JSON.stringify(measurement)}`);
    assert.ok(measurement.plotWidth+0.5>=reference.plotWidth,`track does not fall below the large-window reference: ${JSON.stringify(measurement)}`);
    assert.equal(measurement.zoomedHourHeight,28,`explicit zoom-in remains available: ${JSON.stringify(measurement)}`);
    assert.equal(measurement.restoredHourHeight,18,`explicit zoom-out returns to the fixed default: ${JSON.stringify(measurement)}`);
  }
  for (const measurement of measurements.filter(({viewport})=>viewport[0]<=830)) {
    assert.ok(measurement.surfaceScrollWidth>measurement.surfaceClientWidth,`narrow viewport scrolls over the stable track: ${JSON.stringify(measurement)}`);
  }
  for (const measurement of measurements.filter(({viewport})=>viewport[1]<=560)) {
    assert.ok(measurement.surfaceScrollHeight>measurement.surfaceClientHeight,`short viewport scrolls over the stable hour scale: ${JSON.stringify(measurement)}`);
  }
});
