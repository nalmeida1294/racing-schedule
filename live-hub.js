/* Shared live-race screen. Consumes LiveRaceState, not provider-specific fields. */
(function(){
 'use strict';
 if(window.RACE_LIVE_CONFIG?.enabled===false)return;
 const defaults={gap:true,interval:true,tyre:true,tyreAge:false,lastLap:false,bestLap:false,positionChange:false};
 let preferences={...defaults};try{const saved=JSON.parse(localStorage.getItem('race-live-columns')||'{}');for(const k in defaults)if(typeof saved[k]==='boolean')preferences[k]=saved[k];}catch{}
 let state=null,connection='idle',tab='live',returnScreen=null,open=false,discoveryTimer=null,selectedRace=null,lastPhase=null;
 const entryRaces=new Map();
 const client=new RaceLiveSignalR.Client((next,status)=>{state=next;connection=status;render();entries();if(status!=='connecting'&&!needsStream())client.stop();});
 const labels={unknown:'STATUS UNAVAILABLE',not_started:'AWAITING START',green:'GREEN FLAG',yellow:'YELLOW FLAG',vsc:'VIRTUAL SAFETY CAR',safety_car:'SAFETY CAR',red_flag:'RED FLAG',suspended:'SESSION SUSPENDED',finished:'SESSION FINISHED'};
 const columns={gap:['GAP','Gap to leader'],interval:['INT','Interval to car ahead'],tyre:['TYRE','Tyre compound'],tyreAge:['AGE','Tyre age'],lastLap:['LAST','Last lap'],bestLap:['BEST','Best lap'],positionChange:['+/−','Position change']};
 const el=id=>document.getElementById(id),esc=v=>escapeHtml(v??'');
 const stale=()=>!state?.updatedAt||Date.now()-Date.parse(state.updatedAt)>45000;
 const live=()=>state?.session?.isLive&&!stale()&&connection==='connected';
 const lap=n=>n===null||n===undefined?'—':Math.floor(n/60)+':'+(n%60).toFixed(3).padStart(6,'0');
 const value=n=>n===null||n===undefined||n===''?'—':esc(n);
 const gap=n=>typeof n==='number'?(n===0?'—':'+'+n.toFixed(3)):value(n);
 const track=()=>allTracks.find(t=>t.source==='formula'&&String(t.trackId)===String(selectedRace?.trackId||state?.session?.trackId));
 const raceKey=r=>String(r.raceId||[r.trackId,r.date,r.event].join('|'));
 const startOf=r=>r.startUtc?Date.parse(r.startUtc):raceStartTime(r);
 function resultsKey(race){
  if(!race)return '';
  const start=startOf(race),date=Number.isFinite(start)?new Date(start).toISOString().slice(0,10):race.date;
  // Date identifies the GP, independently of editable names and calendar round numbering.
  const keys=[...new Set(f1Rows('results').filter(r=>r['Race Date UTC']===date&&String(r.Season)===String(date).slice(0,4)).map(r=>r['Jolpica Race Key']).filter(Boolean))];
  return keys.length===1?keys[0]:'';
 }
 const phase=r=>RaceLiveLifecycle.phase({race:r,session:state?.session,start:startOf(r),fresh:live(),hasResults:!!resultsKey(r)});
 function feedRace(){const s=state?.session;if(!s||s.sessionName&&s.sessionName!=='Race')return null;return allRaces.find(r=>r.series==='Formula 1'&&RaceLiveLifecycle.matches(r,s))||{raceId:s.meetingId||s.id,trackId:s.trackId,series:'Formula 1',event:s.grandPrixName,date:s.startTime?.slice(0,10)||'',startUtc:s.startTime,time:''};}
 function put(id,html){const target=el(id);if(target&&target.innerHTML!==html)target.innerHTML=html;}
 function flag(code){const iso={ESP:'ES',ITA:'IT',GBR:'GB',AUS:'AU',AUT:'AT',BEL:'BE',NED:'NL',NLD:'NL',JPN:'JP',USA:'US',MEX:'MX',BRA:'BR',CAN:'CA',CHN:'CN',MON:'MC',MCO:'MC',AZE:'AZ',SGP:'SG',SIN:'SG',UAE:'AE',ARE:'AE',QAT:'QA',BHR:'BH',SAU:'SA'}[code];return iso?String.fromCodePoint(...[...iso].map(c=>127397+c.charCodeAt(0))):'';}
 function entry(race,p){
  const key=raceKey(race);entryRaces.set(key,race);
  const badge=p==='live'?'● LIVE':p==='soon'?'STARTING SOON':p==='waiting'?'AWAITING FEED':p==='concluded'?'RACE CONCLUDED':p==='past'?'RACE ENDED':'RACE HUB';
  return `<button class="live-entry" type="button" data-open-live="${esc(key)}">${seriesLogoMarkup('Formula 1')}<span><strong>Race Hub <b class="live-badge" data-phase="${p}">${badge}</b></strong><small>${esc(race.event)} · ${esc(trackNameForRace(race)||'Event centre')}</small></span><span aria-hidden="true">→</span></button>`;
 }
 function entries(){
  const active=live()?feedRace():null;
  const promoted=active||allRaces.filter(r=>r.series==='Formula 1'&&['soon','waiting'].includes(phase(r))).sort((a,b)=>startOf(a)-startOf(b))[0];
  document.querySelectorAll('[data-live-slot]').forEach(slot=>{
   const event=slot.dataset.liveSlot==='event';
   const race=event?allRaces.find(r=>r.series==='Formula 1'&&(slot.dataset.raceId?String(r.raceId)===slot.dataset.raceId:String(r.trackId)===slot.dataset.trackId&&r.date===slot.dataset.eventDate)):promoted;
   const show=!!race&&(slot.dataset.liveSlot!=='home'||!seriesSettings.hidden.includes('Formula 1'));
   const html=show?entry(race,phase(race)):'';if(slot.innerHTML!==html)slot.innerHTML=html;slot.hidden=!show;
  });
  document.querySelectorAll('[data-live-track]').forEach(card=>{
   const race=allRaces.find(r=>r.series==='Formula 1'&&String(r.trackId)===card.dataset.liveTrack&&r.date===card.dataset.liveDate),p=race?phase(race):'';
   const text=p==='live'?'● LIVE':p==='soon'?'STARTING SOON':'';
   let badge=card.querySelector('.live-badge');
   if(text&&!badge){card.querySelector('.weekend-event')?.insertAdjacentHTML('beforeend',' <b class="live-badge"></b>');badge=card.querySelector('.live-badge');}
   if(text&&badge){badge.textContent=text;badge.dataset.phase=p;}else if(badge)badge.remove();
  });
 }
 function shell(){
  el('live-view').innerHTML=`<button type="button" class="live-back" id="live-back">← Back</button><section class="live-header" id="live-heading" tabindex="-1"></section><p id="live-connection" class="live-connection" role="status"></p><section class="live-race-status" id="live-status"></section><nav class="live-tabs" role="tablist" aria-label="Race hub">${['live','weather','events','settings'].map(t=>`<button type="button" role="tab" id="live-tab-${t}" data-live-tab="${t}" aria-controls="live-panel" aria-selected="${t===tab}" tabindex="${t===tab?0:-1}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</nav><section id="live-panel" role="tabpanel" aria-labelledby="live-tab-${tab}"></section><p class="live-source">Unofficial timing feed · updates may be delayed or unavailable. Timing displayed as received.</p>`;
  el('live-back').onclick=()=>{open=false;const target=returnScreen;setView(target?.view||'home-view');if(target){activeSeriesName=target.series;el('back-button').hidden=target.backHidden;target.focus?.focus?.({preventScroll:true});window.scrollTo({top:target.scroll,behavior:'instant'});}scheduleDiscovery();};
  el('live-view').querySelectorAll('[data-live-tab]').forEach(button=>{
   button.onclick=()=>{tab=button.dataset.liveTab;render(true);};
   button.onkeydown=e=>{const keys=['live','weather','events','settings'];let i=keys.indexOf(tab);if(e.key==='ArrowRight')i=(i+1)%4;else if(e.key==='ArrowLeft')i=(i+3)%4;else if(e.key==='Home')i=0;else if(e.key==='End')i=3;else return;e.preventDefault();tab=keys[i];render(true);el('live-tab-'+tab).focus();};
  });
 }
 function render(reset=false){
  if(!open)return;
  const matches=!selectedRace||RaceLiveLifecycle.matches(selectedRace,state?.session);
  const s=matches?state?.session:null,t=track(),p=selectedRace?phase(selectedRace):null;
  if(p!==lastPhase){reset=true;lastPhase=p;}
  const outline=t?.mapUrl&&/^https:\/\//i.test(t.mapUrl)?`<img src="${esc(t.mapUrl)}" alt="Circuit outline" class="track-media-image live-outline">`:'';
  put('live-heading',`<div><p class="weekend-eyebrow">FORMULA 1 · RACE HUB</p><h1>${s?flag(s.countryCode)+' ':''}${esc(selectedRace?.event||s?.grandPrixName||'Race Hub')}</h1><p>${esc(t?.name||s?.circuitName||'Track information coming soon')}</p></div>${outline}`);
  const lobby=selectedRace&&(p==='before'||p==='unscheduled'||p==='concluded'||p==='past'||!matches||p==='soon'||s?.status==='not_started');
  el('live-status').hidden=!!lobby;
  el('live-view').querySelector('.live-tabs').hidden=!!lobby;
  if(lobby){
   put('live-connection',p==='concluded'?'Race concluded':p==='past'?'Scheduled race window has ended':p==='soon'?'Race Hub is ready · starting soon':p==='waiting'?'Awaiting this race’s timing feed':'Race Hub');
   const starts=startOf(selectedRace),time=Number.isFinite(starts)?esc(new Date(starts).toLocaleString([],{dateStyle:'medium',timeStyle:'short'})):'Start time to be confirmed';
   const title=p==='before'?'Come back when the race begins':p==='unscheduled'?'Waiting for a start time':p==='concluded'?'Race concluded':p==='past'?'Race window ended':p==='soon'?'Getting ready for lights out':'Waiting for race timing';
   const detail=p==='before'?'This hub opens for pre-race updates one hour before the scheduled start.':p==='soon'?'You’re in the right place. Timing will appear automatically when this Grand Prix feed becomes available.':p==='concluded'?'Open the published Grand Prix results below.':p==='past'?'Live timing is no longer promoted for this event. Its completion has not been confirmed by the available feed.':p==='unscheduled'?'The event remains accessible here. Live promotion starts once a reliable start time is available.':'The scheduled start has arrived. The race may be delayed or the feed unavailable. This page will update automatically; another event’s timing will not be shown.';
   const done=p==='concluded'||p==='past',key=resultsKey(selectedRace);
   put('live-panel',`<article class="live-lobby"><p class="weekend-eyebrow">${done?'AFTER THE CHEQUERED FLAG':'THE RACE WEEKEND'}</p><h2>${title}</h2><p>${detail}</p>${!done?`<p class="live-start">Scheduled start · ${time}</p>`:''}${key?'<button class="live-back" type="button" data-live-results>View race results →</button>':done?'<p class="live-help">Results are not published in the app yet.</p><button class="live-back" type="button" data-live-refresh-results>Check for results</button>':''}</article>`);
   return;
  }
  const finished=s?.status==='finished';
  put('live-connection',`${finished?'Completed session · '+esc(s.grandPrixName):connection==='connecting'?'Connecting to timing…':connection!=='connected'?'Connection unavailable · retrying':stale()?'Updates delayed · showing last received data':live()?'Receiving race updates':'No live race confirmed'}${state?.updatedAt?' <span>Feed: '+esc(new Date(state.updatedAt).toLocaleString())+'</span>':''}`);
  const remaining=s?.currentLap!==null&&s?.totalLaps!==null&&s?Math.max(0,s.totalLaps-s.currentLap):null;
  put('live-status',`<div class="live-laps"><strong>LAP ${value(s?.currentLap)} <span>/ ${value(s?.totalLaps)}</span></strong><small>${remaining===null?'Lap count unavailable':remaining+' laps remaining'}</small></div><div class="live-status-bar" data-status="${esc(s?.status||'unknown')}">${labels[s?.status]||labels.unknown}</div>`);
  for(const key of ['live','weather','events','settings']){const button=el('live-tab-'+key);button.setAttribute('aria-selected',String(key===tab));button.tabIndex=key===tab?0:-1;}
  el('live-panel').setAttribute('aria-labelledby','live-tab-'+tab);
  if(reset)el('live-panel').innerHTML='';
  if(tab==='live')timing();
  if(tab==='weather')weather();
  if(tab==='events')events();
  if(tab==='settings')settings();
 }
 function timing(){
  const selected=Object.keys(columns).filter(k=>preferences[k]);
  if(!el('live-timing-body'))put('live-panel',`<p class="live-help">Choose extra timing columns in Settings.</p><div class="live-timing-scroll" tabindex="0" role="region" aria-label="Timing table; scroll horizontally if extra columns are enabled"><table class="live-timing"><thead><tr><th scope="col">POS</th><th scope="col">DRIVER</th>${selected.map(k=>`<th scope="col" title="${columns[k][1]}">${columns[k][0]}</th>`).join('')}</tr></thead><tbody id="live-timing-body"></tbody></table></div><p id="live-timing-note" class="live-help"></p><div id="live-fastest"></div>`);
  const body=el('live-timing-body'),drivers=state?.drivers||[],ids=new Set(drivers.map(d=>d.id));
  for(const row of [...body.children])if(!ids.has(row.dataset.driver))row.remove();
  drivers.forEach((d,i)=>{
   let row=[...body.children].find(r=>r.dataset.driver===d.id);
   if(!row){row=document.createElement('tr');row.dataset.driver=d.id;}
   const color=/^#[0-9a-f]{6}$/i.test(d.color||'')?d.color:'#9aa3ae';
   const compound=['SOFT','MEDIUM','HARD','INTERMEDIATE','WET'].includes(d.tyre)?d.tyre:'';
   const cells={gap:gap(d.gap),interval:gap(d.interval),tyre:compound?`<span class="live-tyre" data-compound="${compound}" title="${compound}" aria-label="${compound}">${compound[0]}</span>`:'—',tyreAge:value(d.tyreAge),lastLap:lap(d.lastLap),bestLap:lap(d.bestLap),positionChange:d.positionChange===null||d.positionChange===0?'—':`<span class="live-change ${d.positionChange>0?'gain':'loss'}">${d.positionChange>0?'↑':'↓'}${Math.abs(d.positionChange)}</span>`};
   const html=`<td>${value(d.position)}</td><th scope="row" style="--driver-color:${color}" title="${esc(d.name+' · '+d.team)}">${esc(d.abbreviation)}${d.retired?'<small>OUT</small>':d.inPit?'<small>PIT</small>':''}</th>${selected.map(k=>`<td>${cells[k]}</td>`).join('')}`;
   if(row.innerHTML!==html)row.innerHTML=html;
   if(body.children[i]!==row)body.insertBefore(row,body.children[i]||null);
  });
  put('live-timing-note',!drivers.length?'Timing data is not available yet.':state?.feeds?.TimingData?.error?'Timing unavailable from provider; driver roster shown.':'Gaps are seconds or laps as supplied. A dash means unavailable.');
  const f=state?.fastestLap;put('live-fastest',f?`<article class="live-fastest"><div><p>FASTEST LAP</p><strong>${esc(f.name)}</strong><small>${f.lap?'Lap '+f.lap:''}</small></div><strong>${lap(f.seconds)}</strong></article>`:'');
 }
 function weather(){const w=state?.weather;put('live-panel',w?`<article class="live-weather-title"><h2>${w.rain===true?'Rain reported':w.rain===false?'No rainfall reported':'Rain status unavailable'}</h2><p>${state.session.status==='finished'?'Last reported session weather':'Circuit weather readings'}</p></article><dl class="live-weather-grid">${[['Air temperature',w.air,'°C'],['Track temperature',w.track,'°C'],['Humidity',w.humidity,'%'],['Wind speed',w.windKmh,' km/h'],['Wind direction',w.windDirection,'°']].map(([label,n,unit])=>`<div><dt>${label}</dt><dd>${n===null?'—':esc(Number(n.toFixed(1))+unit)}</dd></div>`).join('')}</dl><p class="live-help">Rainfall indicates rain at the reporting sensor. It does not confirm a wet track or provide a rain forecast.</p>`:'<p class="live-empty">Weather is unavailable. Other race hub features remain available.</p>');}
 function events(){put('live-panel',state?.events?.length?`<ol class="live-events">${state.events.slice(0,200).map(e=>`<li data-tone="${['yellow','red','green','purple'].includes(e.tone)?e.tone:'neutral'}"><time>${Number.isFinite(Date.parse(e.timestamp))?esc(new Date(e.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})):'—'}</time><div><strong>${esc(e.type)}</strong><p>${esc(e.message)}</p><small>${e.lap!==null?'Lap '+esc(e.lap):''}${e.driver?' · Car '+esc(e.driver):''}</small></div></li>`).join('')}</ol><p class="live-help">Latest 200 messages · times shown in your timezone.</p>`:'<p class="live-empty">No race-control messages available.</p>');}
 function settings(){
  if(el('live-columns'))return;
  put('live-panel',`<fieldset id="live-columns"><legend>Timing columns</legend><p class="live-help">A compact view fits your phone. Extra columns may need a sideways scroll.</p>${Object.entries(columns).map(([k,v])=>`<label><span>${v[1]}</span><input type="checkbox" data-live-column="${k}" ${preferences[k]?'checked':''}></label>`).join('')}</fieldset><p id="live-save-note" class="live-help">Saved on this device.</p><button class="live-back" id="live-reconnect" type="button">Reconnect to feed</button>`);
  el('live-columns').onchange=e=>{const key=e.target.dataset.liveColumn;if(!(key in preferences))return;preferences[key]=e.target.checked;try{localStorage.setItem('race-live-columns',JSON.stringify(preferences));}catch{put('live-save-note','Preferences apply for this visit; device storage is unavailable.');}};
  el('live-reconnect').onclick=()=>{client.stop();client.start();};
 }
 function show(race=null){
  returnScreen={view:['home-view','series-view','event-view'].find(id=>el(id).style.display!=='none')||'home-view',series:activeSeriesName,scroll:window.scrollY,focus:document.activeElement,backHidden:el('back-button').hidden};
  selectedRace=race;lastPhase=null;open=true;tab='live';shell();setView('live-view');render();el('live-heading').focus();client.start();
  if(race)loadF1Feed('results').then(()=>{if(open){render();entries();}});
 }
 function needsStream(){return open?(!selectedRace||['soon','waiting','live'].includes(phase(selectedRace))):live();}
 function scheduleDiscovery(){
  clearTimeout(discoveryTimer);
  if(document.hidden){client.stop();return;}
  if(needsStream())client.start();
  else {client.stop();discoveryTimer=setTimeout(()=>{client.start();scheduleNext();},120000);}
 }
 function scheduleNext(){clearTimeout(discoveryTimer);discoveryTimer=setTimeout(()=>{if(!document.hidden){client.start();scheduleNext();}},120000);}
 window.liveRefreshEntries=entries;
 window.liveViewChanged=id=>{if(id!=='live-view'&&open){open=false;scheduleDiscovery();}};
 document.addEventListener('click',e=>{
  const button=e.target.closest('[data-open-live]');if(button){show(entryRaces.get(button.dataset.openLive)||null);return;}
  if(e.target.closest('[data-live-results]')){
   const key=resultsKey(selectedRace);if(!key)return;
   f1SelectedRace=key;f1ResultSession='results';renderF1Hub('results');
  }
  if(e.target.closest('[data-live-refresh-results]')){
   const button=e.target.closest('button');button.disabled=true;button.textContent='Checking…';
   loadF1Feed('results',true).finally(()=>{if(open)render();entries();});
  }
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)client.stop();else{client.start();scheduleNext();}});
 // No continuous connection in a background tab. Discovery snapshots are infrequent.
 const ticker=setInterval(()=>{if(document.hidden)return;render();entries();if(needsStream())client.start();},5000);
 window.addEventListener('pagehide',()=>{client.stop();clearTimeout(discoveryTimer);clearInterval(ticker);});
 const init=setInterval(()=>{if(!dataReady)return;clearInterval(init);client.start();scheduleNext();if(['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).get('live-preview')==='1')show();},250);
})();
