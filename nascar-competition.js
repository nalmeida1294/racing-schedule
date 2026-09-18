/* Published automated sheets created by NASCAR_Standings_Results.gs. */
const NASCAR_COMPETITION_FEEDS={
 standings:'https://docs.google.com/spreadsheets/d/e/2PACX-1vRQQz0-0bQ37MkSEcZ_jsdy-YD-Laff8UaP70F3FrdywdvgvmUpnydQaVW03vVRHgcqwqGTAV6VCBll/pub?gid=564291582&single=true&output=csv',
 results:'https://docs.google.com/spreadsheets/d/e/2PACX-1vRQQz0-0bQ37MkSEcZ_jsdy-YD-Laff8UaP70F3FrdywdvgvmUpnydQaVW03vVRHgcqwqGTAV6VCBll/pub?gid=694502053&single=true&output=csv',
 status:'https://docs.google.com/spreadsheets/d/e/2PACX-1vRQQz0-0bQ37MkSEcZ_jsdy-YD-Laff8UaP70F3FrdywdvgvmUpnydQaVW03vVRHgcqwqGTAV6VCBll/pub?gid=1456037153&single=true&output=csv'
};
const NascarCompetition=(()=>{
 const ids={'NASCAR Cup Series':1,"O'Reilly Auto Parts Series":2,'Craftsman Truck Series':3};
 const cache={},selection={};
 const text=v=>escapeHtml(String(v??''));
 const number=v=>v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v))?Number(v):null;
 const value=v=>number(v)===null?'—':text(v);
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
 function standings(rows,series,profiles) {
   const sorted=rows.slice().sort((a,b)=>Number(a.Position)-Number(b.Position));
   const cup=series==='NASCAR Cup Series';
   const body=[];
   let outside=false;
   if(cup)body.push('<tr class="nascar-chase-heading"><th colspan="9" scope="colgroup">Current Chase Grid <span>Top 16 in the current standings</span></th></tr>');
   sorted.forEach(r=>{
     const rank=Number(r.Position),inGrid=cup&&rank>=1&&rank<=16;
     if(cup&&rank>16&&!outside){outside=true;body.push('<tr class="nascar-chase-cutoff"><th colspan="9" scope="colgroup">Chase grid cutoff · Outside the top 16</th></tr>');}
     body.push(`<tr${inGrid?' class="nascar-chase-driver"':''}><td>${value(r.Position)}</td><td>${identity(r,series,profiles,false)}</td><td>${text(r.Manufacturer)||'—'}</td><td><strong>${value(r.Points)}</strong></td><td>${rank===1?'—':value(r['Behind Leader'])}</td>${['Wins','Top 5','Top 10','Starts'].map(k=>`<td>${value(r[k])}</td>`).join('')}</tr>`);
   });
   return table(['Pos','Driver','Manufacturer','Points','Behind','Wins','Top 5','Top 10','Starts'],body);
 }
 function eventLabel(row) {
   const track=allTracks.find(t=>t.source==='nascar'&&String(t.trackId)===String(row['Track ID']));
   return [row['Race Date'],row.Event,track?.name].filter(Boolean).join(' · ');
 }
 function results(rows,series,profiles,el) {
   const events=[...new Map(rows.map(r=>[String(r['Race ID']),r])).values()].sort((a,b)=>String(b['Race Date']).localeCompare(String(a['Race Date']))||Number(b['Race ID'])-Number(a['Race ID']));
   if(!events.some(r=>String(r['Race ID'])===selection[series]))selection[series]=String(events[0]['Race ID']);
   const selected=events.find(r=>String(r['Race ID'])===selection[series]);
   const raceRows=rows.filter(r=>String(r['Race ID'])===selection[series]).sort((a,b)=>(Number(a.Position)||999)-(Number(b.Position)||999));
   el.innerHTML=`<label class="nascar-event-picker">Event<select id="nascar-result-event">${events.map(r=>`<option value="${text(r['Race ID'])}"${String(r['Race ID'])===selection[series]?' selected':''}>${text(eventLabel(r))}</option>`).join('')}</select></label><h3>${text(selected.Event)}</h3><p class="f1-data-note">${text(selected['Race Date'])} · Race results</p>`+table(['Finish','Driver','Manufacturer','Start','Laps','Led','Points','Status'],raceRows.map(r=>`<tr><td>${String(r.Disqualified)==='TRUE'?'DSQ':Number(r.Position)>0?value(r.Position):'—'}</td><td>${identity(r,series,profiles,true)}</td><td>${text(r.Manufacturer)||'—'}</td><td>${Number(r.Start)>0?value(r.Start):'—'}</td>${['Laps','Laps Led','Points'].map(k=>`<td>${value(r[k])}</td>`).join('')}<td>${text(r.Status)||'—'}</td></tr>`));
   NascarProfiles.bindImages(el);
   el.querySelector('select').addEventListener('change',e=>{selection[series]=e.target.value;results(rows,series,profiles,el);el.querySelector('select').focus();});
 }
 async function render(el,series,tab) {
   const title=tab==='standings'?'Standings':'Results';
   el.innerHTML=`<h2>${title}</h2><p role="status">Loading ${title.toLowerCase()}…</p>`;
   if(!NASCAR_COMPETITION_FEEDS[tab]){el.innerHTML=`<h2>${title}</h2><p>Published ${title.toLowerCase()} are coming soon.</p>`;return;}
   try {
     const [rows,profileResult,statusResult]=await Promise.all([load(tab),NascarProfiles.load().then(()=>true,()=>false),load('status').catch(()=>[])]);
     if(!el.isConnected)return;
     const data=scoped(rows,series),profiles=profileResult?NascarProfiles.identities(series,new Date().getFullYear()):[];
     const status=scoped(statusResult,series).find(r=>r.Dataset===(tab==='standings'?'Standings':'Results'));
     const updated=data.map(r=>r['Updated UTC']).filter(v=>v&&Number.isFinite(Date.parse(v))).sort().at(-1);
     el.innerHTML=`<h2>${title}</h2><p class="f1-data-note">${new Date().getFullYear()} season${updated?' · Data imported '+text(new Date(updated).toLocaleString()):''}</p>${status?.State==='ERROR'?'<p class="f1-warning">The latest source update failed. Showing the last available data.</p>':''}${!profileResult?'<p class="f1-data-note">Driver images and team details are temporarily unavailable.</p>':''}<div class="nascar-competition-content"></div>`;
     const content=el.querySelector('.nascar-competition-content');
     if(!data.length){content.innerHTML='<p>No published data is available for this season yet.</p>';return;}
     if(tab==='standings'){content.innerHTML=standings(data,series,profiles);NascarProfiles.bindImages(content);}
     else results(data,series,profiles,content);
   }catch(e){if(!el.isConnected)return;el.innerHTML=`<h2>${title}</h2><p role="status">Unable to load ${title.toLowerCase()}.</p><button type="button">Try again</button>`;el.querySelector('button').addEventListener('click',()=>render(el,series,tab));}
 }
 async function homeSummary(el) {
   const series='NASCAR Cup Series';
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
 return {render,homeSummary};
})();
