/* NASCAR profile feeds. Show/Hide affects this roster, never historical results. */
const NASCAR_PROFILE_FEEDS = {
  drivers: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRQQz0-0bQ37MkSEcZ_jsdy-YD-Laff8UaP70F3FrdywdvgvmUpnydQaVW03vVRHgcqwqGTAV6VCBll/pub?gid=1418795107&single=true&output=csv',
  teams: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRQQz0-0bQ37MkSEcZ_jsdy-YD-Laff8UaP70F3FrdywdvgvmUpnydQaVW03vVRHgcqwqGTAV6VCBll/pub?gid=725683399&single=true&output=csv'
};
const NascarProfiles = (() => {
  const manufacturers = {
    Chevrolet: 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Chevrolet-logo.png',
    Ford: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Ford_Logo.png',
    Toyota: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ee/Toyota_logo_%28Red%29.svg/330px-Toyota_logo_%28Red%29.svg.png',
    RAM: 'https://upload.wikimedia.org/wikipedia/commons/2/20/Ram_trucks_textlogo.png'
  };
  const seriesIds = {'NASCAR Cup Series':'1', "O'Reilly Auto Parts Series":'2', 'Craftsman Truck Series':'3'};
  const state = {drivers:[], teams:[], loaded:0, pending:null};
  const clean = value => String(value ?? '').trim();
  const key = value => clean(value).toLowerCase().replace(/\s+/g,' ');
  const make = value => /chev/i.test(value)?'Chevrolet':/ford/i.test(value)?'Ford':/toyota/i.test(value)?'Toyota':/\bram\b/i.test(value)?'RAM':clean(value);
  const scope = (row,series,season) => clean(row['Series ID'])===seriesIds[series] && clean(row.Season)===String(season);
  const color = value => /^#[0-9a-f]{6}$/i.test(clean(value))?clean(value):'';
  const participation = value => key(value)==='full-time'?'Full-time':key(value)==='part-time'?'Part-time':'';
  const participationOrder = value => value==='Full-time'?0:value==='Part-time'?1:2;
  function profiles(drivers,teams,series,season) {
    const teamMap = new Map(teams.filter(r=>scope(r,series,season)).map(r=>[clean(r['Team ID']),r]));
    const unique = new Map();
    for(const row of drivers.filter(r=>scope(r,series,season))) {
      const id=clean(row['Driver ID']);
      if(!id)continue;
      const teamId=clean(row['Team ID Override'])||clean(row['Latest Team ID']);
      const team=teamMap.get(teamId)||{};
      const teamName=clean(team['Organization Override'])||clean(team['Display Name Override'])||clean(team['Team Name'])||(!clean(row['Team ID Override'])?clean(row['Latest Team Name']):'')||'Team to be confirmed';
      unique.set(id,{id,show:key(row['Show in Hub Override'])==='show',name:clean(row['Display Name Override'])||clean(row['Driver Name']),teamId,teamName,
        group:key(team['Organization Override']||team['Team Name']||teamName),
        participation:participation(row.Participation),
        teamParticipation:participation(team['Team Participation Override']),
        teamHidden:key(team['Show in Hub Override'])==='hide',
        number:clean(row['Car Number Override'])||clean(row['Latest Car Number']),
        numberUrl:clean(row['Driver Number URL']),headshot:clean(row['Driver Headshot URL']),
        crew:clean(row['Crew Chief Override'])||clean(row['Crew Chief (API)']),
        manufacturer:make(team.Manufacturer||row.Manufacturer),logo:clean(team['Team Logo URL']),color:color(team['Team Color Hex'])});
    }
    return [...unique.values()];
  }
  function groups(drivers,teams,series,season) {
    const map=new Map();
    for(const driver of profiles(drivers,teams,series,season).filter(d=>d.show&&!d.teamHidden)) {
      const group=driver.group;
      if(!map.has(group))map.set(group,{name:driver.teamName,participation:driver.teamParticipation,logo:'',color:'',manufacturers:new Set(),drivers:[]});
      const team=map.get(group);
      if(participationOrder(driver.teamParticipation)<participationOrder(team.participation))team.participation=driver.teamParticipation;
      team.logo ||= driver.logo;team.color ||= driver.color;
      if(driver.manufacturer)team.manufacturers.add(driver.manufacturer);
      team.drivers.push(driver);
    }
    return [...map.values()].sort((a,b)=>participationOrder(a.participation)-participationOrder(b.participation)||a.name.localeCompare(b.name)).map(t=>({...t,drivers:t.drivers.sort((a,b)=>participationOrder(a.teamParticipation)-participationOrder(b.teamParticipation)||participationOrder(a.participation)-participationOrder(b.participation)||a.number.localeCompare(b.number,undefined,{numeric:true})||a.name.localeCompare(b.name))}));
  }
  function image(url,label,cls) {
    const safe=f1SafeImage(url);
    return safe?`<img class="${cls}" src="${escapeHtml(safe)}" alt="${escapeHtml(label)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`:'';
  }
  function numberMarkup(driver) {
    return `<span class="nascar-number">${image(driver.numberUrl,'Car '+driver.number,'nascar-number-image')}<span${f1SafeImage(driver.numberUrl)?' hidden':''}>${escapeHtml(driver.number?'#'+driver.number:'—')}</span></span>`;
  }
  function rosterSection(driver) {
    if(driver.teamParticipation==='Part-time')return 'Part-Time Entries';
    if(driver.teamParticipation==='Full-time')return driver.participation==='Full-time'?'Full-Time Entries':driver.participation==='Part-time'?'Reserve Driver':'Other Drivers · Full-Time Entries';
    return driver.participation?driver.participation+' drivers':'Other drivers';
  }
  function driverPortrait(driver) {
    const photo=image(driver.headshot,driver.name,'nascar-headshot');
    return photo+`<span class="nascar-driver-silhouette" aria-hidden="true"${photo?' hidden':''}><svg viewBox="0 0 160 200" focusable="false" aria-hidden="true"><circle cx="80" cy="44" r="29"/><path d="M65 70h30v18l23 8c17 6 24 20 27 43l7 61H8l7-61c3-23 10-37 27-43l23-8z"/><path class="nascar-silhouette-seam" d="M80 93v107M47 103l-8 97m74-97 8 97"/></svg></span>`;
  }
  function teamCards(teams) {
    return `<div class="nascar-team-list">${teams.map(team=>`<article class="nascar-team-card${team.participation==='Part-time'?' nascar-team-part-time':team.participation==='Full-time'?' nascar-team-full-time':''}" style="--team-color:${team.color||'#e5b637'}"><header class="nascar-team-header"><div class="nascar-team-brand">${image(team.logo,team.name+' logo','nascar-team-logo')}<div><h3>${escapeHtml(team.name)}</h3>${team.participation==='Part-time'?'<span class="nascar-team-status">Part-time team</span>':''}</div></div><div class="nascar-makes">${[...team.manufacturers].map(m=>`<span class="nascar-make">${image(manufacturers[m],m,'nascar-make-logo')}<span${manufacturers[m]?' hidden':''}>${escapeHtml(m)}</span></span>`).join('')}</div></header><div class="nascar-driver-grid">${team.drivers.map((d,index)=>`${index===0||rosterSection(d)!==rosterSection(team.drivers[index-1])?'<h4 class="nascar-roster-heading'+(d.teamParticipation==='Part-time'?' nascar-part-time-entries-heading':'')+'">'+rosterSection(d)+'</h4>':''}<section class="nascar-driver-card${d.teamParticipation==='Part-time'?' nascar-part-time-entry':''}${d.participation==='Part-time'?' nascar-driver-part-time':d.participation==='Full-time'?' nascar-driver-full-time':''}"><div class="nascar-driver-photo">${driverPortrait(d)}</div><div class="nascar-driver-name">${numberMarkup(d)}<h4>${escapeHtml(d.name)}</h4></div><p class="nascar-crew"><span>Crew chief</span>${escapeHtml(d.crew||'To be confirmed')}</p></section>`).join('')}</div></article>`).join('')}</div>`;
  }
  function cards(teams) {
    return ['Full-time','Part-time',''].map(status=>{
      const rows=teams.filter(t=>t.participation===status);
      return rows.length?'<section class="nascar-team-section'+(status==='Part-time'?' nascar-part-time-section':'')+'"><h3>'+(status?status+' teams':'Other teams')+'</h3>'+teamCards(rows)+'</section>':'';
    }).join('');
  }
  function bindImages(el) {
    el.querySelectorAll('img').forEach(img=>{
      const fallback=()=>{img.hidden=true;const next=img.nextElementSibling;if(next?.tagName==='SPAN')next.hidden=false;};
      img.addEventListener('error',fallback,{once:true});
      if(img.complete&&img.naturalWidth===0)fallback();
    });
  }
  async function load() {
    if(state.pending)return state.pending;
    if(Date.now()-state.loaded<300000)return;
    state.pending=Promise.all([fetchSheet(NASCAR_PROFILE_FEEDS.drivers),fetchSheet(NASCAR_PROFILE_FEEDS.teams)]).then(([drivers,teams])=>{
      for(const [rows,required] of [[drivers,['Season','Series ID','Driver ID','Show in Hub Override']],[teams,['Season','Series ID','Team ID','Team Logo URL']]]) {
        if(rows.length&&!required.every(k=>Object.hasOwn(rows[0],k)))throw new Error('Unexpected NASCAR profile headers');
      }
      state.drivers=drivers;state.teams=teams;state.loaded=Date.now();
    }).finally(()=>{state.pending=null;});
    return state.pending;
  }
  async function render(el,series) {
    const season=new Date().getFullYear();
    el.innerHTML='<h2>Teams &amp; Drivers</h2><p role="status">Loading teams and drivers…</p>';
    if(!NASCAR_PROFILE_FEEDS.drivers||!NASCAR_PROFILE_FEEDS.teams) {
      el.innerHTML='<h2>Teams &amp; Drivers</h2><p>Team profiles are coming soon.</p>';return;
    }
    try {
      await load();
      if(!el.isConnected)return;
      const roster=groups(state.drivers,state.teams,series,season);
      el.innerHTML=`<h2>Teams &amp; Drivers</h2><p class="f1-data-note">${season} season</p>${roster.length?cards(roster):'<p>No drivers have been selected for this season yet.</p>'}`;
      bindImages(el);
    } catch(error) {
      if(!el.isConnected)return;
      el.innerHTML='<h2>Teams &amp; Drivers</h2><p role="status">Team profiles could not be loaded.</p><button type="button" class="nascar-profile-retry">Try again</button>';
      el.querySelector('button').addEventListener('click',()=>render(el,series));
    }
  }
  function identities(series,season) {return profiles(state.drivers,state.teams,series,season);}
  function teamIdentity(series,season,id) {return state.teams.find(r=>scope(r,series,season)&&clean(r['Team ID'])===String(id));}
  return {render,groups,profiles,numberMarkup,cards,bindImages,load,identities,teamIdentity,manufacturerLogo:value=>manufacturers[make(value)]||''};
})();
