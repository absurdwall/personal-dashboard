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
    let sender: RTCRtpSender | undefined;
    let zeroContext: AudioContext | undefined;
    let zeroSource: ConstantSourceNode | undefined;
    let zeroStream: MediaStream | undefined;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    let terminalTimer: ReturnType<typeof setTimeout> | undefined;
    let closeRequested = false;
    let terminalReceived = false;
    let drainTimer: ReturnType<typeof setTimeout> | undefined;
    let drainFinished: Promise<void> | undefined;
    let drainDeadline = 0;
    let drainFailed = false;
    let zeroAttached = false;
    let rejectConnecting: (() => void) | undefined;
    const releaseCapture = () => {
      captureStopped = true;
      stream?.getTracks().forEach(track => { track.onended = null; track.stop(); });
    };
    const releaseZeroAudio = () => {
      if (zeroSource) {
        try { zeroSource.stop(); } catch { /* Already stopped. */ }
        try { zeroSource.disconnect(); } catch { /* Already disconnected. */ }
        zeroSource = undefined;
      }
      zeroStream?.getTracks().forEach(track => track.stop());
      zeroStream = undefined;
      const context = zeroContext;
      zeroContext = undefined;
      // A pending resume/close must not hold tracks or extend finalization.
      if (context) {
        try { void context.close().catch(() => undefined); } catch { /* Already closed. */ }
      }
    };
    const prepareZeroAudio = async () => {
      try {
        if (!sender || typeof AudioContext !== "function") throw new Error("dictation-tail-unavailable");
        const context = new AudioContext();
        zeroContext = context;
        const destination = context.createMediaStreamDestination();
        zeroStream = destination.stream;
        const track = zeroStream.getAudioTracks()[0];
        if (!track) throw new Error("dictation-tail-unavailable");
        const source = context.createConstantSource();
        zeroSource = source;
        source.offset.value = 0;
        source.connect(destination);
        source.start();
        await context.resume();
        if (disposed || signal.aborted || failed || context !== zeroContext || performance.now() >= drainDeadline) return;
        if (context.state !== "running") throw new Error("dictation-tail-unavailable");
        await sender.replaceTrack(track);
        if (disposed || signal.aborted || context !== zeroContext || performance.now() >= drainDeadline) track.stop();
        else zeroAttached = true;
      } catch {
        drainFailed = true;
        releaseZeroAudio();
      }
    };
    const stopCapture = () => {
      // Release physical capture before doing any asynchronous sender/context
      // work. The tail contains generated zeros, never saved microphone audio.
      releaseCapture();
      if (drainFinished || disposed || failed || signal.aborted) return;
      drainDeadline = performance.now() + 10_000;
      drainFinished = new Promise<void>(resolve => { finishWait = resolve; });
      drainTimer = setTimeout(() => { void cleanup(); }, 10_000);
      // Observed CLI v3 session.close produces a final user turn followed by
      // raw session.closed. Give already-sent RTP a short zero-audio grace,
      // then keep both receivers alive within the same total Stop deadline.
      closeTimer = setTimeout(() => {
        if (disposed || signal.aborted || failed) return;
        if (channel?.readyState !== "open") { fail("dictation-connection-lost"); return; }
        closeRequested = true;
        try { channel.send(JSON.stringify({type:"session.close"})); }
        catch { fail("dictation-connection-lost"); }
      }, 1_000);
      void prepareZeroAudio();
    };
    const cleanup = async () => {
      if (disposed) return;
      disposed = true;
      rejectConnecting?.();
      releaseCapture();
      releaseZeroAudio();
      if (drainTimer) clearTimeout(drainTimer);
      if (closeTimer) clearTimeout(closeTimer);
      if (terminalTimer) clearTimeout(terminalTimer);
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
      releaseCapture();
      onEvent({inputId,kind:"failed",failure});
      void cleanup();
    };
    try {
      if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
      stream = await navigator.mediaDevices.getUserMedia({audio:true,video:false});
      if (disposed || failed || signal.aborted || stopRequested) { releaseCapture(); throw new DOMException("Cancelled", "AbortError"); }
      onEvent({inputId,kind:"phase",phase:"connecting"});
      if (disposed || signal.aborted) { releaseCapture(); throw new DOMException("Cancelled", "AbortError"); }
      peer = new RTCPeerConnection();
      stream.getAudioTracks().forEach(track => {
        track.onended = () => { if (!captureStopped) fail("capture-unavailable"); };
        const addedSender = peer!.addTrack(track,stream!);
        sender ??= addedSender;
      });
      channel = peer.createDataChannel("oai-events");
      const dataChannel = channel;
      channel.onmessage = message => {
        if (disposed || signal.aborted) return;
        try {
          const raw: unknown = JSON.parse(String(message.data));
          if (raw && typeof raw === "object" && (raw as {type?:unknown}).type === "session.closed" && closeRequested) {
            const terminal = raw as {error?:unknown;failure?:unknown;reason?:unknown};
            // A terminal can report provider failure even after our close.
            // Unknown reasons are not acknowledgements; never surface their
            // arbitrary payloads as UI text or diagnostics. client_request is
            // the successful close reason observed in the packaged v3 probe.
            if (terminal.error != null || terminal.failure != null ||
                (terminal.reason != null && terminal.reason !== "" && terminal.reason !== "client_request")) {
              fail("dictation-service-failed");
              return;
            }
            terminalReceived = true;
            // Preserve events already queued in this channel turn. Native
            // sideband closure is not this terminal and never shortens drain.
            terminalTimer ??= setTimeout(() => { void cleanup(); }, 0);
            return;
          }
          const event = parseCodexDictationEvent(inputId,raw);
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
      channel.onclose = () => { if (!disposed && !closeRequested) fail("dictation-connection-lost"); };
      peer.onconnectionstatechange = () => {
        if (peer?.connectionState === "failed" || (peer?.connectionState === "disconnected" && !terminalReceived) || (peer?.connectionState === "closed" && !closeRequested)) fail("dictation-connection-lost");
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
            if (event.inputId !== inputId) continue;
            if (event.kind === "closed" && closeRequested) continue;
            if (event.kind === "failed" || event.kind === "closed") fail(event.failure ?? "dictation-service-ended");
          }
        } catch { fail("dictation-connection-lost"); }
        finally { polling = false; }
      },200);
      return {
        stopCapture,
        finalize: async () => {
          stopCapture();
          // Expected raw terminal + a new final + received interval coverage
          // is an observed completion path, not a guarantee of unheard audio.
          // The total deadline starts at Stop, never during recording.
          await drainFinished;
          const incomplete = !terminalReceived || failed || drainFailed || !zeroAttached || stopRequested || transcript.snapshot().unresolved || !finalAfterStop;
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
