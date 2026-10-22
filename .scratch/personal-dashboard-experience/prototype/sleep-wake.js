// THROWAWAY: synthetic records and memory-only interactions for the sleep/wake UI.
const CURRENT_DATE = '2026-10-21';
const DAY_MS = 24 * 60 * 60 * 1000;
const $ = (selector, root = document) => root.querySelector(selector);
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const dateAtOffset = offset => new Date(Date.parse(`${CURRENT_DATE}T12:00:00Z`) - offset * DAY_MS).toISOString().slice(0,10);
const endpoint = (kind, minute = null, raw = '', low = null, high = null) => ({kind, minute, raw, low, high});
const exact = minute => endpoint('exact', minute);
const approx = minute => endpoint('approx', minute);
const fuzzy = (raw, low = null, high = null) => endpoint('range', null, raw, low, high);
const unknown = () => endpoint('unknown');
const records = new Map();
const dailyHabits = [
  {id:'walk',name:'晨间散步',done:true,weekDone:2,weekGoal:3},
  {id:'stretch',name:'伸展活动',done:true,weekDone:4,weekGoal:5},
  {id:'reading',name:'阅读',done:false,weekDone:2,weekGoal:5},
  {id:'evening',name:'晚间整理',done:false,weekDone:1,weekGoal:3}
];
const addRecord = (offset, onset, getup) => records.set(dateAtOffset(offset), {onset, getup});

// The newest week deliberately includes full, partial, range, and empty dates.
addRecord(0, approx(30), exact(8 * 60 + 10));
addRecord(1, exact(10), approx(8 * 60 + 25));
addRecord(2, exact(23 * 60 + 50), exact(7 * 60 + 20));
addRecord(3, fuzzy('23点多', 23 * 60, 24 * 60 - 1), fuzzy('八点多', 8 * 60, 8 * 60 + 59));
addRecord(4, approx(10), null);
addRecord(6, null, exact(7 * 60 + 50));

// Stable synthetic older records make 30-day browsing and history clickable.
for (let offset = 7; offset < 30; offset += 1) {
  if (offset % 6 === 2) continue;
  const onsetMinute = (23 * 60 + 43 + (offset * 11) % 80) % (24 * 60);
  const getupMinute = 7 * 60 + 24 + (offset * 13) % 76;
  let onset = offset % 9 === 0 ? fuzzy('23点多', 23 * 60, 24 * 60 - 1)
    : offset % 7 === 0 ? null
    : offset % 4 === 0 ? approx(onsetMinute) : exact(onsetMinute);
  let getup = offset % 8 === 0 ? unknown()
    : offset % 5 === 0 ? fuzzy('八点多', 8 * 60, 8 * 60 + 59)
    : offset % 7 === 0 ? null
    : offset % 3 === 0 ? approx(getupMinute) : exact(getupMinute);
  records.set(dateAtOffset(offset), {onset, getup});
}

let page = new URLSearchParams(location.search).get('page') || 'today';
let metric = new URLSearchParams(location.search).get('metric') || 'onset';
let rangeDays = Number(new URLSearchParams(location.search).get('range')) === 30 ? 30 : 7;
let showOlder = false;
let voiceState = '麦克风已停止，正在整理转写…';
let draft = '最近一周入睡有点晚，帮我看看起床时间有没有变化。';
let toastTimer;

const metricNames = {onset:'入睡时间', getup:'起床时间', duration:'睡眠时长'};
const metricRanges = {
  onset:{min:21*60, max:33*60, ticks:[21*60,24*60,27*60,30*60,33*60], labels:['21:00','00:00','03:00','06:00','09:00']},
  getup:{min:5*60, max:11*60, ticks:[5*60,6.5*60,8*60,9.5*60,11*60], labels:['05:00','06:30','08:00','09:30','11:00']},
  duration:{min:4*60, max:10*60, ticks:[4*60,5*60,6*60,7*60,8*60,9*60,10*60], labels:['4h','5h','6h','7h','8h','9h','10h']}
};

