// Trusted subset renderer for the checked-in bilingual guides. No dependency.
// Supports headings, flat lists, fences, code, bold and links; not arbitrary HTML.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const docs=resolve(root,'docs');
const release=JSON.parse(await readFile(resolve(root,'release.json'),'utf8'));
const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const pair=(zh,en)=>'<span data-language="zh">'+zh+'</span><span data-language="en">'+en+'</span>';
const titles={installation:['安装与首次使用','Install and start'],manual:['完整使用手册','Complete user manual'],privacy:['隐私与资料','Privacy and files'],limitations:['已知限制','Known limitations'],'release-notes':['发行说明','Release notes']};
function inline(text){
  const tokens=[];
  let value=text.replace(new RegExp(String.fromCharCode(96)+'([^'+String.fromCharCode(96)+']+)'+String.fromCharCode(96),'g'),(_,code)=>'@@'+(tokens.push('<code>'+esc(code)+'</code>')-1)+'@@');
  value=esc(value).replace(/\[([^\]]+)\]\(([^)]+)\)/g,(_,label,href)=>'<a href="'+href+'">'+label+'</a>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  return value.replace(/@@(\d+)@@/g,(_,id)=>tokens[Number(id)]);
}
function markdown(source,language){
  let out='',paragraph=[],list=null,fence=false,code=[],heading=0;
  const flushParagraph=()=>{if(paragraph.length){out+='<p>'+inline(paragraph.join(' '))+'</p>';paragraph=[];}};
  const flush=()=>{flushParagraph();if(list){out+='</'+list+'>';list=null;}};
  for(const line of source.split('\n')){
    if(line.startsWith(String.fromCharCode(96).repeat(3))){flush();if(fence){out+='<pre><code>'+esc(code.join('\n'))+'</code></pre>';code=[];}fence=!fence;continue;}
    if(fence){code.push(line);continue;}
    if(!line.trim()){flush();continue;}
    const h=/^(#{1,3}) (.+)$/.exec(line);
    if(h){flush();let text=h[2],id=language+'-section-'+(++heading),attr='';const custom=/ \{#([\w-]+)\}$/.exec(text);if(custom){id=custom[1]+(language==='en'?'-en':'');attr=' data-anchor="'+custom[1]+'"';text=text.slice(0,-custom[0].length);}const level=h[1].length;out+='<h'+level+' id="'+id+'"'+attr+'>'+inline(text)+'</h'+level+'>';continue;}
    const li=/^(?:- |\d+\. )(.+)$/.exec(line);
    if(li){flushParagraph();const type=line.startsWith('- ')?'ul':'ol';if(list!==type){if(list)out+='</'+list+'>';out+='<'+type+'>';list=type;}out+='<li>'+inline(li[1])+'</li>';continue;}
    paragraph.push(line);
  }
  flush();if(fence)throw Error('Unclosed Markdown fence');return out;
}
for(const [slug,title] of Object.entries(titles)){
  let article='';
  for(const language of ['zh','en']){
    let source=await readFile(resolve(docs,'guide',slug+'.'+language+'.md'),'utf8');
    for(const [key,value] of Object.entries(release))source=source.replaceAll('{{'+key+'}}',String(value));
    article+='<article data-language="'+language+'" lang="'+(language==='zh'?'zh-CN':'en')+'">'+markdown(source,language)+'</article>';
  }
  const menu=Object.entries(titles).map(([key,labels])=>'<a '+(key===slug?'aria-current="page"':'')+' href="'+key+'.html">'+pair(...labels)+'</a>').join('');
  const page='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f6f5ef"><title>'+esc(title.join(' / '))+' — Personal Dashboard</title><link rel="icon" href="../assets/app-icon.svg"><link rel="stylesheet" href="../site.css"><script src="../site.js" defer></script></head><body><a class="skip-link" href="#main">'+pair('跳到正文','Skip to content')+'</a><header class="site-header"><div class="shell header-inner"><a class="brand" href="../index.html"><img src="../assets/app-icon.svg" width="38" height="38" alt=""><span>Personal Dashboard</span></a><nav aria-label="Site"><a href="../index.html#features">'+pair('功能','Features')+'</a><a href="installation.html">'+pair('安装与首用','Get started')+'</a><button class="language-button" data-language-toggle type="button" aria-label="Switch to English">English</button></nav></div></header><main id="main" class="shell guide-layout"><aside class="guide-nav"><p class="eyebrow">'+pair('使用指南','USER GUIDE')+'</p>'+menu+'<a href="../index.html">'+pair('← 返回产品介绍','← Back to product')+'</a></aside><div class="guide-body">'+article+'<div class="source-links"><a href="'+slug+'.zh.md">中文 Markdown</a><a href="'+slug+'.en.md">English Markdown</a></div></div></main><footer class="shell site-footer"><p>Personal Dashboard · '+esc(release.displayVersion)+'</p><div><a href="privacy.html">'+pair('隐私与资料','Privacy & files')+'</a><a href="limitations.html">'+pair('已知限制','Known limitations')+'</a><a href="https://github.com/absurdwall/personal-dashboard">GitHub</a></div><p class="fine">'+pair('Apple Silicon Beta · 本地优先','Apple Silicon beta · Local first')+'</p></footer></body></html>';
  await writeFile(resolve(docs,'guide',slug+'.html'),page);
}
console.log('Built '+Object.keys(titles).length+' bilingual guides for '+release.tag+', build '+release.build+'.');

let home=await readFile(resolve(docs,'index.html'),'utf8');
home=home.replace(/(<[^>]+data-release-field="([^"]+)"[^>]*>)([^<]*)(<\/[^>]+>)/g,(_,open,key,old,close)=>{
  if(!(key in release))throw Error('Unknown release field '+key);
  return open+esc(release[key])+close;
});
await writeFile(resolve(docs,'index.html'),home);
