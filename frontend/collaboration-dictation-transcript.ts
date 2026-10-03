import type { CodexDictationEvent } from "./collaboration-dictation-runtime.js";

type Segment = Readonly<{
  text: string;
  startMs?: number;
  endMs?: number;
  order: number;
  kind: "preview" | "final";
}>;
type TimedSegment = Segment & Readonly<{ startMs: number; endMs: number }>;

function hasInterval(segment: Segment): segment is TimedSegment {
  return typeof segment.startMs === "number" && Number.isFinite(segment.startMs) &&
    typeof segment.endMs === "number" && Number.isFinite(segment.endMs) &&
    segment.startMs >= 0 && segment.startMs < segment.endMs;
}
function overlaps(a: TimedSegment, b: TimedSegment): boolean {
  // Adjacent half-open audio intervals do not conflict.
  return a.startMs < b.endMs && b.startMs < a.endMs;
}
function chronological(a: Segment, b: Segment): number {
  const aTimed = hasInterval(a), bTimed = hasInterval(b);
  if (aTimed && bTimed) return a.startMs - b.startMs || a.endMs - b.endMs || a.order - b.order;
  if (aTimed !== bTimed) return aTimed ? -1 : 1;
  return a.order - b.order;
}

/** Input-scoped raw identities plus conservative audio-interval coverage.
 * Records are never discarded: a corrected range can expose an old preview.
 */
export class CodexDictationTranscript {
  private readonly previews = new Map<string, Segment>();
  private readonly finals = new Map<string, Segment>();
  private nextOrder = 0;

  update(event: CodexDictationEvent): void {
    if (event.role !== "user" || !event.itemId || (event.kind !== "preview" && event.kind !== "final")) return;
    const records = event.kind === "preview" ? this.previews : this.finals;
    const previous = records.get(event.itemId);
    records.set(event.itemId, {
      text: event.text ?? "", startMs: event.startMs, endMs: event.endMs,
      order: previous?.order ?? this.nextOrder++, kind: event.kind,
    });
  }

  snapshot(): Readonly<{
    finalText: string;
    unconfirmedPreviewText: string;
    displayText: string;
    unresolved: boolean;
  }> {
    const finals = [...this.finals.values()].sort(chronological);
    const timedFinals = finals.filter(hasInterval);
    const conflicting = new Set<Segment>();
    for (let a = 0; a < timedFinals.length; a++) {
      for (let b = a + 1; b < timedFinals.length; b++) {
        if (overlaps(timedFinals[a], timedFinals[b])) {
          conflicting.add(timedFinals[a]); conflicting.add(timedFinals[b]);
        }
      }
    }
    const uncovered = [...this.previews.values()].filter(preview => {
      if (!hasInterval(preview)) return true;
      const owners = timedFinals.filter(final => final.startMs <= preview.startMs && preview.endMs <= final.endMs);
      return owners.length !== 1 || conflicting.has(owners[0]) || !owners[0].text.trim();
    }).sort(chronological);
    const displayed = [...finals, ...uncovered].sort(chronological);
    let displayText = "";
    let previousKind: Segment["kind"] | undefined;
    for (const segment of displayed) {
      if (!segment.text) continue;
      if (displayText && (segment.kind === "final" || previousKind === "final")) displayText += "\n";
      displayText += segment.text;
      previousKind = segment.kind;
    }
    return {
      finalText: finals.map(segment => segment.text).filter(Boolean).join("\n").trim(),
      unconfirmedPreviewText: uncovered.map(segment => segment.text).join("").trim(),
      displayText: displayText.trim(),
      unresolved: uncovered.length > 0 || conflicting.size > 0 || timedFinals.length !== finals.length ||
        finals.some(final => !final.text.trim()),
    };
  }
}
