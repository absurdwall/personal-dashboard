import { CodexDictationTranscript } from "./collaboration-dictation-transcript.js";

export type CodexDictationEvent = Readonly<{
  inputId: string;
  kind: "preview" | "final" | "failed" | "phase";
  phase?: "connecting";
  itemId?: string;
  role?: "user";
  text?: string;
  startMs?: number;
  endMs?: number;
  failure?: string;
}>;
export interface CodexDictationCapture {
  stopCapture(): void;
  finalize(): Promise<Readonly<{ incomplete: boolean }>>;
  cancel(): Promise<void>;
}
export interface CodexDictationRuntime {
  start(inputId: string, onEvent: (event: CodexDictationEvent) => void, signal: AbortSignal): Promise<CodexDictationCapture>;
}
export type DictationInvoke = <T>(command: string, args: Record<string, unknown>) => Promise<T>;

function finiteTiming(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

// CLI 0.160.0 v3 data-channel events retain turn identity; normalized flat
// App Server transcript events do not. Preview IDs are explicitly provisional.
export function parseCodexDictationEvent(inputId: string, value: unknown): CodexDictationEvent | undefined {
  if (!value || typeof value !== "object") return undefined;
  const data = value as {type?: unknown;error?: {code?: unknown;type?: unknown;message?: unknown};code?: unknown;message?: unknown;start_ms?: unknown;end_ms?: unknown;item?: {id?: unknown;text?: unknown};turn?: {id?: unknown;role?: unknown;transcript?: unknown;start_ms?: unknown;end_ms?: unknown}};
  if (data.type === "input_transcript.added" && typeof data.item?.text === "string") {
    if (typeof data.item.id !== "string" || !data.item.id) return {inputId,kind:"failed",failure:"dictation-transcript-identity-unavailable"};
    return {inputId,kind:"preview",role:"user",itemId:data.item.id,text:data.item.text,
      startMs:finiteTiming(data.start_ms),endMs:finiteTiming(data.end_ms)};
  }
  if (data.type === "turn.done" && data.turn?.role === "user" && typeof data.turn.transcript === "string") {
    if (typeof data.turn.id !== "string" || !data.turn.id) return {inputId,kind:"failed",failure:"dictation-transcript-identity-unavailable"};
    return {inputId,kind:"final",role:"user",itemId:data.turn.id,text:data.turn.transcript,
      startMs:finiteTiming(data.turn.start_ms),endMs:finiteTiming(data.turn.end_ms)};
  }
  if (data.type === "session.closed") return {inputId,kind:"failed",failure:"dictation-service-ended"};
  if (data.type === "error") return {inputId,kind:"failed",failure:String(data.error?.code ?? data.error?.type ?? data.code ?? data.error?.message ?? data.message ?? "dictation-service-failed")};
  return undefined;
}

export class BrowserCodexDictationRuntime implements CodexDictationRuntime {
  private readonly invoke: DictationInvoke;
  constructor(invoke: DictationInvoke) { this.invoke = invoke; }

  async start(inputId: string, onEvent: (event: CodexDictationEvent) => void, signal: AbortSignal): Promise<CodexDictationCapture> {
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection !== "function") throw new Error("capture-unavailable");
    let stream: MediaStream | undefined;
    let peer: RTCPeerConnection | undefined;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let disposed = false;
    let stopRequested = false;
    let captureStopped = false;
    let finalAfterStop = false;
    const finalIds = new Set<string>();
    const transcript = new CodexDictationTranscript();
    let failed = false;
    let finishWait: (() => void) | undefined;
    let nativeStartRequested = false;
    let channel: RTCDataChannel | undefined;
    let rejectConnecting: (() => void) | undefined;
    const stopCapture = () => {
      captureStopped = true;
      stream?.getTracks().forEach(track => { track.onended = null; track.stop(); });
    };
    const cleanup = async () => {
      if (disposed) return;
      disposed = true;
      rejectConnecting?.();
      stopCapture();
      if (pollTimer) clearInterval(pollTimer);
      if (channel) {
        channel.onmessage = null;
        channel.onclose = null;
        channel.onopen = null;
        channel.onerror = null;
      }
      if (peer) {
        peer.onconnectionstatechange = null;
        peer.close();
      }
      signal.removeEventListener("abort", abort);
      finishWait?.();
      if (nativeStartRequested) await this.invoke("collaboration_dictation_stop", {inputId}).catch(() => undefined);
    };
    const abort = () => { stopRequested = true; void cleanup(); };
    signal.addEventListener("abort", abort, {once:true});
    const fail = (failure: string) => {
      if (disposed || failed) return;
      failed = true;
      stopCapture();
      onEvent({inputId,kind:"failed",failure});
      void cleanup();
    };
    try {
      if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
      stream = await navigator.mediaDevices.getUserMedia({audio:true,video:false});
      if (disposed || failed || signal.aborted || stopRequested) { stopCapture(); throw new DOMException("Cancelled", "AbortError"); }
      onEvent({inputId,kind:"phase",phase:"connecting"});
      if (disposed || signal.aborted) { stopCapture(); throw new DOMException("Cancelled", "AbortError"); }
      peer = new RTCPeerConnection();
      stream.getAudioTracks().forEach(track => {
        track.onended = () => { if (!captureStopped) fail("capture-unavailable"); };
        peer!.addTrack(track,stream!);
      });
      channel = peer.createDataChannel("oai-events");
      const dataChannel = channel;
      channel.onmessage = message => {
        if (disposed || signal.aborted) return;
        try {
          const event = parseCodexDictationEvent(inputId,JSON.parse(String(message.data)));
          if (!event) return;
          if (event.kind === "failed") { fail(event.failure ?? "dictation-service-failed"); return; }
          transcript.update(event);
          if (event.kind === "final" && event.itemId && !finalIds.has(event.itemId)) {
            finalIds.add(event.itemId);
            if (captureStopped) finalAfterStop = true;
          }
          onEvent(event);
        } catch { fail("dictation-protocol-failed"); }
      };
      channel.onerror = () => fail("dictation-connection-lost");
      channel.onclose = () => { if (!disposed) fail("dictation-connection-lost"); };
      peer.onconnectionstatechange = () => {
        if (peer?.connectionState === "failed" || peer?.connectionState === "disconnected" || peer?.connectionState === "closed") fail("dictation-connection-lost");
      };
      const offer = await peer.createOffer();
      if (disposed || failed || signal.aborted) throw new DOMException("Cancelled", "AbortError");
      await peer.setLocalDescription(offer);
      if (disposed || failed || signal.aborted) throw new DOMException("Cancelled", "AbortError");
      nativeStartRequested = true;
      let answer: {inputId:string;sdp:string};
      try {
        answer = await this.invoke<{inputId:string;sdp:string}>("collaboration_dictation_start", {inputId,sdp:offer.sdp});
      } finally {
        // Stop may have reached native before its independently scheduled start.
        // Always stop again after a cancelled start settles (including rejection).
        if (disposed || signal.aborted) {
          await this.invoke("collaboration_dictation_stop", {inputId}).catch(() => undefined);
        }
      }

      if (disposed || signal.aborted) {
        throw new DOMException("Cancelled", "AbortError");
      }
      if (answer.inputId !== inputId) throw new Error("dictation-input-mismatch");
      await peer.setRemoteDescription({type:"answer",sdp:answer.sdp});
      // The data channel is the actual connected gate; accepting SDP alone is
      // insufficient to announce recording readiness.
      await new Promise<void>((resolve, reject) => {
        if (disposed || failed || signal.aborted) {
          reject(new DOMException("Cancelled", "AbortError"));
          return;
        }
        if (dataChannel.readyState === "open") { resolve(); return; }
        let timer: ReturnType<typeof setTimeout> | undefined;
        const settle = (error?: Error) => {
          if (timer) clearTimeout(timer);
          signal.removeEventListener("abort", onAbort);
          dataChannel.onopen = null;
          rejectConnecting = undefined;
          if (error) reject(error); else resolve();
        };
        const onAbort = () => settle(new DOMException("Cancelled", "AbortError"));
        rejectConnecting = onAbort;
        timer = setTimeout(() => settle(new Error("dictation-connection-timeout")), 15_000);
        dataChannel.onopen = () => settle();
        signal.addEventListener("abort", onAbort, {once:true});
      });
      if (disposed || failed || signal.aborted) throw new DOMException("Cancelled", "AbortError");
      let polling = false;
      pollTimer = setInterval(async () => {
        if (disposed || polling) return;
        polling = true;
        try {
          const events = await this.invoke<Array<{inputId:string;kind:string;failure?:string}>>("collaboration_dictation_poll",{inputId});
          if (disposed || signal.aborted) return;
          for (const event of events) {
            if (event.inputId === inputId && (event.kind === "failed" || event.kind === "closed")) fail(event.failure ?? "dictation-service-ended");
          }
        } catch { fail("dictation-connection-lost"); }
        finally { polling = false; }
      },200);
      return {
        stopCapture,
        finalize: async () => {
          stopCapture();
          // This bounds post-capture draining, never recording duration. V3
          // has no verified whole-input flush acknowledgement; a missing new
          // user final or any unpaired preview is explicitly incomplete.
          await new Promise<void>(resolve => {
            const timer = setTimeout(resolve,4_000);
            finishWait = () => {clearTimeout(timer);resolve();};
            if (disposed) finishWait();
          });
          const incomplete = failed || transcript.snapshot().unresolved || !finalAfterStop;
          await cleanup();
          return {incomplete};
        },
        cancel: async () => {stopRequested=true;await cleanup();},
      };
    } catch (error) {
      await cleanup();
      throw error;
    }
  }
}
