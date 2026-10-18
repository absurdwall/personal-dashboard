import assert from 'node:assert/strict';
import test from 'node:test';
import {probe} from './helpers/complete-page.ts';

const empty={state:'missing',message:'尚无 Habits 快照。Dashboard 不会自动生成数据；请在每日流程按需生成后刷新。',livedDate:null,generatedAt:null,displayRangeLabel:null,rangeLabel:null,producerLabel:null,completionRevision:null,completionTargetBinding:null,catalogRevision:null,catalogTargetBinding:'synthetic-space',catalogError:null,completionError:null,namesConfigurationState:'missing',summary:{knownCompletions:0,targetCompletions:0,coverageNote:'',excludedNoGoal:0},habits:[]};
const scenario=`document.querySelector('button[data-workspace-destination="habits"]').click();
await until(()=>document.querySelector('#habits-status').dataset.state!=='loading');
const habitSnapshot=()=>({heading:document.querySelector('#habits-empty-heading').textContent,body:document.querySelector('#habits-empty-copy').textContent,status:document.querySelector('#habits-status').textContent,addDisabled:document.querySelector('#new-habit').disabled});`;

test('a writable empty Habits view guides local creation in both languages', {skip:process.platform!=='darwin'},()=>{
  const result=probe(960,scenario+`const en=habitSnapshot();document.querySelector('#workspace-language').click();await until(()=>document.documentElement.lang==='zh-CN');return JSON.stringify({en,zh:habitSnapshot()});`,false,720,{habit_snapshot:empty,set_interface_language:{interfaceLanguage:'zh'}});
  assert.equal(result.en.heading,'No habits yet.');
  assert.match(result.en.body,/Choose Add habit/);assert.equal(result.en.status,result.en.body);assert.equal(result.en.addDisabled,false);
  assert.equal(result.zh.heading,'尚无习惯。');assert.match(result.zh.body,/添加习惯/);assert.equal(result.zh.status,result.zh.body);assert.equal(result.zh.addDisabled,false);
  assert.doesNotMatch(result.en.body,/generate one|daily flow/);
});

test('missing-space and invalid-catalog Habits views preserve actionable errors', {skip:process.platform!=='darwin'},()=>{
  for(const view of [
    {...empty,state:'unconfigured',catalogTargetBinding:null,message:'请选择 兼容 Vault，以读取 Habits 快照。'},
    {...empty,state:'error',catalogError:'Synthetic catalog failure',readError:'Synthetic catalog failure',message:'Synthetic catalog failure'},
    {...empty,readError:'Synthetic source read failure',message:'Synthetic source read failure'},
  ]){
    const result=probe(960,scenario+'return JSON.stringify(habitSnapshot());',false,720,{habit_snapshot:view});
    if(view.state!=='missing') assert.equal(result.addDisabled,true);assert.doesNotMatch(result.body,/Choose Add habit/);
    assert.notEqual(result.heading,'No habits yet.');
    if(view.readError) assert.match(result.body,/Synthetic .* failure/);
    else assert.match(result.body,/Vault/);
  }
});
