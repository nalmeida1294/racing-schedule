/* Lightweight Indianapolis-inspired vector loading indicator. */
const CircuitLoader=(()=>{
 let target=0,current=0,frame=0,active=false,lastTime=0;
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 function paint(){
  const root=document.querySelector('.loading-circuit');if(!root)return;
  const path=root.querySelector('.loading-track'),length=path.getTotalLength(),p=path.getPointAtLength(length*current),next=path.getPointAtLength(Math.min(length,length*current+1)),prev=path.getPointAtLength(Math.max(0,length*current-1));
  root.querySelector('.loading-trail').style.strokeDasharray=current+' 1';
  root.querySelector('.loading-car').setAttribute('transform','translate('+p.x+' '+p.y+') rotate('+(Math.atan2(next.y-prev.y,next.x-prev.x)*180/Math.PI)+')');
  root.setAttribute('aria-valuenow',String(Math.round(target*100)));
 }
 function tick(now){
  frame=0;const dt=lastTime?Math.min(50,now-lastTime):16;lastTime=now;
  current+=(target-current)*(1-Math.exp(-dt/320));
  if(target-current<.0005)current=target;
  paint();if(active&&current<target)frame=requestAnimationFrame(tick);else lastTime=0;
 }
 function progress(value){target=Math.max(target,Math.min(1,value));if(reduced()){current=target;paint();}else if(active&&!frame)frame=requestAnimationFrame(tick);}
 function start(){cancelAnimationFrame(frame);frame=0;target=current=0;lastTime=0;active=true;paint();}
 async function finish(){
  if(!active)return;
  cancelAnimationFrame(frame);frame=0;target=1;
  if(!reduced()&&!document.hidden){
   // Use the existing 160ms completion window, never an extra lap or delay.
   const from=current;
   await new Promise(resolve=>{
    const began=performance.now();let done=false;
    const complete=()=>{if(done)return;done=true;cancelAnimationFrame(frame);frame=0;resolve();};
    const timeout=setTimeout(complete,160);
    const end=now=>{const t=Math.min(1,(now-began)/160);current=from+(1-from)*(1-Math.pow(1-t,3));paint();if(t<1&&active)frame=requestAnimationFrame(end);else{clearTimeout(timeout);complete();}};
    frame=requestAnimationFrame(end);
   });
  }
  current=1;paint();stop();
 }
 function stop(){active=false;cancelAnimationFrame(frame);frame=0;}
 return {start,progress,finish,stop};
})();
