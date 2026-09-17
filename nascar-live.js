/* Cup live hub: direct NASCAR snapshots, with identity and freshness validation. */
(function(root){
 'use strict';
 const number=v=>v===null||v===undefined||String(v).trim()===''||!Number.isFinite(Number(v))?null:Number(v);
 function normalize(raw,now=Date.now()) {
  if(!raw||!Array.isArray(raw.vehicles)||!raw.race_id||!raw.track_id)throw new Error('Invalid NASCAR live feed');
  const stamp=String(raw.time_of_day_os||'').replace(/(\.\d{3})\d+/,'$1');
  const time=/[zZ]|[+-]\d\d:\d\d$/.test(stamp)?Date.parse(stamp):NaN;
  const fresh=Number.isFinite(time)&&now-time<=90000&&now-time>=-15000;
  const status={1:'green',2:'yellow',3:'red_flag',4:'finished',6:'suspended',8:'not_started',9:'unknown'}[raw.flag_state]||'unknown';
  const ids=new Set();
  const drivers=raw.vehicles.map(v=>{
    const d=v.driver||{},id=String(d.driver_id??'');
    if(!id||ids.has(id))throw new Error('Missing or duplicate driver identity');ids.add(id);
    const position=number(v.running_position),start=number(v.starting_position);
    return {id,name:d.full_name||[d.first_name,d.last_name].filter(Boolean).join(' ')||'Driver',number:String(v.vehicle_number??v.car_number??''),position:position>0?position:null,
      gap:number(v.delta),last:number(v.last_lap_time),best:number(v.best_lap_time),laps:number(v.laps_completed),speed:number(v.last_lap_speed),
      change:start>0&&position>0?start-position:null,status:Number(v.status),pits:Array.isArray(v.pit_stops)?v.pit_stops:null,onTrack:typeof v.is_on_track==='boolean'?v.is_on_track:null};
  }).sort((a,b)=>(a.position??999)-(b.position??999));
  const lap=number(raw.lap_number),total=number(raw.laps_in_race),stage=raw.stage||{};
  return {raceId:String(raw.race_id),trackId:String(raw.track_id),series:Number(raw.series_id),type:Number(raw.run_type),runId:String(raw.run_id),status,fresh,
    updatedAt:Number.isFinite(time)?new Date(time).toISOString():null,drivers,lap,total,
    remaining:number(raw.laps_to_go),cautions:number(raw.number_of_caution_segments),cautionLaps:number(raw.number_of_caution_laps),leadChanges:number(raw.number_of_lead_changes),
    stage:number(stage.stage_num),stageEnd:number(stage.finish_at_lap)>0&&number(stage.finish_at_lap)<=total?number(stage.finish_at_lap):null,
    isLive:fresh&&drivers.length>0&&Number(raw.series_id)===1&&Number(raw.run_type)===3&&['green','yellow','red_flag','suspended'].includes(status)};
 }
 function matches(race,s){return !!race&&!!s&&race.series==='NASCAR Cup Series'&&s.series===1&&s.type===3&&String(race.raceId)===s.raceId&&String(race.trackId)===s.trackId;}
 function phase(race,s,start,now=Date.now()) {
  if(matches(race,s)&&s.status==='finished')return 'concluded';
  if(matches(race,s)&&s.isLive&&s.updatedAt&&now-Date.parse(s.updatedAt)<=90000)return 'live';
  if(!Number.isFinite(start))return 'unscheduled';
  if(now<start-3600000)return 'before';if(now<start)return 'soon';if(now<=start+8*3600000)return 'waiting';return 'past';
 }
 root.NascarLive={normalize,matches,phase};
 if(typeof document==='undefined')return;
 const SERIES='NASCAR Cup Series',URL='https://cf.nascar.com/live/feeds/live-feed.json';
 const defaults={gap:true,last:false,best:false,laps:false,speed:false,change:true};
 let prefs={...defaults};try{const saved=JSON.parse(localStorage.getItem('cup-live-columns')||'{}');Object.keys(defaults).forEach(k=>{if(typeof saved[k]==='boolean')prefs[k]=saved[k];});}catch{}
 let state=null,selected=null,open=false,tab='live',timer=null,controller=null,connection='idle',returnTo=null,events=[],busy=false;
 const esc=v=>escapeHtml(v??''),val=v=>v===null||v===undefined?'—':esc(v),el=id=>document.getElementById(id);
 const p=r=>phase(r,state,raceStartTime(r)),same=()=>matches(selected,state);
 const columns={gap:'Gap',last:'Last lap',best:'Best lap',laps:'Laps',speed:'Speed',change:'+/−'};
 const labels={unknown:'STATUS UNAVAILABLE',not_started:'AWAITING START',green:'GREEN FLAG',yellow:'CAUTION',red_flag:'RED FLAG',suspended:'SESSION STOPPED',finished:'CHECKERED FLAG'};
 function put(id,html){const node=el(id);if(node&&node.innerHTML!==html)node.innerHTML=html;}
 function entry(race){const phase=p(race),badge={live:'● LIVE',soon:'STARTING SOON',waiting:'AWAITING FEED',concluded:'RACE CONCLUDED'}[phase]||'RACE HUB';
  return `<button type="button" class="live-entry cup-live-entry event-photo-tile" data-cup-live="${esc(race.raceId)}">${racePhotoMarkup(race)}${seriesLogoMarkup(SERIES)}<span><strong>Race Hub <b class="live-badge" data-phase="${phase}">${badge}</b></strong><small>${esc(race.event)} · ${esc(trackNameForRace(race))}</small></span><span aria-hidden="true">→</span></button>`;
 }
 function entries(){
  if(typeof allRaces==='undefined')return;
  const races=allRaces.filter(r=>r.series===SERIES),promoted=races.find(r=>p(r)==='live')||races.filter(r=>['soon','waiting'].includes(p(r))).sort((a,b)=>raceStartTime(a)-raceStartTime(b))[0];
  document.querySelectorAll('[data-cup-live-slot]').forEach(slot=>{
    const race=slot.dataset.cupLiveSlot==='event'?races.find(r=>String(r.raceId)===slot.dataset.raceId):promoted;
    const show=race&&(slot.dataset.cupLiveSlot!=='home'||!seriesSettings.hidden.includes(SERIES));
    const html=show?entry(race):'';if(slot.innerHTML!==html)slot.innerHTML=html;slot.hidden=!show;
  });
 }
 function shell(){
  el('nascar-live-view').innerHTML=`<button type="button" class="live-back" id="cup-live-back">← Back</button><section class="live-header event-photo-tile cup-live-hero" id="cup-live-heading" tabindex="-1"></section><p id="cup-live-connection" class="live-connection" role="status"></p><section id="cup-live-status" class="live-race-status"></section><nav class="live-tabs" id="cup-live-tabs" role="tablist" aria-label="Cup race hub">${['live','race','events','settings'].map(t=>`<button type="button" id="cup-tab-${t}" data-cup-tab="${t}" role="tab" aria-controls="cup-live-panel">${t==='race'?'Race info':t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</nav><section id="cup-live-panel" role="tabpanel"></section><p class="live-source">NASCAR timing feed · experimental race-day preview. Updates may be delayed or unavailable.</p>`;
  el('cup-live-back').onclick=()=>{const target=returnTo;open=false;setView(target?.view||'home-view');if(target){activeSeriesName=target.series;el('back-button').hidden=target.backHidden;target.focus?.focus?.({preventScroll:true});window.scrollTo({top:target.scroll,behavior:'instant'});}schedule();};
  el('cup-live-tabs').onclick=e=>{const button=e.target.closest('[data-cup-tab]');if(button){tab=button.dataset.cupTab;put('cup-live-panel','');render();}};
  el('cup-live-tabs').onkeydown=e=>{const keys=['live','race','events','settings'];let i=keys.indexOf(tab);if(e.key==='ArrowRight')i=(i+1)%4;else if(e.key==='ArrowLeft')i=(i+3)%4;else if(e.key==='Home')i=0;else if(e.key==='End')i=3;else return;e.preventDefault();tab=keys[i];put('cup-live-panel','');render();el('cup-tab-'+tab).focus();};
 }
 function render(){
  if(!open||!selected)return;
  const track=allTracks.find(t=>t.source==='nascar'&&String(t.trackId)===String(selected.trackId)),phase=p(selected),s=same()?state:null;
  put('cup-live-heading',`${trackPhotoMarkup(track)}<div>${seriesLogoMarkup(SERIES)}<p class="weekend-eyebrow">NASCAR CUP SERIES · RACE HUB</p><h1>${esc(selected.event)}</h1><p>${esc(track?.name||'Track information coming soon')}</p></div>${track?.mapUrl&&f1SafeImage(track.mapUrl)?`<img class="live-outline track-media-image" src="${esc(f1SafeImage(track.mapUrl))}" alt="Track map">`:''}`);
  const timing=s&&s.drivers.length&&['soon','waiting','live'].includes(phase);
  el('cup-live-status').hidden=!timing;el('cup-live-tabs').hidden=!timing;
  put('cup-live-connection',connection==='error'?'Feed unavailable · retrying automatically':timing?(phase==='live'?'Receiving race updates':'Updates delayed · showing last matching snapshot')+(s.updatedAt?`<span>Feed: ${esc(new Date(s.updatedAt).toLocaleString())}</span>`:''):'Race Hub');
  if(!timing){
    const title={before:'Come back when the race begins',soon:'Getting ready for the green flag',waiting:'Waiting for race timing',concluded:'Race concluded',past:'Scheduled race window has ended',unscheduled:'Start time to be confirmed'}[phase];
    const detail={before:'The hub opens for pre-race updates one hour before the scheduled start.',soon:'Live timing will appear here when this Cup race feed becomes available.',waiting:'The race may be delayed or the feed unavailable. Another event’s timing will not be shown.',concluded:'The matching timing feed reports a checkered flag. Published Cup results are still under development.',past:'Live timing is no longer promoted. Race completion has not been confirmed by the available feed.',unscheduled:'Check the event schedule for the latest start time.'}[phase];
    put('cup-live-panel',`<article class="live-lobby"><h2>${title}</h2><p>${detail}</p><p>Scheduled start · ${esc(formatDate(selected.date))} · ${esc(selected.time||'TBD')}</p><button type="button" class="live-back" data-cup-schedule>Event & weekend schedule →</button></article>`);return;
  }
  put('cup-live-status',`<div class="live-laps"><strong>LAP ${val(s.lap)} <span>/ ${val(s.total)}</span></strong><small>${val(s.remaining)} laps remaining</small></div><p class="cup-stage">Stage ${val(s.stage)}${s.stageEnd!==null?' · ends at lap '+val(s.stageEnd):''} · ${val(s.cautions)} cautions</p><div class="live-status-bar" data-status="${s.status}">${labels[s.status]}</div>`);
  ['live','race','events','settings'].forEach(t=>{el('cup-tab-'+t).setAttribute('aria-selected',String(t===tab));el('cup-tab-'+t).tabIndex=t===tab?0:-1;});el('cup-live-panel').setAttribute('aria-labelledby','cup-tab-'+tab);
  if(tab==='live'){
    const cols=Object.keys(columns).filter(k=>prefs[k]);
    if(!el('cup-timing-body'))put('cup-live-panel',`<p class="live-help">Choose extra timing columns in Settings.</p><div class="live-timing-scroll" tabindex="0" role="region" aria-label="Cup timing"><table class="live-timing"><thead><tr><th scope="col">POS</th><th scope="col">DRIVER</th>${cols.map(k=>`<th scope="col">${columns[k]}</th>`).join('')}</tr></thead><tbody id="cup-timing-body"></tbody></table></div><p class="live-help">Gap is the provider’s delta: seconds or laps down. Lap times are seconds; speed is mph. A dash means unavailable.</p>`);
    const body=el('cup-timing-body'),ids=new Set(s.drivers.map(d=>d.id));[...body.children].forEach(r=>{if(!ids.has(r.dataset.driver))r.remove();});
    s.drivers.forEach((d,i)=>{let row=[...body.children].find(r=>r.dataset.driver===d.id);if(!row){row=document.createElement('tr');row.dataset.driver=d.id;}
      const cells={gap:val(d.gap),last:d.last>0?d.last.toFixed(3):'—',best:d.best>0?d.best.toFixed(3):'—',laps:val(d.laps),speed:d.speed>0?d.speed.toFixed(1):'—',change:d.change===null||d.change===0?'—':`<span class="live-change ${d.change>0?'gain':'loss'}">${d.change>0?'↑':'↓'}${Math.abs(d.change)}</span>`};
      const html=`<td>${val(d.position)}</td><th scope="row" style="--driver-color:#f5c518"><span class="cup-car-number">${esc(d.number)}</span> ${esc(d.name)}${d.status===3?'<small>OUT</small>':d.status===2?'<small>BEHIND WALL</small>':''}</th>${cols.map(k=>`<td>${cells[k]}</td>`).join('')}`;
      if(row.innerHTML!==html)row.innerHTML=html;if(body.children[i]!==row)body.insertBefore(row,body.children[i]||null);
    });
  } else if(tab==='race')put('cup-live-panel',`<dl class="live-weather-grid">${[['Cautions',s.cautions],['Caution laps',s.cautionLaps],['Lead changes',s.leadChanges],['Stage',s.stage]].map(([name,v])=>`<div><dt>${name}</dt><dd>${val(v)}</dd></div>`).join('')}</dl><h2>Pit visits</h2><div class="live-timing-scroll"><table class="live-timing"><thead><tr><th>Driver</th><th>Visits</th><th>Last entry lap</th></tr></thead><tbody>${s.drivers.map(d=>`<tr><th scope="row">#${esc(d.number)} ${esc(d.name)}</th><td>${val(d.pits?.length)}</td><td>${val(d.pits?.at(-1)?.pit_in_leader_lap)}</td></tr>`).join('')}</tbody></table></div><p class="live-help">Pit visits reported by the feed; not confirmed tire changes or stationary stop duration.</p>`);
  else if(tab==='events')put('cup-live-panel',`<p class="live-help">Changes observed while connected. This is not a complete race-control log.</p>${events.length?`<ol class="live-events">${events.slice().reverse().map(e=>`<li><time>${esc(new Date(e.time).toLocaleTimeString())}</time><div><strong>${esc(e.message)}</strong><small>Lap ${val(e.lap)}</small></div></li>`).join('')}</ol>`:'<p class="live-empty">No changes observed yet.</p>'}`);
  else if(!el('cup-live-columns')){
    put('cup-live-panel',`<fieldset id="cup-live-columns"><legend>Timing columns</legend><p class="live-help">Extra columns may need a sideways scroll.</p>${Object.entries(columns).map(([k,v])=>`<label><span>${v}</span><input type="checkbox" data-cup-column="${k}" ${prefs[k]?'checked':''}></label>`).join('')}</fieldset><p class="live-help">Saved on this device. Refreshes approximately every 10 seconds while this hub is open.</p><button type="button" class="live-back" data-cup-retry>Refresh feed</button>`);
    el('cup-live-columns').onchange=e=>{const k=e.target.dataset.cupColumn;if(!(k in prefs))return;prefs[k]=e.target.checked;try{localStorage.setItem('cup-live-columns',JSON.stringify(prefs));}catch{}};
  }
 }
 async function poll(){
  if(busy||document.hidden)return;
  busy=true;controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),12000);
  try{const response=await fetch(URL,{cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error('HTTP '+response.status);const next=normalize(await response.json());
    if(!state||state.raceId!==next.raceId||state.runId!==next.runId||state.series!==next.series)events=[];
    else if(matches(selected,next)&&next.fresh&&state.fresh){if(state.status!==next.status)events.push({time:next.updatedAt,message:labels[next.status],lap:next.lap});if(next.cautions!==null&&state.cautions!==null&&next.cautions>state.cautions)events.push({time:next.updatedAt,message:'Caution count increased to '+next.cautions,lap:next.lap});events=events.slice(-100);}
    state=next;connection='connected';
  }catch(e){if(!document.hidden)connection='error';}finally{clearTimeout(timeout);controller=null;busy=false;render();entries();schedule();}
 }
 function schedule(){clearTimeout(timer);if(document.hidden)return;const active=open&&selected&&['soon','waiting','live'].includes(p(selected));timer=setTimeout(poll,active?10000:120000);}
 function show(race){
  returnTo={view:['home-view','series-view','event-view'].find(id=>el(id).style.display!=='none')||'home-view',series:activeSeriesName,scroll:scrollY,focus:document.activeElement,backHidden:el('back-button').hidden};
  if(!selected||String(selected.raceId)!==String(race.raceId))events=[];selected=race;open=true;tab='live';shell();setView('nascar-live-view');render();el('cup-live-heading').focus();poll();
 }
 const refresh=root.liveRefreshEntries,viewChanged=root.liveViewChanged;
 root.liveRefreshEntries=()=>{refresh?.();entries();};
 root.liveViewChanged=id=>{viewChanged?.(id);if(id!=='nascar-live-view'&&open){open=false;schedule();}};
 document.addEventListener('click',e=>{const entry=e.target.closest('[data-cup-live]');if(entry){const race=allRaces.find(r=>r.series===SERIES&&String(r.raceId)===entry.dataset.cupLive);if(race)show(race);}if(e.target.closest('[data-cup-schedule]')&&selected)renderRaceDetails(selected);if(e.target.closest('[data-cup-retry]'))poll();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(timer);controller?.abort();}else poll();});
 root.addEventListener('pagehide',()=>{clearTimeout(timer);controller?.abort();clearInterval(ticker);clearInterval(init);});
 const ticker=setInterval(()=>{if(!document.hidden){render();entries();}},5000);
 const init=setInterval(()=>{if(!dataReady)return;clearInterval(init);entries();poll();},250);
})(globalThis);
