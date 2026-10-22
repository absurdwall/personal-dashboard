import { localizedSleepElement, setSleepAttribute, setSleepCopy, sleepLanguage, sleepText, SLEEP_LANGUAGE_CHANGED_EVENT, type SleepCopyKey } from "./sleep-presentation.js";
import { createSleepElement as element } from "./sleep-dom.js";
import { formatSleepDuration, formatSleepEndpoint } from "./sleep-format.js";
import type { SleepEndpoint, SleepMetric, SleepRecord, SleepView } from "./sleep.js";

type Sample = Readonly<{ date: string; value: number | null; approximate: boolean; label: string }>;
const dayMinutes = 1440;
function isClockMetric(metric: SleepMetric): boolean { return metric !== "duration"; }
function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
function button(parent: HTMLElement, text: string, action: () => void): HTMLButtonElement {
  const node = element("button", parent, text);
  node.type = "button";
  node.onclick = action;
  return node;
}
function metricKey(metric: SleepMetric): SleepCopyKey {
  return metric === "sleepOnset" ? "sleep.metricOnset" : metric === "getUp" ? "sleep.getUp" : "sleep.metricDuration";
}
function label(metric: SleepMetric): string { return sleepText(metricKey(metric)); }
function localizedButton(parent: HTMLElement, key: SleepCopyKey, action: () => void, variables: Readonly<Record<string,string|number>> = {}): HTMLButtonElement {
  const node = button(parent,"",action); setSleepCopy(node,key,variables); return node;
}

