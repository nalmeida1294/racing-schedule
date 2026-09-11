/* F1 editorial scores and season charts. Published sheets are read only. */
const f1CircuitNames = { Austin:'americas', Baku:'baku', Catalunya:'catalunya', Hungaroring:'hungaroring', Interlagos:'interlagos', 'Kuala Lumpur':'sepang', 'Las Vegas':'vegas', Lusail:'losail', Melbourne:'albert_park', 'Mexico City':'rodriguez', Miami:'miami', 'Monte Carlo':'monaco', Montreal:'villeneuve', Monza:'monza', Shanghai:'shanghai', Silverstone:'silverstone', Singapore:'marina_bay', 'Spa-Francorchamps':'spa', Spielberg:'red_bull_ring', Suzuka:'suzuka', 'Yas Marina Circuit':'yas_marina', Zandvoort:'zandvoort' };
let f1EventForScores = null;
const f1History = { state:'idle', rows:[], promise:null, key:'', a:'', b:'' };
function f1Score(value,max=10) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const n=Number(value); return Number.isFinite(n)&&n>=0&&n<=max?n:null;
}
function f1CircuitFor(track) { return track ? f1CircuitNames[track.name] || '' : ''; }
function f1CombinedRaceRating(reviews) {
  let total=0,weight=0,count=0;
  reviews.forEach(r=>{
    const score=f1Score(r['Race Rating (1-5)']??r['Race Rating'],5);
    if(score===null||score<1||!['Grand Prix','Sprint'].includes(r.Session))return;
    const w=r.Session==='Grand Prix'?3:1;total+=score*w;weight+=w;count++;
  });
  return {value:weight?total/weight:null,count};
}
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
  const combined=f1CombinedRaceRating(reviews);
  return `<dl class="track-facts f1-track-scores">${metric('Rain','Rain Score /10','Rain Samples')}${metric('Chaos','Chaos Score /10','Chaos Samples')}<div><dt>Overall race rating</dt><dd>${combined.value===null?'Not rated':combined.value.toFixed(2)+' /5'}</dd><small>GP weight 3 · sprint weight 1</small></div><div><dt>Grand Prix rating</dt><dd>${average('Grand Prix')}</dd></div><div><dt>Sprint rating</dt><dd>${average('Sprint')}</dd></div></dl><p class="f1-data-note">Personal ratings · across published seasons. Overall race rating includes GP and sprint scores; blank scores are excluded.</p>${f1Store.trackScores.state==='error'?'<p class="f1-warning">Track score update unavailable.</p><button data-f1-retry="trackScores">Retry track scores</button>':''}`;
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
  if(kind==='points')return f1Sorted('constructorStandings').filter(r=>f1Score(r.Points,10000)>0).map(r=>({id:r['Constructor ID'],name:f1TeamName(r),value:Number(r.Points)}));
  const counts=new Map();
  f1Rows('results').filter(r=>(kind==='wins'||kind==='driverWins')?r['Position Text']==='1':['1','2','3'].includes(r['Position Text'])).forEach(r=>{
    const id=kind==='driverWins'?r['Driver ID']:r['Constructor ID'],entry=counts.get(id)||{id,teamId:r['Constructor ID'],name:kind==='driverWins'?f1DriverName(r):f1TeamName(r),value:0};entry.value++;counts.set(id,entry);
  });
  return [...counts.values()].sort((a,b)=>b.value-a.value);
}
function f1Donut(kind,title) {
  const data=f1Distribution(kind),total=data.reduce((s,r)=>s+r.value,0),colors=['#58b995','#ff9800','#ed333b','#4f72df','#d875ee','#a6bf38','#29bed1','#aaa'];
  if(!total)return `<section class="f1-feature"><h3>${title}</h3>${f1Pending('results','Race results')}</section>`;
  const driverChart=kind==='driverWins';
  const imageFor=r=>driverChart?f1Driver(r.id)?.['Headshot URL']:f1Constructor(r.id)?.['Logo URL'];
  const teammates=new Map();
  if(driverChart)data.forEach(r=>{const profile=f1Driver(r.id);r.teamId=profile?.['Current Constructor ID Override']||profile?.['Latest Race Constructor ID']||r.teamId;const ids=teammates.get(r.teamId)||[];ids.push(r.id);teammates.set(r.teamId,ids.sort());});
  let offset=0;
  const teamColors={mercedes:'#58b995',ferrari:'#ed333b',mclaren:'#ff9800',red_bull:'#4f72df'};
  const stops=data.map((r,i)=>{const color=f1Constructor(driverChart?r.teamId:r.id)?.['Team Color Hex'];r.color=/^#[0-9a-f]{6}$/i.test(color||'')?color:teamColors[r.id]||colors[i%colors.length];if(driverChart){const index=teammates.get(r.teamId).indexOf(r.id);if(index){const mix=index%2?.52:-.35;r.color='#'+r.color.slice(1).match(/../g).map(v=>{const n=parseInt(v,16);return Math.round(mix>0?n+(255-n)*mix:n*(1+mix)).toString(16).padStart(2,'0');}).join('');}}const start=offset;offset+=r.value/total*100;r.angle=(start+offset)/2*Math.PI/50;return `${r.color} ${start}% ${offset}%`;});
  const races=kind==='points'?Math.max(0,...f1Rows('constructorStandings').map(r=>Number(r['Through Round'])||0)):new Set(f1Rows('results').filter(r=>kind==='wins'?r['Position Text']==='1':['1','2','3'].includes(r['Position Text'])).map(r=>r['Jolpica Race Key']||r.Round).filter(Boolean)).size;
  const logos=data.filter(r=>r.value/total>=.08).map(r=>{
    const src=f1SafeImage(imageFor(r));
    return src?`<img class="f1-slice-logo${driverChart?' f1-slice-driver':''}" src="${escapeHtml(src)}" alt="" aria-hidden="true" loading="lazy" referrerpolicy="no-referrer" style="left:${50+37*Math.sin(r.angle)}%;top:${50-37*Math.cos(r.angle)}%">`:'';
  }).join('');
  return `<section class="f1-feature"><h3>${title}</h3><div class="f1-donut" role="img" aria-label="After ${races} races. ${escapeHtml(data.map(r=>r.name+': '+r.value).join(', '))}" style="background:conic-gradient(${stops.join(',')})"><span><small>After</small>${races}<small>${races===1?'Race':'Races'}</small></span>${logos}</div><ul class="f1-chart-legend">${data.map(r=>`<li><i style="background:${r.color}" aria-hidden="true"></i>${f1Image(imageFor(r),'',driverChart?'f1-legend-logo f1-legend-driver':'f1-legend-logo')}<span>${escapeHtml(r.name)}</span><strong>${r.value} (${(r.value/total*100).toFixed(1)}%)</strong></li>`).join('')}</ul><p class="f1-data-note">${kind==='points'?'Constructor championship points · includes sprints and published adjustments.':'Grand Prix only · current season · published results.'} ${driverChart?'Driver photos':'Team logos'} for small slices appear in the legend.</p></section>`;
}
function f1InsightsMarkup() {
  return `<section class="f1-section"><h2>Season in numbers</h2><div class="f1-overview-grid">${f1Donut('wins','Wins by team')}${f1Donut('podiums','Podiums by team')}${f1Donut('driverWins','Wins by driver')}${f1Donut('points','Points by team')}</div></section><section class="f1-feature f1-section"><h2>Championship battle</h2>${f1BattleMarkup()}</section>`;
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
  const selected=[f1History.a,f1History.b].map(id=>drivers.find(d=>d['Driver ID']===id));
  const teamFor=row=>{const profile=f1Driver(row['Driver ID']);return f1Constructor(profile?.['Current Constructor ID Override']||profile?.['Latest Race Constructor ID']||row['Constructor ID']);};
  const colorFor=row=>{const color=teamFor(row)?.['Team Color Hex'];return /^#[0-9a-f]{6}$/i.test(color||'')?color:'#f0c44f';};
  const leader=Number(selected[0].Points)>=Number(selected[1].Points)?selected[0]:selected[1],color=colorFor(leader);
  const gap=Math.abs(Number(selected[0].Points)-Number(selected[1].Points));
  const portraits=selected.map((row,i)=>`<article class="f1-battle-driver" style="--battle-driver-color:${colorFor(row)}">${f1Image(f1Driver(row['Driver ID'])?.['Headshot URL'],f1DriverName(row),'f1-battle-portrait')}<div><span class="f1-kicker">DRIVER ${i+1}</span><h3>${escapeHtml(f1DriverName(row))}</h3><p>${escapeHtml(teamFor(row)?.['Display Name Override']||teamFor(row)?.Constructor||'')}</p><strong>${f1Number(row.Points)} <small>points</small></strong></div></article>`).join('');
  const x=r=>55+(r-(points[0]?.round||1))/Math.max(1,(points.at(-1)?.round||1)-(points[0]?.round||1))*600,y=g=>130-g/max*95;
  let path='',previous=false;
  points.forEach(p=>{if(p.gap===null){previous=false;return;}path+=`${previous?'L':'M'}${x(p.round)},${y(p.gap)} `;previous=true;});
  const chart=valid.length?`<div class="f1-battle-chart"><svg class="f1-gap-chart" viewBox="0 0 700 280" role="img" aria-label="Championship points gap by round; each point includes its round and gap">${[-max,-max/2,0,max/2,max].map(t=>`<line x1="55" y1="${y(t)}" x2="655" y2="${y(t)}" stroke="${t===0?'#89929e':'#ffffff12'}" stroke-dasharray="${t===0?'0':'3 6'}"/><text x="43" y="${y(t)+4}" text-anchor="end">${t>0?'+':''}${Number(t.toFixed(1))}</text>`).join('')}<path d="${path}" fill="none" stroke="${color}" stroke-opacity=".1" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"/><path d="${path}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>${valid.map(p=>`<circle cx="${x(p.round)}" cy="${y(p.gap)}" r="3.5" fill="${color}" stroke="#151a20" stroke-width="2"><title>Round ${p.round}: ${p.gap} points</title></circle>`).join('')}${points.filter((p,i)=>i===0||i===points.length-1||i%Math.ceil(points.length/8)===0).map(p=>`<text x="${x(p.round)}" y="251" text-anchor="middle">${p.round}</text>`).join('')}<text x="355" y="275" text-anchor="middle">ROUND</text></svg></div>`:'';
  return `<div class="f1-battle"><div class="f1-rating-controls">${selects}</div><div class="f1-battle-drivers">${portraits}</div><p class="f1-battle-lead" style="--battle-color:${color}">${gap===0?'Level on points':`${escapeHtml(f1DriverName(leader))} leads by <strong>${Number(gap.toFixed(2))} points</strong>`}<small>Current published standings · selected drivers</small></p><p class="f1-data-note">${escapeHtml(name(f1History.a))} minus ${escapeHtml(name(f1History.b))}. Above zero: Driver 1 leads. Below zero: Driver 2 leads.</p>${chart}${f1History.state==='loading'||f1History.state==='idle'?'<p role="status">Loading championship history…</p>':''}${f1History.state==='error'?'<p class="f1-warning">History update unavailable. Any graph shown is the last successful load.</p>':''}<button type="button" id="f1-history-retry">Refresh championship history</button><p class="f1-data-note">After each Grand Prix, including sprint points. Line color follows the current leader of this comparison. Source: Jolpica-F1 standings.</p></div>`;
}
function bindF1Insights(panel) {
  if(f1Tab==='overview')loadF1History();
  ['a','b'].forEach(key=>{const el=panel.querySelector('#f1-battle-'+key);if(el)el.addEventListener('change',e=>{f1History[key]=e.target.value;renderF1Content();document.getElementById('f1-battle-'+key).focus({preventScroll:true});});});
  const retry=panel.querySelector('#f1-history-retry');if(retry)retry.addEventListener('click',()=>{loadF1History(true);renderF1Content();});
}

