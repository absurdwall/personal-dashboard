import { interfaceCopy, type InterfaceLanguage } from "./interface-language.js";
import type { SleepEndpoint } from "./sleep.js";

/** Shared display of reported elapsed minutes and rounded statistical means. */
export function formatSleepDuration(minutes: number | null, language: InterfaceLanguage): string {
  if (minutes === null) return "—";
  const rounded = Math.round(minutes);
  return interfaceCopy("sleep.duration", language, {hours: Math.floor(rounded / 60), minutes: rounded % 60});
}

/** Detail retains dates, summary retains bounds, history retains reported wording. */
export function formatSleepEndpoint(endpoint: SleepEndpoint, mode: "detail" | "summary" | "history", language: InterfaceLanguage): string {
  if (endpoint.kind === "point") {
    const time = endpoint.approximate ? interfaceCopy("sleep.approximateTime", language, {time:endpoint.time}) : endpoint.time;
    return `${mode === "detail" ? endpoint.date + " " : ""}${time}`;
  }
  if (endpoint.kind === "range") {
    if (mode === "history") return endpoint.reportedText;
    const bound = (point: typeof endpoint.start): string => `${mode === "detail" ? point.date + " " : ""}${point.time}`;
    return `${endpoint.reportedText} (${bound(endpoint.start)}–${bound(endpoint.end)})`;
  }
  if (endpoint.kind === "text") return `${mode === "detail" ? endpoint.date + " " : ""}${endpoint.text}`;
  return endpoint.kind === "unknown" ? interfaceCopy("sleep.unknown", language) : mode === "history" ? "—" : interfaceCopy("sleep.unrecorded", language);
}