function clock(minutes: number): string {
  const rounded = ((Math.round(minutes) % dayMinutes) + dayMinutes) % dayMinutes;
  return `${String(Math.floor(rounded / 60)).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
}

function endpointValue(endpoint: SleepEndpoint): number | null {
  if (endpoint.kind !== "point") return null;
  const [hours, minutes] = endpoint.time.split(":").map(Number);
  return hours * 60 + minutes;
}
function endpointLabel(endpoint: SleepEndpoint): string { return formatSleepEndpoint(endpoint,"history",sleepLanguage()); }

function sample(record: SleepRecord | undefined, date: string, metric: SleepMetric): Sample {
  if (!record) return { date, value: null, approximate: false, label: "—" };
  if (metric === "duration") {
    const complete = record.sleepOnset.kind === "point" && record.getUp.kind === "point";
    const value = complete ? record.estimatedDurationMinutes : null;
    return { date, value, approximate: complete && (Boolean(record.sleepOnset.kind === "point" && record.sleepOnset.approximate) || Boolean(record.getUp.kind === "point" && record.getUp.approximate)), label: value === null ? "—" : formatSleepDuration(value, sleepLanguage()) };
  }
  const endpoint = record[metric];
  return { date, value: endpointValue(endpoint), approximate: endpoint.kind === "point" && Boolean(endpoint.approximate), label: endpointLabel(endpoint) };
}
function samples(records: readonly SleepRecord[], endDate: string, days: number, metric: SleepMetric): Sample[] {
  const byDate = new Map(records.map(record => [record.wakeDate, record]));
  return Array.from({ length: days }, (_, index) => {
    const date = shiftDate(endDate, index - days + 1);
    return sample(byDate.get(date), date, metric);
  });
}
function average(values: readonly number[], circular: boolean): number | null {
  if (!values.length) return null;
  if (!circular) return values.reduce((sum, value) => sum + value, 0) / values.length;
  const x = values.reduce((sum, value) => sum + Math.cos(value * Math.PI * 2 / dayMinutes), 0);
  const y = values.reduce((sum, value) => sum + Math.sin(value * Math.PI * 2 / dayMinutes), 0);
  if (Math.hypot(x, y) < 1e-8) return null;
  return ((Math.atan2(y, x) * dayMinutes / (2 * Math.PI)) + dayMinutes) % dayMinutes;
}
function distance(value: number, center: number): number {
  return ((value - center + 2160) % dayMinutes) - 720;
}
function statistics(parent: HTMLElement, points: readonly Sample[], metric: SleepMetric): void {
  const valid = points.filter(point => point.value !== null);
  const values = valid.map(point => point.value!);
  const circular = isClockMetric(metric);
  const mean = average(values, circular);
  const format = circular ? clock : (value: number) => formatSleepDuration(value, sleepLanguage());
  const approximate = valid.filter(point => point.approximate).length;
  parent.replaceChildren();
  const part = (key: SleepCopyKey, variables: Readonly<Record<string,string|number>> = {}): void => {
    if (parent.childNodes.length) parent.append(document.createTextNode(" · "));
    localizedSleepElement("span",parent,key,variables);
  };
  part("sleep.validSamples",{count:valid.length});
  part("sleep.average",{value:mean === null ? "—" : format(mean)});
  if (values.length >= 2 && mean !== null) {
    const ordered = circular ? values.map(value => mean + distance(value, mean)) : values;
    part(circular ? "sleep.earliest" : "sleep.shortest",{value:format(Math.min(...ordered))});
    part(circular ? "sleep.latest" : "sleep.longest",{value:format(Math.max(...ordered))});
  }
  if (approximate) part("sleep.approximateSamples",{count:approximate});
}
function chart(parent: HTMLElement, points: readonly Sample[], metric: SleepMetric, onDate: (date: string) => void): void {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  svg.setAttribute("viewBox", "0 0 700 90");
  svg.setAttribute("preserveAspectRatio", "none");
  if (points.length > 7) svg.style.minWidth = `${points.length * 32}px`;
  setSleepAttribute(svg,"aria-label","sleep.trend",{metric:label(metric)});
  svg.setAttribute("role", "img");
  parent.append(svg);
  const valid = points.flatMap(point => point.value === null ? [] : [point.value]);
  const circular = isClockMetric(metric);
  const center = circular ? average(valid, true) ?? 0 : 0;
  const coordinates = points.map((point, index) => ({
    x: 700 * (index + .5) / points.length,
    value: point.value === null ? null : circular ? distance(point.value, center) : point.value,
  }));
  const values = coordinates.flatMap(point => point.value === null ? [] : [point.value]);
  const min = values.length ? Math.min(...values) - 20 : 0;
  const max = values.length ? Math.max(...values) + 20 : 1;
  const y = (value: number): number => 76 - 62 * (value - min) / Math.max(1, max - min);
  for (let index = 0; index < coordinates.length; index++) {
    const point = coordinates[index];
    const previous = coordinates[index - 1];
    if (point.value === null) continue;
    if (previous?.value !== null && previous?.value !== undefined) {
      const line = document.createElementNS(namespace, "line");
      for (const [name, value] of Object.entries({ x1: previous.x, y1: y(previous.value), x2: point.x, y2: y(point.value) })) line.setAttribute(name, String(value));
      line.dataset.sleepSegment = "true";
      svg.append(line);
    }
    const circle = document.createElementNS(namespace, "circle");
    circle.setAttribute("cx", String(point.x)); circle.setAttribute("cy", String(y(point.value)));
    circle.setAttribute("r", points[index].approximate ? "4" : "3");
    circle.dataset.approximate = String(points[index].approximate);
    svg.append(circle);
  }
  const dates = element("div", parent); dates.className = "sleep-chart-dates";
  dates.style.setProperty("--sleep-days", String(points.length));
  if (points.length > 7) dates.style.minWidth = `${points.length * 32}px`;
  for (const point of points) {
    const node = button(dates, `${point.label}\n${point.date.slice(5)}`, () => onDate(point.date));
    node.dataset.sleepDate = point.date;
    node.title = `${point.date} · ${label(metric)} · ${point.label}`;
    node.setAttribute("aria-label", node.title);
  }
}

export function renderSleepHome(parent: HTMLElement, view: SleepView, date: string, onOpen: (date: string, metric: SleepMetric) => void): void {
  parent.replaceChildren();
  localizedSleepElement("h3",parent,"sleep.homeTitle");
  localizedSleepElement("p",parent,"sleep.homeHelp");
  for (const metric of ["sleepOnset", "getUp"] as const) {
    const row = element("section", parent); row.dataset.sleepTrend = metric; row.className = "sleep-trend-row";
    localizedButton(row, metricKey(metric), () => onOpen(date, metric)).className = "sleep-metric-link";
    const plot = element("div", row); plot.className = "sleep-chart";
    chart(plot, samples(view.records, date, 7, metric), metric, selected => onOpen(selected, metric));
  }
}

export function renderSleepInsights(parent: HTMLElement, view: SleepView, date: string, initialMetric: SleepMetric, onOpen: (date: string, metric: SleepMetric) => void): HTMLElement {
  let metric = initialMetric;
  let days = 7;
  let endDate = date;
  let historyPage = 0;
  const toolbar = element("div", parent); toolbar.className = "sleep-detail-toolbar";
  const metrics = element("div", toolbar); metrics.className = "sleep-metric-tabs";
  const ranges = element("div", toolbar); ranges.className = "sleep-range-tabs";
  const period = element("p", parent); period.dataset.sleepRange = "true";
  const stats = element("p", parent); stats.dataset.sleepStatistics = "true";
  const plot = element("div", parent); plot.className = "sleep-chart sleep-detail-chart";
  const navigate = element("div", parent); navigate.className = "sleep-period-navigation";
  const historySection = document.createElement("section");
  const historyHeading = localizedSleepElement("h3",historySection,"sleep.history");
  const history = element("div", historySection); history.className = "sleep-history"; history.setAttribute("aria-labelledby", "sleep-history-heading");
  historyHeading.id = "sleep-history-heading";
  const historyNav = element("div", historySection); historyNav.className = "sleep-history-navigation";
  const records = [...view.records].sort((a, b) => b.wakeDate.localeCompare(a.wakeDate));
  const historySize = 12;
  const renderHistory = (): void => {
    history.replaceChildren(); historyNav.replaceChildren();
    for (const record of records.slice(historyPage * historySize, (historyPage + 1) * historySize)) {
      const node = button(history, `${record.wakeDate} · ${endpointLabel(record.sleepOnset)} → ${endpointLabel(record.getUp)} · ${record.estimatedDurationMinutes === null ? "—" : formatSleepDuration(record.estimatedDurationMinutes,sleepLanguage())}`, () => onOpen(record.wakeDate, metric));
      node.dataset.sleepHistoryDate = record.wakeDate;
      node.setAttribute("aria-current", String(record.wakeDate === date));
    }
    if (!records.length) localizedSleepElement("p",history,"sleep.noRecords");
    if (historyPage > 0) localizedButton(historyNav,"sleep.newer", () => { historyPage--; renderHistory(); });
    if ((historyPage + 1) * historySize < records.length) localizedButton(historyNav,"sleep.older", () => { historyPage++; renderHistory(); });
  };
  const render = (): void => {
    parent.closest<HTMLDialogElement>("dialog")!.dataset.metric = metric;
    metrics.replaceChildren(); ranges.replaceChildren(); plot.replaceChildren(); navigate.replaceChildren();
    for (const choice of ["sleepOnset", "getUp", "duration"] as const) {
      const node = localizedButton(metrics, metricKey(choice), () => { metric = choice; render(); });
      node.dataset.sleepMetric = choice; node.setAttribute("aria-pressed", String(choice === metric));
    }
    for (const choice of [7, 30]) {
      const node = localizedButton(ranges,"sleep.days", () => { days = choice; render(); },{count:choice});
      node.dataset.sleepDays = String(choice); node.setAttribute("aria-pressed", String(choice === days));
    }
    period.textContent = `${shiftDate(endDate, 1 - days)} – ${endDate}`;
    const points = samples(view.records, endDate, days, metric);
    statistics(stats, points, metric);
    chart(plot, points, metric, selected => onOpen(selected, metric));
    localizedButton(navigate,"sleep.previous", () => { endDate = shiftDate(endDate, -days); render(); });
    localizedButton(navigate,"sleep.next", () => { endDate = shiftDate(endDate, days); render(); });
  };
  const refreshLanguage = (): void => { render(); renderHistory(); };
  document.addEventListener(SLEEP_LANGUAGE_CHANGED_EVENT,refreshLanguage);
  parent.closest("dialog")?.addEventListener("close",()=>document.removeEventListener(SLEEP_LANGUAGE_CHANGED_EVENT,refreshLanguage),{once:true});
  render(); renderHistory();
  return historySection;
}
