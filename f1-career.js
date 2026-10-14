/* Only fetched when the Career Records tab is opened. */
const F1Career=(()=>{
 let data=null,pending=null,loaded=0,error='',category='drivers',metric='wins',query='',currentOnly=false,limit=50,selected='';
 const metrics={titles:'Championships',wins:'GP Wins',podiums:'GP Podiums',poleStarts:'GP Pole Starts',starts:'GP Starts',fastest:'Recorded Fastest Laps',sprintWins:'Sprint Wins'};
 const esc=v=>escapeHtml(String(v??''));
 const protectedNow=()=>typeof Spoilers!=='undefined'&&Spoilers.protected('Formula 1');
 async function load(force=false){
  if(protectedNow()||!window.RC_F1_CAREER_CONFIG?.feedUrl)return;
  if(pending)return pending;if(!force&&data&&Date.now()-loaded<900000)return;
  pending=(async()=>{try{
   const rows=await fetchSheet(window.RC_F1_CAREER_CONFIG.feedUrl),next={drivers:[],teams:[]},seen=new Set();
   for(const row of rows){if(!['Status','drivers','teams'].includes(row.Kind))throw Error('Unexpected records feed');const value=JSON.parse(row.Data),key=row.Kind+':'+row.ID;if(seen.has(key))throw Error('Duplicate records row');seen.add(key);
    if(row.Kind==='Status'){if(value.schema!==1||!Array.isArray(value.coverage)||!Number.isInteger(value.currentYear))throw Error('Invalid records status');next.status=value;}
    else{if(value.id!==row.ID||!value.name||!Array.isArray(value.seasons)||!Array.isArray(value.teams)||Object.keys(metrics).some(k=>!Number.isInteger(value[k])||value[k]<0))throw Error('Invalid career totals');next[row.Kind].push(value);}}
   if(!next.status||!next.drivers.length)throw Error('Career feed is not ready');
   data=next;loaded=Date.now();error='';
  }catch(e){error='Career records could not refresh. '+(data?'Showing previously loaded totals.':'Please try again shortly.');console.warn('F1 career records',e);}finally{pending=null;}})();return pending;
 }
 function photo(row){const source=category==='drivers'?f1Driver(row.id)?.['Headshot URL']:f1Constructor(row.id)?.['Logo URL'];return f1Image(source,'','career-photo');}
 function detail(row){
  const statLabel=k=>k==='starts'&&category==='teams'?'GP Race Entries':metrics[k];
  const event=e=>e?esc(e.name)+' · '+esc(e.date):'Unavailable';
  return `<section class="career-profile"><button type="button" data-career-close aria-label="Close career profile">Close</button><div class="career-profile-heading">${photo(row)}<div><h3>${esc(row.name)}</h3><p>${esc(row.nationality)} · ${row.seasons.length} seasons in loaded records</p></div></div><dl>${Object.keys(metrics).map(k=>`<div><dt>${statLabel(k)}</dt><dd>${row[k]}</dd></div>`).join('')}</dl><p><strong>First GP start:</strong> ${event(row.first)}</p><p><strong>Most recent GP start:</strong> ${event(row.last)}</p>${category==='drivers'?'<p><strong>Constructors:</strong> '+row.teams.map(esc).join(', ')+'</p>':''}<p class="f1-data-note">${data.status.complete?'Career totals from imported championship results.':'Partial history: these totals will grow as older seasons import.'}</p></section>`;
 }
 function markup(){
  if(protectedNow())return Spoilers.note();
  const heading='<h2>Career Records</h2><p class="f1-data-note">Explore Formula 1 careers, championship history and Grand Prix achievements.</p>';
  if(!window.RC_F1_CAREER_CONFIG?.feedUrl)return heading+'<section class="career-profile"><h3>The Archive Is Being Prepared</h3><p>Historical career records will appear here once the records feed is connected.</p></section>';
  if(!data)return heading+`<p role="status">${esc(error||'Career records are loading.')}</p><button type="button" data-career-retry>Retry Records</button>`;
  const status=data.status,base=data[category].filter(r=>!currentOnly||r.seasons.includes(status.currentYear));
  const ranked=[...base].sort((a,b)=>b[metric]-a[metric]||a.name.localeCompare(b.name));
  const filtered=ranked.filter(r=>r.name.toLowerCase().includes(query.toLowerCase())),profile=base.find(r=>r.id===selected);
  const label=metric==='starts'&&category==='teams'?'GP Race Entries':metrics[metric];
  const dates=status.coverage.slice().sort((a,b)=>a-b);
  return heading+`<div class="career-coverage"><strong>${status.complete?'History Loaded':'Historical Import In Progress'}</strong><span>${dates.length} seasons loaded · ${esc(dates[0])}–${esc(dates.at(-1))} · Current season through round ${status.throughRound}</span><small>Last imported: ${esc(typeof RaceDisplay!=='undefined'?RaceDisplay.checked(status.updated):status.updated)}</small></div>${error?'<p class="f1-warning">'+esc(error)+'</p><button data-career-retry>Retry Records</button>':''}<div class="career-controls"><label>Records<select data-career-category><option value="drivers" ${category==='drivers'?'selected':''}>Drivers</option><option value="teams" ${category==='teams'?'selected':''}>Constructors</option></select></label><label>Achievement<select data-career-metric>${Object.entries(metrics).map(([key,title])=>`<option value="${key}" ${metric===key?'selected':''}>${key==='starts'&&category==='teams'?'GP Race Entries':title}</option>`).join('')}</select></label><label>Find a Name<input type="search" data-career-search value="${esc(query)}" placeholder="Search records"></label><label class="career-current"><input type="checkbox" data-career-current ${currentOnly?'checked':''}> This Season’s ${category==='drivers'?'Drivers':'Constructors'}</label></div>${profile?detail(profile):''}<div class="career-highlights">${ranked.slice(0,3).map((r,i)=>`<button data-career-id="${esc(r.id)}"><small>${i===0?'Leading '+label:label}</small><strong>${r[metric]}</strong><span>${esc(r.name)}</span></button>`).join('')}</div><p class="f1-data-note">${status.complete?'':'Ranks reflect imported seasons only. '}${metric==='fastest'?`Fastest-lap winners are recorded for ${status.fastestRaces} of ${status.races} imported Grands Prix; this is not a complete all-time fastest-lap record.`:metric==='poleStarts'?'Pole starts count grid position 1 in race results, not qualifying P1 or an official pole-award record.':metric==='titles'?`Championships use final standings through ${status.titleThrough}. Current-season titles are added after the calendar year ends.`:'Sprint wins are separate from Grand Prix statistics.'}</p><div class="f1-table-scroll"><table class="f1-table"><caption>${label} · ${filtered.length} matching ${category}</caption><thead><tr><th>Rank</th><th>${category==='drivers'?'Driver':'Constructor'}</th><th>${label}</th><th>Seasons</th></tr></thead><tbody>${filtered.slice(0,limit).map(r=>`<tr><td>${ranked.findIndex(x=>x[metric]===r[metric])+1}</td><th scope="row"><button class="career-name" data-career-id="${esc(r.id)}">${esc(r.name)}</button></th><td class="f1-table-points">${r[metric]}</td><td>${esc(r.seasons[0]??'—')}–${esc(r.seasons.at(-1)??'—')}</td></tr>`).join('')}</tbody></table></div>${!filtered.length?'<p>No matching records.</p>':''}${filtered.length>limit?'<button class="career-more" data-career-more>Show More</button>':''}<details class="career-notes"><summary>Record Definitions &amp; Coverage</summary><p>World Championship results from 1950 onward, including Indianapolis 500 rounds that counted toward the championship. DNS, DNQ and withdrawn entries are excluded from starts. Constructor starts count races entered, not cars. Podiums count cars, combining historical shared drives with the same car number. Constructors remain separate source identities; team renames and engine combinations are not merged.</p><p>Career points are intentionally omitted because scoring systems and dropped-score rules changed. Fastest laps count only winners explicitly recorded by the source. Pole starts use the published starting grid and can differ from official pole statistics. Sprint statistics remain separate.</p><p>Imported seasons: ${dates.join(', ')}.</p><a href="https://github.com/jolpica/jolpica-f1/blob/main/docs/README.md" target="_blank" rel="noopener noreferrer">Data source: Jolpica F1</a></details>`;
 }
 function bind(panel){
  const redraw=()=>{if(f1Tab!=='records'||protectedNow())return;panel.innerHTML=markup();bind(panel);};
  panel.querySelector('[data-career-category]')?.addEventListener('change',e=>{category=e.target.value;selected='';limit=50;redraw();});
  panel.querySelector('[data-career-metric]')?.addEventListener('change',e=>{metric=e.target.value;limit=50;redraw();});
  panel.querySelector('[data-career-current]')?.addEventListener('change',e=>{currentOnly=e.target.checked;selected='';limit=50;redraw();});
  panel.querySelector('[data-career-search]')?.addEventListener('input',e=>{query=e.target.value;limit=50;redraw();const input=panel.querySelector('[data-career-search]');input.focus({preventScroll:true});});
  panel.querySelectorAll('[data-career-id]').forEach(b=>b.onclick=()=>{selected=b.dataset.careerId;redraw();panel.querySelector('.career-profile')?.scrollIntoView({block:'nearest',behavior:'smooth'});});
  panel.querySelector('[data-career-close]')?.addEventListener('click',()=>{selected='';redraw();});
  panel.querySelector('[data-career-more]')?.addEventListener('click',()=>{limit+=50;redraw();});
  panel.querySelector('[data-career-retry]')?.addEventListener('click',async e=>{e.target.disabled=true;await load(true);if(panel.isConnected)redraw();});
 }
 return {load,markup,bind};
})();
