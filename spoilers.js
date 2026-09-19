/* Spoiler protection is a presentation preference, saved on this device. */
const Spoilers=(()=>{
 const key='raceControlSpoilersV1';
 let state={enabled:false,choices:{}};
 try{const saved=JSON.parse(localStorage.getItem(key));if(saved&&typeof saved.enabled==='boolean')state={enabled:saved.enabled,choices:saved.choices&&typeof saved.choices==='object'?saved.choices:{}};}catch{}
 const protectedSeries=series=>state.enabled&&state.choices[series]!=='caught-up';
 const note=()=>'<p class="spoiler-note">Spoiler Mode · results and updates hidden</p>';
 const esc=v=>escapeHtml(String(v??''));
 const cache=new Map();
 function chosen(series){return allRaces.find(r=>r.series===series&&String(r.raceId)===state.choices[series]);}
 function configure(){
   const host=document.getElementById('spoiler-settings');if(!host)return;
   const series=[...new Set(allRaces.map(r=>r.series))];
   host.innerHTML=`<label class="spoiler-switch"><input type="checkbox" id="spoiler-enabled"${state.enabled?' checked':''}> Spoiler Mode</label><p>Watching later? Hide results, live timing, and championship updates for series you haven’t caught up with. Choose the next race you plan to watch. Off by default; saved on this device until you change it.</p><div id="spoiler-choices"${state.enabled?'':' hidden'}><p>Series start protected. Choose “Fully caught up” to show a series normally. Pre-race standings are shown only when a verified snapshot exists.</p>${series.map(s=>`<label class="spoiler-choice">${esc(s)}<select data-spoiler-series="${esc(s)}"><option value="">Hide updates — choose a race</option><option value="caught-up"${state.choices[s]==='caught-up'?' selected':''}>Fully caught up</option>${racesFor(s).map(r=>`<option value="${esc(r.raceId)}"${String(r.raceId)===state.choices[s]?' selected':''}>Before ${esc(r.event)} · ${esc(r.date)}</option>`).join('')}</select></label>`).join('')}</div><button type="button" id="spoiler-save">Save spoiler settings</button><p id="spoiler-save-status" role="status"></p>`;
   host.querySelector('#spoiler-enabled').onchange=e=>host.querySelector('#spoiler-choices').hidden=!e.target.checked;
   host.querySelector('#spoiler-save').onclick=()=>{
     const next={enabled:host.querySelector('#spoiler-enabled').checked,choices:Object.fromEntries([...host.querySelectorAll('[data-spoiler-series]')].map(s=>[s.dataset.spoilerSeries,s.value]))};
     try{localStorage.setItem(key,JSON.stringify(next));}catch{host.querySelector('#spoiler-save-status').textContent='Your browser could not save this setting. Spoiler settings have not changed.';return;}
     // Reload clears old rendered views, in-flight callbacks, and live connections together.
     document.body.style.visibility='hidden';location.reload();
   };
 }
 async function json(url){const r=await fetch(url);if(!r.ok)throw Error('Source unavailable');return r.json();}
 function validate(rows){
   if(!rows.length||!rows.some(r=>Number(r.position)===1)||rows.some(r=>!r.id||!r.name||!Number.isInteger(Number(r.position))||Number(r.position)<1||!Number.isFinite(Number(r.points))||r.points===''||r.points==null)||new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('Incomplete snapshot');
   return rows.slice().sort((a,b)=>Number(a.position)-Number(b.position));
 }
 async function f1History(race){
   const year=Number(race.date.slice(0,4)),base='https://api.jolpi.ca/ergast/f1/';
   const calendar=(await json(base+year+'.json?limit=100')).MRData?.RaceTable?.Races;
   if(!Array.isArray(calendar)||!calendar.some(r=>r.date===race.date))throw Error('Calendar match unavailable');
   const previous=calendar.filter(r=>r.date<race.date).sort((a,b)=>Number(a.round)-Number(b.round)).at(-1);
   if(!previous)throw Error('No prior championship round');
   const get=async(kind,field)=>{
     const data=(await json(base+year+'/'+previous.round+'/'+kind+'.json?limit=100')).MRData;
     const list=data?.StandingsTable?.StandingsLists?.[0];
     if(String(list?.round)!==String(previous.round)||String(list?.season)!==String(year)||Number(data.total)>100)throw Error('Historical round mismatch');
     return validate((list[field]||[]).map(r=>({id:r.Driver?.driverId||r.Constructor?.constructorId,name:r.Driver?[r.Driver.givenName,r.Driver.familyName].join(' '):r.Constructor?.name,position:r.position,points:r.points})));
   };
   const [drivers,teams]=await Promise.all([get('driverStandings','DriverStandings'),get('constructorStandings','ConstructorStandings')]);
   return {label:'After '+previous.raceName+' · Round '+previous.round,drivers,teams};
 }
 async function nascarHistory(race){
   const id={'NASCAR Cup Series':1,"O'Reilly Auto Parts Series":2,'Craftsman Truck Series':3}[race.series],year=Number(race.date.slice(0,4));
   if(!id)throw Error('Historical standings not connected for this series');
   // Resolve the exact previous points-paying race, including schedules with exhibitions.
   const calendar=(await json('https://cf.nascar.com/cacher/'+year+'/race_list_basic.json'))['series_'+id];
   if(!Array.isArray(calendar)||!calendar.some(r=>String(r.race_id)===String(race.raceId)))throw Error('Calendar match unavailable');
   const previous=calendar.filter(r=>Number(r.race_type_id)===1&&String(r.race_date||r.date_scheduled).slice(0,10)<race.date).sort((a,b)=>String(a.race_date||a.date_scheduled).localeCompare(String(b.race_date||b.date_scheduled))).at(-1);
   if(!previous)throw Error('No prior championship round');
   if(window.RACE_SPOILER_HISTORY_URL){
     const all=await fetchSheet(window.RACE_SPOILER_HISTORY_URL);
     const rows=all.filter(r=>Number(r.Season)===year&&Number(r['Series ID'])===id&&String(r['After Race ID'])===String(previous.race_id));
     if(rows.length)return {label:'After '+previous.race_name,drivers:validate(rows.map(r=>({id:r['Driver ID'],name:r['Driver Name'],position:r.Position,points:r.Points}))),teams:[]};
   }
   // Earlier Chase backfills contain contenders only. Never label these as the full standings.
   const rows=(await fetchSheet(NASCAR_COMPETITION_FEEDS.results)).filter(r=>Number(r.Season)===year&&Number(r['Series ID'])===id&&String(r['Race ID'])===String(previous.race_id)&&String(r['Championship Points']??'')!==''&&Number(r['Championship Position'])>0);
   const size={1:16,2:12,3:10}[id];
   if(rows.length!==size||!rows.some(r=>Number(r['Championship Position'])===1))throw Error('Historical standings unavailable');
   return {label:'After '+previous.race_name+' · Chase contenders only'+(Number(rows[0]['Chase Round'])===0?' · Reset starting points':''),drivers:validate(rows.map(r=>({id:r['Driver ID'],name:r['Driver Name'],position:r['Championship Position'],points:r['Championship Points']}))),teams:[]};
 }
 function table(title,rows){return `<h3>${title}</h3><div class="spoiler-table"><table><thead><tr><th>Pos</th><th>Name</th><th>Points</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.position)}</td><td>${esc(r.name)}</td><td>${esc(r.points)}</td></tr>`).join('')}</tbody></table></div>`;}
 async function render(el,series){
   const race=chosen(series),token={};el.spoilerToken=token;
   el.innerHTML=`<section class="nascar-chart-card spoiler-protected"><h2>Spoiler Mode</h2><p>${race?'Before '+esc(race.event)+' · '+esc(race.date):'Choose your next race to watch in Customize Series.'}</p><p>Current results, charts, ratings, and live timing are hidden for this series. Schedules are still available. Mark the series fully caught up in settings to restore its normal hub.</p><div data-spoiler-history>${race?'<p role="status">Loading pre-race standings…</p>':''}</div></section>`;
   if(!race)return;
   const k=series+'|'+race.date+'|'+race.raceId;
   try{
     if(!cache.has(k))cache.set(k,(series==='Formula 1'?f1History(race):nascarHistory(race)).catch(e=>{cache.delete(k);throw e;}));
     const data=await cache.get(k);if(!el.isConnected||el.spoilerToken!==token)return;
     el.querySelector('[data-spoiler-history]').innerHTML=`<p class="spoiler-note">${esc(data.label)}</p>${table('Pre-race driver standings',data.drivers)}${data.teams.length?table('Pre-race constructor standings',data.teams):''}<p class="f1-data-note">Historical standings may reflect later official corrections. No current standings are substituted.</p>`;
   }catch{if(el.isConnected&&el.spoilerToken===token)el.querySelector('[data-spoiler-history]').innerHTML='<p>Pre-race standings are unavailable for this race. Current standings remain hidden.</p>';}
 }
 return {protected:protectedSeries,note,configure,render};
})();
