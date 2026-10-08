/* Refresh only the visible results/event screen. Never poll hidden tabs or
 * replace a page after the user has navigated elsewhere. */
const ResultsRefresh=(()=>{
  let pending=false,lastCheck=0,lastInteraction=0;
  const visible=id=>document.getElementById(id)?.style.display==='block';
  const hubs=()=>({
    'Formula 2':[F2Hub,'f2'], 'F1 Academy':[AcademyHub,'academy'],
    WEC:[WECHub,'wec'], IMSA:[IMSAHub,'imsa'], 'CARS Tour':[CARSHub,'cars']
  });
  function context(){
    const series=activeSeriesName;
    if(typeof Spoilers!=='undefined'&&Spoilers.protected(series))return null;
    if(visible('event-view')&&window.rcResultsEvent?.series===series){
      const el=document.querySelector('#event-details .weekend-schedule');
      return el?{series,el,event:window.rcResultsEvent}:null;
    }
    if(!visible('series-view'))return null;
    if(series==='Formula 1'&&f1Tab==='results'&&!document.getElementById('f1-hub').hidden)
      return {series,el:document.getElementById('f1-content')};
    if(nascarHubSeries.has(series)&&document.querySelector('[data-nascar-tab="results"][aria-pressed="true"]'))
      return {series,el:document.getElementById('nascar-hub-content')};
    const item=hubs()[series];
    if(item&&document.querySelector(`[data-${item[1]}-tab="results"][aria-pressed="true"]`))
      return {series,el:document.getElementById(item[1]+'-hub-content')};
    return null;
  }
  async function tick(){
    if(pending||document.hidden||navigator.onLine===false||loading||!dataReady||Date.now()-lastCheck<60000||Date.now()-lastInteraction<5000)return;
    if(document.activeElement?.matches('input,select,textarea,[contenteditable="true"]'))return;
    const before=context();if(!before)return;
    pending=true;lastCheck=Date.now();
    const child=before.el.firstElementChild,interaction=lastInteraction;
    try{
      const item=hubs()[before.series];
      if(before.series==='Formula 1')await loadF1Feeds(false,'results',true);
      else if(nascarHubSeries.has(before.series)){const checks=await NascarCompetition.preload(before.series,'results');if(checks?.some(r=>r.status==='rejected'))throw Error('Keeping previously loaded results after a failed update');}
      else if(item)await item[0].load();
      else return;
      const after=context();
      if(document.hidden||loading||!after||after.el!==before.el||after.series!==before.series||after.event!==before.event||before.el.firstElementChild!==child||interaction!==lastInteraction)return;
      const scroll=window.scrollY,positions=[...before.el.querySelectorAll('.f1-table-wrap,.f1-table-scroll')].map(el=>el.scrollLeft);
      if(before.event){
        if(item)item[0].install();
        await eventResultShortcuts(before.event);
        if(before.series==='Formula 1')refreshF1EventRatings();
      }else if(before.series==='Formula 1')renderF1Content();
      else if(nascarHubSeries.has(before.series))await NascarCompetition.render(before.el,before.series,'results');
      else item[0].refreshResults(before.el);
      // Rendering results must not move the user's viewport or table position.
      if(context()?.el===before.el){
        before.el.querySelectorAll('.f1-table-wrap,.f1-table-scroll').forEach((el,i)=>el.scrollLeft=positions[i]||0);
        window.scrollTo({top:scroll,behavior:'instant'});
        let note=before.el.querySelector('[data-results-refresh-note]');
        if(!note){note=document.createElement('p');note.dataset.resultsRefreshNote='true';note.className='f1-data-note';before.el.append(note);}
        note.textContent='Checks for updates every minute while this screen is open. Published results may be revised.';
      }
    }catch(e){console.warn('Results refresh will retry:',e.message);}
    finally{pending=false;}
  }
  for(const event of ['pointerdown','keydown','change'])document.addEventListener(event,()=>{lastInteraction=Date.now();},{passive:true});
  setInterval(tick,15000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
  window.addEventListener('online',tick);
  window.addEventListener('focus',tick);
  return {tick};
})();
