import type { DictationAudioSource, DictationInvoke } from "./collaboration-dictation-runtime.js";

// The native feature/environment gate authorizes this synthetic source. It feeds
// the ordinary composer/runtime without speaker playback. Microphone access is
// off by default; the separate permission experiment must be explicitly enabled.
export async function captureDiagnosticDictationFixture(invoke: DictationInvoke, localMicrophonePreflight = false, signal?: AbortSignal): Promise<DictationAudioSource> {
  const bytes = await invoke<number[]>("collaboration_voice_gate_fixture", {});
  if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
  if (localMicrophonePreflight) {
    const authorization = await invoke<string>("collaboration_voice_gate_request_microphone", {})
      .catch(() => "unavailable");
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    if (authorization !== "authorized") throw new Error("capture-unavailable");
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("capture-unavailable");
    let local: MediaStream | undefined;
    // Same-document capture access can affect WebKit ICE filtering. This stream
    // is never returned, stored, played or attached to a peer/cloud connection.
    try { local = await navigator.mediaDevices.getUserMedia({audio:true,video:false}); }
    finally { local?.getTracks().forEach(track => track.stop()); }
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
  }
  const context = new AudioContext();
  try {
    const audio = await context.decodeAudioData(new Uint8Array(bytes).buffer);
    await context.resume();
    const destination = context.createMediaStreamDestination();
    const source = context.createBufferSource();
    const clock = context.createConstantSource();
    source.buffer = audio;
    source.connect(destination);
    clock.offset.value = 0;
    clock.connect(destination);
    clock.start();
    let released = false;
    return {
      stream: destination.stream,
      diagnostic: true,
      start: () => { if (!released) source.start(); },
      release: () => {
        if (released) return;
        released = true;
        try { source.stop(); } catch { /* Source may not have started. */ }
        clock.stop();
        destination.stream.getTracks().forEach(track => track.stop());
        void context.close();
      },
    };
  } catch (error) {
    void context.close();
    throw error;
  }
}