function localDateLabel(iso, includeWeekday = true) {
  const date = new Date(`${iso}T12:00:00`);
  const label = `${date.getMonth()+1}月${date.getDate()}日`;
  return includeWeekday ? `${label} · 周${'日一二三四五六'[date.getDay()]}` : label;
}
function clock(minute) {
  const value = ((Math.round(minute) % 1440) + 1440) % 1440;
  return `${String(Math.floor(value / 60)).padStart(2,'0')}:${String(value % 60).padStart(2,'0')}`;
}
function durationText(minutes) {
  const rounded = Math.max(0, Math.round(minutes));
  const hours = Math.floor(rounded / 60), mins = rounded % 60;
  return `${hours}小时${String(mins).padStart(2,'0')}分`;
}
function hasValue(value) { return Boolean(value && value.kind !== 'unknown'); }
function durationValue(record) {
  if (!record) return null;
  if (record.onset?.kind === 'unknown' || record.getup?.kind === 'unknown') return {kind:'unknown'};
  if (!record.onset || !record.getup) return null;
  if (record.onset.minute == null || record.getup.minute == null) return {kind:'range'};
  const minutes = (record.getup.minute - record.onset.minute + 1440) % 1440;
  return {kind:record.onset.kind === 'approx' || record.getup.kind === 'approx' ? 'approx' : 'exact', minutes};
}
function endpointText(value) {
  if (!value) return '未记录';
  if (value.kind === 'unknown') return '不清楚';
  if (value.kind === 'range') return value.raw || '范围';
  return `${value.kind === 'approx' ? '约 ' : ''}${clock(value.minute)}`;
}
function durationDisplay(record) {
  const result = durationValue(record);
  if (!result) return '—';
  if (result.kind === 'unknown') return '未知';
  if (result.kind === 'range') return '范围不生成时长';
  return `${result.kind === 'approx' ? '约 ' : ''}${durationText(result.minutes)}`;
}
function daysFor(count) { return Array.from({length:count},(_,i)=>dateAtOffset(count-1-i)); }
function updateUrl() {
  const params = new URLSearchParams({page});
  if (page === 'sleep') { params.set('metric',metric); params.set('range',String(rangeDays)); }
  history.replaceState(null,'',`${location.pathname}?${params.toString()}`);
}
function navPage(next) {
  if (next === 'tasks' || next === 'calendar') {
    location.href = `/revised.html?page=${next}&variant=R`;
    return;
  }
  page = next; render();
}
function toast(message) {
  const el = $('#toast'); el.textContent = message; el.className = 'sw-toast'; el.dataset.visible = 'true';
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>{el.dataset.visible='false';},2400);
}
function header(title, subtitle, action = '') {
  return `<div class="sw-page-header"><div><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`;
}
function pointValue(record, selectedMetric) {
  if (!record) return null;
  if (selectedMetric === 'duration') {
    const d = durationValue(record);
    return d && (d.kind === 'exact' || d.kind === 'approx') ? {kind:d.kind, value:d.minutes} : null;
  }
  const value = record[selectedMetric];
  if (!value || value.kind === 'unknown') return null;
  if (value.kind === 'range') return value.low != null && value.high != null ? {kind:'range', low:value.low, high:value.high, raw:value.raw} : null;
  return {kind:value.kind === 'approx' ? 'approx' : 'exact', value:value.minute};
}
function axisValue(value, selectedMetric) {
  if (selectedMetric === 'duration') return value;
  if (selectedMetric === 'onset' && value < 12*60) return value + 1440;
  return value;
}
function plottedValue(entry, selectedMetric) {
  if (!entry) return null;
  if (entry.kind === 'range') return {kind:'range',low:axisValue(entry.low,selectedMetric),high:axisValue(entry.high,selectedMetric)};
  return {kind:entry.kind,value:axisValue(entry.value,selectedMetric)};
}
function chartSvg(selectedMetric, days, compact = false) {
  const spec = metricRanges[selectedMetric];
  const width = 700, height = compact ? 132 : 214;
  const left = compact ? 38 : 48, right = 12, top = 10, bottom = compact ? 25 : 28;
  const plotW = width-left-right, plotH = height-top-bottom;
  const y = value => top + ((spec.max-value)/(spec.max-spec.min))*plotH;
  const x = index => left + (days.length < 2 ? plotW/2 : index*plotW/(days.length-1));
  const patternId = `sw-range-${selectedMetric}-${days.length}-${compact ? 'mini' : 'large'}`;
  const compactIndices = selectedMetric==='onset' ? [0,1,spec.ticks.length-1] : [0,Math.floor(spec.ticks.length/2),spec.ticks.length-1];
  const ticks = compact ? compactIndices.map(index=>spec.ticks[index]) : spec.ticks;
  const tickLabels = compact ? compactIndices.map(index=>spec.labels[index]) : spec.labels;
  const grid = ticks.map((tick,index)=>`<line class="sw-grid" x1="${left}" x2="${width-right}" y1="${y(tick)}" y2="${y(tick)}"/><text x="${left-7}" y="${y(tick)+3}" text-anchor="end">${tickLabels[index]}</text>`).join('');
  const values = days.map((date,index)=>({date,index,plotted:plottedValue(pointValue(records.get(date),selectedMetric),selectedMetric)}));
  let segments = [], segment = [];
  const flush = () => { if (segment.length > 1) segments.push(segment); segment=[]; };
  for (const entry of values) {
    if (entry.plotted?.kind === 'exact' || entry.plotted?.kind === 'approx') segment.push(entry);
    else flush();
  }
  flush();
  const lines = segments.map(items=>`<path class="sw-line" d="${items.map((item,index)=>`${index?'L':'M'} ${x(item.index)} ${y(item.plotted.value)}`).join(' ')}"/>`).join('');
  const bands = values.filter(item=>item.plotted?.kind==='range').map(item=>{
    const topY = Math.min(y(item.plotted.low),y(item.plotted.high));
    const bandH = Math.max(6,Math.abs(y(item.plotted.low)-y(item.plotted.high)));
    const bandW = compact ? 12 : 17;
    return `<rect class="sw-range-band" style="fill:url(#${patternId})" x="${x(item.index)-bandW/2}" y="${topY}" width="${bandW}" height="${bandH}"/><line class="sw-range-cap" x1="${x(item.index)-bandW/2-2}" x2="${x(item.index)+bandW/2+2}" y1="${topY}" y2="${topY}"/><line class="sw-range-cap" x1="${x(item.index)-bandW/2-2}" x2="${x(item.index)+bandW/2+2}" y1="${topY+bandH}" y2="${topY+bandH}"/>`;
  }).join('');
  const dots = values.filter(item=>item.plotted?.kind==='exact'||item.plotted?.kind==='approx').map(item=>`<circle class="${item.plotted.kind==='approx'?'sw-point-approx':'sw-point'}" cx="${x(item.index)}" cy="${y(item.plotted.value)}" r="${compact?3.3:4.2}"><title>${localDateLabel(item.date)}：${selectedMetric==='duration'?durationText(item.plotted.value):clock(item.plotted.value)}</title></circle>`).join('');
  const labelIndices = days.length <= 7 ? days.map((_,i)=>i) : [0,4,9,14,19,24,29].filter(i=>i<days.length);
  const labels = labelIndices.map(index=>`<text x="${x(index)}" y="${height-5}" text-anchor="middle">${Number(days[index].slice(8,10))}日</text>`).join('');
  return `<svg class="sw-chart ${compact?'sw-chart-compact':'sw-chart-large'}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${metricNames[selectedMetric]}趋势图，${days.length}天；缺失记录处断线，模糊范围用区间显示"><defs><pattern id="${patternId}" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#f8f3e8"/><line x1="0" y1="0" x2="0" y2="6" stroke="#e7ddc7" stroke-width="2"/></pattern></defs>${grid}${lines}${bands}${dots}${labels}</svg>`;
}
function pointMinutesForAverage(record, selectedMetric) {
  if (selectedMetric === 'duration') {
    const d = durationValue(record);
    return d && (d.kind==='exact'||d.kind==='approx') ? {value:d.minutes,approximate:d.kind==='approx'} : null;
  }
  const e = record?.[selectedMetric];
  return e && (e.kind==='exact'||e.kind==='approx') ? {value:e.minute,approximate:e.kind==='approx'} : null;
}
function metricStats(selectedMetric, dates) {
  let valid = 0, values = [];
  for (const date of dates) {
    const record = records.get(date);
    if (!record) continue;
    const point = pointMinutesForAverage(record,selectedMetric);
    if (selectedMetric === 'duration' ? point !== null : hasValue(record[selectedMetric])) valid++;
    if (point) values.push(point);
  }
  let average = null;
  if (values.length) {
    if (selectedMetric === 'onset') {
      const signed = values.map(item=>item.value > 12*60 ? item.value-1440 : item.value);
      const mean = Math.round(signed.reduce((sum,item)=>sum+item,0)/signed.length);
      average = ((mean%1440)+1440)%1440;
    } else average = Math.round(values.reduce((sum,item)=>sum+item.value,0)/values.length);
  }
  return {valid, average, pointCount:values.length, approximate:values.some(item=>item.approximate)};
}
function averageText(selectedMetric, stats) {
  if (stats.average == null) return '暂无可平均的时间点';
  let value = selectedMetric === 'duration' ? durationText(stats.average) : clock(stats.average);
  return `${stats.approximate?'约 ':''}${value}`;
}
function renderMetricCard(selectedMetric, dates) {
  const stats = metricStats(selectedMetric,dates);
  return `<button class="sw-trend-card" data-open-metric="${selectedMetric}" aria-label="查看${metricNames[selectedMetric]}详情"><span class="sw-trend-top"><strong>${metricNames[selectedMetric]}</strong><small>${stats.valid}/${dates.length} 晚有记录</small></span><span class="sw-trend-average">平均 ${averageText(selectedMetric,stats)}</span>${chartSvg(selectedMetric,dates,true)}<span class="sw-hint">点击查看 7 天 / 30 天趋势与历史</span></button>`;
}
function renderCompactMetricSummary(selectedMetric, dates) {
  const stats = metricStats(selectedMetric,dates);
  return `<button class="sw-sleep-summary-row" data-open-metric="${selectedMetric}" aria-label="查看${metricNames[selectedMetric]}详情"><strong>${metricNames[selectedMetric]}</strong><small>${stats.valid}/${dates.length} 晚有记录</small><span>平均 ${averageText(selectedMetric,stats)}</span><span class="sw-sleep-summary-link">查看趋势 →</span></button>`;
}
function todayPage() {
  const record = records.get(CURRENT_DATE);
  const onsetText = record?.onset ? endpointText(record.onset) : '未记录';
  const getupText = record?.getup ? endpointText(record.getup) : '未记录';
  const sleepText = durationDisplay(record);
  return `<div class="sw-page sw-today-page">
    ${header('今天','2026 年 10 月 21 日 · 周三')}
    <div class="sw-phase-tabs" aria-label="今日阶段"><span class="active">早晨</span><span>白天</span><span>晚间</span></div>
    <button class="sw-today-sleep-row" data-detail="onset" aria-label="查看习惯中的昨晚作息趋势">
      <span class="sw-today-sleep-label">昨晚作息</span>
      <strong>${esc(onsetText)} 入睡 · 今天 ${esc(getupText)} 起床</strong>
      <span class="sw-today-sleep-duration">${esc(sleepText)}</span>
      <span class="sw-today-sleep-link">查看习惯趋势 →</span>
    </button>
    <div class="sw-today-context">
      <section class="surface"><h2>今天的安排</h2><div class="sw-agenda"><div class="sw-agenda-row"><time>10:00</time><span>整理上午的计划</span></div><div class="sw-agenda-row"><time>午后</time><span>留出一段自由时间</span></div><div class="sw-agenda-row"><time>晚间</time><span>按实际情况安排休息</span></div></div></section>
    </div>
  </div>`;
}
function habitsPage() {
  const dates = daysFor(7);
  const doneCount = dailyHabits.filter(habit=>habit.done).length;
  const weekDone = dailyHabits.reduce((sum,habit)=>sum+habit.weekDone,0);
  const weekGoal = dailyHabits.reduce((sum,habit)=>sum+habit.weekGoal,0);
  return `<div class="sw-page sw-habits-page">
    ${header('本周习惯','保留本周摘要与今日习惯；睡眠和起床趋势也在这里查看')}
    <div class="sw-habits-layout">
      <aside class="surface sw-habits-summary">
        <div class="sw-week-summary"><strong>本周统计</strong><small>10 月 19 日 – 25 日 · 截至 21 日</small></div>
        <div class="sw-week-total"><strong>${weekDone} / ${weekGoal}</strong><span>已达标天数 / 本周目标天数</span></div>
        <div class="sw-habit-summary-list">
          ${dailyHabits.map(habit=>`<div class="sw-habit-summary-row"><span>${esc(habit.name)}<small>每周 ${habit.weekGoal} 天</small></span><strong>${habit.weekDone} / ${habit.weekGoal}</strong><i><b style="width:${Math.min(100,habit.weekDone/habit.weekGoal*100)}%"></b></i></div>`).join('')}
        </div>
      </aside>
      <div class="sw-habits-main">
        <section class="surface sw-panel">
          <div class="sw-week-summary"><strong>睡眠与起床趋势</strong><small>过去 7 天 · 示例记录</small></div>
          <div class="sw-sleep-summary-rows">${renderCompactMetricSummary('onset',dates)}${renderCompactMetricSummary('getup',dates)}</div>
          <p class="sw-hint">作息单独按时间查看，不作为习惯完成打勾；点开可看详细趋势和历史。</p>
        </section>
        <section class="surface sw-panel sw-today-habits">
          <div class="sw-week-summary"><strong>今日习惯</strong><small>${doneCount} / ${dailyHabits.length} 已完成</small></div>
          <div class="sw-habit-list">
            ${dailyHabits.map(habit=>`<label class="sw-habit-row"><input type="checkbox" data-habit-check="${habit.id}" ${habit.done?'checked':''}><span>${esc(habit.name)}<small>本周 ${habit.weekDone} / ${habit.weekGoal} 天</small></span><small>${habit.done?'已记录':'未完成'}</small></label>`).join('')}
          </div>
        </section>
      </div>
    </div>
  </div>`;
}
function selectedMetricRecord(record) {
  if (!record) return {kind:'empty'};
  if (metric === 'duration') return durationValue(record) || {kind:'empty'};
  return record[metric] || {kind:'empty'};
}
function historyRow(date) {
  const record = records.get(date);
  const noData = !record || (!record.onset && !record.getup);
  return `<button class="sw-history-row" data-edit-date="${date}" aria-label="${esc(localDateLabel(date))}${noData?'，无记录':'，查看和修改记录'}"><span class="sw-history-cell">${esc(localDateLabel(date))}</span><span class="sw-history-cell">${esc(record?.onset?endpointText(record.onset):'未记录')}</span><span class="sw-history-cell">${esc(record?.getup?endpointText(record.getup):'未记录')}</span><span class="sw-history-cell">${esc(durationDisplay(record))}</span></button>`;
}
function sleepDetailPage() {
  const dates = daysFor(rangeDays), stats = metricStats(metric,dates);
  const result = selectedMetricRecord(records.get(CURRENT_DATE));
  const allThisWeek = daysFor(7);
  const weekRows = allThisWeek;
  const olderDates = daysFor(30).filter(date=>date<weekRows[0] && records.has(date) && (records.get(date).onset || records.get(date).getup));
  const rows = showOlder ? [...weekRows,...olderDates] : weekRows;
  const average = averageText(metric,stats);
  const validLabel = `${stats.valid} 晚`;
  const pointsLabel = `${stats.pointCount} 个时间点计入平均`;
  const summaryTitle = metric === 'duration' ? '平均估算时长' : `平均${metricNames[metric]}`;
  let todaySummary = '最近一晚尚无记录';
  if (result.kind === 'range') todaySummary = '保留为范围，未换算单点';
  else if (result.kind === 'unknown') todaySummary = '这一端记录为不清楚';
  else if (result.kind === 'exact' || result.kind === 'approx') todaySummary = metric==='duration' ? `${result.kind==='approx'?'约 ':''}${durationText(result.minutes)}` : endpointText(result);
  else if (result.kind === 'empty') todaySummary = metric==='duration' ? durationDisplay(records.get(CURRENT_DATE)) : endpointText(records.get(CURRENT_DATE)?.[metric]);
  return `<div class="sw-page sw-detail-page">
    <button class="text-button sw-back" data-page="habits">← 返回习惯</button>
    ${header('作息详情','同一晚的入睡、起床与估算睡眠时长')}
    <div class="sw-detail-controls">
      <div class="sw-metric-tabs" role="group" aria-label="作息指标">${['onset','getup','duration'].map(key=>`<button data-metric="${key}" aria-pressed="${metric===key}">${metricNames[key]}</button>`).join('')}</div>
      <div class="sw-range-tabs" role="group" aria-label="趋势范围">${[7,30].map(value=>`<button data-range="${value}" aria-pressed="${rangeDays===value}">${value} 天</button>`).join('')}</div>
    </div>
    <section class="surface sw-trend-panel">
      <div class="sw-trend-summary">
        <div class="sw-summary-item"><small>${summaryTitle} · ${rangeDays} 天</small><strong>${esc(average)}</strong></div>
        <div class="sw-summary-item"><small>有效记录</small><strong>${validLabel}</strong><span class="sw-summary-note">${pointsLabel}</span></div>
        <div class="sw-summary-item"><small>10 月 21 日</small><strong>${esc(todaySummary)}</strong></div>
      </div>
      <p class="sw-chart-explainer">时间轴跨过午夜连续排列；缺记录处断线，模糊范围只显示区间，不参与单点平均。</p>
      ${chartSvg(metric,dates,false)}
      <div class="sw-chart-legend"><span><i class="sw-legend-line"></i>时间点趋势</span><span><i class="sw-legend-point"></i>具体时间</span><span><i class="sw-legend-point" style="background:white;border:2px solid #78648a"></i>约数时间点</span><span><i class="sw-legend-range"></i>模糊范围</span></div>
    </section>
    <section class="sw-history">
      <div class="sw-history-heading"><h2>历史记录</h2><button class="text-button" data-edit-date="${CURRENT_DATE}">＋ 记录 / 补充这一晚</button></div>
      <div class="sw-history-table"><div class="sw-history-head"><span>日期</span><span>入睡时间</span><span>起床时间</span><span>估算睡眠时长</span></div>${rows.map(historyRow).join('')}</div>
      ${!showOlder&&olderDates.length?`<div class="sw-history-heading" style="justify-content:center;margin-top:7px"><button class="text-button" data-show-older>查看更早记录</button></div>`:''}
      ${showOlder?`<div class="sw-history-heading" style="justify-content:center;margin-top:7px"><button class="text-button" data-hide-older>收起更早记录</button></div>`:''}
    </section>
    <div class="sw-detail-callout"><span>ⓘ</span><span>睡眠时长只在入睡与起床两端都能表示为时间点时估算；任一端为“八点多”这类范围或未知时，保留记录，不从范围端点推算精确时长。</span></div>
  </div>`;
}
function collaborationPage() {
  return `<div class="sw-page sw-collab-page">
    ${header('协作','与 Codex 讨论安排与复盘')}
    <section class="surface sw-chat-surface" aria-label="协作会话">
      <div class="sw-chat-head"><div class="sw-chat-title"><strong>本周作息回顾</strong><small>示例标题 · 首轮回复完成后生成</small></div><span class="sw-chat-context">今日安排 · 已保存会话</span></div>
      <div class="sw-chat-messages" aria-live="polite">
        <div class="sw-message user"><small>你</small>最近一周入睡有点晚，帮我看看起床时间有没有变化。</div>
        <div class="sw-message assistant"><small>Codex · 示例回复</small>可以从起床时间趋势看起；缺少记录的日期会留空。这里仅展示会话排版，不会调用模型。</div>
      </div>
      <form class="sw-composer" id="collab-form">
        <div class="sw-voice-status" role="status" aria-live="polite"><span aria-hidden="true">◉</span><span id="voice-status-text">${esc(voiceState)}</span></div>
        <div class="sw-composer-box"><textarea id="collab-draft" aria-label="协作消息" placeholder="写下你想讨论的内容">${esc(draft)}</textarea><div class="sw-composer-footer"><small>⌘ Enter 发送</small><div class="sw-composer-actions"><button class="btn sw-mic-button" type="button" data-voice aria-label="切换语音状态演示" title="仅切换状态文案，不访问麦克风">🎙</button><button class="btn primary sw-send-button" type="submit">发送</button></div></div></div>
        <p class="sw-collab-note">语音按钮只切换演示状态；文字、语音和发送控件保持在原有会话区域。</p>
      </form>
    </section>
  </div>`;
}
function render() {
  updateUrl();
  const app = $('.app-shell');
  app.dataset.workspaceDestination = page==='sleep' ? 'habits' : page;
  document.querySelectorAll('.destination-button').forEach(button=>button.setAttribute('aria-current',button.dataset.page===page || (page==='sleep'&&button.dataset.page==='habits')?'page':'false'));
  $('#page').innerHTML = page==='today' ? todayPage() : page==='habits' ? habitsPage() : page==='sleep' ? sleepDetailPage() : page==='collaboration' ? collaborationPage() : `<div class="sw-page">${header(page==='tasks'?'任务':'日历','其他页面在本局部原型中保持示意')}</div>`;
  bindPage();
}
function rangeFor(raw, prefix) {
  const normalized = raw.trim();
  const arabic = normalized.match(/([0-2]?\d)\s*(?:点|時|时)\s*多/);
  const chinese = normalized.match(/([一二三四五六七八九十])\s*点\s*多/);
  const chineseNumber = {'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10};
  const hour = arabic ? Number(arabic[1]) : chinese ? chineseNumber[chinese[1]] : null;
  if (hour == null || hour > 23) return fuzzy(normalized);
  const low = hour * 60;
  return fuzzy(normalized,low,low+59);
}
function fieldMarkup(name,label,value) {
  const kind = value?.kind || 'missing';
  const minuteValue = value?.minute == null ? '' : `${String(Math.floor(value.minute/60)).padStart(2,'0')}:${String(value.minute%60).padStart(2,'0')}`;
  return `<div class="sw-edit-endpoint"><div class="sw-edit-label">${label}</div><div class="sw-edit-controls"><select id="${name}-kind" aria-label="${label}记录类型"><option value="exact" ${kind==='exact'?'selected':''}>具体时间</option><option value="approx" ${kind==='approx'?'selected':''}>约一个时间点</option><option value="range" ${kind==='range'?'selected':''}>模糊范围 / 原文</option><option value="unknown" ${kind==='unknown'?'selected':''}>不清楚</option><option value="missing" ${kind==='missing'?'selected':''}>未记录</option></select><input id="${name}-time" type="time" value="${minuteValue}" aria-label="${label}时间" ${kind==='range'||kind==='unknown'||kind==='missing'?'hidden':''}><input id="${name}-range" type="text" value="${esc(value?.raw||'')}" placeholder="例如：八点多" aria-label="${label}范围原文" ${kind==='range'?'':'hidden'}></div><p class="sw-edit-note" id="${name}-note">${kind==='range'?'保留原文与范围，不生成中点。':kind==='unknown'?'保留为未知，不推测时间。':'约数仍是时间点，可以纳入时间点平均。'}</p></div>`;
}
function openEditor(date) {
  const record = records.get(date) || {onset:null,getup:null};
  const dialog = $('#edit-dialog');
  dialog.className = 'sw-dialog';
  dialog.innerHTML = `<form id="edit-form"><h2 id="edit-title">作息记录 · ${esc(localDateLabel(date))}</h2><p class="sw-dialog-intro">一晚一条记录。可以只填一端，或保留约数、范围和未知状态。编辑只存在于当前原型内存。</p>${fieldMarkup('onset','入睡时间',record.onset)}${fieldMarkup('getup','起床时间',record.getup)}<div class="sw-edit-footer"><button class="text-button" type="button" data-clear-date="${date}">清空这一晚</button><div class="sw-edit-actions"><button class="btn" type="button" data-close-editor>取消</button><button class="btn primary" type="submit">保存示例记录</button></div></div></form>`;
  for (const name of ['onset','getup']) $(`#${name}-kind`,dialog).addEventListener('change',()=>refreshField(name,dialog));
  $('[data-close-editor]',dialog).addEventListener('click',()=>dialog.close());
  $('[data-clear-date]',dialog).addEventListener('click',()=>{records.delete(date);dialog.close();render();toast('这一晚的示例记录已清空');});
  $('#edit-form',dialog).addEventListener('submit',event=>{
    event.preventDefault();
    const next = {onset:readField('onset',dialog),getup:readField('getup',dialog)};
    if (!next.onset && !next.getup) records.delete(date); else records.set(date,next);
    dialog.close(); render(); toast('示例记录已在内存中更新');
  });
  dialog.showModal();
}
function refreshField(name,root) {
  const kind = $(`#${name}-kind`,root).value;
  $(`#${name}-time`,root).hidden = !['exact','approx'].includes(kind);
  $(`#${name}-range`,root).hidden = kind !== 'range';
  $(`#${name}-note`,root).textContent = kind==='range' ? '保留原文与范围，不生成中点。' : kind==='unknown' ? '保留为未知，不推测时间。' : kind==='missing' ? '此端保持未记录；历史与趋势会留空。' : '约数仍是时间点，可以纳入时间点平均。';
}
function readField(name,root) {
  const kind = $(`#${name}-kind`,root).value;
  if (kind==='missing') return null;
  if (kind==='unknown') return unknown();
  if (kind==='range') {
    const raw = $(`#${name}-range`,root).value.trim();
    return raw ? rangeFor(raw,name) : null;
  }
  const input = $(`#${name}-time`,root).value;
  if (!input) return null;
  const [hours,minutes] = input.split(':').map(Number);
  return endpoint(kind,hours*60+minutes);
}
function openState() {
  const dialog = $('#state-dialog');
  dialog.className = 'sw-dialog';
  dialog.innerHTML = `<h2 id="state-title">当前示例数据</h2><p class="sw-dialog-intro">所有值只在此页面的 JavaScript 内存中；没有写入 Vault。</p><pre></pre><button class="btn" data-close-state>关闭</button>`;
  $('pre',dialog).textContent = JSON.stringify({date:CURRENT_DATE,records:Object.fromEntries(records),selectedMetric:metric,rangeDays,persistence:'memory-only',vaultAccess:false,modelCalls:0,microphoneAccess:false},null,2);
  $('[data-close-state]',dialog).addEventListener('click',()=>dialog.close());
  dialog.showModal();
}
function bindPage() {
  document.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>navPage(button.dataset.page)));
  document.querySelectorAll('[data-detail]').forEach(button=>button.addEventListener('click',()=>{metric=button.dataset.detail;page='sleep';rangeDays=7;render();}));
  document.querySelectorAll('[data-open-metric]').forEach(button=>button.addEventListener('click',()=>{metric=button.dataset.openMetric;rangeDays=7;page='sleep';render();}));
  document.querySelectorAll('[data-metric]').forEach(button=>button.addEventListener('click',()=>{metric=button.dataset.metric;render();}));
  document.querySelectorAll('[data-range]').forEach(button=>button.addEventListener('click',()=>{rangeDays=Number(button.dataset.range);render();}));
  document.querySelectorAll('[data-edit-date]').forEach(button=>button.addEventListener('click',()=>openEditor(button.dataset.editDate)));
  document.querySelectorAll('[data-habit-check]').forEach(input=>input.addEventListener('change',()=>{const item=dailyHabits.find(habit=>habit.id===input.dataset.habitCheck);if(item&&item.done!==input.checked){item.weekDone=Math.max(0,Math.min(item.weekGoal,item.weekDone+(input.checked?1:-1)));item.done=input.checked;}render();}));
  $('[data-show-older]')?.addEventListener('click',()=>{showOlder=true;render();});
  $('[data-hide-older]')?.addEventListener('click',()=>{showOlder=false;render();});
  $('[data-voice]')?.addEventListener('click',()=>{
    voiceState = voiceState==='正在听写（演示）' ? '麦克风已停止，正在整理转写…' : '正在听写（演示）';
    $('#voice-status-text').textContent=voiceState;
    toast('只切换示例状态，没有访问麦克风');
  });
  const textarea = $('#collab-draft');
  if (textarea) {
    textarea.addEventListener('input',()=>{draft=textarea.value;});
    textarea.addEventListener('keydown',event=>{if(event.key==='Enter'&&(event.metaKey||event.ctrlKey)){event.preventDefault();toast('消息保留为本地草稿；没有调用模型');}});
    $('#collab-form').addEventListener('submit',event=>{event.preventDefault();draft=textarea.value;toast('消息保留为本地草稿；没有调用模型');});
  }
}
$('#inspect-state').addEventListener('click',openState);
render();
