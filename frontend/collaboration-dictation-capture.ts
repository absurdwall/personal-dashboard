import { captureDiagnosticDictationFixture } from "./collaboration-dictation-fixture.js";
import type { DictationAudioSource, DictationInvoke } from "./collaboration-dictation-runtime.js";

type DiagnosticIdentity = Readonly<{ diagnosticVoiceFixture?: boolean; diagnosticVoiceLocalMicrophonePreflight?: boolean }>;
type DiagnosticReport = Readonly<Record<string, boolean | string>>;

/** Owns capture-source selection and the gated diagnostic report lifecycle. */
export class CollaborationDictationCapture {
  private fixtureEnabled = false;
  private localMicrophonePreflight = false;
  private reportState: Record<string, boolean | string> = {};
  private reportWrite = Promise.resolve();

  constructor(private readonly invoke: DictationInvoke) {}

  configure(identity: DiagnosticIdentity): void {
    this.fixtureEnabled = identity.diagnosticVoiceFixture === true;
    this.localMicrophonePreflight = this.fixtureEnabled && identity.diagnosticVoiceLocalMicrophonePreflight === true;
  }

  resetReport(): void {
    if (this.fixtureEnabled) this.reportState = {};
  }

  report(value: DiagnosticReport): void {
    if (!this.fixtureEnabled) return;
    // These flags describe the cloud source; local permission access is separate.
    this.reportState = {...this.reportState, ...value, syntheticOnly:true, cloudMicrophone:false};
    const result = {...this.reportState};
    this.reportWrite = this.reportWrite
      .then(() => this.invoke<void>("collaboration_voice_runtime_gate", {result}))
      .catch(() => undefined);
  }

  async capture(signal?: AbortSignal): Promise<DictationAudioSource> {
    if (this.fixtureEnabled) {
      if (this.localMicrophonePreflight) this.report({localMicrophonePreflightRequested:true});
      const source = await captureDiagnosticDictationFixture(this.invoke, this.localMicrophonePreflight, signal);
      if (this.localMicrophonePreflight) this.report({localMicrophonePreflightStopped:true});
      return source;
    }
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("capture-unavailable");
    return {stream: await navigator.mediaDevices.getUserMedia({audio:true,video:false})};
  }
}
