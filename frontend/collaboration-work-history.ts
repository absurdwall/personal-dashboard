export type CollaborationLink =
  | Readonly<{ kind: "task" | "list"; id: string }>
  | Readonly<{ kind: "record"; date: string; phase: "morning" | "daytime" | "evening" | null }>
  | Readonly<{ kind: "habit"; key: string; date: string }>;

export type CollaborationWorkHistory = Readonly<{
  evidenceVersion: number;
  executionId: string;
  threadId: string;
  turnId: string;
  sequence: number;
  status: string;
  gaps?: readonly string[];
  items: readonly Readonly<{
    itemId: string; callId: string | null; kind: string; phase: string | null;
    text: string; summary: readonly string[]; tool: string | null; status: string;
    firstSequence: number; lastSequence: number; observedAtMs: number; updatedAtMs: number;
    runtimeStartedAtMs: number | null; runtimeCompletedAtMs: number | null;
    runtimeEmittedAtMs: number | null; authoritative: boolean;
    parameters?: readonly Readonly<{ name: string; value: string }>[];
    diagnostic?: string | null; diagnosticGap?: string | null;
    diagnosticOrigin?: "application" | "external" | null;
    changes?: readonly Readonly<{
      id: string; source: string; objectId: string | null; path: string | null; operation: string;
      receiptId: string | null; targetDate: string | null; beforeRevision: string | null;
      afterRevision: string | null; diff: string | null; verification: string;
      observedAtMs: number | null; gaps: readonly string[]; movePath?: string | null;
    }>[];
    changeGap?: string | null;
    payloadOmissions?: readonly Readonly<{field:string; originalBytes:number; retainedBytes:number; retainedFromPriorObservation?:boolean; inputFingerprint:string; reasonCode:string}>[];
  }>[];
}>;

function validDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date;
}

