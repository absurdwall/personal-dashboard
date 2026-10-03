type GateResult = Record<string, boolean | string | number>;
const result: GateResult = {
  origin: location.origin,
  secureContext: isSecureContext,
  mediaDevices: !!navigator.mediaDevices,
  getUserMedia: typeof navigator.mediaDevices?.getUserMedia === "function",
  peerConnection: typeof RTCPeerConnection === "function",
};
async function report(): Promise<void> {
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
let cloudPeer: RTCPeerConnection | undefined;
let cloudInput: string | undefined;
let polling: ReturnType<typeof setInterval> | undefined;
const invoke = (command: string, args: unknown) => (window as unknown as { __TAURI__: { core: { invoke<T>(command: string, args: unknown): Promise<T> } } }).__TAURI__.core.invoke<any>(command, args);
const stopCloud = async () => {
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
    channel.onopen = () => {
      result.dataChannelOpen=true;
      void report();
      if(result.syntheticOnly)void sendFixture();
    };
    channel.onmessage = event => {
      try {
        const data = JSON.parse(String(event.data));
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
          if (event.kind === "failed" || event.kind === "closed") result.serviceEnded = true;
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
