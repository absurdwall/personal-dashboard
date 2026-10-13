import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE_PATH ? pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href : 'playwright');
const root=resolve(import.meta.dirname,'../..');
async function fixture(width=1200) {
  const server=createServer(async(req,res)=>{try {
    if(req.url==='/') { res.setHeader('Content-Type','text/html');res.end('<html><head><link rel="stylesheet" href="/styles.css"></head><body><script type="module">import {showHabitSettingsDialog} from "/habit-settings.js"; window.openHabitEditor=showHabitSettingsDialog;</script></body></html>');return; }
    const file=resolve(root,'dist',req.url.slice(1));if(!file.startsWith(resolve(root,'dist')+'/')) throw Error('path');
    res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':'text/css');res.end(await readFile(file));
  }catch{res.statusCode=404;res.end();}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width,height:760}});
  try { await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>typeof window.openHabitEditor==='function',{},{timeout:3000}); } catch(error) { await browser.close();await new Promise(r=>server.close(r));throw error; }
  return {page,close:async()=>{await browser.close();await new Promise(r=>server.close(r));}};
}
for(const width of [1200,560]) test(`create form retains draft through failed save/reread at width ${width}`,async()=>{
  const f=await fixture(width);try{
    await f.page.evaluate(()=>{
      window.saved=[];window.fail=true;window.done=false;
      const snapshot={catalogRevision:null,catalogTargetBinding:'vault-a',habits:[]};
      window.openHabitEditor({snapshot,livedDate:'2026-10-13',language:'en',
        save:async input=>{window.saved.push(input);if(window.fail){window.fail=false;throw Error('Synthetic storage failure');}return {...snapshot,catalogRevision:'r2',habits:[{key:input.habitKey,settings:input.settings,currentGoal:input.settings.goal,pendingGoal:null,goalLabel:'Saved'}]};},
        reread:async()=>({...snapshot,catalogRevision:'r1'}),onSaved:()=>window.done=true});
    });
    assert.equal(await f.page.getByLabel('Start date').inputValue(),'2026-10-13');
    await f.page.getByLabel('Name',{exact:true}).fill('Reading');
    await f.page.getByLabel('Frequency and goal').selectOption('weekly-days');
    await f.page.getByLabel('Attained days per week').fill('5');
    await f.page.getByRole('button',{name:'Save',exact:true}).click();
    await f.page.getByRole('status').filter({hasText:'Synthetic storage failure'}).waitFor();
    assert.equal(await f.page.getByLabel('Name',{exact:true}).inputValue(),'Reading');
    assert.equal(await f.page.locator('dialog[open]').count(),1);
    const bounds=await f.page.locator('dialog').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width);
    await mkdir('/private/tmp/pdex24-ui.noindex',{recursive:true});await f.page.screenshot({path:`/private/tmp/pdex24-ui.noindex/habit-settings-${width}.png`});
    await f.page.getByRole('button',{name:'Read again'}).click();
    await f.page.getByRole('status').filter({hasText:'Draft kept'}).waitFor();
    await f.page.getByRole('button',{name:'Save',exact:true}).click();
    await f.page.waitForFunction(()=>window.done);
    const inputs=await f.page.evaluate(()=>window.saved);
    assert.equal(inputs[0].habitKey,inputs[1].habitKey);assert.equal(inputs[0].changeId,inputs[1].changeId);
    assert.deepEqual(inputs[1].settings.goal,{kind:'weekly-days',days:5});assert.equal(inputs[1].expectedRevision,'r1');
  }finally{await f.close();}
});
test('edit form displays current and pending goals and retains next-day threshold fields',async()=>{
  const f=await fixture();try{
    await f.page.evaluate(()=>{
      const current={kind:'daily-time',time:'00:30',dayRelation:'next-day'},pending={kind:'daily-time',time:'01:00',dayRelation:'next-day'};
      const habit={key:'sleep',settings:{name:'Sleep',emoji:'🌙',group:'Rest',startDate:'2026-10-01',goal:pending},currentGoal:current,pendingGoal:{effectiveDate:'2026-10-14',goal:pending},goalLabel:'每日 次日 00:30'};
      window.saved=[];window.openHabitEditor({snapshot:{catalogRevision:'r1',catalogTargetBinding:'vault-a',habits:[habit]},habitKey:'sleep',livedDate:'2026-10-13',language:'en',save:async input=>{window.saved.push(input);throw Error('Hold draft');},reread:async()=>{},onSaved:()=>{}});
    });
    assert.match(await f.page.locator('[data-habit-current-goal]').textContent(),/00:30/);
    assert.match(await f.page.locator('[data-habit-pending-goal]').textContent(),/2026-10-14.*01:00/);
    assert.equal(await f.page.getByLabel('Target time').inputValue(),'01:00');
    assert.equal(await f.page.getByLabel('Target day relation').inputValue(),'next-day');
    await f.page.getByLabel('Name',{exact:true}).fill('Bedtime');await f.page.getByRole('button',{name:'Save',exact:true}).click();
    await f.page.getByRole('status').filter({hasText:'Hold draft'}).waitFor();
    const input=await f.page.evaluate(()=>window.saved[0]);assert.equal(input.habitKey,'sleep');assert.equal(input.settings.startDate,'2026-10-01');assert.equal(input.settings.goal.dayRelation,'next-day');
  }finally{await f.close();}
});
