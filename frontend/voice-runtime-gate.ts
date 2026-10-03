type TimingRow = { startMs: number; endMs: number; arrivalOrdinal: number };
type GateResult = Record<string, boolean | string | number | TimingRow[]>;
const result: GateResult = {
  origin: location.origin,
  secureContext: isSecureContext,
  mediaDevices: !!navigator.mediaDevices,
  getUserMedia: typeof navigator.mediaDevices?.getUserMedia === "function",
  peerConnection: typeof RTCPeerConnection === "function",
};
async function report(): Promise<void> {
  if(result.syntheticOnly&&cloudPeer) {
    result.currentPeerState=cloudPeer.connectionState;
    result.currentIceState=cloudPeer.iceConnectionState;
    result.currentSignalingState=cloudPeer.signalingState;
    result.syntheticAudioContextState=fixtureContext?.state??"none";
    void cloudPeer.getStats().then(stats=>{
      let packets=0;
      stats.forEach(stat=>{if(stat.type==="outbound-rtp"&&stat.kind==="audio")packets+=Number(stat.packetsSent??0);});
      result.syntheticOutboundPackets=String(packets);
    }).catch(()=>undefined);
  }
  document.querySelector("#result")!.textContent = JSON.stringify(result, null, 2);
  await (window as unknown as { __TAURI__: { core: { invoke(command: string, args: unknown): Promise<void> } } }).__TAURI__.core.invoke("collaboration_voice_runtime_gate", { result });
}
void report();
document.querySelector("#start")!.addEventListener("click", async () => {
  let stream: MediaStream | undefined;
  let peer: RTCPeerConnection | undefined;
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("capture-unavailable");
    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    result.microphone = stream.getAudioTracks().some(track => track.readyState === "live");
    peer = new RTCPeerConnection();
    for (const track of stream.getAudioTracks()) peer.addTrack(track, stream);
    peer.createDataChannel("oai-events");
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    result.offer = !!offer.sdp;
  } catch (error) {
    result.failure = error instanceof DOMException ? error.name : "capture-unavailable";
  } finally {
    stream?.getTracks().forEach(track => track.stop());
    peer?.close();
    await report();
  }
});

