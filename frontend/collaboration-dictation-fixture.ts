import type { DictationAudioSource, DictationInvoke } from "./collaboration-dictation-runtime.js";

// The native feature/environment gate authorizes this synthetic source. It feeds
// the ordinary composer/runtime, without speaker playback or microphone access.
export async function captureDiagnosticDictationFixture(invoke: DictationInvoke): Promise<DictationAudioSource> {
  const bytes = await invoke<number[]>("collaboration_voice_gate_fixture", {});
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
