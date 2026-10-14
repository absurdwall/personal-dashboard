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
  const bindings = ["todayContinuousAxis:today-continuous-axis", "todayHourTicks:today-hour-ticks", "todayTimedEvents:today-timed-events", "todayTimedDurations:today-timed-duration", "todayTimedDetails:today-timed-details", "todayTimedEmpty:today-timed-empty", "todayCurrentArrangementUnlocated:today-current-arrangement-unlocated", "todayConfirmedFactsUnlocated:today-confirmed-facts-unlocated", "todayCurrentTime:today-current-time", "todayLocateNowButton:today-locate-now", "todayAxisZoomToggle:today-axis-zoom-toggle", "todayUnlocatedTimeRegion:today-unlocated-time-region", "todayUnlocatedTimeShortcut:today-unlocated-time-shortcut", "todaySideRegion:today-side-region", "todayAxisScrollSurface:today-axis-scroll-surface"].map(binding => { const [name,id] = binding.split(":"); return `const ${name} = document.getElementById('${id}');`; }).join("\n");
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
    let todayAxisFollowState = 'following', currentInterfaceLanguage = 'en', currentWorkspaceDestination = 'today', programmaticTodayAxisScrollUntil = 0;
    const t = (key, values) => interfaceCopy(key, 'en', values);
    const setCopy = (node,key,values) => { node.textContent = t(key,values); node.dataset.i18n = key; };
    ${fn('taskStateCopyKey')}
    const entry = (text,startMinute,endMinute=null) => ({text,startMinute,endMinute,period:null,sourceDate:'2026-10-01',continuesFromPreviousDay:false,continuesIntoNextDay:false});
    let currentTodayView = {date:'2026-10-01',isToday:true,currentTime:'12:00',tasks:{lists:[],tasks:[{id:'same-task',listId:'inbox',name:'Task at 08:30',date:'2026-10-01',time:'08:30',state:'pending',timePassed:true,deletedAt:null}]},timeAxis:{currentArrangement:[entry('08:00–10:00 Plan',480,600),entry('14:00 Plan alone',840)],confirmedFacts:[entry('08:30 Fact',510)],unlocatedCurrentArrangement:[],unlocatedConfirmedFacts:[]}};
    ${slice('function todayTimelineItem(', 'function todayEvidenceGroup(')}
    ${slice('function scrollTodayAxisToNow(', 'function scheduleTodayAxisFollowScroll(')}
    ${main.slice(main.lastIndexOf('for (const id of ["today-expand-early", "today-expand-late"])'))}
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
      const solitary=markers.find(m=>m.querySelector('.today-axis-marker-link').dataset.axisItemText==='14:00 Plan alone');
      const clicks=cluster.map(m=>{
        const a=m.querySelector('.today-axis-marker-link');
        if(m.classList.contains('is-task'))return {editable:Boolean(m.dataset.planId),detail:false,editor:false,control:a.tagName};
        const target=a.getAttribute('href')?document.querySelector(a.getAttribute('href')):null;
        a.click();
        const editor=document.querySelector('dialog.plan-time-editor[open]');
        const outcome={lane:m.classList.contains('is-fact')?'fact':'arrangement',editable:Boolean(m.dataset.planId),detail:Boolean(target?.open),editor:Boolean(editor),control:a.tagName};
        editor?.close();
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
    for(const click of result.clicks.filter((item:any)=>item.control!=='BUTTON')) {
      assert.equal(click.editor,click.editable);
      assert.equal(click.detail,click.lane==='fact' && !click.editable);
    }
    assert.equal(result.clicks.find((item:any)=>item.control==='BUTTON')?.detail,false);
    assert.ok(result.sources.some((s:string)=>s.includes('arrangement')));
    assert.ok(result.sources.some((s:string)=>s.includes('fact')));
    assert.ok(result.sources.some((s:string)=>s.includes('Task')));
  }
});

