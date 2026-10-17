import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, mkdtempSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

// Execute the unmodified production bootstrap, with only native IPC substituted.
// Deliberately resolve Today before the persisted preference, as on native restart.
test('persisted English startup refreshes existing axis controls and derived times without replacing interaction state', {skip:process.platform!=='darwin'}, () => {
  const directory=mkdtempSync(join(tmpdir(),'pdex-startup-language-'));
  try {
    const root=new URL('../..',import.meta.url).pathname;
    execFileSync(join(root,'node_modules/.bin/tsc'),['--module','commonjs','--outDir',directory],{cwd:root});
    const modules=Object.fromEntries(readdirSync(directory).filter(name=>name.endsWith('.js')).map(name=>['./'+name,readFileSync(join(directory,name),'utf8')]));
    const view=JSON.parse(readFileSync(new URL('./fixtures/plan-time-views.json',import.meta.url),'utf8')).loaded;
    const base=view.timeAxis.currentArrangement[0];
    view.timeAxis.currentArrangement=[
      {...base,planId:'opaque-range-a',planPrecision:'exactRange',startMinute:780,endMinute:840,text:'13:00–14:00 保留原文甲'},
      {...base,planId:'opaque-range-b',planPrecision:'exactRange',startMinute:780,endMinute:840,text:'13:00–14:00 保留原文乙'},
      {...base,planId:'opaque-broad',startMinute:840,text:'保留午后原文'},
      {...base,planId:'opaque-approximate',period:'',planPrecision:'approximatePoint',startMinute:900,text:'保留约时原文'},
    ];
    view.timeAxis.unlocatedCurrentArrangement=[{...base,planId:'opaque-unlocated',startMinute:null,text:'保留未定位原文'}];
    writeFileSync(join(directory,'index.html'),readFileSync(new URL('../../frontend/index.html',import.meta.url),'utf8').replace(/<script[^>]*src="main.js"[^>]*><\/script>/,''));
    writeFileSync(join(directory,'styles.css'),readFileSync(new URL('../../frontend/styles.css',import.meta.url),'utf8'));
    writeFileSync(join(directory,'check.js'),`
      const modules=${JSON.stringify(modules)},cache={};
      function require(name){if(cache[name])return cache[name];const exports={};cache[name]=exports;new Function('exports','require',modules[name])(exports,require);return exports;}
      const view=${JSON.stringify(view)};let releaseLanguage;const languageGate=new Promise(resolve=>releaseLanguage=resolve);
      const calls=[];
      window.__TAURI__={core:{invoke:async(command,args)=>{
        calls.push(command);
        if(command==='today_view')return structuredClone(view);
        if(command==='application_identity')return {productName:'Synthetic Dashboard'};
        if(command==='interface_language_preferences'){await languageGate;return {interfaceLanguage:'en'};}
        if(command==='set_interface_language')return {interfaceLanguage:args.interfaceLanguage};
        if(command==='appearance_preferences')return {accent:'green',fontSize:'normal'};
        throw Error('Unexpected boundary '+command);
      }}};
      require('./main.js');
      async function until(condition){for(let n=0;n<200;n++){if(condition())return;await Promise.resolve();}throw Error('Startup condition timed out: '+condition+' lang='+document.documentElement.lang+' calls='+calls.join(','));}
      await until(()=>document.querySelector('.today-axis-plan-end')&&document.querySelector('.today-axis-stack-reveal'));
      
      document.querySelector('[data-today-phase="daytime"]').click();
      await new Promise(resolve=>setTimeout(resolve,40));
      document.querySelector('#today-axis-zoom-in').click();
      const link=document.querySelector('[data-plan-id="opaque-broad"] .today-axis-marker-link');
      if(link.tagName!=='BUTTON')throw Error('Editable plan must use a marker button');
      const marker=link.closest('li');marker.classList.add('is-stack-front');link.focus({preventScroll:true});
      const end=document.querySelector('.today-axis-plan-end'),reveal=document.querySelector('.today-axis-stack-reveal');
      const surface=document.querySelector('#today-axis-scroll-surface');
      if(!surface)throw Error('Production axis scroll viewport missing');
      surface.scrollTop=57;const scroll=surface.scrollTop;
      if(scroll<=0)throw Error('Axis regression requires a nonzero reading position');
      link.click();await until(()=>document.querySelector('dialog.plan-time-editor[open]'));
      const dialog=document.querySelector('dialog.plan-time-editor');const precision=dialog.querySelector('select');
      const start=dialog.querySelector('input[type=time]');start.value='16:35';
      const before={language:document.documentElement.lang,end:end.getAttribute('aria-label'),time:link.querySelector('.today-axis-marker-time').textContent};
      releaseLanguage();await until(()=>document.documentElement.lang==='en'&&document.querySelector('#runtime-status')?.dataset.state==='ready');
      const snapshot=()=>({end:end.getAttribute('aria-label'),endTitle:end.title,reveal:reveal.getAttribute('aria-label'),revealTitle:reveal.title,time:link.querySelector('.today-axis-marker-time').textContent,mode:precision.value,start:start.value,aria:link.getAttribute('aria-label'),approximate:document.querySelector('[data-plan-id="opaque-approximate"] .today-axis-marker-time').textContent,unlocated:document.querySelector('#today-axis-arrangement-unlocated-entry-0 .today-axis-entry-time-label').textContent});
      const english=snapshot();
      const retained={link:document.querySelector('[data-plan-id="opaque-broad"] .today-axis-marker-link')===link,dialog:document.querySelector('dialog.plan-time-editor')===dialog,open:dialog.open,controls:dialog.contains(precision)&&dialog.contains(start),front:marker.classList.contains('is-stack-front'),focused:dialog.contains(document.activeElement),scroll:surface.scrollTop===scroll};
      document.querySelector('#workspace-language').click();await until(()=>document.documentElement.lang==='zh-CN');const chinese=snapshot();
      document.querySelector('#workspace-language').click();await until(()=>document.documentElement.lang==='en');
      return JSON.stringify({before,english,chinese,again:snapshot(),retained,scroll,calls,fixtureUnchanged:JSON.stringify(view)===JSON.stringify(${JSON.stringify(view)})});
    `);
    const result=JSON.parse(execFileSync('swift',[new URL('./helpers/rendered-evening-entry.swift',import.meta.url).pathname,join(directory,'index.html'),join(directory,'check.js')],{encoding:'utf8',timeout:60000}));
    assert.equal(result.before.language,'zh-CN');
    assert.ok(result.before.end.includes('调整计划结束'));
    assert.equal(result.before.time,'午后');
    assert.equal(result.english.end,'Adjust plan end (drag or click to edit)');
    assert.equal(result.english.endTitle,result.english.end);
    assert.match(result.english.reveal,/^Show next item \(\d+ total\)$/);
    assert.equal(result.english.revealTitle,result.english.reveal);
    assert.equal(result.english.time,'午后');
    assert.equal(result.english.mode,'approximatePoint');assert.equal(result.english.start,'16:35');
    assert.ok(result.english.aria.includes('午后'));
    assert.ok(!result.english.aria.includes('Around 14:00'));
    assert.ok(result.english.aria.includes('保留午后原文'));
    assert.equal(result.english.approximate,'Around 15:00');
    assert.ok(result.english.unlocated.includes('午后'));
    assert.ok(!result.english.unlocated.includes('未定位'));
    assert.equal(result.chinese.time,'午后');
    assert.deepEqual(result.again,result.english);
    assert.ok(result.scroll>0,'a real nonzero viewport position was captured before applying persisted English');
    assert.deepEqual(result.retained,{link:true,dialog:true,open:true,controls:true,front:true,focused:true,scroll:true});
    assert.equal(result.fixtureUnchanged,true);
    assert.equal(result.calls.filter((command:string)=>command==='today_view').length,1);
  } finally {rmSync(directory,{recursive:true,force:true});}
});
