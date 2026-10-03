export type CodexDictationEvent = Readonly<{
  inputId: string;
  kind: "preview" | "final" | "failed";
  itemId?: string;
  role?: "user";
  text?: string;
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

// CLI 0.160.0 v3 data-channel events retain turn identity; normalized flat
// App Server transcript events do not. Preview IDs are explicitly provisional.
export function parseCodexDictationEvent(inputId: string, value: unknown): CodexDictationEvent | undefined {
  if (!value || typeof value !== "object") return undefined;
  const data = value as {type?: unknown;item?: {id?: unknown;text?: unknown};turn?: {id?: unknown;role?: unknown;transcript?: unknown}};
  if (data.type === "input_transcript.added" && typeof data.item?.text === "string") {
    return {inputId,kind:"preview",role:"user",itemId:typeof data.item.id === "string" ? data.item.id : undefined,text:data.item.text};
  }
  if (data.type === "turn.done" && data.turn?.role === "user" && typeof data.turn.transcript === "string") {
    if (typeof data.turn.id !== "string" || !data.turn.id) return {inputId,kind:"failed",failure:"dictation-transcript-identity-unavailable"};
    return {inputId,kind:"final",role:"user",itemId:data.turn.id,text:data.turn.transcript};
  }
  if (data.type === "session.closed") return {inputId,kind:"failed",failure:"dictation-service-ended"};
  if (data.type === "error") return {inputId,kind:"failed",failure:"dictation-service-failed"};
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
    let pendingPreview = false;
    let failed = false;
    let finishWait: (() => void) | undefined;
    let startSettled = false;
    const stopCapture = () => {
      captureStopped = true;
      stream?.getTracks().forEach(track => track.stop());
    };
    const cleanup = async () => {
      if (disposed) return;
      disposed = true;
      stopCapture();
      if (pollTimer) clearInterval(pollTimer);
      if (peer) {
        peer.onconnectionstatechange = null;
        peer.close();
      }
      signal.removeEventListener("abort", abort);
      if (startSettled) await this.invoke("collaboration_dictation_stop", {inputId}).catch(() => undefined);
      finishWait?.();
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
      stream = await navigator.mediaDevices.getUserMedia({audio:true,video:false});
      if (signal.aborted || stopRequested) { stopCapture(); throw new DOMException("Cancelled", "AbortError"); }
      peer = new RTCPeerConnection();
      stream.getAudioTracks().forEach(track => peer!.addTrack(track,stream!));
      const channel = peer.createDataChannel("oai-events");
      channel.onmessage = message => {
        if (disposed || signal.aborted) return;
        try {
          const event = parseCodexDictationEvent(inputId,JSON.parse(String(message.data)));
          if (!event) return;
          if (event.kind === "failed") { fail(event.failure ?? "dictation-service-failed"); return; }
          if (event.kind === "preview") pendingPreview = true;
          if (event.kind === "final") {
            pendingPreview = false;
            if (captureStopped) finalAfterStop = true;
          }
          onEvent(event);
        } catch { fail("dictation-protocol-failed"); }
      };
      channel.onclose = () => { if (!disposed) fail("dictation-connection-lost"); };
      peer.onconnectionstatechange = () => {
        if (peer?.connectionState === "failed" || peer?.connectionState === "disconnected") fail("dictation-connection-lost");
      };
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
      const answer = await this.invoke<{inputId:string;sdp:string}>("collaboration_dictation_start", {inputId,sdp:offer.sdp});
      startSettled = true;
      if (disposed || signal.aborted) {
        await this.invoke("collaboration_dictation_stop", {inputId}).catch(() => undefined);
        throw new DOMException("Cancelled", "AbortError");
      }
      if (answer.inputId !== inputId) throw new Error("dictation-input-mismatch");
      await peer.setRemoteDescription({type:"answer",sdp:answer.sdp});
      // The data channel is the actual connected gate; accepting SDP alone is
      // insufficient to announce recording readiness.
      await new Promise<void>((resolve,reject) => {
        if (channel.readyState === "open") { resolve(); return; }
        const timer = setTimeout(() => reject(new Error("dictation-connection-timeout")),15_000);
        channel.onopen = () => {clearTimeout(timer);resolve();};
        const onAbort = () => {clearTimeout(timer);reject(new DOMException("Cancelled","AbortError"));};
        signal.addEventListener("abort",onAbort,{once:true});
        channel.addEventListener("open",() => signal.removeEventListener("abort",onAbort),{once:true});
      });
      let polling = false;
      pollTimer = setInterval(async () => {
        if (disposed || polling) return;
        polling = true;
        try {
          const events = await this.invoke<Array<{inputId:string;kind:string}>>("collaboration_dictation_poll",{inputId});
          for (const event of events) {
            if (event.inputId === inputId && (event.kind === "failed" || event.kind === "closed")) fail("dictation-service-ended");
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
          // user final or unresolved preview is explicitly incomplete.
          await new Promise<void>(resolve => {
            const timer = setTimeout(resolve,4_000);
            finishWait = () => {clearTimeout(timer);resolve();};
            if (disposed) finishWait();
          });
          const incomplete = failed || pendingPreview || !finalAfterStop;
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