let cloudStream: MediaStream | undefined;
let fixtureCaptureStopped=false;
let fixtureClock:ConstantSourceNode|undefined;
const finalTurns=new Map<string,string>();
// Synthetic diagnostic only: report field names/counts, never ID values or bodies.
const previewIds=new Set<string>();
const finalIds=new Set<string>();
const previewReferences=new Set<string>();
const finalReferences=new Set<string>();
const previewTimings: TimingRow[] = [];
const finalTimings: TimingRow[] = [];
let timingOrdinal = 0;
let invalidPreviewTiming = 0;
let invalidFinalTiming = 0;
function recordFrameTiming(data: Record<string, any>, preview: boolean): void {
  // Only called for the configured synthetic source. Never retains identifiers/bodies.
  const source = preview ? data : data.turn;
  const startMs = source?.start_ms;
  const endMs = source?.end_ms;
  const valid = typeof startMs === "number" && typeof endMs === "number"
    && Number.isFinite(startMs) && Number.isFinite(endMs)
    && startMs >= 0 && endMs >= startMs && endMs <= 86_400_000;
  timingOrdinal += 1;
  if (!valid) {
    if (preview) invalidPreviewTiming += 1; else invalidFinalTiming += 1;
  }
  const rows = preview ? previewTimings : finalTimings;
  // Preserve bounded raw numeric intervals, including bounded invalid ranges, for diagnosis.
  if (rows.length < (preview ? 64 : 32) && typeof startMs === "number" && typeof endMs === "number"
      && Number.isFinite(startMs) && Number.isFinite(endMs)
      && Math.abs(startMs) <= 86_400_000 && Math.abs(endMs) <= 86_400_000 && timingOrdinal <= 10_000) {
    rows.push({ startMs, endMs, arrivalOrdinal: timingOrdinal });
  }
  const validRows = (items: TimingRow[]) => items.filter(row => row.startMs >= 0 && row.endMs >= row.startMs);
  const previews = validRows(previewTimings);
  const finals = validRows(finalTimings);
  let containedPairs = 0, overlapPairs = 0, exactPairs = 0, multipleFinalMatches = false;
  let containedPreviews = 0;
  for (const p of previews) {
    let matches = 0;
    for (const f of finals) {
      if (p.startMs >= f.startMs && p.endMs <= f.endMs) { containedPairs += 1; matches += 1; }
      if (Math.max(p.startMs, f.startMs) < Math.min(p.endMs, f.endMs)) overlapPairs += 1;
      if (p.startMs === f.startMs && p.endMs === f.endMs) exactPairs += 1;
    }
    if (matches > 0) containedPreviews += 1;
    if (matches > 1) multipleFinalMatches = true;
  }
  result.syntheticPreviewTimingRows = previewTimings;
  result.syntheticFinalTimingRows = finalTimings;
  result.previewValidTimingCount = String(previews.length);
  result.finalValidTimingCount = String(finals.length);
  result.previewInvalidTimingCount = String(invalidPreviewTiming);
  result.finalInvalidTimingCount = String(invalidFinalTiming);
  result.timingContainedPairCount = String(containedPairs);
  result.timingOverlapPairCount = String(overlapPairs);
  result.timingExactBoundaryPairCount = String(exactPairs);
  result.timingContainedPreviewCount = String(containedPreviews);
  result.timingAllPreviewsContained = previews.length > 0 && containedPreviews === previews.length;
  result.timingMultipleFinalMatches = multipleFinalMatches;
  result.timingRowsTruncated = timingOrdinal > previewTimings.length + finalTimings.length
    + invalidPreviewTiming + invalidFinalTiming;
}
function recordFrameLinkage(data:Record<string,any>):void {
  if(!result.syntheticOnly)return;
  const preview=data.type==="input_transcript.added";
  const final=data.type==="turn.done"&&data.turn?.role==="user";
  if(!preview&&!final)return;
  recordFrameTiming(data, preview);
  const item=preview?data.item:data.turn;
  if(!item||typeof item!=="object")return;
  const fields=(value:Record<string,unknown>)=>Object.keys(value).filter(key=>/^[a-zA-Z_]{1,40}$/.test(key)).sort().slice(0,32).join(",").slice(0,120);
  result[preview?"previewEnvelopeFields":"finalEnvelopeFields"]=fields(data);
  result[preview?"previewItemFields":"finalTurnFields"]=fields(item);
  const ids=preview?previewIds:finalIds;
  const refs=preview?previewReferences:finalReferences;
  if(typeof item.id==="string")ids.add(item.id);
  for(const value of [data,item])for(const [key,reference]of Object.entries(value)) {
    if(key!=="id"&&/(?:_id|Id)$/.test(key)&&typeof reference==="string")refs.add(reference);
  }
  result.previewIdentityCount=String(previewIds.size);
  result.finalIdentityCount=String(finalIds.size);
  result.previewFinalIdentityIntersect=[...previewIds].some(id=>finalIds.has(id));
  result.finalReferenceMatchesPreview=[...finalReferences].some(id=>previewIds.has(id));
  result.previewReferenceMatchesFinal=[...previewReferences].some(id=>finalIds.has(id));
}
let cloudPeer: RTCPeerConnection | undefined;
let cloudChannel: RTCDataChannel | undefined;
let fixtureSource: AudioBufferSourceNode | undefined;
let closeDrainTimer: ReturnType<typeof setTimeout> | undefined;
let closeDrainPending = false;
async function finishCloseDrain(terminal: boolean): Promise<void> {
  if (!closeDrainPending) return;
  closeDrainPending = false;
  if (closeDrainTimer) clearTimeout(closeDrainTimer);
  closeDrainTimer = undefined;
  result.closeDrainTerminal = terminal;
  result.closeDrainTimedOut = !terminal;
  result.closeDrainFinalCount = String(finalTurns.size);
  await stopCloud();
}

