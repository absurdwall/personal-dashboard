import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { readFileSync, mkdtempSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const output=mkdtempSync(join(tmpdir(),'pdex-calendar-production-'));
after(()=>rmSync(output,{recursive:true,force:true}));
const root=new URL('../..',import.meta.url).pathname;
execFileSync(join(root,'node_modules/.bin/tsc'),['--module','commonjs','--outDir',output],{cwd:root});
const main=readFileSync(join(output,'main.js'),'utf8').replace('void connectToApplication();','')+`
window.calendarHarness={
  render(month){
    currentInterfaceLanguage='zh';currentWorkspaceDestination='calendar';currentCalendarMonth=month;
    appShell.dataset.workspaceDestination='calendar';
    workspaceDestinationPanels.forEach(panel=>panel.hidden=panel.dataset.workspacePanel!=='calendar');
    workspaceInformation.prepend(document.querySelector('#workspace-destination-calendar'));
    renderCalendarGrid(month);workspaceInformation.scrollTop=0;
  },
  selected:()=>({date:selectedCalendarDate,view:currentCalendarSummaryView}),
};`;
writeFileSync(join(output,'main.js'),main);
const modules=Object.fromEntries(readdirSync(output).filter(n=>n.endsWith('.js')).map(n=>['./'+n,readFileSync(join(output,n),'utf8')]));

function webKit(script:string,width=1280,height=720):any {
  const directory=mkdtempSync(join(tmpdir(),'pdex-calendar-dom-'));
  try {
    writeFileSync(join(directory,'index.html'),readFileSync(new URL('../../frontend/index.html',import.meta.url),'utf8').replace(/<script[^>]*src="main.js"[^>]*><\/script>/,''));
    writeFileSync(join(directory,'styles.css'),readFileSync(new URL('../../frontend/styles.css',import.meta.url),'utf8'));
    writeFileSync(join(directory,'check.js'),`
      const modules=${JSON.stringify(modules)},cache={};
      function require(name){if(cache[name])return cache[name];const exports={};cache[name]=exports;new Function('exports','require',modules[name])(exports,require);return exports;}
      const sourceFixture=${readFileSync(new URL('./fixtures/compact-calendar-view.json',import.meta.url),'utf8')};
      let selectedView=null,commands=[];
      window.__TAURI__={core:{invoke:async(command,args)=>{commands.push({command,args});if(command==='read_daily_view' || command==='today_view')return selectedView;throw Error('Unexpected native command '+command);}}};
      require('./main.js');
      function fixture(weeks){
        const first=weeks===5?'2026-08-30':'2026-04-26',month=weeks===5?9:5;
        const days=Array.from({length:weeks*7},(_,i)=>{const day=new Date(first+'T12:00:00Z');day.setUTCDate(day.getUTCDate()+i);const date=day.toISOString().slice(0,10);return {date,inMonth:day.getUTCMonth()+1===month,isToday:i===10,availability:i===10?'unreviewed':i===11?'reviewed':i===12?'error':'missing',taskSummaries:i===10?Array.from({length:4},(_,k)=>({id:'task-'+k,name:'Synthetic long task '+k+' to preview on one line',state:k===2?'completed':'pending'})):[],taskOverflowCount:i===10?3:0};});
        return {year:2026,month,configured:true,taskState:'ready',taskMessage:'',days};
      }
      const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
      ${script}`);
    return JSON.parse(execFileSync('swift',[new URL('./helpers/rendered-evening-entry.swift',import.meta.url).pathname,join(directory,'index.html'),join(directory,'check.js'),String(width),String(height)],{encoding:'utf8',timeout:60000}));
  } finally {rmSync(directory,{recursive:true,force:true});}
}

test('five-week month fits the shipped 1280×720 workspace with equal date heights and four previews', {skip:process.platform!=='darwin'},()=>{
  const result=webKit(`calendarHarness.render(fixture(5));const grid=document.querySelector('#calendar-grid');const cells=[...grid.children];return JSON.stringify({height:innerHeight,width:innerWidth,grid:rect(grid),heights:cells.map(c=>rect(c).height),preview:cells[10].querySelectorAll('.calendar-day-task-summary').length});`);
  assert.equal(result.height,720);assert.equal(result.width,1280);
  assert.ok(result.grid.bottom<=720,JSON.stringify(result.grid));
  assert.ok(Math.max(...result.heights)-Math.min(...result.heights)<1);
  assert.equal(result.preview,4);
});

for(const [width,height] of [[1280,720],[830,758],[1280,688],[830,726]]) {
  for(const weeks of [5,6]) {
    test(`${weeks}-week month is fully visible with four unclipped single-line previews at ${width}×${height}`,{skip:process.platform!=='darwin'},()=>{
      const result=webKit(`calendarHarness.render(fixture(${weeks}));const grid=document.querySelector('#calendar-grid');const cells=[...grid.children];const dense=cells[10];return JSON.stringify({width:innerWidth,height:innerHeight,grid:rect(grid),cells:cells.map(rect),previews:[...dense.querySelectorAll('.calendar-day-task-summary')].map(p=>({rect:rect(p),whiteSpace:getComputedStyle(p).whiteSpace,overflow:getComputedStyle(p).overflow,scroll:p.scrollWidth,client:p.clientWidth})),dense:rect(dense)});`,width,height);
      assert.equal(result.width,width);assert.equal(result.height,height);
      assert.equal(result.cells.length,weeks*7);
      assert.ok(result.grid.top>=0 && result.grid.bottom<=height,JSON.stringify(result.grid));
      assert.ok(result.grid.right<=width);
      assert.ok(Math.max(...result.cells.map((c:any)=>c.height))-Math.min(...result.cells.map((c:any)=>c.height))<1);
      assert.equal(result.previews.length,4);
      for(const preview of result.previews) {
        assert.equal(preview.whiteSpace,'nowrap');assert.equal(preview.overflow,'hidden');
        assert.ok(preview.rect.bottom<=result.dense.bottom && preview.rect.right<=result.dense.right);
        assert.ok(preview.scroll>preview.client,'long titles must truncate rather than widen a date');
      }
    });
  }
}

for(const [width,height] of [[1280,720],[830,758]]) {
  test(`real native record states and overflow stay beside dates without covering previews at ${width}×${height}`,{skip:process.platform!=='darwin'},()=>{
    const result=webKit(`
      calendarHarness.render(sourceFixture.month);
      const cells=['2026-09-09','2026-09-10','2026-09-11','2026-09-12'].map(date=>document.querySelector('[data-calendar-date="'+date+'"]'));
      return JSON.stringify(cells.map(cell=>({availability:cell.dataset.availability,aria:cell.getAttribute('aria-label'),marker:cell.querySelector('.calendar-day-marker').textContent,markerHidden:getComputedStyle(cell.querySelector('.calendar-day-marker')).display==='none',top:rect(cell.querySelector('.calendar-day-top')),number:rect(cell.querySelector('strong')),markerRect:rect(cell.querySelector('.calendar-day-marker')),more:cell.querySelector('.calendar-day-task-overflow').textContent,moreRect:rect(cell.querySelector('.calendar-day-task-overflow')),previews:[...cell.querySelectorAll('.calendar-day-task-summary')].map(p=>({rect:rect(p),name:p.textContent,state:p.dataset.taskState}))})));
    `,width,height);
    assert.deepEqual(result.map((day:any)=>day.availability),['unreviewed','reviewed','error','missing']);
    assert.deepEqual(result.map((day:any)=>day.marker),['记','复','!','']);
    assert.equal(result[3].markerHidden,true);assert.ok(result[2].aria.includes('读取错误'));
    const dense=result[0];assert.equal(dense.more,'+3');assert.equal(dense.previews.length,4);
    assert.ok(dense.previews.some((p:any)=>p.state==='completed'));
    assert.ok(dense.markerRect.left>=dense.number.right);
    assert.ok(dense.markerRect.width<=14 && dense.markerRect.height<=14);
    assert.ok(dense.moreRect.top>=dense.top.top && dense.moreRect.bottom<=dense.top.bottom);
    assert.ok(dense.markerRect.top>=dense.top.top && dense.markerRect.bottom<=dense.top.bottom);
    assert.ok(dense.previews[0].rect.top>=dense.top.bottom);
    assert.ok(dense.moreRect.left>=dense.markerRect.right);
  });
}

test('clicking the overflow date reads the full authoritative Daily Record and all shared Tasks including cross-midnight interval',{skip:process.platform!=='darwin'},()=>{
  const result=webKit(`
    selectedView=sourceFixture.selected;calendarHarness.render(sourceFixture.month);
    document.querySelector('[data-calendar-date="2026-09-09"]').click();
    while(!calendarHarness.selected().view) await new Promise(r=>setTimeout(r,5));
    const tasks=document.querySelector('#calendar-task-list');
    const editor=tasks.querySelector('[data-task-editor="preview-0"]');
    return JSON.stringify({date:calendarHarness.selected().date,availability:document.querySelector('#calendar-summary-status').dataset.availability,copy:document.querySelector('#calendar-summary-copy').textContent,count:tasks.children.length,names:[...tasks.children].map(c=>c.textContent),start:editor.querySelector('[data-task-time]').value,endDate:editor.querySelector('[data-task-end-date]').value,endTime:editor.querySelector('[data-task-end-time]').value,commands});
  `,830,758);
  assert.equal(result.date,'2026-09-09');assert.equal(result.availability,'unreviewed');
  assert.ok(result.copy.includes('合成安排。'));assert.equal(result.count,7);
  assert.equal(result.start,'23:30');assert.equal(result.endDate,'2026-09-10');assert.equal(result.endTime,'00:45');
  assert.ok(result.names.some((name:string)=>name.includes('23:30') && name.includes('00:45')));
  assert.deepEqual(result.commands.filter((item:any)=>item.command==='read_daily_view'),[{command:'read_daily_view',args:{date:'2026-09-09'}}]);
  assert.ok(result.commands.every((item:any)=>['read_daily_view','today_view'].includes(item.command)),'date details must read the shared sources without writes');
});
