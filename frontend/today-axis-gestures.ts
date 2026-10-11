/** One pointer owner for blank selection, Task movement and plan gestures. */
export type AxisGestureTarget = Readonly<{
  key: string;
  kind: string;
  startMinute: number;
  endMinute: number | null;
  mode?: "move" | "resize-end";
}>;
export type AxisGestureCommit<Context> = Readonly<{
  context: Context;
  target: AxisGestureTarget | null;
  startMinute: number;
  endMinute: number | null;
}>;
export function attachTodayAxisGestures<Context>(options: Readonly<{
  plot: HTMLElement;
  scrollSurface: HTMLElement;
  bounds(): readonly [number, number];
  begin(): Context | null;
  resolveTarget(element: Element, context: Context): AxisGestureTarget | null | false;
  onCommit(change: AxisGestureCommit<Context>): void;
  onInvalid(): void;
}>): () => void {
  const {plot, scrollSurface} = options;
  let gesture: {id:number; context:Context; target:AxisGestureTarget|null; originY:number; lastY:number;
    originMinute:number; bounds:readonly[number,number]; moved:boolean; start:number; end:number|null} | null = null;
  let frame = 0;
  let suppressedClick = false;
  let preview: HTMLElement | null = null;
  const snap = (minute:number) => Math.round(minute / 15) * 15;
  const position = (clientY:number, bounds:readonly[number,number]) => {
    const rect=plot.getBoundingClientRect();
    return bounds[0]+(clientY-rect.top)/rect.height*(bounds[1]-bounds[0]);
  };
  const update = () => {
    const current=gesture;if(!current)return;
    const minute=position(current.lastY,current.bounds);
    if(current.target) {
      if(current.target.mode === "resize-end") {current.start=current.target.startMinute;current.end=snap(minute);}
      else {current.start=snap(current.target.startMinute+minute-current.originMinute);
        current.end=current.target.endMinute===null?null:current.start+current.target.endMinute-current.target.startMinute;}
    } else {current.start=Math.min(snap(current.originMinute),snap(minute));current.end=Math.max(snap(current.originMinute),snap(minute));}
    if(!current.moved)return;
    preview ??= document.createElement('div');
    preview.className='today-axis-gesture-preview';preview.dataset.axisGesturePreview='';
    if(!preview.parentElement)plot.append(preview);
    preview.style.top=`${(current.start-current.bounds[0])/(current.bounds[1]-current.bounds[0])*100}%`;
    preview.style.height=`${Math.max(0,(current.end??current.start)-current.start)/(current.bounds[1]-current.bounds[0])*100}%`;
    preview.classList.toggle('is-point',current.end===null);
  };
  const scroll = () => {
    frame=0;const current=gesture;if(!current?.moved)return;
    const rect=scrollSurface.getBoundingClientRect();
    const distance=current.lastY<rect.top+40?current.lastY-(rect.top+40):
      current.lastY>rect.bottom-40?current.lastY-(rect.bottom-40):0;
    if(distance!==0) {scrollSurface.scrollTop+=Math.max(-18,Math.min(18,distance*.35));update();}
    frame=requestAnimationFrame(scroll);
  };
  const cleanup=()=>{if(frame)cancelAnimationFrame(frame);frame=0;preview?.remove();preview=null;plot.classList.remove('is-pointer-editing');};
  const down=(event:PointerEvent)=>{
    if(event.button!==0||!event.isPrimary||gesture||!(event.target instanceof Element))return;
    if(event.target.closest('button,input,select,textarea,[data-axis-gesture-ignore]'))return;
    const context=options.begin();if(context===null)return;
    const target=options.resolveTarget(event.target,context);if(target===false)return;
    const bounds=options.bounds();const minute=position(event.clientY,bounds);
    gesture={id:event.pointerId,context,target,originY:event.clientY,lastY:event.clientY,originMinute:minute,bounds,moved:false,start:minute,end:null};
    plot.setPointerCapture(event.pointerId);
  };
  const move=(event:PointerEvent)=>{if(!gesture||gesture.id!==event.pointerId)return;
    gesture.lastY=event.clientY;
    if(!gesture.moved&&Math.abs(event.clientY-gesture.originY)>=5) {
      gesture.moved=true;plot.classList.add('is-pointer-editing');frame=requestAnimationFrame(scroll);
    }
    if(gesture.moved){event.preventDefault();update();}
  };
  const up=(event:PointerEvent)=>{const current=gesture;if(!current||current.id!==event.pointerId)return;
    current.lastY=event.clientY;update();gesture=null;cleanup();
    if(plot.hasPointerCapture(event.pointerId))plot.releasePointerCapture(event.pointerId);
    if(!current.moved)return;
    suppressedClick=true;
    // Commit against the captured source. Bounds violations remain visible failures.
    if(current.start<240||current.start>=1680||(current.end!==null&&(current.end<=current.start||current.end>1680))) {options.onInvalid();return;}
    if(current.target&&current.start===current.target.startMinute&&current.end===current.target.endMinute)return;
    options.onCommit({context:current.context,target:current.target,startMinute:current.start,endMinute:current.end});
  };
  const cancel=()=>{gesture=null;cleanup();};
  const click=(event:MouseEvent)=>{if(!suppressedClick)return;suppressedClick=false;event.preventDefault();event.stopImmediatePropagation();};
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape'&&gesture){event.preventDefault();cancel();}};
  plot.addEventListener('pointerdown',down);plot.addEventListener('pointermove',move);plot.addEventListener('pointerup',up);
  plot.addEventListener('pointercancel',cancel);plot.addEventListener('lostpointercapture',cancel);
  plot.addEventListener('click',click,true);document.addEventListener('keydown',key);
  return()=>{cancel();plot.removeEventListener('pointerdown',down);plot.removeEventListener('pointermove',move);plot.removeEventListener('pointerup',up);
    plot.removeEventListener('pointercancel',cancel);plot.removeEventListener('lostpointercapture',cancel);plot.removeEventListener('click',click,true);document.removeEventListener('keydown',key);};
}

/** Natural calendar endpoints for one lived-day axis minute. */
export function taskAxisDateTime(date:string, minute:number): Readonly<{date:string;time:string}> {
  const day=new Date(`${date}T12:00:00Z`);day.setUTCDate(day.getUTCDate()+Math.floor(minute/1440));
  const clock=((minute%1440)+1440)%1440;
  return {date:day.toISOString().slice(0,10),time:`${String(Math.floor(clock/60)).padStart(2,'0')}:${String(clock%60).padStart(2,'0')}`};
}
export function taskAxisMinute(date:string, endpoint:Readonly<{date:string;time:string}>):number {
  const days=(Date.parse(`${endpoint.date}T12:00:00Z`)-Date.parse(`${date}T12:00:00Z`))/86400000;
  return days*1440+Number(endpoint.time.slice(0,2))*60+Number(endpoint.time.slice(3,5));
}