let cloudInput: string | undefined;
let polling: ReturnType<typeof setInterval> | undefined;
const invoke = (command: string, args: unknown) => (window as unknown as { __TAURI__: { core: { invoke<T>(command: string, args: unknown): Promise<T> } } }).__TAURI__.core.invoke<any>(command, args);
document.querySelector("#native-permission")!.addEventListener("click",async()=>{
  (document.querySelector("#native-permission")as HTMLButtonElement).disabled=true;
  result.nativeMicrophoneRequestOutcome="request-pending";
  await report();
  try {
    const status=await invoke("collaboration_voice_gate_request_microphone",{});
    result.nativeMicrophoneRequestOutcome=["not-determined","restricted","denied","authorized","class-unavailable","request-pending","unsupported-platform"].includes(status)?status:"unknown";
  }catch{result.nativeMicrophoneRequestOutcome="request-failed";}
  await report();
});
const stopCloud = async () => {
  if (closeDrainTimer) clearTimeout(closeDrainTimer);
  closeDrainTimer = undefined;
  closeDrainPending = false;
  (document.querySelector("#close-drain") as HTMLButtonElement).disabled = true;
  try { fixtureSource?.stop(); } catch { /* Already ended. */ }

  cloudStream?.getTracks().forEach(track => track.stop());
  fixtureDestination?.stream.getTracks().forEach(track => track.stop());
  try{fixtureClock?.stop();}catch{}
  void fixtureContext?.close();
  result.captureStopped = true;
  if (polling) clearInterval(polling);
  if (cloudInput) await invoke("collaboration_dictation_stop", { inputId: cloudInput }).catch(() => undefined);
  cloudPeer?.close();
  result.peerClosed = true;
  cloudInput = undefined;
  (document.querySelector("#stop") as HTMLButtonElement).disabled = true;
  await report();
};
document.querySelector("#close-drain")!.addEventListener("click", async () => {
  // Restricted to the configured synthetic diagnostic, never the production composer.
  if (!result.syntheticOnly || cloudChannel?.readyState !== "open" || closeDrainPending) return;
  (document.querySelector("#close-drain") as HTMLButtonElement).disabled = true;
  closeDrainPending = true;
  result.closeDrainTerminal = false;
  result.closeDrainTimedOut = false;
  try { fixtureSource?.stop(); } catch { /* Already ended. */ }
  cloudStream?.getTracks().forEach(track => track.stop());
  fixtureDestination?.stream.getTracks().forEach(track => track.stop());
  fixtureCaptureStopped = true;
  result.fixtureCaptureStopped = true;
  closeDrainTimer = setTimeout(() => { void finishCloseDrain(false); }, 10_000);
  try {
    // Known v3 message shape under test; this does not assert flush acknowledgement.
    cloudChannel.send(JSON.stringify({ type: "session.close" }));
    result.closeRequestSent = true;
  } catch {
    result.closeRequestSent = false;
    await finishCloseDrain(false);
  }
  await report();
});
document.querySelector("#cloud")!.addEventListener("click", async () => {
  if (cloudInput) return;
  cloudInput = crypto.randomUUID();
  try {
    let fixtureAvailable=false;
    try { await invoke("collaboration_voice_gate_fixture",{}); fixtureAvailable=true; } catch { /* Mic-only gate. */ }
    if (fixtureAvailable) {
      fixtureContext=new AudioContext();
      await fixtureContext.resume();
      fixtureDestination=fixtureContext.createMediaStreamDestination();
      cloudStream=fixtureDestination.stream;
      fixtureClock=fixtureContext.createConstantSource();
      fixtureClock.offset.value=0;
      fixtureClock.connect(fixtureDestination);
      fixtureClock.start();
      result.sourceReadyBeforeOffer=true;
      result.syntheticOnly=true;
    } else {
      cloudStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      result.microphone = cloudStream.getAudioTracks().some(track => track.readyState === "live");
    }
    cloudPeer = new RTCPeerConnection();
    cloudStream.getAudioTracks().forEach(track => cloudPeer!.addTrack(track, cloudStream!));
    const channel = cloudPeer.createDataChannel("oai-events");
    cloudChannel = channel;
    channel.onclose = () => { if (closeDrainPending) void finishCloseDrain(true); };
    channel.onopen = () => {
      result.dataChannelOpen=true;
      (document.querySelector("#close-drain") as HTMLButtonElement).disabled = !result.syntheticOnly;
      void report();
      if(result.syntheticOnly)void sendFixture();
    };
    channel.onmessage = event => {
      try {
        const data = JSON.parse(String(event.data));
        recordFrameLinkage(data);
        if (data.type === "session.closed" && closeDrainPending) void finishCloseDrain(true);
        result.rawEventType = String(data.type ?? "unknown");
        result.rawRole = String(data.turn?.role ?? "none");
        result.rawTextLength = String((data.turn?.transcript ?? "").length);
        if (data.type === "turn.done" && data.turn?.role === "user") {
          result.userFinal = true;
          result.userFinalIdentity = typeof data.turn.id === "string";
          result.finalTurnIdPresent = typeof data.turn.id === "string";
          result.finalTextLength = String((data.turn.transcript ?? "").length);
          result.finalMatchesFixture = (data.turn.transcript ?? "").includes("personal dashboard") && (data.turn.transcript ?? "").includes("tomorrow");
          finalTurns.set(data.turn.id,data.turn.transcript??"");
          result.finalCount=String(finalTurns.size);
          if (closeDrainPending) result.closeDrainFinalCount = String(finalTurns.size);
          const aggregate=[...finalTurns.values()].join(" ");
          result.aggregateMatchesFixture=aggregate.toLowerCase().includes("personal dashboard")&&aggregate.toLowerCase().includes("tomorrow")&&aggregate.includes("三十");
          result.finalAfterFixtureCaptureStop=fixtureCaptureStopped;
          document.querySelector("#preview")!.textContent = `User final segments: ${finalTurns.size}; latest characters: ${(data.turn.transcript??"").length}`;
          void report();
        }
        if (data.type === "input_transcript.added") { result.dataChannelTranscript = true; void report(); }
      } catch { /* Never log raw payload. */ }
    };
    cloudPeer.onconnectionstatechange = () => { result.connectionState = cloudPeer!.connectionState; void report(); };
    const offer = await cloudPeer.createOffer();
    await cloudPeer.setLocalDescription(offer);
    const answer = await invoke("collaboration_dictation_start", { inputId: cloudInput, sdp: offer.sdp });
    result.remoteAnswer = !!answer.sdp;
    await cloudPeer.setRemoteDescription({ type:"answer", sdp:answer.sdp });
    (document.querySelector("#stop") as HTMLButtonElement).disabled = false;
    (document.querySelector("#fixture") as HTMLButtonElement).disabled = false;
    let pending = false;
    polling = setInterval(async () => {
      if (pending || !cloudInput) return;
      pending = true;
      try {
        const events = await invoke("collaboration_dictation_poll", { inputId:cloudInput });
        for (const event of events) {
          if (event.kind === "segment-completed" && event.role === "user") {
            result.sidebandUserFinal = true;
            result.sidebandFinalIdentity = !!event.itemId;
            document.querySelector("#preview")!.textContent = "User final segment received (body not displayed in diagnostic).";
          }
          if (event.kind === "failed" || event.kind === "closed") {
            result.serviceEnded = true;
            if (event.kind === "closed" && closeDrainPending) void finishCloseDrain(true);
          }
        }
      } catch { result.failure = "dictation-connection-lost"; }
      finally { pending = false; await report(); }
    }, 200);
    await report();
  } catch (error) {
    result.failure = typeof error === "string" && /^dictation-[a-z-]+$/.test(error) ? error : "dictation-connection-failed";
    await stopCloud();
  }
});
document.querySelector("#stop")!.addEventListener("click", () => { void stopCloud(); });

