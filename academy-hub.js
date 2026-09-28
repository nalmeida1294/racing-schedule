/* F1 Academy hub: official website data imported through Sheets; never fetches website keys in the app. */
const AcademyHub=(()=>{
  const series='F1 Academy',tabs={overview:'Overview',schedule:'Schedule',standings:'Standings',teams:'Teams & Drivers',results:'Results',tracks:'Tracks'};
  let data=null,loaded=0,pending=null,error='',selectedEvent='',selectedSession='',tab='overview';
  const legacyEvents=new Map();
  const esc=x=>escapeHtml(x??''),year=()=>String(new Date().getFullYear());
  const configured=()=>!!window.RC_ACADEMY_CONFIG?.feedUrl;
  const rows=kind=>(data?.[kind]||[]).filter(r=>kind==='Status'||String(r.Season)===year());
  const safe=url=>{try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}};
  const img=(url,cls='academy-logo')=>safe(url)?`<img class="${cls}" src="${esc(safe(url))}" alt="" onerror="this.hidden=true">`:'';
  function driverFlag(country){
    const codes={'argentina':'ar','brazil':'br','paraguay':'py','japan':'jp','united states of america':'us','united states':'us','usa':'us','mexico':'mx','bulgaria':'bg','sweden':'se','poland':'pl','italy':'it','germany':'de','colombia':'co','spain':'es','norway':'no','ireland':'ie','india':'in','thailand':'th','great britain':'gb','united kingdom':'gb','netherlands':'nl','france':'fr','australia':'au','new zealand':'nz','finland':'fi','denmark':'dk','belgium':'be','switzerland':'ch','austria':'at','canada':'ca','china':'cn','south korea':'kr','portugal':'pt','czech republic':'cz','czechia':'cz','estonia':'ee'};
    const code=/^[A-Z]{2}$/i.test(String(country||''))?String(country).toLowerCase():codes[String(country||'').trim().toLowerCase()];
    return code?img('https://flagcdn.com/w80/'+code+'.png','academy-driver-flag'):'';
  }
  const countryName=code=>{try{return new Intl.DisplayNames(['en'],{type:'region'}).of(code)||code;}catch{return code;}};
  const team=id=>rows('Teams').find(t=>String(t['Team ID'])===String(id));
  const teamName=t=>t?.['Display Name Override']||t?.Team||'';
  const color=t=>/^#[0-9a-f]{6}$/i.test(t?.['Color Override']||t?.Color||'')?(t['Color Override']||t.Color):'#9271bb';
  const driver=id=>rows('Drivers').find(d=>d['Driver ID']===id);
  const name=(id,fallback)=>driver(id)?.['Display Name Override']||driver(id)?.Driver||fallback||id;
  const protectedMode=()=>typeof Spoilers!=='undefined'&&Spoilers.protected(series);
  const identity=(id,fallback,teamId)=>{const d=driver(id),previous=rows('Results').filter(r=>r['Driver ID']===id).sort((a,b)=>String(b['Start UTC']).localeCompare(String(a['Start UTC'])))[0],t=team(teamId||d?.['Team ID']||previous?.['Team ID']);return `<span class="academy-identity" style="--academy-team:${color(t)}">${img(t?.['Logo URL Override']||t?.['Logo URL'])}<span><strong>${esc(name(id,fallback))}</strong><small>${esc(teamName(t))}</small></span></span>`;};
  async function load(){
    if(!configured())return;
    if(pending)return pending;if(data&&Date.now()-loaded<300000)return;
    pending=(async()=>{try{
      const raw=await fetchSheet(window.RC_ACADEMY_CONFIG.feedUrl),next={};
      for(const row of raw){if(!['Events','Drivers','Teams','Standings','Results','Status'].includes(row.Kind))continue;const value=JSON.parse(row.Data);if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid F1 Academy record');(next[row.Kind]??=[]).push(value);}
      if(!next.Events?.length||!next.Standings?.length)throw Error('F1 Academy feed is incomplete');
      data=next;loaded=Date.now();error='';
    }catch(e){error='F1 Academy update unavailable. '+(data?'Showing the last loaded data.':'Please try again shortly.');console.warn('F1 Academy feed unavailable',e.message);}finally{pending=null;}})();return pending;
  }
  const sessions=e=>{try{return JSON.parse(e['Sessions JSON']||'[]');}catch{return [];}};
  function eastern(iso){const d=new Date(iso);if(!Number.isFinite(d.getTime()))return {date:'',time:'TBD'};return {date:new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(d),time:d.toLocaleTimeString('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit'})};}
  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  function install(){
    if(!data)return;
    const formulaTracks=allTracks.filter(t=>t.source==='formula'),legacy=allRaces.filter(r=>r.series===series&&!r.academyEventId);
    const tracks=new Map(formulaTracks.map(t=>[String(t.trackId),{...t,source:'academy'}]));
    const incoming=[];const covered=[];const newSessions=[];
    for(const e of rows('Events')){
      const ss=sessions(e);
      const oldRace=legacy.find(r=>r.date>=e['Start Date']&&r.date<=e['End Date'])||legacyEvents.get(e['Event ID']);
      if(oldRace)legacyEvents.set(e['Event ID'],oldRace);
      const candidates=formulaTracks.filter(t=>[t.name,t.apiName,t.city].some(n=>n&&[e['Track Name'],e.City].some(v=>normalize(v)===normalize(n))));
      const shared=formulaTracks.find(t=>e['F1 Track ID']&&String(t.trackId)===String(e['F1 Track ID']))||(candidates.length===1?candidates[0]:null);
      const id='academy-'+(e['Track ID']||e['Event ID']);
      tracks.set(id,{...(shared||{}),trackId:id,source:'academy',name:shared?.name||e['Track Name'],city:shared?.city||e.City,state:shared?.state||e.Country,length:shared?.length||e['Track Length'],imageUrl:shared?.imageUrl||e['Track Image URL'],mapUrl:shared?.mapUrl||e['Track Map URL']});
      const races=ss.filter(s=>s.type==='Race');
      if(!races.length){
        // Even before session backfill, repair the old calendar's track link.
        const existing=legacy.filter(r=>r.date>=e['Start Date']&&r.date<=e['End Date']);
        if(existing.length){covered.push(e);incoming.push(...existing.map(r=>({...r,trackId:id})));}
        continue;
      }
      covered.push(e);
      for(const s of races){const when=eastern(s.start);incoming.push({series,raceId:'academy-'+e['Event ID']+'-'+s.id,academyEventId:e['Event ID'],academySession:s.name,round:String(e.Round),event:e.Event+' · '+s.name,trackId:id,date:when.date||s.date||e['End Date'],time:when.time,network:oldRace?.network||'',notes:''});}
      for(const race of incoming.filter(r=>r.academyEventId===e['Event ID']))for(const s of ss){const when=eastern(s.start);newSessions.push({raceId:race.raceId,trackId:id,series,session:s.name,type:s.type,date:when.date||s.date||e['Start Date'],time:when.time,notes:''});}
    }
    allRaces=allRaces.filter(r=>r.series!==series||(!r.academyEventId&&!covered.some(e=>r.date>=e['Start Date']&&r.date<=e['End Date']))).concat(incoming);
    allTracks=allTracks.filter(t=>t.source!=='academy').concat([...tracks.values()]);
    allSessions=allSessions.filter(s=>s.series!==series).concat(newSessions);
  }
  const featureRace=r=>!/reverse grid/i.test(r.academySession||r.event||'');
  const enabled=()=>!!data;
  function note(){const status=rows('Status')[0];return `${error?`<p class="f1-warning">${esc(error)}</p>`:''}${status?`<p class="f1-data-note">Updated ${esc(new Date(status['Updated UTC']).toLocaleString())}${status.State!=='OK'?' · Some source updates are pending':''}. Official F1 Academy published data.</p>`:''}`;}
  let standingsSort={key:'Points',direction:-1};
  function driverStats(id){
    const entries=[...new Map(rows('Results').filter(r=>r['Driver ID']===id).map(r=>[r['Session ID'],r])).values()];
    const races=entries.filter(r=>/race/i.test(r.Session));
    const feature=races.filter(r=>/feature/i.test(r.Session)&&Number(r.Position)===1).length;
    const reverse=races.filter(r=>/reverse grid/i.test(r.Session)&&Number(r.Position)===1).length;
    return {Wins:races.filter(r=>Number(r.Position)===1).length,'Feature Wins':feature,'Reverse Grid Wins':reverse,Poles:entries.filter(r=>/qualifying/i.test(r.Session)&&Number(r.Position)===1).length,Podiums:races.filter(r=>Number(r.Position)>=1&&Number(r.Position)<=3).length,DNFs:races.filter(r=>/^(DNF|RET|RETIRED)$/i.test(r.Status)).length};
  }
  function standings(category='Driver',limit){
    const base=rows('Standings').filter(r=>r.Category===category).sort((a,b)=>Number(a.Position)-Number(b.Position));
    const detailed=category==='Driver'&&!limit,keys=['Points','Wins','Feature Wins','Reverse Grid Wins','Poles','Podiums','DNFs'];
    const sorted=base.map(r=>({...r,...driverStats(r.ID)}));
    if(detailed)sorted.sort((a,b)=>(Number(a[standingsSort.key])-Number(b[standingsSort.key]))*standingsSort.direction||Number(a.Position)-Number(b.Position));
    return `<div class="f1-table-wrap"><table class="academy-table"><thead><tr><th>Pos</th><th>${category==='Driver'?'Driver':'Team'}</th>${(detailed?keys:['Points']).map(k=>`<th ${detailed?`aria-sort="${standingsSort.key===k?(standingsSort.direction===-1?'descending':'ascending'):'none'}"`:''}>${detailed?`<button data-academy-sort="${k}">${k}${standingsSort.key===k?(standingsSort.direction===-1?' ↓':' ↑'):''}</button>`:k}</th>`).join('')}<th>Behind</th></tr></thead><tbody>${sorted.slice(0,limit||sorted.length).map(r=>`<tr><td>${esc(r.Position)}</td><td>${category==='Driver'?identity(r.ID,r.Name):`${img(team(r.ID)?.['Logo URL Override']||team(r.ID)?.['Logo URL'])}${esc(teamName(team(r.ID))||r.Name)}`}</td>${(detailed?keys:['Points']).map(k=>`<td>${esc(r[k])}</td>`).join('')}<td>${Number(r.Position)===1?'—':'−'+(Number(base[0].Points)-Number(r.Points))}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function seasonDrivers(){
    const list=new Map(rows('Drivers').map(d=>[d['Driver ID'],d]));
    for(const r of resultRows())if(!list.has(r['Driver ID']))list.set(r['Driver ID'],{...r,Current:'FALSE'});
    return [...list.values()].sort((a,b)=>(b.Current==='TRUE')-(a.Current==='TRUE')||String(a.Driver).localeCompare(String(b.Driver)));
  }
  function resultRows(){return rows('Results').sort((a,b)=>String(b['Start UTC']).localeCompare(String(a['Start UTC']))||Number(a.Position)-Number(b.Position));}
  function overview(el){
    const next=racesFor(series).filter(featureRace).find(r=>r.date>localIsoDate()||(r.date===localIsoDate()&&raceStartTime(r)>=Date.now())),last=resultRows().find(r=>/Race/.test(r.Session));
    el.innerHTML=`${note()}${next?`<section class="f1-feature event-photo-tile" style="--event-accent:#9271bb">${racePhotoMarkup(next)}<p class="f1-kicker">Next Race</p><h2>${esc(next.event)}</h2><p>${esc(trackNameForRace(next))}</p><p>${formatDate(next.date)} · ${esc(next.time)}</p>${next.network?`<p>Network: ${esc(next.network)}</p>`:''}<button class="nascar-schedule-action" data-academy-next>Event & Weekend Schedule <span aria-hidden="true">→</span></button></section>`:'<section class="f1-feature"><h2>Season Schedule</h2><p>No upcoming race is currently scheduled.</p></section>'}${last?`<button class="f1-feature academy-overview-link" data-academy-latest><p class="f1-kicker">Latest Podium · ${esc(last.Session)}</p><h2>${esc(rows('Events').find(e=>e['Event ID']===last['Event ID'])?.Event||'Latest Race')}</h2>${resultRows().filter(r=>r['Session ID']===last['Session ID']&&Number(r.Position)>=1&&Number(r.Position)<=3).sort((a,b)=>Number(a.Position)-Number(b.Position)).map(r=>`<span class="academy-podium"><b>${esc(r.Position)}</b>${identity(r['Driver ID'],r.Driver,r['Team ID'])}</span>`).join('')}<span class="home-panel-cta">Full Results →</span></button>`:'<p>Race results are being imported.</p>'}<section class="f1-feature"><button class="academy-section-link" data-academy-standings><h2>Driver Championship</h2><span>Full Standings →</span></button>${standings('Driver',3)}</section><section class="f1-feature"><button class="academy-section-link" data-academy-team-standings><h2>Team Championship</h2><span>Full Standings →</span></button>${standings('Team',3)}</section>`;
    el.querySelector('[data-academy-next]')?.addEventListener('click',()=>showRaceDetails(next));
    el.querySelector('[data-academy-latest]')?.addEventListener('click',()=>openResults(last['Event ID'],last['Session ID']));
    el.querySelector('[data-academy-standings]').onclick=()=>render('standings');
    el.querySelector('[data-academy-team-standings]').onclick=async()=>{await render('standings');document.getElementById('academy-team-standings')?.scrollIntoView({block:'center'});};
  }
  function teams(el){el.innerHTML=`${note()}<h2>Teams & Drivers</h2><div class="academy-team-grid">${rows('Teams').filter(t=>seasonDrivers().some(d=>d['Team ID']===t['Team ID'])).map(t=>`<section class="f1-feature" style="border-top:3px solid ${color(t)}"><h3>${img(t['Logo URL Override']||t['Logo URL'])}${esc(teamName(t))}</h3><div class="academy-drivers">${seasonDrivers().filter(d=>d['Team ID']===t['Team ID']).map(d=>`<article>${img(d['Headshot URL Override']||d['Headshot URL'],'academy-portrait')}<small>#${esc(d.Number)}</small><h4>${esc(name(d['Driver ID'],d.Driver))}</h4>${d.Country||d['Country Code']?`<p class="academy-country">${driverFlag(d['Country Code']||d.Country)}${esc(d.Country||countryName(d['Country Code']))}</p>`:''}${d['Supported By']?`<p class="academy-support">Supported by ${esc(d['Supported By'])}</p>`:''}${d.Wildcard==='TRUE'?'<small class="academy-former">Wildcard Driver</small>':d.Current!=='TRUE'?'<small class="academy-former">Earlier This Season</small>':''}<p>${rows('Standings').find(r=>r.Category==='Driver'&&r.ID===d['Driver ID'])?'P'+esc(rows('Standings').find(r=>r.Category==='Driver'&&r.ID===d['Driver ID']).Position)+' in the Championship':'No Championship Classification Yet'}</p></article>`).join('')}</div></section>`).join('')}</div>`;}
  function results(el){
    const rs=resultRows(),ids=[...new Set(rs.map(r=>r['Event ID']))],events=rows('Events').filter(e=>ids.includes(e['Event ID'])).sort((a,b)=>Number(b.Round)-Number(a.Round));
    if(!events.length){el.innerHTML='<h2>Results</h2><p>No published results have been imported yet.</p>';return;}
    if(!ids.includes(selectedEvent))selectedEvent=events[0]['Event ID'];
    const choices=[...new Map(rs.filter(r=>r['Event ID']===selectedEvent).map(r=>[r['Session ID'],r])).values()];
    if(!choices.some(r=>r['Session ID']===selectedSession))selectedSession=choices[0]['Session ID'];
    const selected=rs.filter(r=>r['Session ID']===selectedSession).sort((a,b)=>(Number(a.Position)||999)-(Number(b.Position)||999));
    const race=!/qualifying/i.test(selected[0]?.Session||'');
    el.innerHTML=`${note()}<h2>Results</h2><div class="academy-result-filters"><label>Event<select id="academy-result-event">${events.map(e=>`<option value="${esc(e['Event ID'])}" ${e['Event ID']===selectedEvent?'selected':''}>Round ${esc(e.Round)} · ${esc(e.Event)} · ${esc(e['Track Name'])}</option>`).join('')}</select></label><label>Session<select id="academy-result-session">${choices.map(r=>`<option value="${esc(r['Session ID'])}" ${r['Session ID']===selectedSession?'selected':''}>${esc(r.Session)}</option>`).join('')}</select></label></div><h3>${esc(selected[0]?.Session)}</h3><div class="f1-table-wrap"><table class="academy-table"><thead><tr><th>Pos</th><th>Driver</th><th>Time / Gap</th><th>Laps</th>${race?'<th>Points</th>':''}<th>Status</th></tr></thead><tbody>${selected.map(r=>`<tr><td>${esc(r.Position||'—')}</td><td>${identity(r['Driver ID'],r.Driver,r['Team ID'])}</td><td>${esc(r.Time||'—')}</td><td>${esc(r.Laps||'—')}</td>${race?`<td>${esc(String(r.Points??'')||'—')}</td>`:''}<td>${esc(r.Status==='OK'?'Classified':r.Status||'—')}</td></tr>`).join('')}</tbody></table></div>`;
    el.querySelector('#academy-result-event').onchange=e=>{selectedEvent=e.target.value;selectedSession='';results(el);};el.querySelector('#academy-result-session').onchange=e=>{selectedSession=e.target.value;results(el);};
  }
  function tracks(el){const ids=new Set(racesFor(series).map(r=>r.trackId));const list=allTracks.filter(t=>t.source==='academy'&&ids.has(t.trackId));el.innerHTML=`<h2>Tracks</h2><div class="f1-track-grid">${list.map(t=>`<details class="f1-feature circuit-card"><summary class="event-photo-tile">${trackPhotoMarkup(t)}<span><strong>${esc(t.name)}</strong><span class="circuit-location">${esc([t.city,t.state].filter(Boolean).join(', '))}</span></span><span class="circuit-expand">+</span></summary><div class="circuit-body">${f1TrackFullPhotoMarkup(t)}<h3>${esc(t.name)}</h3>${trackFactsMarkup(t)}</div></details>`).join('')||'<p>Track details are being imported.</p>'}</div>`;}
  async function render(which='overview',prepared=false){
    if(!prepared)return withLoading(async()=>{await loadSeriesDetails(series);return render(which,true);},'Opening F1 Academy…');
    tab=which;activeSeriesName=series;document.getElementById('f1-hub').hidden=true;
    const hub=document.getElementById('series-hub');hub.innerHTML=`<div class="hub-sticky-navigation"><div class="series-hub-hero">${seriesLogoMarkup(series,true)}<p class="weekend-eyebrow">THE CHAMPIONSHIP HUB</p><h1>F1 Academy</h1></div><nav class="nascar-hub-tabs" style="--hub-accent:#9271bb" aria-label="F1 Academy sections">${Object.entries(tabs).map(([key,label])=>`<button type="button" data-academy-tab="${key}" aria-pressed="${key===which}">${label}</button>`).join('')}</nav></div><div id="academy-hub-content"></div>`;
    document.getElementById('series-calendar').hidden=true;const el=hub.querySelector('#academy-hub-content');
    if(which==='schedule')renderSeries(series,false,true);
    else if(protectedMode())el.innerHTML=Spoilers.note();
    else if(!data)el.innerHTML=`<section class="f1-feature"><h2>F1 Academy</h2><p>${configured()?esc(error||'Results are temporarily unavailable.'):'The F1 Academy data connection is being prepared. The schedule remains available.'}</p>${configured()?'<button class="nascar-schedule-action" data-academy-retry>Try Again</button>':''}</section>`;
    else if(which==='overview')overview(el);else if(which==='teams')teams(el);else if(which==='results')results(el);else if(which==='tracks')tracks(el);else el.innerHTML=`${note()}<h2>Driver Standings</h2><p class="f1-data-note">Stats cover imported race and qualifying results; totals update as historical sessions finish loading. Scroll sideways for all stats.</p>${standings()}<h2 id="academy-team-standings">Team Standings</h2>${standings('Team')}`;
    hub.querySelectorAll('[data-academy-sort]').forEach(b=>b.onclick=()=>{standingsSort={key:b.dataset.academySort,direction:standingsSort.key===b.dataset.academySort?-standingsSort.direction:-1};render('standings',true);});
    hub.hidden=false;setView('series-view');document.getElementById('back-button').hidden=true;
    hub.querySelectorAll('[data-academy-tab]').forEach(b=>b.onclick=()=>render(b.dataset.academyTab));
    hub.querySelector('[data-academy-retry]')?.addEventListener('click',()=>{loaded=0;render(which);});
    const active=hub.querySelector('[aria-pressed="true"]');active.parentElement.scrollLeft=Math.max(0,active.offsetLeft-active.parentElement.offsetLeft-(active.parentElement.clientWidth-active.offsetWidth)/2);
    if(which==='schedule')focusScheduleRace();
  }
  function openResults(event,session){selectedEvent=String(event);selectedSession=String(session||'');return render('results');}
  function home(card){
    if(!data||protectedMode())return;
    const leader=rows('Standings').find(r=>r.Category==='Driver'&&Number(r.Position)===1);
    const teamLeader=rows('Standings').find(r=>r.Category==='Team'&&Number(r.Position)===1);
    const d=leader&&driver(leader.ID),t=teamLeader&&team(teamLeader.ID);
    const el=document.createElement('div');el.className='academy-home-summary';
    el.innerHTML=[leader?`<div class="f1-home-leader" data-home-action="standings" role="link" tabindex="0"><p><span>Championship leader</span><strong>${esc(name(leader.ID,leader.Name))}</strong><small>${esc(leader.Points)} pts</small></p>${img(d?.['Headshot URL Override']||d?.['Headshot URL'],'f1-home-portrait')}</div>`:'',teamLeader?`<div class="f1-home-leader" data-academy-team-leader role="link" tabindex="0"><p><span>Teams’ championship leader</span><strong>${esc(teamName(t)||teamLeader.Name)}</strong><small>${esc(teamLeader.Points)} pts</small></p>${img(t?.['Logo URL Override']||t?.['Logo URL'],'f1-home-team-logo')}</div>`:''].join('');
    if(leader||teamLeader)card.appendChild(el);
    const openTeams=async e=>{if(e.type==='keydown'&&!['Enter',' '].includes(e.key))return;e.preventDefault();e.stopPropagation();await render('standings');document.getElementById('academy-team-standings')?.scrollIntoView({block:'center'});};
    el.querySelector('[data-academy-team-leader]')?.addEventListener('click',openTeams);
    el.querySelector('[data-academy-team-leader]')?.addEventListener('keydown',openTeams);
    const last=resultRows().find(r=>/Race/.test(r.Session)&&Number(r.Position)===1),race=last&&racesFor(series).find(r=>r.academyEventId===last['Event ID']&&r.academySession===last.Session);
    if(race)homePreviousPanel(card,race,`${identity(last['Driver ID'],last.Driver,last['Team ID'])}`,()=>openResults(last['Event ID'],last['Session ID']));
  }
  function eventLinks(race){if(protectedMode()||!data)return [];let event=race.academyEventId;if(!event)event=rows('Events').find(e=>race.date>=e['Start Date']&&race.date<=e['End Date'])?.['Event ID'];return [...new Map(resultRows().filter(r=>r['Event ID']===event).map(r=>[r['Session ID'],r])).values()].map(r=>({label:r.Session+' Results',session:r.Session,leader:(()=>{const winner=resultRows().find(w=>w['Session ID']===r['Session ID']&&Number(w.Position)===1);return winner?name(winner['Driver ID'],winner.Driver):'';})(),leaderLabel:/qualifying/i.test(r.Session)?'Pole sitter':'Winner',open:()=>openResults(r['Event ID'],r['Session ID'])}));}
  return {load,install,enabled,configured,render,home,eventLinks,featureRace};
})();
