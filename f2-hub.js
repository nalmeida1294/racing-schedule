/* F2 hub: official website data imported through Sheets; never fetches website keys in the app. */
const F2Hub=(()=>{
  const series='Formula 2',tabs={overview:'Overview',schedule:'Schedule',standings:'Standings',teams:'Teams & Drivers',results:'Results',tracks:'Tracks'};
  let data=null,loaded=0,pending=null,error='',selectedEvent='',selectedSession='',tab='overview';
  const legacyEvents=new Map();
  const esc=x=>escapeHtml(x??''),year=()=>String(new Date().getFullYear());
  const configured=()=>!!window.RC_F2_CONFIG?.feedUrl;
  const rows=kind=>(data?.[kind]||[]).filter(r=>kind==='Status'||String(r.Season)===year());
  const safe=url=>{try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}};
  const img=(url,cls='f2-logo')=>safe(url)?`<img class="${cls}" src="${esc(safe(url))}" alt="" onerror="this.hidden=true">`:'';
  const team=id=>rows('Teams').find(t=>String(t['Team ID'])===String(id));
  const teamName=t=>t?.['Display Name Override']||t?.Team||'';
  const color=t=>/^#[0-9a-f]{6}$/i.test(t?.['Color Override']||t?.Color||'')?(t['Color Override']||t.Color):'#438cbd';
  const driver=id=>rows('Drivers').find(d=>d['Driver ID']===id);
  const name=(id,fallback)=>driver(id)?.['Display Name Override']||driver(id)?.Driver||fallback||id;
  const protectedMode=()=>typeof Spoilers!=='undefined'&&Spoilers.protected(series);
  const identity=(id,fallback,teamId)=>{const d=driver(id),previous=rows('Results').filter(r=>r['Driver ID']===id).sort((a,b)=>String(b['Start UTC']).localeCompare(String(a['Start UTC'])))[0],t=team(teamId||d?.['Team ID']||previous?.['Team ID']);return `<span class="f2-identity" style="--f2-team:${color(t)}">${img(t?.['Logo URL Override']||t?.['Logo URL'])}<span><strong>${esc(name(id,fallback))}</strong><small>${esc(teamName(t))}</small></span></span>`;};
  async function load(){
    if(!configured())return;
    if(pending)return pending;if(data&&Date.now()-loaded<300000)return;
    pending=(async()=>{try{
      const raw=await fetchSheet(window.RC_F2_CONFIG.feedUrl),next={};
      for(const row of raw){if(!['Events','Drivers','Teams','Standings','Results','Status'].includes(row.Kind))continue;const value=JSON.parse(row.Data);if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid F2 record');(next[row.Kind]??=[]).push(value);}
      if(!next.Events?.length||!next.Standings?.length)throw Error('F2 feed is incomplete');
      data=next;loaded=Date.now();error='';
    }catch(e){error='F2 update unavailable. '+(data?'Showing the last loaded data.':'Please try again shortly.');console.warn('F2 feed unavailable',e.message);}finally{pending=null;}})();return pending;
  }
  const sessions=e=>{try{return JSON.parse(e['Sessions JSON']||'[]');}catch{return [];}};
  function eastern(iso){const d=new Date(iso);if(!Number.isFinite(d.getTime()))return {date:'',time:'TBD'};return {date:new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(d),time:d.toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'})};}
  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  function install(){
    if(!data)return;
    const formulaTracks=allTracks.filter(t=>t.source==='formula'),legacy=allRaces.filter(r=>r.series===series&&!r.f2EventId);
    const tracks=new Map(formulaTracks.map(t=>[String(t.trackId),{...t,source:'f2'}]));
    const incoming=[];const covered=[];const newSessions=[];
    for(const e of rows('Events')){
      const ss=sessions(e);if(!ss.length)continue;
      const oldRace=legacy.find(r=>r.date>=e['Start Date']&&r.date<=e['End Date'])||legacyEvents.get(e['Event ID']);
      if(oldRace)legacyEvents.set(e['Event ID'],oldRace);
      const candidates=formulaTracks.filter(t=>[t.name,t.apiName,t.city].some(n=>n&&[e['Track Name'],e.City].some(v=>normalize(v)===normalize(n))));
      const shared=formulaTracks.find(t=>e['F1 Track ID']&&String(t.trackId)===String(e['F1 Track ID']))||formulaTracks.find(t=>oldRace&&String(t.trackId)===String(oldRace.trackId))||(candidates.length===1?candidates[0]:null);
      const id='f2-'+(e['Track ID']||e['Event ID']);
      tracks.set(id,{...(shared||{}),trackId:id,source:'f2',name:shared?.name||e['Track Name'],city:shared?.city||e.City,state:shared?.state||e.Country,length:shared?.length||e['Track Length'],imageUrl:shared?.imageUrl||e['Track Image URL'],mapUrl:shared?.mapUrl||e['Track Map URL']});
      const races=ss.filter(s=>s.type==='Race');
      if(!races.length)continue;
      covered.push(e);
      for(const s of races){const when=eastern(s.start);incoming.push({series,raceId:'f2-'+e['Event ID']+'-'+s.id,f2EventId:e['Event ID'],f2Session:s.name,round:String(e.Round),event:e.Event+' · '+s.name,trackId:id,date:when.date||e['End Date'],time:when.time,network:oldRace?.network||'',notes:''});}
      for(const race of incoming.filter(r=>r.f2EventId===e['Event ID']))for(const s of ss){const when=eastern(s.start);newSessions.push({raceId:race.raceId,trackId:id,series,session:s.name,type:s.type,date:when.date,time:when.time,notes:''});}
    }
    allRaces=allRaces.filter(r=>r.series!==series||(!r.f2EventId&&!covered.some(e=>r.date>=e['Start Date']&&r.date<=e['End Date']))).concat(incoming);
    allTracks=allTracks.filter(t=>t.source!=='f2').concat([...tracks.values()]);
    allSessions=allSessions.filter(s=>s.series!==series).concat(newSessions);
  }
  const enabled=()=>!!data;
  function note(){const status=rows('Status')[0];return `${error?`<p class="f1-warning">${esc(error)}</p>`:''}${status?`<p class="f1-data-note">Updated ${esc(new Date(status['Updated UTC']).toLocaleString())}${status.State!=='OK'?' · Some source updates are pending':''}. Official F2 published data.</p>`:''}`;}
  function standings(category='Driver',limit){const sorted=rows('Standings').filter(r=>r.Category===category).sort((a,b)=>Number(a.Position)-Number(b.Position));return `<div class="f1-table-wrap"><table class="f2-table"><thead><tr><th>Pos</th><th>${category==='Driver'?'Driver':'Team'}</th><th>Points</th><th>Behind</th></tr></thead><tbody>${sorted.slice(0,limit||sorted.length).map(r=>`<tr><td>${esc(r.Position)}</td><td>${category==='Driver'?identity(r.ID,r.Name):`${img(team(r.ID)?.['Logo URL Override']||team(r.ID)?.['Logo URL'])}${esc(teamName(team(r.ID))||r.Name)}`}</td><td>${esc(r.Points)}</td><td>${Number(r.Position)===1?'—':'−'+(Number(sorted[0].Points)-Number(r.Points))}</td></tr>`).join('')}</tbody></table></div>`;}
  function resultRows(){return rows('Results').sort((a,b)=>String(b['Start UTC']).localeCompare(String(a['Start UTC']))||Number(a.Position)-Number(b.Position));}
  function overview(el){
    const next=racesFor(series).find(r=>raceStartTime(r)>=Date.now()),last=resultRows().find(r=>/Race/.test(r.Session));
    el.innerHTML=`${note()}${next?`<section class="f1-feature event-photo-tile" style="--event-accent:#438cbd">${racePhotoMarkup(next)}<p class="f1-kicker">Next Race</p><h2>${esc(next.event)}</h2><p>${esc(trackNameForRace(next))}</p><p>${formatDate(next.date)} · ${esc(next.time)}</p>${next.network?`<p>Network: ${esc(next.network)}</p>`:''}<button class="nascar-schedule-action" data-f2-next>Event & Weekend Schedule <span aria-hidden="true">→</span></button></section>`:'<section class="f1-feature"><h2>Season Schedule</h2><p>No upcoming race is currently scheduled.</p></section>'}${last?`<button class="f1-feature f2-overview-link" data-f2-latest><p class="f1-kicker">Latest Podium · ${esc(last.Session)}</p><h2>${esc(rows('Events').find(e=>e['Event ID']===last['Event ID'])?.Event||'Latest Race')}</h2>${resultRows().filter(r=>r['Session ID']===last['Session ID']&&Number(r.Position)>=1&&Number(r.Position)<=3).sort((a,b)=>Number(a.Position)-Number(b.Position)).map(r=>`<span class="f2-podium"><b>${esc(r.Position)}</b>${identity(r['Driver ID'],r.Driver,r['Team ID'])}</span>`).join('')}<span class="home-panel-cta">Full Results →</span></button>`:'<p>Race results are being imported.</p>'}<section class="f1-feature"><button class="f2-section-link" data-f2-standings><h2>Driver Championship</h2><span>Full Standings →</span></button>${standings('Driver',3)}</section><section class="f1-feature"><button class="f2-section-link" data-f2-team-standings><h2>Team Championship</h2><span>Full Standings →</span></button>${standings('Team',3)}</section>`;
    el.querySelector('[data-f2-next]')?.addEventListener('click',()=>showRaceDetails(next));
    el.querySelector('[data-f2-latest]')?.addEventListener('click',()=>openResults(last['Event ID'],last['Session ID']));
    el.querySelector('[data-f2-standings]').onclick=()=>render('standings');
    el.querySelector('[data-f2-team-standings]').onclick=async()=>{await render('standings');document.getElementById('f2-team-standings')?.scrollIntoView({block:'center'});};
  }
  function teams(el){el.innerHTML=`${note()}<h2>Teams & Drivers</h2><div class="f2-team-grid">${rows('Teams').filter(t=>rows('Drivers').some(d=>d.Current==='TRUE'&&d['Team ID']===t['Team ID'])).map(t=>`<section class="f1-feature" style="border-top:3px solid ${color(t)}"><h3>${img(t['Logo URL Override']||t['Logo URL'])}${esc(teamName(t))}</h3><div class="f2-drivers">${rows('Drivers').filter(d=>d.Current==='TRUE'&&d['Team ID']===t['Team ID']).map(d=>`<article>${img(d['Headshot URL Override']||d['Headshot URL'],'f2-portrait')}<small>#${esc(d.Number)}</small><h4>${esc(name(d['Driver ID'],d.Driver))}</h4><p>${rows('Standings').find(r=>r.Category==='Driver'&&r.ID===d['Driver ID'])?'P'+esc(rows('Standings').find(r=>r.Category==='Driver'&&r.ID===d['Driver ID']).Position)+' in the Championship':'No Championship Classification Yet'}</p></article>`).join('')}</div></section>`).join('')}</div>`;}
  function results(el){
    const rs=resultRows(),ids=[...new Set(rs.map(r=>r['Event ID']))],events=rows('Events').filter(e=>ids.includes(e['Event ID'])).sort((a,b)=>Number(b.Round)-Number(a.Round));
    if(!events.length){el.innerHTML='<h2>Results</h2><p>No published results have been imported yet.</p>';return;}
    if(!ids.includes(selectedEvent))selectedEvent=events[0]['Event ID'];
    const choices=[...new Map(rs.filter(r=>r['Event ID']===selectedEvent).map(r=>[r['Session ID'],r])).values()];
    if(!choices.some(r=>r['Session ID']===selectedSession))selectedSession=choices[0]['Session ID'];
    const selected=rs.filter(r=>r['Session ID']===selectedSession).sort((a,b)=>(Number(a.Position)||999)-(Number(b.Position)||999));
    const race=selected[0]?.Session!=='Qualifying';
    el.innerHTML=`${note()}<h2>Results</h2><div class="f2-result-filters"><label>Event<select id="f2-result-event">${events.map(e=>`<option value="${esc(e['Event ID'])}" ${e['Event ID']===selectedEvent?'selected':''}>Round ${esc(e.Round)} · ${esc(e.Event)} · ${esc(e['Track Name'])}</option>`).join('')}</select></label><label>Session<select id="f2-result-session">${choices.map(r=>`<option value="${esc(r['Session ID'])}" ${r['Session ID']===selectedSession?'selected':''}>${esc(r.Session)}</option>`).join('')}</select></label></div><h3>${esc(selected[0]?.Session)}</h3><div class="f1-table-wrap"><table class="f2-table"><thead><tr><th>Pos</th><th>Driver</th><th>Time / Gap</th><th>Laps</th>${race?'<th>Points</th>':''}<th>Status</th></tr></thead><tbody>${selected.map(r=>`<tr><td>${esc(r.Position||'—')}</td><td>${identity(r['Driver ID'],r.Driver,r['Team ID'])}</td><td>${esc(r.Time||'—')}</td><td>${esc(r.Laps||'—')}</td>${race?`<td>${esc(String(r.Points??'')||'—')}</td>`:''}<td>${esc(r.Status==='OK'?'Classified':r.Status||'—')}</td></tr>`).join('')}</tbody></table></div>`;
    el.querySelector('#f2-result-event').onchange=e=>{selectedEvent=e.target.value;selectedSession='';results(el);};el.querySelector('#f2-result-session').onchange=e=>{selectedSession=e.target.value;results(el);};
  }
  function tracks(el){const ids=new Set(racesFor(series).map(r=>r.trackId));const list=allTracks.filter(t=>t.source==='f2'&&ids.has(t.trackId));el.innerHTML=`<h2>Tracks</h2><div class="f1-track-grid">${list.map(t=>`<details class="f1-feature circuit-card"><summary class="event-photo-tile">${trackPhotoMarkup(t)}<span><strong>${esc(t.name)}</strong><span class="circuit-location">${esc([t.city,t.state].filter(Boolean).join(', '))}</span></span><span class="circuit-expand">+</span></summary><div class="circuit-body">${f1TrackFullPhotoMarkup(t)}<h3>${esc(t.name)}</h3>${trackFactsMarkup(t)}</div></details>`).join('')||'<p>Track details are being imported.</p>'}</div>`;}
  async function render(which='overview',prepared=false){
    if(!prepared)return withLoading(async()=>{await loadSeriesDetails(series);return render(which,true);},'Opening Formula 2…');
    tab=which;activeSeriesName=series;document.getElementById('f1-hub').hidden=true;
    const hub=document.getElementById('series-hub');hub.innerHTML=`<div class="hub-sticky-navigation"><div class="series-hub-hero">${seriesLogoMarkup(series,true)}<p class="weekend-eyebrow">THE CHAMPIONSHIP HUB</p><h1>Formula 2</h1></div><nav class="nascar-hub-tabs" style="--hub-accent:#438cbd" aria-label="Formula 2 sections">${Object.entries(tabs).map(([key,label])=>`<button type="button" data-f2-tab="${key}" aria-pressed="${key===which}">${label}</button>`).join('')}</nav></div><div id="f2-hub-content"></div>`;
    document.getElementById('series-calendar').hidden=true;const el=hub.querySelector('#f2-hub-content');
    if(which==='schedule')renderSeries(series,false,true);
    else if(protectedMode())el.innerHTML=Spoilers.note();
    else if(!data)el.innerHTML=`<section class="f1-feature"><h2>Formula 2</h2><p>${configured()?esc(error||'Results are temporarily unavailable.'):'The Formula 2 data connection is being prepared. The schedule remains available.'}</p>${configured()?'<button class="nascar-schedule-action" data-f2-retry>Try Again</button>':''}</section>`;
    else if(which==='overview')overview(el);else if(which==='teams')teams(el);else if(which==='results')results(el);else if(which==='tracks')tracks(el);else el.innerHTML=`${note()}<h2>Driver Standings</h2>${standings()}<h2 id="f2-team-standings">Team Standings</h2>${standings('Team')}`;
    hub.hidden=false;setView('series-view');document.getElementById('back-button').hidden=true;
    hub.querySelectorAll('[data-f2-tab]').forEach(b=>b.onclick=()=>render(b.dataset.f2Tab));
    hub.querySelector('[data-f2-retry]')?.addEventListener('click',()=>{loaded=0;render(which);});
    const active=hub.querySelector('[aria-pressed="true"]');active.parentElement.scrollLeft=Math.max(0,active.offsetLeft-active.parentElement.offsetLeft-(active.parentElement.clientWidth-active.offsetWidth)/2);
    if(which==='schedule')focusScheduleRace();
  }
  function openResults(event,session){selectedEvent=String(event);selectedSession=String(session||'');return render('results');}
  function home(card){if(!data||protectedMode())return;const leader=rows('Standings').find(r=>r.Category==='Driver'&&Number(r.Position)===1);if(leader){const el=document.createElement('div');el.className='f1-home-summary';el.innerHTML=`<button class="f2-home-leader" data-home-action="standings"><small>CHAMPIONSHIP LEADER</small>${identity(leader.ID,leader.Name)}<span>${esc(leader.Points)} pts</span></button>`;card.appendChild(el);}const last=resultRows().find(r=>/Race/.test(r.Session)&&Number(r.Position)===1),race=last&&racesFor(series).find(r=>r.f2EventId===last['Event ID']&&r.f2Session===last.Session);if(race)homePreviousPanel(card,race,`${identity(last['Driver ID'],last.Driver,last['Team ID'])}`,()=>openResults(last['Event ID'],last['Session ID']));}
  function eventLinks(race){if(protectedMode()||!data)return [];let event=race.f2EventId;if(!event)event=rows('Events').find(e=>race.date>=e['Start Date']&&race.date<=e['End Date'])?.['Event ID'];return [...new Map(resultRows().filter(r=>r['Event ID']===event).map(r=>[r['Session ID'],r])).values()].map(r=>({label:r.Session+' Results',open:()=>openResults(r['Event ID'],r['Session ID'])}));}
  return {load,install,enabled,configured,render,home,eventLinks};
})();
