import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

// Production macOS WebKit DOM/layout with only the public Tauri boundary substituted.
function probe(width:number, scenario:string) {
  const directory=mkdtempSync(join(tmpdir(),'pdex13-webkit-'));
  try {
    const root=new URL('../..',import.meta.url).pathname;
    execFileSync(join(root,'node_modules/.bin/tsc'),['--module','commonjs','--outDir',directory],{cwd:root});
    const modules=Object.fromEntries(readdirSync(directory).filter(n=>n.endsWith('.js')).map(n=>['./'+n,readFileSync(join(directory,n),'utf8')]));
    const view=JSON.parse(readFileSync(new URL('./fixtures/plan-time-views.json',import.meta.url),'utf8')).loaded;
    const base=view.timeAxis.currentArrangement[0];
    view.timeAxis.unlocatedCurrentArrangement=[{...base,startMinute:null,endMinute:null,planPrecision:'unlocated',text:'Synthetic untimed plan original',period:'择机'}];
    view.timeAxis.unlocatedConfirmedFacts=[{...base,startMinute:null,endMinute:null,planId:null,timeEditable:false,text:'Synthetic untimed confirmed fact original',period:''}];
    writeFileSync(join(directory,'index.html'),readFileSync(new URL('../../frontend/index.html',import.meta.url),'utf8').replace(/<script[^>]*src="main.js"[^>]*><\/script>/,''));
    writeFileSync(join(directory,'styles.css'),readFileSync(new URL('../../frontend/styles.css',import.meta.url),'utf8'));
    writeFileSync(join(directory,'check.js'),`
      const modules=${JSON.stringify(modules)},cache={};
      function require(n){if(cache[n])return cache[n];const e={};cache[n]=e;new Function('exports','require',modules[n])(e,require);return e;}
      const view=${JSON.stringify(view)},calls=[];
      window.__TAURI__={core:{invoke:async(command,args)=>{calls.push({command,args});
        if(command==='today_view')return structuredClone(view);
        if(command==='application_identity')return {productName:'Synthetic Dashboard'};
        if(command==='interface_language_preferences')return {interfaceLanguage:'en'};
        if(command==='appearance_preferences')return {accent:'green',fontSize:'normal'};
        throw Error('Unexpected public command '+command);
      }}};
      require('./main.js');
      async function until(f){for(let n=0;n<200;n++){if(f())return;await new Promise(r=>setTimeout(r,2));}throw Error('DOM condition timed out '+f);}
      await until(()=>document.querySelector('#runtime-status').dataset.state==='ready'&&document.documentElement.lang==='en');
      document.querySelector('[data-today-phase="daytime"]').click();
      const region=document.querySelector('#today-unlocated-time-region'),trigger=document.querySelector('#today-unlocated-time-shortcut');
      const rect=n=>{const r=n.getBoundingClientRect();return {width:r.width,height:r.height,left:r.left,right:r.right,top:r.top};};
      const snapshot=()=>({viewport:innerWidth,axis:rect(document.querySelector('#today-axis-scroll-surface')),nav:rect(document.querySelector('.workspace-sidebar')),region:rect(region),hidden:region.hidden,expanded:trigger.getAttribute('aria-expanded'),label:trigger.textContent,content:region.textContent});
      ${scenario}
    `);
    return JSON.parse(execFileSync('swift',[new URL('./helpers/rendered-today-unlocated.swift',import.meta.url).pathname,join(directory,'index.html'),join(directory,'check.js'),String(width),'758'],{encoding:'utf8',timeout:60000}));
  } finally {rmSync(directory,{recursive:true,force:true});}
}

test('medium Today keeps left navigation and frees the axis while untimed items stay discoverable', {skip:process.platform!=='darwin'},()=>{
  const result=probe(1000,'return JSON.stringify(snapshot());');
  assert.equal(result.hidden,true);
  assert.equal(result.expanded,'false');
  assert.match(result.label,/2/);
  assert.ok(result.nav.width>=140&&result.nav.height>400,'existing left navigation stays vertical');
  assert.ok(result.axis.width>=500,JSON.stringify(result));
  assert.match(result.content,/Synthetic untimed plan original/);
  assert.match(result.content,/Synthetic untimed confirmed fact original/);
});

