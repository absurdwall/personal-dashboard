import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

// Existing browser tooling only; no new dependency or user profile.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE_PATH ? pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href : 'playwright');
const root=resolve(import.meta.dirname,'../..');
const view=JSON.parse(await readFile(resolve(root,'tests/frontend/fixtures/plan-time-views.json'),'utf8')).loaded;
const calendar=JSON.parse(await readFile(resolve(root,'tests/frontend/fixtures/compact-calendar-view.json'),'utf8')).month;
const base=view.timeAxis.currentArrangement[0];
view.timeAxis.unlocatedCurrentArrangement=[{...base,startMinute:null,endMinute:null,planPrecision:'unlocated',text:'Synthetic keyboard plan',period:'择机'}];
view.timeAxis.unlocatedConfirmedFacts=[];

for(const width of [640,1000,1280]) {
  test(`sidebar keyboard activation and focus at ${width}px use the production UI without writes`,async()=>{
    const server=createServer(async(req,res)=>{try {
      const url=new URL(req.url,'http://localhost');const file=resolve(root,'dist',url.pathname==='/'?'index.html':url.pathname.slice(1));
      if(!file.startsWith(resolve(root,'dist')+'/'))throw Error('Invalid path');
      res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await readFile(file));
    }catch{res.statusCode=404;res.end('not found');}});
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    const browser=await chromium.launch({channel:'chrome',headless:true});
    try {
      const page=await browser.newPage({viewport:{width,height:758}});
      await page.addInitScript(({view,calendar})=>{
        window.__calls=[];
        window.__TAURI__={core:{invoke:async(command,args)=>{
          window.__calls.push({command,args});
          if(['today_view','read_daily_view'].includes(command))return structuredClone(view);
          if(command==='tasks_view')return structuredClone(view.tasks);
          if(command==='calendar_month')return structuredClone(calendar);
          if(command==='application_identity')return {productName:'Synthetic Dashboard'};
          if(command==='interface_language_preferences')return {interfaceLanguage:'en'};
          if(command==='appearance_preferences')return {accent:'green',fontSize:'normal'};
          throw Error('Unsupported synthetic public boundary '+command);
        }}};
      },{view,calendar});
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      await page.waitForFunction(()=>document.querySelector('#runtime-status').dataset.state==='ready'&&document.documentElement.lang==='en');
      const nav=page.locator('#workspace-sidebar-toggle');
      for(const destination of ['today','tasks','calendar','habits','collaboration']) {
        await page.locator(`.destination-button[data-workspace-destination=${destination}]`).click();
        await nav.focus();await nav.press('Space');
        assert.equal(await nav.getAttribute('aria-expanded'),'false');
        assert.equal(await page.locator('#workspace-sidebar').isVisible(),false);
        assert.equal(await nav.evaluate(el=>el===document.activeElement),true);
        await nav.press('Enter');
        assert.equal(await nav.getAttribute('aria-expanded'),'true');
        assert.equal(await page.locator('#workspace-sidebar').isVisible(),true);
        assert.equal(await nav.evaluate(el=>el===document.activeElement),true);
      }
      await page.locator('.destination-button[data-workspace-destination=today]').click();
      await page.locator('[data-today-phase=daytime]').click();
      const today=page.locator('#today-unlocated-time-shortcut');
      if(await today.getAttribute('aria-expanded')==='true')await today.click();
      await today.focus();await today.press('Space');
      assert.equal(await today.getAttribute('aria-expanded'),'true');
      assert.equal(await page.locator('#today-side-region').isVisible(),true);
      assert.equal(await today.evaluate(el=>el===document.activeElement),true);
      await today.press('Escape');assert.equal(await today.getAttribute('aria-expanded'),'true','docked sidebar has no modal Escape lifecycle');
      await today.press('Enter');assert.equal(await today.getAttribute('aria-expanded'),'false');
      assert.equal(await today.evaluate(el=>el===document.activeElement),true);
      await page.locator('.destination-button[data-workspace-destination=calendar]').click();
      const summary=page.locator('#calendar-summary-toggle');await summary.focus();await summary.press('Space');
      assert.equal(await summary.getAttribute('aria-expanded'),'false');await summary.press('Enter');
      assert.equal(await summary.getAttribute('aria-expanded'),'true');assert.equal(await summary.evaluate(el=>el===document.activeElement),true);
      assert.equal(await page.locator('dialog[open]').count(),0);
      assert.deepEqual(await page.evaluate(()=>window.__calls.filter(c=>/^(create_|edit_|update_|save_|set_)/.test(c.command))),[]);
    }finally{await browser.close();await new Promise(r=>server.close(r));}
  });
}
