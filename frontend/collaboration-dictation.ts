import type { CollaborationVoiceTarget, CollaborationVoiceState, CollaborationVoiceFailure, CollaborationVoiceHandlers } from "./collaboration-voice.js";
import type { CodexDictationRuntime, CodexDictationCapture, CodexDictationEvent } from "./collaboration-dictation-runtime.js";

type ActiveInput = {
  id:string; target:CollaborationVoiceTarget; state:Exclude<CollaborationVoiceState,"idle">;
  abort:AbortController; capture?:CodexDictationCapture; finals:Map<string,string>; preview:string; ended:boolean;
};
export class CodexCollaborationVoiceInputController {
  #active:ActiveInput|null=null;
  private readonly runtime:CodexDictationRuntime;
  private readonly handlers:CollaborationVoiceHandlers & {
    onPreview?(target:CollaborationVoiceTarget,text:string):void;
    onIncomplete?(target:CollaborationVoiceTarget):void;
  };
  constructor(runtime:CodexDictationRuntime,handlers:CollaborationVoiceHandlers & {
    onPreview?(target:CollaborationVoiceTarget,text:string):void;
    onIncomplete?(target:CollaborationVoiceTarget):void;
  }) { this.runtime=runtime;this.handlers=handlers; }
  get state():CollaborationVoiceState {return this.#active?.state??"idle";}
  async start(target:CollaborationVoiceTarget):Promise<void> {
    if(this.#active||!target.sessionId||!target.targetDate)return;
    const active:ActiveInput={id:crypto.randomUUID(),target:{...target},state:"requesting",abort:new AbortController(),finals:new Map(),preview:"",ended:false};
    this.#active=active;
    this.handlers.onState("requesting",active.target);
    try {
      const capture=await this.runtime.start(active.id,event=>this.#event(active,event),active.abort.signal);
      if(this.#active!==active){await capture.cancel();return;}
      active.capture=capture;
      active.state="recording";
      this.handlers.onState("recording",active.target);
    }catch(error){
      if(this.#active!==active)return;
      const failure:CollaborationVoiceFailure=error instanceof DOMException&&(error.name==="NotAllowedError"||error.name==="SecurityError")?"permission-denied":String(error).includes("dictation-login-required")?"login-required":String(error).includes("capture-unavailable")?"capture-unavailable":"connection-failed";
      this.#finish(active,false,failure);
    }
  }
  stop():void {
    const active=this.#active;
    if(!active||active.state!=="recording"||!active.capture)return;
    active.capture.stopCapture();
    active.state="transcribing";
    this.handlers.onState("transcribing",active.target);
    void active.capture.finalize().then(result=>this.#finish(active,result.incomplete),()=>this.#finish(active,true,"recognition-failed"));
  }
  cancel():void {
    const active=this.#active;
    if(!active)return;
    this.#active=null;
    active.ended=true;
    active.abort.abort();
    void active.capture?.cancel();
    this.handlers.onPreview?.(active.target,"");
    this.handlers.onCancel(active.target);
    this.handlers.onState("idle",active.target);
  }
  #event(active:ActiveInput,event:CodexDictationEvent):void {
    if(this.#active!==active||active.ended||event.inputId!==active.id)return;
    if(event.kind==="failed"){this.#finish(active,true,"recognition-failed");return;}
    if(event.role!=="user")return;
    if(event.kind==="preview")active.preview+=event.text??"";
    if(event.kind==="final"&&event.itemId){active.finals.set(event.itemId,event.text??"");active.preview="";}
    this.handlers.onPreview?.(active.target,[...active.finals.values(),active.preview].filter(Boolean).join("\n"));
  }
  #finish(active:ActiveInput,incomplete:boolean,failure?:CollaborationVoiceFailure):void {
    if(this.#active!==active||active.ended)return;
    active.ended=true;
    this.#active=null;
    active.abort.abort();
    void active.capture?.cancel();
    const text=[...active.finals.values(),...(incomplete?[active.preview]:[])].filter(Boolean).join("\n").trim();
    this.handlers.onPreview?.(active.target,"");
    if(text)this.handlers.onTranscript(active.target,text);
    else this.handlers.onFailure(active.target,failure??"empty-recording");
    if(incomplete&&text)this.handlers.onIncomplete?.(active.target);
    this.handlers.onState("idle",active.target);
  }
}
