import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {probe} from './helpers/complete-page.ts';

// Actual public TodayApplication payloads, captured by the Rust workflow case
// today_keeps_independent_sources_visible_when_either_daily_record_or_sleep_is_unreadable
// by serializing its broken/unreadable TodayView values. Only synthetic Vault
// metadata is stabilized; source facts, error state and capabilities are unchanged.
const captured=JSON.parse(readFileSync(new URL('./fixtures/today-recovery-with-sleep.json',import.meta.url),'utf8'));
for(const kind of ['readError','damagedRecord','invalidUtf8']){
  test(`Today retains repair guidance alongside independent sleep facts for ${kind}`,{skip:process.platform!=='darwin'},()=>{
    const actual=captured[kind];
    const result=probe(969,`
      await until(()=>document.querySelector('#today-status').dataset.state==='error');
      const marker=document.querySelector('[data-sleep-record-id]');
      const handoff=document.querySelector('#today-handoff');
      return JSON.stringify({sleepFacts:document.querySelectorAll('[data-sleep-record-id]').length,
        sleepVisible:Boolean(marker&&!marker.closest('[hidden]')),recordId:marker?.dataset.sleepRecordId,
        readyVisible:!document.querySelector('#today-ready').hidden,handoffVisible:!handoff.hidden,
        repairHeading:document.querySelector('#today-handoff-heading').textContent,
        repairCopy:document.querySelector('#today-handoff-copy').textContent,
        status:document.querySelector('#today-status').textContent,
        noteFormHidden:document.querySelector('#today-daytime-form').hidden,
        eveningFormHidden:document.querySelector('#today-evening-form').hidden,
        writes:calls.filter(c=>/^(add_dated_note|save_evening|save_daily|correct_dated)/.test(c.command)).length,
        errors:window.probeErrors});
    `,false,758,{},'Object.assign(view,'+JSON.stringify(actual)+');');
    assert.equal(result.sleepFacts,1);assert.equal(result.sleepVisible,true);assert.equal(result.readyVisible,true);
    assert.equal(result.recordId,actual.timeAxis.confirmedFacts[0].sleepFact.recordId);
    assert.match(result.repairHeading,/Daily Record needs repair/);
    assert.equal(result.noteFormHidden,!actual.canRecord);assert.equal(result.eveningFormHidden,!actual.canRecord);
    assert.equal(result.writes,0);assert.deepEqual(result.errors,[]);
    assert.equal(result.handoffVisible,true,'independent facts cannot hide the existing Daily Record repair handoff: '+JSON.stringify(result));
  });
}