test('narrow untimed drawer retains sources, axis width and focus without business writes', {skip:process.platform!=='darwin'},()=>{
  const result=probe(1000,`
    const before=snapshot();trigger.focus();trigger.click();
    const dialog=document.querySelector('dialog[data-today-unlocated-drawer]');
    const opened=snapshot();
    const modal=Boolean(dialog&&dialog.open&&dialog.contains(region));
    const focusedInDrawer=Boolean(dialog&&dialog.contains(document.activeElement));
    const sources=region.textContent;
    const close=dialog?.querySelector('[data-unlocated-close]');close?.click();
    const closed=snapshot(),focusAfterClose=document.activeElement===trigger;
    trigger.click();dialog?.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    return JSON.stringify({before,opened,modal,focusedInDrawer,sources,closed,focusAfterClose,focusAfterEscape:document.activeElement===trigger,closedAfterEscape:!dialog?.open,calls});
  `);
  assert.equal(result.modal,true);
  assert.equal(result.focusedInDrawer,true);
  assert.equal(result.opened.axis.width,result.before.axis.width);
  assert.match(result.sources,/Current arrangement/);
  assert.match(result.sources,/Confirmed facts/);
  assert.match(result.sources,/Synthetic untimed confirmed fact original/);
  assert.equal(result.closed.hidden,true);
  assert.equal(result.closed.expanded,'false');
  assert.equal(result.focusAfterClose,true);
  assert.equal(result.closedAfterEscape,true);
  assert.equal(result.focusAfterEscape,true);
  assert.deepEqual(result.calls.filter((c:{command:string})=>/^(create_|edit_|update_|save_|set_)/.test(c.command)),[]);
});


test('wide auto panel and measured medium/extreme geometry preserve content without squeezed drawers', {skip:process.platform!=='darwin'},()=>{
  const geometry=[];
  for(const width of [1280,1000,960,830,640]) {
    const result=probe(width,`
      const initial=snapshot();trigger.click();const changed=snapshot();
      return JSON.stringify({initial,changed,drawer:Boolean(document.querySelector('dialog[data-today-unlocated-drawer]')?.open)});
    `);
    geometry.push(result);
    assert.equal(result.initial.viewport,width);
    assert.equal(result.initial.hidden,width!==1280);
    assert.match(result.initial.label,/2/);
    if(width===1280)assert.ok(result.changed.axis.width>result.initial.axis.width+180,'wide hide frees side rail width');
    else {assert.equal(result.changed.axis.width,result.initial.axis.width);assert.equal(result.drawer,true);}
    if(width>=830)assert.ok(result.initial.nav.width>=140&&result.initial.nav.height>400);
    assert.ok(result.initial.axis.width>300);
  }
  console.log('Measured production WebKit geometry:',JSON.stringify(geometry));
});

test('resize adapts manual presentation, keeps reading position and nodes, navigation resets automatic mode with no writes', {skip:process.platform!=='darwin'},()=>{
  const result=probe(1280,`
    const surface=document.querySelector('#today-axis-scroll-surface');surface.scrollTop=80;
    const scroll=surface.scrollTop,detail=region.querySelector('details');detail.open=true;
    const initial=snapshot();
    // Offscreen WKWebView suppresses resize notifications: native frame/geometry is real; deliver the public event after native sizing.
    async function resize(width){window.webkit.messageHandlers.resizeViewport.postMessage({width,height:758});await until(()=>innerWidth===width);window.dispatchEvent(new Event('resize'));await new Promise(r=>setTimeout(r,30));}
    await resize(1000);const automatic=snapshot();
    trigger.click();const manual=snapshot(),drawerOpen=document.querySelector('dialog[data-today-unlocated-drawer]').open;
    await resize(1280);const wideAgain=snapshot(),returnedInline=region.parentElement.classList.contains('today-side-region');
    await resize(1000);const narrowAgain=snapshot(),scrollAfterResize=surface.scrollTop;
    document.querySelector('dialog[data-today-unlocated-drawer] [data-unlocated-close]').click();
    document.querySelector('[data-today-phase="morning"]').click();
    document.querySelector('[data-today-phase="daytime"]').click();const phaseReset=snapshot();
    return JSON.stringify({initial,automatic,manual,drawerOpen,wideAgain,returnedInline,narrowAgain,phaseReset,retained:detail===region.querySelector('details')&&detail.open,scrollBefore:scroll,scrollAfterResize,calls});
  `);
  assert.equal(result.automatic.hidden,true);
  assert.equal(result.drawerOpen,true);
  assert.equal(result.wideAgain.hidden,false);
  assert.equal(result.returnedInline,true);
  assert.equal(result.narrowAgain.hidden,false);
  assert.equal(result.phaseReset.hidden,true);
  assert.equal(result.retained,true);
  assert.ok(result.scrollBefore>0);
  assert.equal(result.scrollAfterResize,result.scrollBefore);
  assert.deepEqual(result.calls.filter((c:{command:string})=>/^(create_|edit_|update_|save_|set_)/.test(c.command)),[]);
});