let fixtureContext: AudioContext | undefined;
let fixtureDestination: MediaStreamAudioDestinationNode | undefined;
async function sendFixture():Promise<void> {
  if (!cloudPeer || cloudPeer.connectionState !== "connected") return;
  const bytes = await invoke("collaboration_voice_gate_fixture", {});
  fixtureContext ??= new AudioContext();
  await fixtureContext.resume();
  const audio = await fixtureContext.decodeAudioData(new Uint8Array(bytes).buffer);
  const source = fixtureContext.createBufferSource();
  fixtureSource = source;
  source.buffer = audio;
  fixtureDestination = fixtureContext.createMediaStreamDestination();
  source.connect(fixtureDestination);
  const sender = cloudPeer.getSenders().find(sender => sender.track?.kind === "audio");
  cloudStream?.getTracks().forEach(track => track.stop());
  await sender?.replaceTrack(fixtureDestination.stream.getAudioTracks()[0]);
  source.onended=()=>{
    fixtureCaptureStopped=true;
    fixtureDestination?.stream.getTracks().forEach(track=>track.stop());
    result.fixtureCaptureStopped=true;
    void cloudPeer?.getStats().then(stats=>{
      let packets=0;
      stats.forEach(stat=>{if(stat.type==="outbound-rtp"&&stat.kind==="audio")packets+=Number(stat.packetsSent??0);});
      result.fixturePacketsSent=String(packets);
      void report();
    });
  };
  source.start();
  result.fixtureSent = true;
  await report();
}
document.querySelector("#fixture")!.addEventListener("click",()=>{void sendFixture();});

document.querySelector("#product")!.addEventListener("click",()=>{location.href="index.html";});
