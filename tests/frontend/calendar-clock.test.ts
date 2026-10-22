import assert from 'node:assert/strict';
import test from 'node:test';
import {registerHooks} from 'node:module';
import {formatClockMinutes} from '../../frontend/clock-time.ts';
import {shiftDateOnly} from '../../frontend/date-only.ts';
const hook=registerHooks({resolve(specifier,context,next){return next(['./clock-time.js','./date-only.js','./interface-language.js'].includes(specifier)?specifier.replace(/\.js$/,'.ts'):specifier,context);}});
const {taskAxisDateTime}=await import('../../frontend/today-axis-gestures.ts');
const {sleepElapsedCopy,formatSleepCopy}=await import('../../frontend/sleep-facts.ts');
hook.deregister();

test('clock text keeps explicit caller rounding and each established wrap convention',()=>{
  for(const [minute,positive,signed]of [
    [0,'00:00','00:00'],[59,'00:59','00:59'],[60,'01:00','01:00'],
    [1439,'23:59','23:59'],[1440,'00:00','00:00'],[1680,'04:00','04:00'],
    [-1,'23:59','-1:-1'],[-60,'23:00','-1:00'],[-1441,'23:59','-1:-1'],
    [61.5,'01:1.5','01:1.5'],
  ]as const){assert.equal(formatClockMinutes(minute),positive);assert.equal(formatClockMinutes(minute,'signed'),signed);}
  assert.equal(formatClockMinutes(Math.round(61.5)),'01:02');
});

test('UTC-noon date shifting preserves leap, month, year, and DST calendar boundaries',()=>{
  for(const [date,days,expected]of [
    ['2024-02-28',1,'2024-02-29'],['2024-03-01',-1,'2024-02-29'],
    ['2026-12-31',1,'2027-01-01'],['2026-01-01',-1,'2025-12-31'],
    ['2026-03-08',1,'2026-03-09'],['2026-11-01',-1,'2026-10-31'],
  ]as const)assert.equal(shiftDateOnly(date,days),expected);
  assert.equal(shiftDateOnly('not-a-date',1),'not-a-date');
  assert.throws(()=>shiftDateOnly('not-a-date',1,'throw'),RangeError);
  assert.throws(()=>shiftDateOnly('2026-01-01',Infinity),RangeError);
});

test('axis endpoints retain 04:00, negative minutes, and their original invalid-date throw',()=>{
  for(const [date,minute,expected]of [
    ['2026-08-10',240,{date:'2026-08-10',time:'04:00'}],
    ['2026-08-10',1680,{date:'2026-08-11',time:'04:00'}],
    ['2026-08-10',-1,{date:'2026-08-09',time:'23:59'}],
    ['2026-08-10',-1441,{date:'2026-08-08',time:'23:59'}],
    ['2024-02-28',1440,{date:'2024-02-29',time:'00:00'}],
    ['2026-08-10',61.5,{date:'2026-08-10',time:'01:1.5'}],
  ]as const)assert.deepEqual(taskAxisDateTime(date,minute),expected);
  assert.throws(()=>taskAxisDateTime('not-a-date',240),RangeError);
});

test('elapsed copy rounds total minutes once and retains sample/statistic approximation grammar',()=>{
  for(const [minutes,language,exact,sample,statistic]of [
    [450,'en','7 h 30 min','about 7 h 30 min','about 7 h 30 min'],
    [479.5,'en','8 h 0 min','about 8 h 0 min','about 8 h 0 min'],
    [450,'zh','7小时30分','约 7小时30分','约 7 小时 30 分钟'],
    [479.5,'zh','8小时0分','约 8小时0分','约 8 小时 0 分钟'],
  ]as const){
    assert.equal(formatSleepCopy(sleepElapsedCopy(minutes,false,'sample'),language),exact);
    assert.equal(formatSleepCopy(sleepElapsedCopy(minutes,false,'statistic'),language),exact);
    assert.equal(formatSleepCopy(sleepElapsedCopy(minutes,true,'sample'),language),sample);
    assert.equal(formatSleepCopy(sleepElapsedCopy(minutes,true,'statistic'),language),statistic);
  }
});