test("the Daytime axis scrolls independently and quiet-hour expansion preserves its reading position", { skip: process.platform !== "darwin" }, () => {
  const result = render(`
    todayAxisZoomToggle.click();
    const surface=todayAxisScrollSurface;
    const outerBefore=workspaceInformation.scrollTop;
    const height=surface.clientHeight, total=surface.scrollHeight;
    surface.scrollTop=380;
    const middle=()=>[...todayTimedEvents.querySelectorAll('.today-axis-marker-link')].find(a=>a.dataset.axisItemText==='14:00 Plan alone');
    const before=middle().getBoundingClientRect().top;
    document.getElementById('today-expand-early').click();
    const after=middle().getBoundingClientRect().top;
    return JSON.stringify({height,total,innerScroll:surface.scrollTop,outerBefore,outerAfter:workspaceInformation.scrollTop,before,after});
  `);
  assert.ok(result.total > result.height && result.height >= 240 && result.height <= 600, `independent bounded viewport: ${JSON.stringify(result)}`);
  assert.ok(result.innerScroll > 380, "expanding the earlier segment adjusts its own viewport");
  assert.equal(result.outerAfter, result.outerBefore);
  assert.ok(Math.abs(result.before-result.after)<1.1, `current reading anchor remains in place: ${JSON.stringify(result)}`);
});

test("quiet-hour entries are counted at the ends and expand only when the user asks", { skip: process.platform !== "darwin" }, () => {
  const result = render(`
    currentTodayView={...currentTodayView,date:'2026-10-02',tasks:{lists:[],tasks:[]},timeAxis:{currentArrangement:[entry('04:30 early plan',270),entry('01:30 late plan',1530)],confirmedFacts:[],unlocatedCurrentArrangement:[],unlocatedConfirmedFacts:[]}};
    renderTodayTimeAxis(currentTodayView);
    const initial=[...todayTimedEvents.querySelectorAll('.today-axis-marker-time')].map(n=>n.textContent);
    const early=document.getElementById('today-expand-early'),late=document.getElementById('today-expand-late');
    const collapsed={early:early.textContent,late:late.textContent,expanded:[early.getAttribute('aria-expanded'),late.getAttribute('aria-expanded')]};
    early.click();const earlyVisible=[...todayTimedEvents.querySelectorAll('.today-axis-marker-time')].map(n=>n.textContent);
    late.click();const full=[...todayTimedEvents.querySelectorAll('.today-axis-marker-time')].map(n=>n.textContent);
    early.click();late.click();
    return JSON.stringify({initial,collapsed,earlyVisible,full,collapsedAgain:todayTimedEvents.querySelectorAll('li').length});
  `);
  assert.deepEqual(result.initial, []);
  assert.match(result.collapsed.early, /1 item/);
  assert.match(result.collapsed.late, /1 item/);
  assert.deepEqual(result.collapsed.expanded,['false','false']);
  assert.deepEqual(result.earlyVisible,['04:30']);
  assert.deepEqual(result.full,['04:30','01:30 Next day']);
  assert.equal(result.collapsedAgain,0);
});

test("a broad plan keeps its source period until a drag and exposes only the existing move target", { skip: process.platform !== "darwin" }, () => {
  const result=render(`
    const broad={...entry('午后安排',840),planId:'broad-plan',planPrecision:'broad',period:'午后',timeEditable:true};
    currentTodayView={...currentTodayView,isToday:false,currentTime:null,tasks:{lists:[],tasks:[]},timeAxis:{currentArrangement:[broad],confirmedFacts:[],unlocatedCurrentArrangement:[],unlocatedConfirmedFacts:[]}};
    renderTodayTimeAxis(currentTodayView);
    const marker=document.querySelector('.today-axis-marker'),label=marker.querySelector('.today-axis-marker-link');
    const before={text:label.dataset.axisItemTime,aria:label.getAttribute('aria-label'),precision:broad.planPrecision};
    label.click();
    return JSON.stringify({before,after:label.dataset.axisItemTime,planId:marker.dataset.planId,editor:Boolean(document.querySelector('dialog.plan-time-editor[open]')),precision:broad.planPrecision});
  `);
  assert.equal(result.before.text,'午后');
  assert.match(result.before.aria,/午后/);
  assert.doesNotMatch(result.before.aria,/14:00|840/);
  assert.equal(result.after,'午后');
  assert.equal(result.planId,'broad-plan','the existing pointer-move seam can resolve the broad plan identity');
  assert.equal(result.editor,false,'viewing a broad plan does not turn its default anchor into an explicit edit');
});

