// Read an exported saved synthetic session and run the production message
// renderer. This verifies presentation/navigation, not model understanding.
// Usage: node scripts/acceptance/verify-personal-retro.mjs session.json [...]
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { appendCollaborationMarkdown, appendCollaborationWorkHistory } from '../../frontend/collaboration-work-history.ts';

class Element {
  textContent='';className='';dataset={};children=[];listeners={};open=false;
  scrollTop=0;scrollHeight=300;clientHeight=100;
  constructor(tag){this.tagName=tag;}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(){this.children=[];}
  setAttribute(){}
  addEventListener(name,handler){this.listeners[name]=handler;}
  querySelectorAll(selector){return this.children.flatMap(node=>[
    ...(selector==='details[data-work-key]' && node.tagName==='details' && node.dataset.workKey?[node]:[]),
    ...node.querySelectorAll(selector),
  ]);}
}
const document={createElement:tag=>new Element(tag)};
const descendants=node=>[node,...node.children.flatMap(descendants)];
const text=node=>[node.textContent,...node.children.map(text)].join('\n');
const source=readFileSync(new URL('../../frontend/main.ts',import.meta.url),'utf8');
function productionFunction(name){
  const offset=source.indexOf(`function ${name}(`);assert.ok(offset>=0);
  const rest=source.slice(offset);const end=/^}\n/m.exec(rest);assert.ok(end);
  return stripTypeScriptTypes(rest.slice(0,end.index+2));
}
const files=process.argv.slice(2);assert.ok(files.length,'Provide saved session JSON');
for(const file of files){
  const session=JSON.parse(readFileSync(file,'utf8'));
  assert.equal(session.runState,'completed');
  assert.equal(session.taskOperations.length,0,'A report has no business mutations');
  assert.equal(session.memoryProposals.length,0);
  const reply=session.messages.filter(message=>message.role==='assistant').at(-1);
  assert.ok(reply?.text,'Use an actual saved reply');
  const list=new Element('section');const navigated=[];
  const context=vm.createContext({document,session,collaborationMessageList:list,
    appendCollaborationWorkHistory,appendCollaborationMarkdown,
    collaborationDateLabel:value=>value,collaborationDeliveryStateLabel:value=>value,t:key=>key,
    renderCollaborationOutcomes(){},navigateCollaborationLink:(origin,target)=>{assert.equal(origin.id,session.id);navigated.push(target);},
  });
  vm.runInContext(productionFunction('collaborationWorkHistoryLabels')+
    productionFunction('renderCollaborationMessages')+'\nrenderCollaborationMessages(session)',context);
  const shown=text(list);
  for(const fact of ['Synthetic morning baseline.','Synthetic current arrangement.','完成合成工作块',
    'completed 2026-09-26 at an unknown time','Missing dates remain unknown','Suggestions are discussion']){
    assert.ok(shown.includes(fact),`Saved report fact absent: ${fact}`);
  }
  assert.ok(descendants(list).some(node=>node.tagName==='strong' && node.textContent.startsWith('Personal retro')));
  const buttons=descendants(list).filter(node=>node.tagName==='button' && node.className==='text-button collaboration-reply-link');
  for(const button of buttons){button.listeners.click();}
  assert.ok(navigated.some(target=>target.kind==='record' && target.date==='2026-09-27' && target.phase==='daytime'));
  assert.ok(navigated.some(target=>target.kind==='task' && target.id));
  assert.ok(navigated.some(target=>target.kind==='habit' && target.key==='exercise' && target.date==='2026-09-26'));
  assert.ok(!descendants(list).some(node=>['script','iframe'].includes(node.tagName)));
  console.log(JSON.stringify({file,sessionId:session.id,replyId:reply.id,links:navigated.length,
    verified:['saved-reply','baseline-vs-arrangement-vs-fact','sparse-unknown','read-only-source-navigation']}));
}