/** Read-only app navigation. No URL can select a vault, file path or mutation. */
export function parseCollaborationLink(value: string): CollaborationLink | null {
  const match = /^dashboard:\/\/(task|list|record|habit)\/([^/?#]+)(?:\?([^#]*))?$/.exec(value);
  if (!match) return null;
  let identity: string;
  try { identity = decodeURIComponent(match[2]); } catch { return null; }
  const kind = match[1];
  const query = new URLSearchParams(match[3] ?? "");
  if (kind === "record") {
    if (!validDate(identity) || [...query.keys()].some(key => key !== "phase") || query.getAll("phase").length > 1) return null;
    const phase = query.get("phase");
    if (phase !== null && !["morning", "daytime", "evening"].includes(phase)) return null;
    return { kind: "record", date: identity, phase: phase as "morning" | "daytime" | "evening" | null };
  }
  if (!/^[\p{L}\p{N}_.:-]{1,160}$/u.test(identity) || identity === "." || identity === "..") return null;
  if (kind === "habit") {
    const date = query.get("date") ?? "";
    if (!validDate(date) || [...query.keys()].some(key => key !== "date") || query.getAll("date").length !== 1) return null;
    return { kind: "habit", key: identity, date };
  }
  if (query.size) return null;
  return { kind: kind as "task" | "list", id: identity };
}

function appendInline(container: HTMLElement, text: string, doc: Document, navigate: (target: CollaborationLink) => void): void {
  const pattern = /\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+)\*\*|`([^`\n]+)`/g;
  let position = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index! > position) {
      const plain = doc.createElement("span"); plain.textContent = text.slice(position, match.index); container.append(plain);
    }
    const target = match[2] ? parseCollaborationLink(match[2]) : null;
    const node = doc.createElement(target ? "button" : match[3] ? "strong" : match[4] ? "code" : "span");
    node.textContent = match[1] ?? match[3] ?? match[4];
    if (target) {
      (node as HTMLButtonElement).type = "button";
      node.className = "text-button collaboration-reply-link";
      node.addEventListener("click", () => navigate(target));
    }
    container.append(node);
    position = match.index! + match[0].length;
  }
  if (position < text.length || !text.length) {
    const plain = doc.createElement("span"); plain.textContent = text.slice(position); container.append(plain);
  }
}

/** Small DOM-only Markdown subset; HTML and arbitrary URLs remain inert text. */
export function appendCollaborationMarkdown(container: HTMLElement, text: string, doc: Document, navigate: (target: CollaborationLink) => void): void {
  let list: HTMLOListElement | HTMLUListElement | null = null;
  let paragraph: HTMLParagraphElement | null = null;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) { list = null; paragraph = null; continue; }
    const bullet = /^\s*(?:([-*])\s+|(\d+)\.\s+)(.*)$/.exec(line);
    if (bullet) {
      paragraph = null;
      const tag = bullet[2] ? "ol" : "ul";
      if (!list || list.tagName.toLowerCase() !== tag) {
        list = doc.createElement(tag);
        if (tag === "ol") (list as HTMLOListElement).start = Number(bullet[2]);
        container.append(list);
      }
      const row = doc.createElement("li");
      const check = /^\[([ xX])\]\s+(.*)$/.exec(bullet[3]);
      if (check) {
        const checkbox = doc.createElement("input"); checkbox.type = "checkbox"; checkbox.checked = check[1].toLowerCase() === "x"; checkbox.disabled = true;
        row.append(checkbox); row.className = "collaboration-checklist-item";
      }
      appendInline(row, check?.[2] ?? bullet[3], doc, navigate);
      list.append(row);
    } else {
      list = null;
      if (!paragraph) { paragraph = doc.createElement("p"); container.append(paragraph); }
      else paragraph.append(doc.createElement("br"));
      appendInline(paragraph, line, doc, navigate);
    }
  }
}

export type WorkHistoryLabels = Readonly<{
  title: string; summary: string; commentary: string; message: string; tool: string;
  failed: string; completed: string; running: string; details: string;
  actions?: Readonly<Record<string, string>>;
  diagnosticUnavailable?: string;
  historyMissing?: string;
  statuses?: Readonly<Record<string, string>>;
  changeOperations?: Readonly<Record<string, string>>;
  operationLabel?: string;
  omissionReasons?: Readonly<Record<string,string>>;
  priorPayloadLabel?: string;
  formatOmission?: (field:string, original:number, retained:number, fingerprint:string) => string;
  formatDiagnostic?: (value: string) => string;
  formatApplicationDiagnostic?: (value: string) => string;
  changeStates?: Readonly<Record<string, string>>;
}>;

export function appendCollaborationWorkHistory(container: HTMLElement, history: CollaborationWorkHistory | null, doc: Document, labels: WorkHistoryLabels, navigate: (target: CollaborationLink) => void): void {
  if (!history) {
    const missing = doc.createElement("p");
    missing.className = "collaboration-history-unavailable";
    missing.textContent = labels.historyMissing ?? "Work history unavailable.";
    container.append(missing);
    return;
  }
  const details = doc.createElement("details");
  details.className = "collaboration-work-history";
  details.dataset.workKey = `${history.executionId}:history`;
  details.dataset.active = String(["inProgress", "stopping"].includes(history.status));
  details.open = details.dataset.active === "true";
  const title = doc.createElement("summary"); title.textContent = labels.title;
  title.addEventListener("click", () => { details.dataset.manual = "true"; });
  title.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") details.dataset.manual = "true"; });
  details.append(title);
  for (const gap of history.gaps ?? []) {
    const note=doc.createElement("p");note.className="collaboration-history-gap";note.textContent=labels.formatDiagnostic?.(gap) ?? gap;details.append(note);
  }
  for (const item of [...history.items].sort((left, right) => left.firstSequence - right.firstSequence)) {
    if (item.kind === "agentMessage" && item.phase === "final_answer" && !item.payloadOmissions?.length) continue;
    if (item.kind === "reasoning" && !item.summary.some(part => part.trim()) && !item.payloadOmissions?.length) continue;
    const row = doc.createElement("section"); row.className = "collaboration-work-item";
    row.dataset.itemId = item.itemId; row.dataset.status = item.status;
    const heading = doc.createElement("strong");
    if (item.kind === "reasoning") heading.textContent = labels.summary;
    else if (item.kind === "agentMessage") heading.textContent = item.phase === "commentary" ? labels.commentary : labels.message;
    else {
      const operation = item.parameters?.find(parameter => parameter.name === "operation")?.value;
      const action = labels.actions?.[operation ?? ""] ?? labels.actions?.[item.tool ?? ""] ?? labels.actions?.[item.kind] ?? labels.tool;
      const object = item.parameters?.find(parameter => parameter.name === "name")?.value;
      const date = item.parameters?.find(parameter => parameter.name === "targetDate" || parameter.name === "date")?.value;
      heading.textContent = [action, object, date, ["failed", "declined"].includes(item.status) ? labels.failed : ["completed", "succeeded"].includes(item.status) ? labels.completed : labels.running].filter(Boolean).join(" · ");
    }
    row.append(heading);
    if (item.kind === "agentMessage" || item.kind === "reasoning") {
      if (item.phase !== "final_answer") appendCollaborationMarkdown(row, item.kind === "reasoning" ? item.summary.filter(Boolean).join("\n\n") : item.text, doc, navigate);
    } else {
      const diagnostic = doc.createElement("details"); diagnostic.dataset.workKey = `${history.executionId}:${item.itemId}`;
      const summary = doc.createElement("summary"); summary.textContent = labels.details;
      summary.addEventListener("click", () => { diagnostic.dataset.manual = "true"; });
      const explanation = doc.createElement("p");
      // Only host-filtered labels and actual status/identity/times. No raw payloads.
      explanation.textContent = `${item.tool ?? item.kind} · ${labels.statuses?.[item.status] ?? item.status}`;
      const identity = doc.createElement("small");
      identity.textContent = [item.itemId, item.callId, item.observedAtMs ? new Date(item.observedAtMs).toLocaleTimeString() : null].filter(Boolean).join(" · ");
      diagnostic.append(summary, explanation, identity);
      for (const parameter of item.parameters ?? []) {
        const fact = doc.createElement("p");
        const operation = parameter.name === "operation";
        fact.textContent = `${operation ? labels.operationLabel ?? parameter.name : parameter.name}: ${operation ? labels.actions?.[parameter.value] ?? parameter.value : parameter.value}`;
        diagnostic.append(fact);
      }
      if (item.diagnostic || item.diagnosticGap || ["failed", "declined"].includes(item.status)) {
        const cause = doc.createElement("p");
        const hostDiagnostic = item.kind === "dynamicToolCall" && item.tool?.startsWith("dashboard_");
        const sourceApplicationDiagnostic = item.kind === "hostSourceRead" && item.diagnosticOrigin === "application";
        const commandDiagnostic = item.kind === "commandExecution" && item.parameters?.some(parameter => parameter.name === "exitCode");
        cause.textContent = item.diagnostic
          ? hostDiagnostic ? labels.formatApplicationDiagnostic?.(item.diagnostic) ?? item.diagnostic
            : commandDiagnostic || sourceApplicationDiagnostic ? labels.formatDiagnostic?.(item.diagnostic) ?? item.diagnostic : item.diagnostic
          : labels.diagnosticUnavailable ?? "Diagnostic unavailable";
        diagnostic.append(cause);
      }
      if (item.diagnosticGap) {
        const gap = doc.createElement("p"); gap.textContent = labels.formatDiagnostic?.(item.diagnosticGap) ?? item.diagnosticGap; diagnostic.append(gap);
      }
      for (const change of item.changes ?? []) {
        const target = doc.createElement("p");
        target.textContent = [change.path ?? change.objectId, labels.changeOperations?.[change.operation] ?? change.operation, labels.changeStates?.[change.verification] ?? change.verification].filter(Boolean).join(" · ");
        diagnostic.append(target);
        if (change.beforeRevision || change.afterRevision) {
          const revisions = doc.createElement("small");
          revisions.textContent = `${change.beforeRevision ?? "?"} → ${change.afterRevision ?? "?"}`;
          diagnostic.append(revisions);
        }
        if (change.diff) {
          const diff = doc.createElement("pre"); diff.className = "collaboration-change-diff";
          diff.textContent = change.diff; diagnostic.append(diff);
        }
        for (const gap of change.gaps) {
          const missing = doc.createElement("p"); missing.textContent = labels.formatDiagnostic?.(gap) ?? gap; diagnostic.append(missing);
        }
      }
      if (item.changeGap) {
        const missing = doc.createElement("p"); missing.textContent = labels.formatDiagnostic?.(item.changeGap) ?? item.changeGap; diagnostic.append(missing);
      }
      row.append(diagnostic);
    }
    for (const omission of item.payloadOmissions ?? []) {
      const note=doc.createElement("p");note.className="collaboration-payload-omission";
      note.textContent=[labels.omissionReasons?.[omission.reasonCode] ?? omission.reasonCode,
        omission.retainedFromPriorObservation ? labels.priorPayloadLabel ?? "Earlier retained copy; current authoritative payload unavailable" : null,
        labels.formatOmission?.(omission.field,omission.originalBytes,omission.retainedBytes,omission.inputFingerprint) ?? `${omission.field}: ${omission.originalBytes} / ${omission.retainedBytes} · ${omission.inputFingerprint}`].filter(Boolean).join(" · ");
      row.append(note);
    }
    details.append(row);
  }
  container.append(details);
}