test("the default 06:00–24:00 overview fits the visible Today axis and exposes a display-only zoom control", { skip: process.platform !== "darwin" }, () => {
  for(const [width,height] of [[1280,800],[1280,720]]) {
    const result=render(`
      const surface=todayAxisScrollSurface,plot=document.querySelector('#today-axis-plot');
      const zoom=document.querySelector('#today-axis-zoom-toggle');
      const beforeTimes=[...document.querySelectorAll('.today-axis-marker-time')].map(n=>n.textContent);
      const beforeScale=getComputedStyle(todayContinuousAxis).getPropertyValue('--today-axis-hour-height');
      const initialScrollHeight=surface.scrollHeight;
      zoom?.click();
      const detailScale=getComputedStyle(todayContinuousAxis).getPropertyValue('--today-axis-hour-height');
      const detailPressed=zoom?.getAttribute('aria-pressed');
      const afterZoomTimes=[...document.querySelectorAll('.today-axis-marker-time')].map(n=>n.textContent);
      zoom?.click();
      const overviewScale=getComputedStyle(todayContinuousAxis).getPropertyValue('--today-axis-hour-height');
      return JSON.stringify({width:innerWidth,height:innerHeight,initialScrollHeight,scrollHeight:surface.scrollHeight,clientHeight:surface.clientHeight,
        surface:rect(surface),plot:rect(plot),expanded:[document.querySelector('#today-expand-early').getAttribute('aria-expanded'),document.querySelector('#today-expand-late').getAttribute('aria-expanded')],
        zoom:Boolean(zoom),label:zoom?.getAttribute('aria-label'),scale:beforeScale,detailScale,detailPressed,overviewScale,beforeTimes,afterZoomTimes});
    `,width,height);
    assert.equal(result.width,width);assert.equal(result.height,height);
    assert.deepEqual(result.expanded,['false','false']);assert.equal(result.zoom,true);
    assert.ok(result.plot.bottom<=result.surface.bottom+1,`06:00–24:00 remains in the visible axis viewport; supporting fact details may scroll below it: ${JSON.stringify(result)}`);
    assert.notEqual(result.detailScale,result.scale,'zoom changes only the display scale');
    assert.equal(result.detailPressed,'true');assert.equal(result.overviewScale,result.scale);
    assert.deepEqual(result.afterZoomTimes,result.beforeTimes,'zoom does not change saved time labels');
  }
});

test("Morning reads original baseline wording as a text document with an explicit source", { skip: process.platform !== "darwin" }, () => {
  const result = render(`
    const morning=document.getElementById('today-phase-morning'); morning.hidden=false; document.getElementById('today-phase-daytime').hidden=true;
    const list=document.getElementById('today-baseline-timeline');
    list.replaceChildren(todayTimelineItem({period:'午后',title:'约 14:00 买菜',detail:'保留宽泛安排与原始证据。'}));
    return JSON.stringify({text:list.textContent,display:getComputedStyle(list.firstElementChild).display,axes:morning.querySelectorAll('.today-continuous-axis').length,source:morning.querySelector('.section-label').textContent,label:list.getAttribute('aria-label')});
  `);
  assert.equal(result.text, '午后约 14:00 买菜保留宽泛安排与原始证据。');
  assert.equal(result.display, 'block');
  assert.equal(result.axes, 0);
  assert.match(result.source, /Daily Record/);
  assert.doesNotMatch(result.label, /时间线/);
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
    document.getElementById('today-expand-late').click();
    return JSON.stringify([...todayTimedEvents.querySelectorAll('li')].map(m=>({card:rect(m.querySelector('.today-axis-marker-link')),title:rect(m.querySelector('.today-axis-marker-title')),time:rect(m.querySelector('.today-axis-marker-time')),source:rect(m.querySelector('.today-axis-marker-source-status')),label:m.querySelector('.today-axis-marker-time').textContent,fullLabel:m.querySelector('.today-axis-marker-link').dataset.axisItemTime,sourceText:m.querySelector('.today-axis-marker-source-status').textContent})));
  `);
  assert.equal(result.length,2);
  for(const r of result){
    assert.match(r.fullLabel,/2026-10-03/);
    assert.match(r.label,/Next day/);
    assert.ok(r.title.width>=40 && r.title.height>=8,`compact title retains a visible truncated label: ${JSON.stringify(r)}`);
    assert.ok(r.time.right<=r.card.right+1 && r.title.right<=r.card.right+1,`date and title fit the target: ${JSON.stringify(r)}`);
    assert.ok(r.sourceText.length>0,`source metadata remains available on the marker: ${JSON.stringify(r)}`);
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
