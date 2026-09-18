/* Published automated sheets created by NASCAR_Standings_Results.gs. */
const NASCAR_COMPETITION_FEEDS={
 standings:'https://docs.google.com/spreadsheets/d/e/2PACX-1vRQQz0-0bQ37MkSEcZ_jsdy-YD-Laff8UaP70F3FrdywdvgvmUpnydQaVW03vVRHgcqwqGTAV6VCBll/pub?gid=564291582&single=true&output=csv',
 results:'https://docs.google.com/spreadsheets/d/e/2PACX-1vRQQz0-0bQ37MkSEcZ_jsdy-YD-Laff8UaP70F3FrdywdvgvmUpnydQaVW03vVRHgcqwqGTAV6VCBll/pub?gid=694502053&single=true&output=csv',
 status:'https://docs.google.com/spreadsheets/d/e/2PACX-1vRQQz0-0bQ37MkSEcZ_jsdy-YD-Laff8UaP70F3FrdywdvgvmUpnydQaVW03vVRHgcqwqGTAV6VCBll/pub?gid=1456037153&single=true&output=csv'
};
const NascarCompetition=(()=>{
 const ids={'NASCAR Cup Series':1,"O'Reilly Auto Parts Series":2,'Craftsman Truck Series':3};
 const chaseSizes={1:16,2:12,3:10};
 const cache={},selection={},sessionSelection={};
 const text=v=>escapeHtml(String(v??''));
 const number=v=>v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v))?Number(v):null;
 const value=v=>number(v)===null?'—':text(v);
 const behind=v=>number(v)===null?'—':Number(v)===0?'0':'-'+Math.abs(Number(v));
 function contention(row,series) {
   // Verified 2026 points-paying totals and regular-season lengths. Do not
   // carry these rules into a new season without reviewing its rules/calendar.
   const rules={1:[36,26],2:[33,24],3:[25,18]}[ids[series]];
   const starts=number(row.Starts),gap=number(row['Behind Leader']);
   if(Number(row.Season)!==2026||!rules||!Number.isInteger(starts)||starts<=rules[1]||starts>rules[0]||gap===null||number(row.Points)<2000)return false;
   // Each driver's starts are a lower bound on completed rounds. Missed races
   // deliberately overestimate opportunities rather than eliminate too early.
   // Chase maximum: win 55 + two stages 20 + fastest lap 1. Leader may score 0.
   // Strict comparison keeps all possible ties alive; no guessed tie-breaker.
   return Math.abs(gap)>(rules[0]-starts)*76;
 }
 const scoped=(rows,series)=>rows.filter(r=>Number(r['Series ID'])===ids[series]&&Number(r.Season)===new Date().getFullYear());
 const requirements={standings:['Season','Series ID','Driver ID','Position','Points'],results:['Season','Series ID','Race ID','Driver ID','Team ID','Position'],status:['Dataset','Season','Series ID','State']};
 async function load(kind) {
   const entry=cache[kind];if(entry?.pending)return entry.pending;
   if(entry?.loaded&&Date.now()-entry.loaded<300000)return entry.rows;
   if(!NASCAR_COMPETITION_FEEDS[kind])throw new Error('Not connected');
   const item=cache[kind]||(cache[kind]={});
   item.pending=fetchSheet(NASCAR_COMPETITION_FEEDS[kind]).then(rows=>{
     if(rows.length&&!requirements[kind].every(k=>Object.hasOwn(rows[0],k)))throw new Error('Unexpected headers');
     item.rows=rows;item.loaded=Date.now();return rows;
   }).finally(()=>{item.pending=null;});return item.pending;
 }
 function identity(row,series,profiles,isResult) {
   const profile=profiles.find(p=>p.id===String(row['Driver ID']));
   const team=isResult?NascarProfiles.teamIdentity(series,Number(row.Season),row['Team ID']):null;
   const rawColor=isResult?team?.['Team Color Hex']:profile?.color;
   const color=/^#[0-9a-f]{6}$/i.test(rawColor||'')?rawColor:'#c5a74d';
   const car=String(row['Car Number']??'');
   // Do not use a current number graphic when a driver used another car in this event.
   const graphic=profile&&profile.number===car?profile.numberUrl:'';
   const name=profile?.name||row['Driver Name'];
   const teamName=isResult?(team?.['Display Name Override']||row['Team Name']):profile?.teamName;
   return `<span class="nascar-result-driver" style="--team-color:${color}">${NascarProfiles.numberMarkup({number:car,numberUrl:graphic})}<span><strong>${text(name)}</strong>${teamName?`<small>${text(teamName)}</small>`:''}</span></span>`;
 }
 function table(headers,rows) {return `<div class="f1-table-wrap nascar-competition-table" tabindex="0" aria-label="Scrollable ${headers[0]==='Pos'?'standings':'race results'} table"><table class="f1-table"><thead><tr>${headers.map(h=>`<th scope="col">${text(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;}
 function standings(rows,series,profiles,sort={key:"Points",direction:"descending"}) {
   const sorted=rows.slice().sort((a,b)=>{
     const key=sort.key,strings=['Driver Name','Manufacturer'].includes(key);
     const av=strings?String(a[key]||''):number(a[key]),bv=strings?String(b[key]||''):number(b[key]);
     if(av===null||bv===null)return av===bv?Number(a.Position)-Number(b.Position):av===null?1:-1;
     const delta=strings?av.localeCompare(bv):av-bv;
     return (sort.direction==='ascending'?delta:-delta)||Number(a.Position)-Number(b.Position);
   });
   const championshipOrder=sort.key==='Points'&&sort.direction==='descending'||sort.key==='Position'&&sort.direction==='ascending';
   const cutoff=chaseSizes[ids[series]];
   const body=[];
   let outside=false;
   if(championshipOrder)body.push(`<tr class="nascar-chase-heading"><th colspan="11" scope="colgroup">Current Chase Grid <span>Top ${cutoff} in the current standings</span></th></tr>`);
   sorted.forEach(r=>{
     const rank=Number(r.Position),inGrid=rank>=1&&rank<=cutoff;
     const eliminated=inGrid&&contention(r,series);
     if(championshipOrder&&rank>cutoff&&!outside){outside=true;body.push(`<tr class="nascar-chase-cutoff"><th colspan="11" scope="colgroup">Chase grid cutoff · Outside the top ${cutoff}</th></tr>`);}
     body.push(`<tr${inGrid?` class="nascar-chase-driver${eliminated?' nascar-chase-eliminated':''}"`:''}><td>${value(r.Position)}</td><td>${identity(r,series,profiles,false)}${eliminated?'<span class="nascar-eliminated-label">Eliminated from title contention</span>':''}</td><td>${text(r.Manufacturer)||'—'}</td><td><strong>${value(r.Points)}</strong></td><td>${rank===1?'—':behind(r['Behind Leader'])}</td>${['Wins','Stage Wins','Stage Points','Top 5','Top 10','Starts'].map(k=>`<td>${value(r[k])}</td>`).join('')}</tr>`);
   });
   return '<p class="f1-data-note">Title elimination is a conservative calculation from published standings, not an official NASCAR designation. Possible points ties stay in contention; missed starts may delay a label.</p>'+table(['Pos','Driver','Manufacturer','Points','Behind','Wins','Stage Wins','Stage Points','Top 5','Top 10','Starts'],body);
 }
 function renderStandings(el,rows,series,profiles,sort={key:'Points',direction:'descending'}) {
   const scroll=el.querySelector('.nascar-competition-table')?.scrollLeft||0;
   el.innerHTML=standings(rows,series,profiles,sort);
   const keys=['Position','Driver Name','Manufacturer','Points','Behind Leader','Wins','Stage Wins','Stage Points','Top 5','Top 10','Starts'];
   el.querySelectorAll('thead th').forEach((th,i)=>{
     const key=keys[i],label=th.textContent,active=sort.key===key;
     th.setAttribute('aria-sort',active?sort.direction:'none');
     th.innerHTML=`<button type="button" class="nascar-sort-button" data-sort="${key}" aria-label="Sort by ${label}">${label} ${active?(sort.direction==='descending'?'▼':'▲'):'↕'}</button>`;
     th.firstElementChild.addEventListener('click',()=>{
       const direction=active?(sort.direction==='descending'?'ascending':'descending'):['Position','Driver Name','Manufacturer','Behind Leader'].includes(key)?'ascending':'descending';
       renderStandings(el,rows,series,profiles,{key,direction});
       el.querySelector(`[data-sort="${key}"]`).focus({preventScroll:true});
     });
   });
   el.querySelector('.nascar-competition-table').scrollLeft=scroll;
   NascarProfiles.bindImages(el);
 }
 function eventLabel(row) {
   const track=allTracks.find(t=>t.source==='nascar'&&String(t.trackId)===String(row['Track ID']));
   return [row['Race Date'],row.Event,track?.name].filter(Boolean).join(' · ');
 }
 function results(rows,series,profiles,el,chase=null) {
   const events=[...new Map(rows.map(r=>[String(r['Race ID']),r])).values()].sort((a,b)=>String(b['Race Date']).localeCompare(String(a['Race Date']))||Number(b['Race ID'])-Number(a['Race ID']));
   if(!events.some(r=>String(r['Race ID'])===selection[series]))selection[series]=String(events[0]['Race ID']);
   const selected=events.find(r=>String(r['Race ID'])===selection[series]);
   const raceRows=rows.filter(r=>String(r['Race ID'])===selection[series]).sort((a,b)=>(Number(a.Position)||999)-(Number(b.Position)||999));
   el.innerHTML=`<label class="nascar-event-picker">Event<select id="nascar-result-event">${events.map(r=>`<option value="${text(r['Race ID'])}"${String(r['Race ID'])===selection[series]?' selected':''}>${text(eventLabel(r))}</option>`).join('')}</select></label><h3>${text(selected.Event)}</h3><p class="f1-data-note">${text(selected['Race Date'])} · Race results</p><p class="nascar-chase-legend">${chase?'Gold highlights show the current top '+chaseSizes[ids[series]]+' Chase grid, not the grid at the time of this race.':'Chase highlighting unavailable while standings cannot be loaded.'}</p>`+table(['Finish','Driver','Manufacturer','Start','Laps','Led','Points','Status'],raceRows.map(r=>`<tr${chase?.has(String(r['Driver ID']))?' class="nascar-chase-result"':''}><td>${String(r.Disqualified)==='TRUE'?'DSQ':Number(r.Position)>0?value(r.Position):'—'}</td><td>${identity(r,series,profiles,true)}${chase?.has(String(r['Driver ID']))?'<span class="nascar-chase-badge">Chase grid</span>':''}</td><td>${text(r.Manufacturer)||'—'}</td><td>${Number(r.Start)>0?value(r.Start):'—'}</td>${['Laps','Laps Led','Points'].map(k=>`<td>${value(r[k])}</td>`).join('')}<td>${text(r.Status)||'—'}</td></tr>`));
   const available=[1,2,3].filter(n=>raceRows.some(r=>number(r['Stage '+n+' Position'])>0));
   if(!available.includes(sessionSelection[series]))sessionSelection[series]=0;
   const session=document.createElement('label');session.className='nascar-event-picker';
   session.innerHTML='Session<select id="nascar-result-session"><option value="0">Race Results</option>'+available.map(n=>`<option value="${n}"${sessionSelection[series]===n?' selected':''}>Stage ${n}</option>`).join('')+'</select>';
   el.querySelector('.nascar-event-picker').after(session);
   if(sessionSelection[series]) {
     const n=sessionSelection[series],stageRows=raceRows.filter(r=>number(r['Stage '+n+' Position'])>0).sort((a,b)=>Number(a['Stage '+n+' Position'])-Number(b['Stage '+n+' Position']));
     el.querySelector('h3').textContent=selected.Event+' · Stage '+n;
     el.querySelector('.f1-data-note').textContent=selected['Race Date']+' · Published stage results';
     el.querySelector('.nascar-competition-table').outerHTML=table(['Pos','Driver','Manufacturer','Stage Points'],stageRows.map(r=>`<tr${chase?.has(String(r['Driver ID']))?' class="nascar-chase-result"':''}><td>${value(r['Stage '+n+' Position'])}</td><td>${identity(r,series,profiles,true)}${chase?.has(String(r['Driver ID']))?'<span class="nascar-chase-badge">Chase grid</span>':''}</td><td>${text(r.Manufacturer)||'—'}</td><td>${value(r['Stage '+n+' Points'])}</td></tr>`));
   }
   session.querySelector('select').addEventListener('change',e=>{sessionSelection[series]=Number(e.target.value);results(rows,series,profiles,el,chase);el.querySelector('#nascar-result-session').focus();});
   NascarProfiles.bindImages(el);
   el.querySelector('select').addEventListener('change',e=>{selection[series]=e.target.value;sessionSelection[series]=0;results(rows,series,profiles,el,chase);el.querySelector('select').focus();});
 }
 async function render(el,series,tab) {
   const title=tab==='standings'?'Standings':'Results';
   el.innerHTML=`<h2>${title}</h2><p role="status">Loading ${title.toLowerCase()}…</p>`;
   if(!NASCAR_COMPETITION_FEEDS[tab]){el.innerHTML=`<h2>${title}</h2><p>Published ${title.toLowerCase()} are coming soon.</p>`;return;}
   try {
     const [rows,profileResult,statusResult,chaseRows]=await Promise.all([load(tab),NascarProfiles.load().then(()=>true,()=>false),load('status').catch(()=>[]),tab==='results'?load('standings').catch(()=>null):Promise.resolve(null)]);
     if(!el.isConnected)return;
     const data=scoped(rows,series),profiles=profileResult?NascarProfiles.identities(series,new Date().getFullYear()):[];
     const status=scoped(statusResult,series).find(r=>r.Dataset===(tab==='standings'?'Standings':'Results'));
     const updated=data.map(r=>r['Updated UTC']).filter(v=>v&&Number.isFinite(Date.parse(v))).sort().at(-1);
     el.innerHTML=`<h2>${title}</h2><p class="f1-data-note">${new Date().getFullYear()} season${updated?' · Data imported '+text(new Date(updated).toLocaleString()):''}</p>${status?.State==='ERROR'?'<p class="f1-warning">The latest source update failed. Showing the last available data.</p>':''}${!profileResult?'<p class="f1-data-note">Driver images and team details are temporarily unavailable.</p>':''}<div class="nascar-competition-content"></div>`;
     const content=el.querySelector('.nascar-competition-content');
     if(!data.length){content.innerHTML='<p>No published data is available for this season yet.</p>';return;}
     if(tab==='standings'){renderStandings(content,data,series,profiles);}
     else {
       const grid=chaseRows===null?null:scoped(chaseRows,series);
       const chase=grid?.length?new Set(grid.filter(r=>Number(r.Position)>=1&&Number(r.Position)<=chaseSizes[ids[series]]).map(r=>String(r['Driver ID']))):null;
       results(data,series,profiles,content,chase);
     }
   }catch(e){if(!el.isConnected)return;el.innerHTML=`<h2>${title}</h2><p role="status">Unable to load ${title.toLowerCase()}.</p><button type="button">Try again</button>`;el.querySelector('button').addEventListener('click',()=>render(el,series,tab));}
 }
 async function homeSummary(el,series='NASCAR Cup Series') {
   if(!ids[series])return;
   const [standingsResult,resultsResult]=await Promise.allSettled([load('standings'),load('results'),NascarProfiles.load()]);
   if(!el.isConnected)return;
   const profiles=NascarProfiles.identities(series,new Date().getFullYear());
   const leader=standingsResult.status==='fulfilled'?scoped(standingsResult.value,series).find(r=>Number(r.Position)===1):null;
   const raceRows=resultsResult.status==='fulfilled'?scoped(resultsResult.value,series):[];
   const latest=raceRows.slice().sort((a,b)=>String(b['Race Date']).localeCompare(String(a['Race Date']))||Number(b['Race ID'])-Number(a['Race ID']))[0];
   const winner=latest?raceRows.find(r=>String(r['Race ID'])===String(latest['Race ID'])&&Number(r.Position)===1&&r.Disqualified!=='TRUE'):null;
   const item=(row,label,detail)=>{
     if(!row)return '';
     const profile=profiles.find(p=>p.id===String(row['Driver ID']));
     const photo=f1SafeImage(profile?.headshot);
     const number=String(row['Car Number']??'');
     const badge=NascarProfiles.numberMarkup({number,numberUrl:profile?.number===number?profile.numberUrl:''});
     return `<div class="f1-home-leader"><p><span>${label}</span><strong>${text(profile?.name||row['Driver Name'])}</strong><small>${detail}</small></p><div class="nascar-home-driver-media">${photo?`<img class="f1-home-portrait" src="${text(photo)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:''}${badge}</div></div>`;
   };
   el.innerHTML=item(leader,'Championship leader',value(leader?.Points)+' pts')+item(winner,'Latest race winner',text(winner?.Event));
   NascarProfiles.bindImages(el);
 }
 async function overview(el,series) {
   el.innerHTML='<div class="f1-overview-grid nascar-overview"><section class="f1-feature event-photo-tile" data-nascar-next></section><section class="f1-feature" data-nascar-latest><p class="f1-kicker">LATEST RACE PODIUM</p><p role="status">Loading results…</p></section><section class="f1-feature" data-nascar-leaders><p class="f1-kicker">CHAMPIONSHIP STANDINGS</p><p role="status">Loading standings…</p></section></div>';
   const nextPanel=el.querySelector('[data-nascar-next]'),latestPanel=el.querySelector('[data-nascar-latest]'),leadersPanel=el.querySelector('[data-nascar-leaders]');
   const nextRace=(finished=new Set())=>{
     const today=new Date();today.setHours(0,0,0,0);
     const races=racesFor(series),next=races.find(r=>raceTime(r)>=today.getTime()&&!finished.has(String(r.raceId)));
     nextPanel.innerHTML=`${racePhotoMarkup(next)}<p class="f1-kicker">NEXT RACE</p>${next?`<h2>${text(next.event)}</h2><p>${text(trackNameForRace(next))}</p><p>${formatDate(next.date)} · ${text(next.time||'Time TBD')}</p><button type="button" data-next-event>Event &amp; weekend schedule →</button>`:`<h2>${races.length?'No upcoming races':'Schedule coming soon'}</h2><p>${races.length?'No further races are currently listed for this season.':'Race dates will appear when available.'}</p><button type="button" data-next-calendar>View schedule →</button>`}`;
     nextPanel.querySelector('[data-next-event]')?.addEventListener('click',()=>showRaceDetails(next));
     nextPanel.querySelector('[data-next-calendar]')?.addEventListener('click',()=>renderNascarHub(series,'schedule'));
   };
   nextRace();
   const [standingsResult,resultsResult,profilesResult,statusResult]=await Promise.allSettled([load('standings'),load('results'),NascarProfiles.load(),load('status')]);
   if(!el.isConnected)return;
   const profiles=profilesResult.status==='fulfilled'?NascarProfiles.identities(series,new Date().getFullYear()):[];
   const statuses=statusResult.status==='fulfilled'?scoped(statusResult.value,series):[];
   const warning=dataset=>statuses.some(r=>r.Dataset===dataset&&r.State==='ERROR')?'<p class="f1-warning">Latest source update unavailable. Showing previously imported data.</p>':'';
   const failed=(panel,label)=>{panel.innerHTML=`<p class="f1-kicker">${label}</p><p>Data is temporarily unavailable.</p><button type="button" data-overview-retry>Try again</button>`;panel.querySelector('button').addEventListener('click',()=>renderNascarHub(series,'overview'));};
   if(resultsResult.status==='fulfilled') {
     const rows=scoped(resultsResult.value,series);
     nextRace(new Set(rows.map(r=>String(r['Race ID']))));
     const latest=rows.slice().sort((a,b)=>String(b['Race Date']).localeCompare(String(a['Race Date']))||Number(b['Race ID'])-Number(a['Race ID']))[0];
     const podium=latest?rows.filter(r=>String(r['Race ID'])===String(latest['Race ID'])&&Number(r.Position)>=1&&Number(r.Position)<=3).sort((a,b)=>Number(a.Position)-Number(b.Position)):[];
     latestPanel.innerHTML='<p class="f1-kicker">LATEST RACE PODIUM</p>'+ (latest?`<h2>${text(latest.Event)}</h2><p class="f1-data-note">${text(eventLabel(latest))}</p><ol class="nascar-overview-list">${podium.map(r=>`<li><span class="nascar-overview-rank">${value(r.Position)}</span>${identity(r,series,profiles,true)}</li>`).join('')}</ol>${warning('Results')}<button type="button" data-full-results>Full race results →</button>`:'<p>No completed race results have been published for this season yet.</p>');
     latestPanel.querySelector('[data-full-results]')?.addEventListener('click',()=>{selection[series]=String(latest['Race ID']);renderNascarHub(series,'results');});
   }else failed(latestPanel,'LATEST RACE PODIUM');
   if(standingsResult.status==='fulfilled') {
     const top=scoped(standingsResult.value,series).sort((a,b)=>Number(a.Position)-Number(b.Position)).slice(0,5);
     leadersPanel.innerHTML='<p class="f1-kicker">CHAMPIONSHIP STANDINGS</p><h2>The top five</h2>'+(top.length?`<ol class="nascar-overview-list">${top.map(r=>`<li><span class="nascar-overview-rank">${value(r.Position)}</span>${identity(r,series,profiles,false)}<span class="nascar-overview-points"><strong>${value(r.Points)} pts</strong><small>${Number(r.Position)===1?'Leader':value(r['Behind Leader'])+' behind'}</small></span></li>`).join('')}</ol>${warning('Standings')}<button type="button" data-full-standings>Full standings →</button>`:'<p>Standings have not been published for this season yet.</p>');
     leadersPanel.querySelector('[data-full-standings]')?.addEventListener('click',()=>renderNascarHub(series,'standings'));
   }else failed(leadersPanel,'CHAMPIONSHIP STANDINGS');
   const charts=document.createElement('div');charts.className='nascar-overview-charts';el.appendChild(charts);
   NascarCharts.render(charts,series,resultsResult.status==='fulfilled'?scoped(resultsResult.value,series):[],standingsResult.status==='fulfilled'?scoped(standingsResult.value,series):[],profiles);
   NascarProfiles.bindImages(el);
 }
 return {render,homeSummary,overview};
})();
