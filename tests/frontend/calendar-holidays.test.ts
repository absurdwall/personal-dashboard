import assert from 'node:assert/strict';
import test from 'node:test';
import { calendarHolidaysForDate, isHolidayYearCovered } from '../../frontend/calendar-holidays.ts';

test('verified annual dates distinguish China lunar festivals and US observed holidays',()=>{
  const names=(date:string)=>calendarHolidaysForDate(date).map(h=>[h.region,h.name.en,h.observed]);
  assert.deepEqual(names('2026-02-17'),[['china','Lunar New Year',false]]);
  assert.deepEqual(names('2027-02-06'),[['china','Lunar New Year',false]]);
  assert.deepEqual(names('2026-06-19'),[['china','Dragon Boat Festival',false],['unitedStates','Juneteenth National Independence Day',false]]);
  assert.deepEqual(names('2027-09-15'),[['china','Mid-Autumn Festival',false]]);
  assert.deepEqual(names('2026-07-03'),[['unitedStates','Independence Day (observed)',true]]);
  assert.deepEqual(names('2027-07-05'),[['unitedStates','Independence Day (observed)',true]]);
  assert.deepEqual(names('2027-12-24'),[['unitedStates','Christmas Day (observed)',true]]);
  assert.deepEqual(names('2027-12-25'),[['unitedStates','Christmas Day',false]]);
});

test('total and region switches filter only covered read-only date annotations',()=>{
  assert.equal(calendarHolidaysForDate('2026-01-01').length,2);
  assert.deepEqual(calendarHolidaysForDate('2026-01-01',{enabled:false,china:true,unitedStates:true}),[]);
  assert.deepEqual(calendarHolidaysForDate('2026-01-01',{enabled:true,china:false,unitedStates:true}).map(h=>h.region),['unitedStates']);
  assert.deepEqual(calendarHolidaysForDate('2026-01-01',{enabled:true,china:true,unitedStates:false}).map(h=>h.region),['china']);
  assert.equal(isHolidayYearCovered(2026),true);assert.equal(isHolidayYearCovered(2027),true);
  assert.equal(isHolidayYearCovered(2025),false);assert.equal(isHolidayYearCovered(2028),false);
  assert.deepEqual(calendarHolidaysForDate('2028-01-01'),[]);
  const source=calendarHolidaysForDate('2027-09-15')[0];
  assert.ok(source.sources.includes('https://www.hko.gov.hk/en/gts/time/calendar/pdf/files/2027e.pdf'));
});

test('coverage includes the verified observed New Year boundary inside December 2027',()=>{
  const holiday=calendarHolidaysForDate('2027-12-31')[0];
  assert.equal(holiday?.name.en,'New Year 2028 (observed)');
  assert.equal(holiday?.observed,true);
  assert.deepEqual(calendarHolidaysForDate('2028-01-01'),[]);
});
