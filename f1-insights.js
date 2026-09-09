/* F1 editorial scores and season charts. Published sheets are read only. */
const f1CircuitNames = { Austin:'americas', Baku:'baku', Catalunya:'catalunya', Hungaroring:'hungaroring', Interlagos:'interlagos', 'Kuala Lumpur':'sepang', 'Las Vegas':'vegas', Lusail:'losail', Melbourne:'albert_park', 'Mexico City':'rodriguez', Miami:'miami', 'Monte Carlo':'monaco', Montreal:'villeneuve', Monza:'monza', Shanghai:'shanghai', Silverstone:'silverstone', Singapore:'marina_bay', 'Spa-Francorchamps':'spa', Spielberg:'red_bull_ring', Suzuka:'suzuka', 'Yas Marina Circuit':'yas_marina', Zandvoort:'zandvoort' };
let f1EventForScores = null;
const f1History = { state:'idle', rows:[], promise:null, key:'', a:'', b:'' };
function f1Score(value,max=10) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const n=Number(value); return Number.isFinite(n)&&n>=0&&n<=max?n:null;
}
function f1CircuitFor(track) { return track ? f1CircuitNames[track.name] || '' : ''; }
function f1TrackScoreMarkup(id) {
  const row=f1Store.trackScores.rows.find(r=>r['Circuit ID']===id);
  const metric=(label,key,count)=>{
    const value=row&&Number(row[count])>0?f1Score(row[key]):null;
    return `<div><dt>${label}</dt><dd>${value===null?'Not rated':value.toFixed(2)+' /10'}</dd>${value===null?'':`<small>${escapeHtml(row[count])} rated sessions</small>`}</div>`;
  };
  const reviews=f1Store.reviews.rows.filter(r=>r['Circuit ID']===id);
  const average=session=>{
    const values=reviews.filter(r=>r.Session===session).map(r=>f1Score(r['Race Rating (1-5)']??r['Race Rating'],5)).filter(v=>v!==null&&v>=1);
    return values.length?`${(values.reduce((a,b)=>a+b,0)/values.length).toFixed(2)} /5 <small>(${values.length} rated)</small>`:'Not rated';
  };
  return `<dl class="track-facts f1-track-scores">${metric('Rain','Rain Score /10','Rain Samples')}${metric('Chaos','Chaos Score /10','Chaos Samples')}<div><dt>Grand Prix rating</dt><dd>${average('Grand Prix')}</dd></div><div><dt>Sprint rating</dt><dd>${average('Sprint')}</dd></div></dl><p class="f1-data-note">Personal ratings · averages across published seasons. Blank scores are excluded.</p>${f1Store.trackScores.state==='error'?'<p class="f1-warning">Track score update unavailable.</p><button data-f1-retry="trackScores">Retry track scores</button>':''}`;
}
function f1TracksMarkup() {
  const tracks=allTracks.filter(t=>t.source==='formula');
  const known=new Set(tracks.map(f1CircuitFor).filter(Boolean));
  const extra=[...new Map(f1Store.reviews.rows.filter(r=>r['Circuit ID']&&!known.has(r['Circuit ID'])).map(r=>[r['Circuit ID'],r])).values()];
  const cards=tracks.map(t=>({...t,id:f1CircuitFor(t)})).concat(extra.map(r=>({name:r.Circuit,id:r['Circuit ID']}))).sort((a,b)=>a.name.localeCompare(b.name));
  return `<div class="tracks-heading"><p class="weekend-eyebrow">THE CIRCUIT COLLECTION</p><h2>Iconic venues. Every turn.</h2><p class="f1-data-note">Explore ${cards.length} circuits, track details, and your race ratings.</p></div><div class="f1-track-grid">${cards.map((t,i)=>`<details class="f1-feature circuit-card"><summary><span class="circuit-number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><span><small>${escapeHtml(t.type||'FORMULA 1 CIRCUIT')}</small><strong>${escapeHtml(t.name)}</strong><span class="circuit-location">${escapeHtml([t.city,t.state].filter(Boolean).join(', ')||'Explore circuit')}</span></span><span class="circuit-expand" aria-hidden="true">+</span></summary><div class="circuit-body">${typeof trackFactsMarkup==='function'?trackFactsMarkup(t):''}${f1TrackScoreMarkup(t.id)}</div></details>`).join('')}</div>`;
}
function showF1EventRatings(race) {
  f1EventForScores=race.series==='Formula 1'?race:null;
  if(!f1EventForScores)return;
  document.getElementById('event-details').insertAdjacentHTML('beforeend','<section class="detail-section" id="f1-event-scores"></section>');
  refreshF1EventRatings(); loadF1Feed('reviews'); loadF1Feed('trackScores');
}
function refreshF1EventRatings() {
  const target=document.getElementById('f1-event-scores');
  if(!target||!f1EventForScores)return;
  const race=f1EventForScores,track=allTracks.find(t=>t.source==='formula'&&String(t.trackId)===String(race.trackId)),id=f1CircuitFor(track);
  const year=String(race.date).slice(0,4);
  const reviews=f1Store.reviews.rows.filter(r=>id&&r['Circuit ID']===id&&r.Season===year&&String(r.Round)===String(race.round));
  target.innerHTML='<h2>Track & race ratings</h2>'+f1TrackScoreMarkup(id)+reviews.map(r=>{
    const score=f1Score(r['Race Rating (1-5)']??r['Race Rating'],5);
    return score===null||score<1?'':`<p><strong>${escapeHtml(r.Event)} · ${escapeHtml(r.Session)}:</strong> ${score.toFixed(1)} /5</p>`;
  }).join('');
  target.querySelectorAll('[data-f1-retry]').forEach(b=>b.addEventListener('click',()=>loadF1Feed(b.dataset.f1Retry,true)));
}
function f1Distribution(kind) {
  const counts=new Map();
  f1Rows('results').filter(r=>kind==='wins'?r['Position Text']==='1':['1','2','3'].includes(r['Position Text'])).forEach(r=>{
    const id=r['Constructor ID'],entry=counts.get(id)||{id,name:f1TeamName(r),value:0};entry.value++;counts.set(id,entry);
  });
  return [...counts.values()].sort((a,b)=>b.value-a.value);
}
function f1Donut(kind,title) {
  const data=f1Distribution(kind),total=data.reduce((s,r)=>s+r.value,0),colors=['#58b995','#ff9800','#ed333b','#4f72df','#d875ee','#a6bf38','#29bed1','#aaa'];
  if(!total)return `<section class="f1-feature"><h3>${title}</h3>${f1Pending('results','Race results')}</section>`;
  let offset=0;
  const teamColors={mercedes:'#58b995',ferrari:'#ed333b',mclaren:'#ff9800',red_bull:'#4f72df'};
  const stops=data.map((r,i)=>{const color=f1Constructor(r.id)?.['Team Color Hex'];r.color=/^#[0-9a-f]{6}$/i.test(color||'')?color:teamColors[r.id]||colors[i%colors.length];const start=offset;offset+=r.value/total*100;return `${r.color} ${start}% ${offset}%`;});
  return `<section class="f1-feature"><h3>${title}</h3><div class="f1-donut" role="img" aria-label="${escapeHtml(data.map(r=>r.name+': '+r.value).join(', '))}" style="background:conic-gradient(${stops.join(',')})"><span>${total}<small>${kind==='wins'?'wins':'podiums'}</small></span></div><ul class="f1-chart-legend">${data.map(r=>`<li><i style="background:${r.color}" aria-hidden="true"></i><span>${escapeHtml(r.name)}</span><strong>${r.value} (${(r.value/total*100).toFixed(1)}%)</strong></li>`).join('')}</ul><p class="f1-data-note">Grand Prix only · current season · published results</p></section>`;
}
function f1InsightsMarkup() {
  return `<section class="f1-section"><h2>Season in numbers</h2><div class="f1-overview-grid">${f1Donut('wins','Wins by team')}${f1Donut('podiums','Podiums by team')}</div></section><section class="f1-feature f1-section"><h2>Championship battle</h2>${f1BattleMarkup()}</section>`;
}
async function loadF1History(force=false) {
  if(f1History.promise)return f1History.promise;
  const year=new Date().getFullYear(),round=Math.max(0,...f1Rows('standings').map(r=>Number(r['Through Round'])||0));
  if(!round||round>30)return;
  const key=`${year}:${round}`;
  if(!force&&f1History.key===key&&f1History.state!=='idle')return;
  f1History.key=key;f1History.state='loading';
  f1History.promise=(async()=>{
    try {
      const rows=[];
      for(let r=1;r<=round;r++) {
        const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
        try {
          const response=await fetch(`https://api.jolpi.ca/ergast/f1/${year}/${r}/driverStandings.json?limit=100`,{signal:controller.signal});
          if(!response.ok)throw new Error('Standings unavailable');
          const json=await response.json(),lists=json.MRData?.StandingsTable?.StandingsLists,list=lists?.[0];
          if(!list||String(list.season)!==String(year)||Number(list.round)!==r||!Array.isArray(list.DriverStandings)||!list.DriverStandings.length||Number(json.MRData.total)!==list.DriverStandings.length)throw new Error('Incomplete standings');
          const ids=new Set();
          for(const d of list.DriverStandings){if(!d.Driver?.driverId||ids.has(d.Driver.driverId)||f1Score(d.points,10000)===null)throw new Error('Invalid standings');ids.add(d.Driver.driverId);rows.push({round:r,id:d.Driver.driverId,points:Number(d.points)});}
        } finally {clearTimeout(timer);}
        if(r<round)await new Promise(resolve=>setTimeout(resolve,350));
      }
      f1History.rows=rows;f1History.state='ready';
    } catch(e){f1History.state='error';console.error('Championship history unavailable',e);}
    finally{f1History.promise=null;refreshF1Hub();}
  })();
  return f1History.promise;
}
function f1BattlePoints(a,b) {
  return [...new Set(f1History.rows.map(r=>r.round))].sort((x,y)=>x-y).map(round=>{
    const ra=f1History.rows.find(r=>r.round===round&&r.id===a),rb=f1History.rows.find(r=>r.round===round&&r.id===b);
    return {round,gap:ra&&rb?ra.points-rb.points:null};
  });
}
function f1BattleMarkup() {
  const drivers=f1Sorted('standings');
  if(drivers.length<2)return f1Pending('standings','Driver standings');
  if(!drivers.some(d=>d['Driver ID']===f1History.a))f1History.a=drivers[0]['Driver ID'];
  if(!drivers.some(d=>d['Driver ID']===f1History.b)||f1History.a===f1History.b)f1History.b=drivers.find(d=>d['Driver ID']!==f1History.a)['Driver ID'];
  const name=id=>f1DriverName(drivers.find(d=>d['Driver ID']===id));
  const selects=['a','b'].map((key,i)=>`<div><label for="f1-battle-${key}">Driver ${i+1}</label><select id="f1-battle-${key}">${drivers.map(d=>`<option value="${escapeHtml(d['Driver ID'])}" ${d['Driver ID']===f1History[key]?'selected':''}>${escapeHtml(f1DriverName(d))}</option>`).join('')}</select></div>`).join('');
  const points=f1BattlePoints(f1History.a,f1History.b),valid=points.filter(p=>p.gap!==null),max=Math.max(10,...valid.map(p=>Math.abs(p.gap)));
  const x=r=>45+(r-1)/Math.max(1,points.length-1)*610,y=g=>125-g/max*95;
  let path='',previous=false;
  points.forEach(p=>{if(p.gap===null){previous=false;return;}path+=`${previous?'L':'M'}${x(p.round)},${y(p.gap)} `;previous=true;});
  const chart=valid.length?`<svg class="f1-gap-chart" viewBox="0 0 700 265" role="img" aria-label="Championship points gap; values available in the table below"><line x1="45" y1="125" x2="655" y2="125" stroke="#888"/><text x="4" y="34">+${max}</text><text x="12" y="130">0</text><text x="4" y="224">−${max}</text><path d="${path}" fill="none" stroke="#ef5350" stroke-width="3"/>${valid.map(p=>`<circle cx="${x(p.round)}" cy="${y(p.gap)}" r="4" fill="#ef5350"><title>Round ${p.round}: ${p.gap} points</title></circle><text x="${x(p.round)}" y="250" text-anchor="middle">${p.round}</text>`).join('')}</svg><details><summary>View points gap by round</summary>${f1Table(['Round','Grand Prix','Points gap'],points.map(p=>`<tr><td>${p.round}</td><td>${escapeHtml(f1Rows('results').find(r=>Number(r.Round)===p.round)?.Event||'')}</td><td>${p.gap===null?'Unavailable':p.gap}</td></tr>`),'Championship gap after each Grand Prix')}</details>`:'';
  return `<div class="f1-rating-controls">${selects}</div><p class="f1-data-note">${escapeHtml(name(f1History.a))} minus ${escapeHtml(name(f1History.b))}. Positive means the first driver leads. Standings after each Grand Prix include sprint points; sprint weekends are not separate graph points.</p>${chart}${f1History.state==='loading'||f1History.state==='idle'?'<p role="status">Loading championship history…</p>':''}${f1History.state==='error'?'<p class="f1-warning">History update unavailable. Any graph shown is the last successful load.</p>':''}<button type="button" id="f1-history-retry">Refresh championship history</button><p class="f1-data-note">Source: Jolpica-F1 standings.</p>`;
}
function bindF1Insights(panel) {
  if(f1Tab==='overview')loadF1History();
  ['a','b'].forEach(key=>{const el=panel.querySelector('#f1-battle-'+key);if(el)el.addEventListener('change',e=>{f1History[key]=e.target.value;renderF1Content();document.getElementById('f1-battle-'+key).focus({preventScroll:true});});});
  const retry=panel.querySelector('#f1-history-retry');if(retry)retry.addEventListener('click',()=>{loadF1History(true);renderF1Content();});
}
