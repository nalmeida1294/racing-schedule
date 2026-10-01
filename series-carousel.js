const SeriesCarousel=(()=>{
 let cleanup=()=>{},selected='';
 function mount(host){
  cleanup();
  const cards=[...host.querySelectorAll('.home-series-card')];
  host.classList.add('series-carousel');
  if(!cards.length){host.innerHTML='<h2>Series Hubs</h2><p>Select a series in Customize Series to see its hub here.</p>';return;}
  const heading=document.createElement('div');heading.className='carousel-heading';
  heading.innerHTML='<div><h2 id="series-carousel-title">Series Hubs</h2><p>Swipe to Explore Your Series</p></div><div class="carousel-controls"><button type="button" aria-label="Previous series">‹</button><button type="button" aria-label="Next series">›</button></div>';
  const track=document.createElement('div');track.className='series-carousel-track';track.setAttribute('role','region');track.setAttribute('aria-roledescription','carousel');track.setAttribute('aria-labelledby','series-carousel-title');track.tabIndex=0;
  const pages=document.createElement('div');pages.className='carousel-pages';pages.setAttribute('aria-label','Choose series');
  const status=document.createElement('p');status.className='carousel-status';status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
  cards.forEach((card,i)=>{card.setAttribute('role','group');card.setAttribute('aria-roledescription','slide');card.setAttribute('aria-label',`${i+1} of ${cards.length}: ${card.dataset.series}`);track.appendChild(card);const dot=document.createElement('button');dot.type='button';dot.setAttribute('aria-label','Show '+card.dataset.series);dot.onclick=()=>go(i);pages.appendChild(dot);});
  host.replaceChildren(heading,track,pages,status);
  let index=Math.max(0,cards.findIndex(c=>c.dataset.series===selected)),timer,frame;
  const controls=heading.querySelectorAll('button');
  function height(){if(track.clientWidth)track.style.height=Math.ceil(cards[index].getBoundingClientRect().height)+'px';}
  function update(){selected=cards[index].dataset.series;cards.forEach((card,i)=>{card.inert=i!==index;pages.children[i].setAttribute('aria-current',String(i===index));});controls[0].disabled=index===0;controls[1].disabled=index===cards.length-1;status.textContent=`${index+1} / ${cards.length} · ${selected}`;height();}
  function position(i){return cards[i].offsetLeft-cards[0].offsetLeft;}
  function go(i){index=Math.max(0,Math.min(cards.length-1,i));update();track.scrollTo({left:position(index),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  function settle(){index=cards.reduce((best,c,i)=>Math.abs(position(i)-track.scrollLeft)<Math.abs(position(best)-track.scrollLeft)?i:best,0);update();if(Math.abs(track.scrollLeft-position(index))>1)track.scrollTo({left:position(index),behavior:'smooth'});}
  function scroll(){clearTimeout(timer);timer=setTimeout(settle,150);}
  track.addEventListener('scroll',scroll,{passive:true});track.addEventListener('scrollend',settle);
  track.addEventListener('keydown',e=>{if(e.target!==track)return;if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();go(e.key==='Home'?0:e.key==='End'?cards.length-1:index+(e.key==='ArrowRight'?1:-1));}});
  controls[0].onclick=()=>go(index-1);controls[1].onclick=()=>go(index+1);
  let width=0;const resize=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{height();if(track.clientWidth&&width!==track.clientWidth){width=track.clientWidth;track.scrollTo({left:position(index),behavior:'instant'});}});});
  cards.forEach(c=>resize.observe(c));resize.observe(track);
  update();track.scrollLeft=position(index);
  // Suppress the synthetic click after a drag without intercepting vertical scrolling.
  let startX=0,startY=0,dragged=false;
  track.addEventListener('pointerdown',e=>{startX=e.clientX;startY=e.clientY;dragged=false;},{passive:true});
  track.addEventListener('pointermove',e=>{if(e.buttons&&Math.hypot(e.clientX-startX,e.clientY-startY)>10)dragged=true;},{passive:true});
  track.addEventListener('click',e=>{if(dragged){e.preventDefault();e.stopImmediatePropagation();dragged=false;}},true);
  cleanup=()=>{resize.disconnect();clearTimeout(timer);cancelAnimationFrame(frame);};
 }
 return {mount};
})();
