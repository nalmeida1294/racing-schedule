/* Lightweight Indianapolis-inspired vector loading indicator. */
const CircuitLoader=(()=>{
 let target=0,current=0,frame=0,active=false;
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 function paint(){
  const root=document.querySelector('.loading-circuit');if(!root)return;
  const path=root.querySelector('.loading-track'),length=path.getTotalLength(),p=path.getPointAtLength(length*current),next=path.getPointAtLength(Math.min(length,length*current+1)),prev=path.getPointAtLength(Math.max(0,length*current-1));
  root.querySelector('.loading-trail').style.strokeDasharray=current+' 1';
  root.querySelector('.loading-car').setAttribute('transform','translate('+p.x+' '+p.y+') rotate('+(Math.atan2(next.y-prev.y,next.x-prev.x)*180/Math.PI)+')');
  root.setAttribute('aria-valuenow',String(Math.round(target*100)));
 }
 function tick(){frame=0;current=Math.min(target,current+.035);paint();if(active&&current<target)frame=requestAnimationFrame(tick);}
 function progress(value){target=Math.max(target,Math.min(1,value));if(reduced()){current=target;paint();}else if(active&&!frame)frame=requestAnimationFrame(tick);}
 function start(){cancelAnimationFrame(frame);frame=0;target=current=0;active=true;paint();}
 async function finish(){if(!active)return;progress(1);if(!reduced()&&!document.hidden)await new Promise(resolve=>setTimeout(resolve,160));current=1;paint();stop();}
 function stop(){active=false;cancelAnimationFrame(frame);frame=0;}
 return {start,progress,finish,stop};
})();
