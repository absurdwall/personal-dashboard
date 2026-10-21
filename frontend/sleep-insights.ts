import type { SleepEndpoint, SleepMetric, SleepRecord, SleepView } from "./sleep.js";

type Copy = (zh: string, en: string) => string;
type Sample = Readonly<{ date: string; value: number | null; approximate: boolean; label: string }>;
const dayMinutes = 1440;
function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
function element<K extends keyof HTMLElementTagNameMap>(tag: K, parent: HTMLElement, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  parent.append(node);
  return node;
}
function button(parent: HTMLElement, text: string, action: () => void): HTMLButtonElement {
  const node = element("button", parent, text);
  node.type = "button";
  node.onclick = action;
  return node;
}
function label(metric: SleepMetric, copy: Copy): string {
  return metric === "sleepOnset" ? copy("入睡", "Sleep onset") : metric === "getUp" ? copy("离床", "Get-up") : copy("估算时长", "Estimated duration");
}
function clock(minutes: number): string {
  const rounded = ((Math.round(minutes) % dayMinutes) + dayMinutes) % dayMinutes;
  return `${String(Math.floor(rounded / 60)).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
}
function duration(minutes: number, copy?: Copy): string {
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60), rest = rounded % 60;
  return copy ? copy(`${hours} 小时 ${rest} 分`, `${hours}h ${rest}m`) : `${hours}h ${rest}m`;
}
function endpointValue(endpoint: SleepEndpoint): number | null {
  if (endpoint.kind !== "point") return null;
  const [hours, minutes] = endpoint.time.split(":").map(Number);
  return hours * 60 + minutes;
}
function endpointLabel(endpoint: SleepEndpoint, copy: Copy): string {
  if (endpoint.kind === "point") return `${endpoint.approximate ? copy("约 ", "about ") : ""}${endpoint.time}`;
  if (endpoint.kind === "text") return endpoint.text;
  if (endpoint.kind === "range") return endpoint.reportedText;
  return endpoint.kind === "unknown" ? copy("未知", "unknown") : "—";
}
function sample(record: SleepRecord | undefined, date: string, metric: SleepMetric, copy: Copy): Sample {
  if (!record) return { date, value: null, approximate: false, label: "—" };
  if (metric === "duration") {
    const complete = record.sleepOnset.kind === "point" && record.getUp.kind === "point";
    const value = complete ? record.estimatedDurationMinutes : null;
    return { date, value, approximate: complete && (Boolean(record.sleepOnset.kind === "point" && record.sleepOnset.approximate) || Boolean(record.getUp.kind === "point" && record.getUp.approximate)), label: value === null ? "—" : duration(value, copy) };
  }
  const endpoint = record[metric];
  return { date, value: endpointValue(endpoint), approximate: endpoint.kind === "point" && Boolean(endpoint.approximate), label: endpointLabel(endpoint, copy) };
}
function samples(records: readonly SleepRecord[], endDate: string, days: number, metric: SleepMetric, copy: Copy): Sample[] {
  const byDate = new Map(records.map(record => [record.wakeDate, record]));
  return Array.from({ length: days }, (_, index) => {
    const date = shiftDate(endDate, index - days + 1);
    return sample(byDate.get(date), date, metric, copy);
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
function statistics(parent: HTMLElement, points: readonly Sample[], metric: SleepMetric, copy: Copy): void {
  const valid = points.filter(point => point.value !== null);
  const values = valid.map(point => point.value!);
  const circular = metric !== "duration";
  const mean = average(values, circular);
  const format = circular ? clock : (value: number) => duration(value, copy);
  const approximate = valid.filter(point => point.approximate).length;
  const parts = [copy(`有效样本 ${valid.length}`, `${valid.length} valid samples`), copy("平均 ", "Average ") + (mean === null ? "—" : format(mean))];
  if (values.length >= 2 && mean !== null) {
    const ordered = circular ? values.map(value => mean + distance(value, mean)) : values;
    parts.push(copy(circular ? "最早 " : "最短 ", circular ? "Earliest " : "Shortest ") + format(Math.min(...ordered)));
    parts.push(copy(circular ? "最晚 " : "最长 ", circular ? "Latest " : "Longest ") + format(Math.max(...ordered)));
  }
  if (approximate) parts.push(copy(`其中 ${approximate} 个约数`, `${approximate} approximate`));
  parent.textContent = parts.join(" · ");
}
function chart(parent: HTMLElement, points: readonly Sample[], metric: SleepMetric, onDate: (date: string) => void, copy: Copy): void {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  svg.setAttribute("viewBox", "0 0 700 90");
  svg.setAttribute("preserveAspectRatio", "none");
  if (points.length > 7) svg.style.minWidth = `${points.length * 32}px`;
  svg.setAttribute("aria-label", label(metric, copy) + copy("时间趋势；缺失或非单点不连线", " trend; missing or non-point times have gaps"));
  svg.setAttribute("role", "img");
  parent.append(svg);
  const valid = points.flatMap(point => point.value === null ? [] : [point.value]);
  const center = metric === "duration" ? 0 : average(valid, true) ?? 0;
  const coordinates = points.map((point, index) => ({
    x: 700 * (index + .5) / points.length,
    value: point.value === null ? null : metric === "duration" ? point.value : distance(point.value, center),
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
    node.title = `${point.date} · ${label(metric, copy)} · ${point.label}`;
    node.setAttribute("aria-label", node.title);
  }
}

export function renderSleepHome(parent: HTMLElement, view: SleepView, date: string, onOpen: (date: string, metric: SleepMetric) => void, copy: Copy): void {
  parent.replaceChildren();
  element("h3", parent, copy("作息 · 最近七天", "Sleep · last seven days"));
  element("p", parent, copy("用户报告的时间；空缺与范围不绘制为单点。", "Reported times; missing values and ranges are not plotted as points."));
  for (const metric of ["sleepOnset", "getUp"] as const) {
    const row = element("section", parent); row.dataset.sleepTrend = metric; row.className = "sleep-trend-row";
    button(row, label(metric, copy), () => onOpen(date, metric)).className = "sleep-metric-link";
    const plot = element("div", row); plot.className = "sleep-chart";
    chart(plot, samples(view.records, date, 7, metric, copy), metric, selected => onOpen(selected, metric), copy);
  }
}

export function renderSleepInsights(parent: HTMLElement, view: SleepView, date: string, initialMetric: SleepMetric, onOpen: (date: string, metric: SleepMetric) => void, copy: Copy): HTMLElement {
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
  const historyHeading = element("h3", historySection, copy("历史记录", "History"));
  const history = element("div", historySection); history.className = "sleep-history"; history.setAttribute("aria-labelledby", "sleep-history-heading");
  historyHeading.id = "sleep-history-heading";
  const historyNav = element("div", historySection); historyNav.className = "sleep-history-navigation";
  const records = [...view.records].sort((a, b) => b.wakeDate.localeCompare(a.wakeDate));
  const historySize = 12;
  const renderHistory = (): void => {
    history.replaceChildren(); historyNav.replaceChildren();
    for (const record of records.slice(historyPage * historySize, (historyPage + 1) * historySize)) {
      const node = button(history, `${record.wakeDate} · ${endpointLabel(record.sleepOnset, copy)} → ${endpointLabel(record.getUp, copy)} · ${record.estimatedDurationMinutes === null ? "—" : duration(record.estimatedDurationMinutes, copy)}`, () => onOpen(record.wakeDate, metric));
      node.dataset.sleepHistoryDate = record.wakeDate;
      node.setAttribute("aria-current", String(record.wakeDate === date));
    }
    if (!records.length) element("p", history, copy("尚无作息记录。", "No sleep records yet."));
    if (historyPage > 0) button(historyNav, copy("较新记录", "Newer records"), () => { historyPage--; renderHistory(); });
    if ((historyPage + 1) * historySize < records.length) button(historyNav, copy("更早记录", "Older records"), () => { historyPage++; renderHistory(); });
  };
  const render = (): void => {
    parent.closest<HTMLDialogElement>("dialog")!.dataset.metric = metric;
    metrics.replaceChildren(); ranges.replaceChildren(); plot.replaceChildren(); navigate.replaceChildren();
    for (const choice of ["sleepOnset", "getUp", "duration"] as const) {
      const node = button(metrics, label(choice, copy), () => { metric = choice; render(); });
      node.dataset.sleepMetric = choice; node.setAttribute("aria-pressed", String(choice === metric));
    }
    for (const choice of [7, 30]) {
      const node = button(ranges, copy(`${choice} 天`, `${choice} days`), () => { days = choice; render(); });
      node.dataset.sleepDays = String(choice); node.setAttribute("aria-pressed", String(choice === days));
    }
    period.textContent = `${shiftDate(endDate, 1 - days)} – ${endDate}`;
    const points = samples(view.records, endDate, days, metric, copy);
    statistics(stats, points, metric, copy);
    chart(plot, points, metric, selected => onOpen(selected, metric), copy);
    button(navigate, copy("上一时段", "Previous period"), () => { endDate = shiftDate(endDate, -days); render(); });
    button(navigate, copy("下一时段", "Next period"), () => { endDate = shiftDate(endDate, days); render(); });
  };
  render(); renderHistory();
  return historySection;
}
