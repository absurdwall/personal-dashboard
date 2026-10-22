import {readFileSync,mkdtempSync,writeFileSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

// Production macOS WebKit DOM/layout with only the public Tauri boundary substituted.
export function probe(width:number, scenario:string, withUntimed=true, height=758, responses: Record<string, unknown> = {}, beforeMain = "") {
  const directory=mkdtempSync(join(tmpdir(),'pdex14-webkit-'));
  try {
    const root=new URL('../../..',import.meta.url).pathname;
    execFileSync(join(root,'node_modules/.bin/tsc'),['--module','commonjs','--outDir',directory],{cwd:root});
    const modules=Object.fromEntries(readdirSync(directory).filter(n=>n.endsWith('.js')).map(n=>['./'+n,readFileSync(join(directory,n),'utf8')]));
    const view=JSON.parse(readFileSync(new URL('../fixtures/plan-time-views.json',import.meta.url),'utf8')).loaded;
    const base=view.timeAxis.currentArrangement[0];
    view.timeAxis.unlocatedCurrentArrangement=withUntimed ? [{...base,startMinute:null,endMinute:null,planPrecision:'unlocated',text:'Synthetic untimed plan original',period:'择机'}] : [];
    view.timeAxis.unlocatedConfirmedFacts=withUntimed ? [{...base,startMinute:null,endMinute:null,planId:null,timeEditable:false,text:'Synthetic untimed confirmed fact original',period:''}] : [];
    writeFileSync(join(directory,'index.html'),readFileSync(new URL('../../../frontend/index.html',import.meta.url),'utf8').replace(/<script[^>]*src="main.js"[^>]*><\/script>/,''));
    writeFileSync(join(directory,'styles.css'),readFileSync(new URL('../../../frontend/styles.css',import.meta.url),'utf8'));
    writeFileSync(join(directory,'check.js'),`
      const modules=${JSON.stringify(modules)},cache={};
      function require(n){if(cache[n])return cache[n];const e={};cache[n]=e;new Function('exports','require',modules[n])(e,require);return e;}
      const responses=${JSON.stringify(responses)};window.probeErrors=[];window.addEventListener('error',event=>window.probeErrors.push(event.message));window.addEventListener('unhandledrejection',event=>window.probeErrors.push(String(event.reason)));
      const view=${JSON.stringify(view)},month=${readFileSync(new URL('../fixtures/compact-calendar-view.json',import.meta.url),'utf8')}.month,calls=[];
      window.__TAURI__={core:{invoke:async(command,args)=>{calls.push({command,args});
        if(command in responses)return structuredClone(responses[command]);
        if(command==='today_clock')return {date:view.date,livedDate:view.date,time:'09:30'};
        if(['today_view','daily_view','read_daily_view'].includes(command))return structuredClone(view);
        if(command==='calendar_month')return structuredClone(month);
        if(command==='tasks_view')return structuredClone(view.tasks);
        if(command==='application_identity')return {productName:'Synthetic Dashboard'};
        if(command==='interface_language_preferences')return {interfaceLanguage:'en'};
        if(command==='appearance_preferences')return {accent:'green',fontSize:'normal'};
        throw Error('Unexpected public command '+command);
      }}};
      ${beforeMain}
      require('./main.js');
      async function until(f){for(let n=0;n<200;n++){if(f())return;await new Promise(r=>setTimeout(r,2));}throw Error('DOM condition timed out '+f);}
      await until(()=>document.querySelector('#runtime-status').dataset.state==='ready'&&document.documentElement.lang.startsWith(responses.interface_language_preferences?.interfaceLanguage??'en'));
      document.querySelector('[data-today-phase="daytime"]').click();
      const region=document.querySelector('#today-unlocated-time-region'),trigger=document.querySelector('#today-unlocated-time-shortcut');
      const rect=n=>{const r=n.getBoundingClientRect();return {width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
      const side=document.querySelector('.today-side-region');
      const snapshot=()=>({side:rect(side),sideHidden:side.hidden,viewport:innerWidth,layoutWidth:rect(document.querySelector('.today-layout')).width,axis:rect(document.querySelector('#today-axis-scroll-surface')),nav:rect(document.querySelector('.workspace-sidebar')),region:rect(region),hidden:region.hidden,expanded:trigger.getAttribute('aria-expanded'),label:trigger.getAttribute('aria-label'),visibleText:trigger.textContent,badge:trigger.querySelector('.sidebar-toggle-count')?.textContent??null,content:region.textContent});
      ${scenario}
    `);
    return JSON.parse(execFileSync('swift',[new URL('./rendered-today-unlocated.swift',import.meta.url).pathname,join(directory,'index.html'),join(directory,'check.js'),String(width),String(height)],{encoding:'utf8',timeout:60000}));
  } finally {rmSync(directory,{recursive:true,force:true});}
}

