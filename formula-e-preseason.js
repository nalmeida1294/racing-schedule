/* Curated Season 13 preview. Update this snapshot after checking official sources.
 * Do not populate it from the Season 12 team directory or infer race times.
 */
const FormulaEPreseason=(()=>{
 const series='Formula E',season='2026/27',updated='September 29, 2026';
 const calendarSource='https://www.fiaformulae.com/en/news/races/season-13-calendar-where-will-formula-e-be-racing-in-202627';
 const rosterSource='https://www.fiaformulae.com/en/news/teams/mahindra-racing-retain-mortara-and-de-vries-for-gen4';
 const venues=[
 ['jeddah','Jeddah','Saudi Arabia','Jeddah Corniche Circuit',['2026-12-18','2026-12-19']],
 ['mexico','Mexico City','Mexico','Autódromo Hermanos Rodríguez',['2027-01-16']],
 ['austin','Austin','United States','Circuit of The Americas',['2027-02-06']],
 ['miami','Miami','United States','Miami International Autodrome',['2027-02-20']],
 ['saopaulo','São Paulo','Brazil','Anhembi Sambadrome Circuit',['2027-03-13']],
 ['sanya','Sanya','China','Haitang Bay Circuit',['2027-04-17']],
 ['monaco','Monaco','Monaco','Circuit de Monaco',['2027-05-01','2027-05-02']],
 ['berlin','Berlin','Germany','Tempelhof Airport Street Circuit',['2027-05-08','2027-05-09']],
 ['london','London','United Kingdom','Brands Hatch',['2027-05-29','2027-05-30']],
 ['zandvoort','Zandvoort','Netherlands','MASCOT Zandvoort Circuit',['2027-06-18','2027-06-19']],
 ['madrid','Madrid','Spain','Circuito de Madrid Jarama-RACE',['2027-06-26','2027-06-27']],
 ['shanghai','Shanghai','China','Shanghai International Circuit',['2027-07-10','2027-07-11']],
 ['tokyo','Tokyo','Japan','Tokyo Street Circuit',['2027-07-24','2027-07-25']]
 ];
 const teams=[
 ['Andretti','Jake Dennis','Felipe Drugovich'],['Citroën Racing','Nick Cassidy','Jean-Éric Vergne'],
 ['CUPRA KIRO','Pepe Martí',null],['Opel','Mitch Evans','Théo Pourchaire'],
 ['Envision Racing',"Zak O’Sullivan",'Maximilian Günther'],['Jaguar TCS Racing','António Félix da Costa',null],
 ['Lola Yamaha ABT',null,null],['Mahindra Racing','Nyck de Vries','Edoardo Mortara'],
 ['Nissan','Oliver Rowland','Zane Maloney'],['Porsche',null,null],['Fortescue Zero',null,null]
 ];
 const tabs={overview:'Overview',schedule:'Schedule',standings:'Standings',teams:'Teams & Drivers',results:'Results',tracks:'Tracks'};
 const esc=x=>escapeHtml(x??''),normalize=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const legacyTracks=new Map();
 function install(){
  if(typeof SeasonTimeline!=='undefined')SeasonTimeline.remember(allRaces.filter(r=>r.series===series&&!r.fePreseason));
  allTracks.filter(t=>t.source==='formula-e'&&!t.fePreseason).forEach(t=>legacyTracks.set(String(t.trackId),t));
  const tracks=venues.map(([id,city,country,name])=>{const matches=[...legacyTracks.values()].filter(t=>[t.name,t.apiName].some(n=>normalize(n)===normalize(name)));const old=matches.length===1?matches[0]:{};
   // Formula E may use a different layout from F1 at the same venue. Reuse
   // only matching Formula E media; don't copy F1 lengths or maps by city.
   return {...old,source:'formula-e',fePreseason:true,trackId:'fe13-'+id,name,city,state:country};});
  let round=0;const races=venues.flatMap(([id,city,country,name,dates])=>dates.map(date=>({series,raceId:'fe13-'+(++round),round:String(round),event:city+' E-Prix',trackId:'fe13-'+id,date,time:'TBA',network:'',fePreseason:true,notes:'2026/27 Preseason · Official event date; start time and weekend sessions to be announced.'})));
  allRaces=allRaces.filter(r=>r.series!==series).concat(races);
  allTracks=allTracks.filter(t=>t.source!=='formula-e').concat(tracks);
  allSessions=allSessions.filter(s=>s.series!==series).concat(races.map(r=>({series,raceId:r.raceId,trackId:r.trackId,session:'Race',type:'Race',date:r.date,time:'TBA',notes:'Preseason · Detailed session schedule to be announced.'})));
 }
 function banner(){return `<section class="fe-preseason-banner"><span class="fe-preseason-badge">PRESEASON · ${season}</span><h2>A New Season Is Taking Shape</h2><p>Check back for calendar updates, confirmed drivers, and weekend schedules. Results and standings will follow once racing begins.</p><small>Verified ${updated} · Dates and lineups may change.</small></section>`;}
 function source(url,label){return `<a class="fe-source" href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;}
 function teamsMarkup(){return `<p class="f1-data-note">Confirmed names from Formula E’s new-season announcement. TBA means no driver was confirmed in that source as of ${updated}. Team branding and car numbers will be added when verified.</p><div class="fe-team-grid">${teams.map(([team,...drivers])=>`<section class="f1-feature"><h3>${esc(team)}</h3><div class="fe-driver-grid">${drivers.map(d=>`<div class="fe-driver ${d?'':'fe-tba'}"><span>${d?'Confirmed':'Seat Unconfirmed'}</span><strong>${esc(d||'TBA')}</strong></div>`).join('')}</div></section>`).join('')}</div>${source(rosterSource,'Official Driver Announcements')}`;}
 function scheduleMarkup(){return `<p class="f1-data-note">21 rounds · 13 race weekends. Dates are local event dates. Race start times and detailed session schedules are still TBA.</p><div class="fe-calendar">${racesFor(series).map(r=>`<button class="f1-feature event-photo-tile fe-event" data-fe-race="${r.raceId}">${racePhotoMarkup(r)}<span class="weekend-eyebrow">ROUND ${r.round}</span><h3>${esc(r.event)}</h3><p>${esc(trackNameForRace(r))}</p><strong>${formatDate(r.date)}</strong><small>Time TBA</small><span class="home-panel-cta">Event Details →</span></button>`).join('')}</div>${source(calendarSource,'Official Season 13 Calendar')}`;}
 async function render(tab='overview'){
  install();activeSeriesName=series;document.getElementById('f1-hub').hidden=true;document.getElementById('series-calendar').hidden=true;document.getElementById('back-button').hidden=true;
  const hub=document.getElementById('series-hub');let body='';
  if(tab==='overview'){const first=racesFor(series)[0];body=`<section class="f1-feature event-photo-tile fe-opener">${racePhotoMarkup(first)}<p class="weekend-eyebrow">SEASON OPENER · DECEMBER 18–19, 2026</p><h2>Jeddah E-Prix</h2><p>Jeddah Corniche Circuit · Saudi Arabia</p><button class="nascar-schedule-action" data-fe-open="schedule">Explore the Calendar →</button></section><div class="fe-summary"><div><strong>21</strong><span>Scheduled Rounds</span></div><div><strong>${teams.flatMap(t=>t.slice(1)).filter(Boolean).length}</strong><span>Confirmed Drivers</span></div><div><strong>${teams.flatMap(t=>t.slice(1)).filter(d=>!d).length}</strong><span>Seats Awaiting News</span></div></div><section class="f1-feature"><h3>Follow the Preseason</h3><p>Explore the announced teams and drivers. Unconfirmed seats remain TBA.</p><button class="nascar-schedule-action" data-fe-open="teams">Teams & Drivers →</button></section>${source(calendarSource,'Official Calendar')} ${source(rosterSource,'Official Driver Announcements')}`;}
  else if(tab==='teams')body=teamsMarkup();
  else if(tab==='schedule')body=scheduleMarkup();
  else if(tab==='tracks')body=`<p class="f1-data-note">Announced venues for Season 13. Formula E layouts and track details will be added as they are confirmed.</p><div class="fe-calendar">${allTracks.filter(t=>t.source==='formula-e').map(t=>`<section class="f1-feature"><h3>${esc(t.name)}</h3><p>${esc(t.city)}, ${esc(t.state)}</p><small>Formula E Layout Details TBA</small></section>`).join('')}</div>${source(calendarSource,'Official Venues')}`;
  else body=`<section class="f1-feature"><h2>${tabs[tab]} Await the Season Start</h2><p>The ${season} season has not begun. Check back after the opening races for ${tab==='results'?'published race and qualifying results':'championship standings'}.</p></section>`;
  hub.innerHTML=`<div class="hub-sticky-navigation"><div class="series-hub-hero">${seriesLogoMarkup(series,true)}<p class="weekend-eyebrow">${season} · PRESEASON</p><h1>Formula E</h1></div><nav class="nascar-hub-tabs" style="--hub-accent:${themeFor(series)[0]}" aria-label="Formula E sections">${Object.entries(tabs).map(([k,v])=>`<button data-fe-tab="${k}" aria-pressed="${k===tab}">${v}</button>`).join('')}</nav></div><div class="fe-preseason-content">${banner()}${body}</div>`;
  hub.hidden=false;setView('series-view');hub.querySelectorAll('[data-fe-tab],[data-fe-open]').forEach(b=>b.onclick=()=>withLoading(()=>render(b.dataset.feTab||b.dataset.feOpen),'Opening Formula E…'));hub.querySelectorAll('[data-fe-race]').forEach(b=>b.onclick=()=>showRaceDetails(racesFor(series).find(r=>r.raceId===b.dataset.feRace)));
  const active=hub.querySelector('[aria-pressed="true"]');active.parentElement.scrollLeft=Math.max(0,active.offsetLeft-active.parentElement.offsetLeft-(active.parentElement.clientWidth-active.offsetWidth)/2);
 }
 return {install,render};
})();
