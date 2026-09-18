/* NASCAR overview charts: official race winners and saved standings snapshots. */
const NascarCharts=(()=>{
 const esc=v=>escapeHtml(String(v??''));
 const valid=v=>v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v));
 const sizes={'NASCAR Cup Series':[16,10],"O'Reilly Auto Parts Series":[12,9],'Craftsman Truck Series':[10,7]};
 const palette=['#ee5253','#36b9dc','#f4ba46','#9a85ed','#65cfaa','#e897ba','#7eacec','#db944a','#a3ce62','#d6dce5','#c872dc','#55a998','#d6ce73','#a38d7e','#7397a0','#d17b81'];
 const safeImage=(url,x,y,w,h)=>{const safe=f1SafeImage(url);return safe?`<image href="${esc(safe)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`:'';};
 const normalized=v=>String(v||'').trim().toLowerCase().replace(/\s+/g,' ');
 function wins(rows,series,profiles,kind){
   const buckets=new Map(),seen=new Set();
   rows.filter(r=>Number(r['Race Type'])===1&&Number(r.Position)===1&&String(r.Disqualified)!=='TRUE').forEach(r=>{
     if(seen.has(String(r['Race ID'])))return;seen.add(String(r['Race ID']));
     const p=profiles.find(p=>p.id===String(r['Driver ID'])),team=NascarProfiles.teamIdentity(series,Number(r.Season),r['Team ID']);
     const org=team?.['Organization Override']||team?.['Team Name']||r['Team Name']||'Unknown team';
     const manufacturer=/chev/i.test(r.Manufacturer)?'Chevrolet':/ford/i.test(r.Manufacturer)?'Ford':/toyota/i.test(r.Manufacturer)?'Toyota':/ram/i.test(r.Manufacturer)?'RAM':r.Manufacturer||'Unknown';
     const key=kind==='driver'?String(r['Driver ID']):normalized(kind==='team'?org:manufacturer);
     if(!buckets.has(key))buckets.set(key,{key,name:kind==='driver'?(p?.name||r['Driver Name']):kind==='team'?org:manufacturer,numbers:new Set(),count:0,image:kind==='driver'?(p?.number===String(r['Car Number'])?p.numberUrl:''):kind==='team'?team?.['Team Logo URL']:NascarProfiles.manufacturerLogo(manufacturer),color:kind==='manufacturer'?{Chevrolet:'#dcb955',Ford:'#429be2',Toyota:'#ef5350',RAM:'#bdc5d0'}[manufacturer]:team?.['Team Color Hex']||p?.color});
     const b=buckets.get(key);b.count++;b.numbers.add(String(r['Car Number']));
   });
   return [...buckets.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name)).map((b,i)=>({...b,label:b.name+(kind==='driver'?' · #'+[...b.numbers].join(' / #'):''),color:kind==='driver'?palette[i%palette.length]:/^#[a-f0-9]{6}$/i.test(b.color||'')?b.color:palette[i%palette.length]}));
 }
 function pie(title,items){
   const total=items.reduce((n,b)=>n+b.count,0);let angle=-Math.PI/2;
   const paths=items.map((b,i)=>{const span=b.count/total*Math.PI*2,start=angle;angle+=span;const mid=start+span/2,r=94,c=110,x=c+r*Math.cos(start),y=c+r*Math.sin(start),ex=c+r*Math.cos(angle),ey=c+r*Math.sin(angle);const fill=b.color;
     const shape=items.length===1?`<circle cx="110" cy="110" r="94" fill="${fill}"/>`:`<path d="M110 110 L${x} ${y} A94 94 0 ${span>Math.PI?1:0} 1 ${ex} ${ey} Z" fill="${fill}" stroke="#151b23" stroke-width="2"/>`;
     const w=Math.max(14,Math.min(42,span*60)),lx=c+62*Math.cos(mid),ly=c+62*Math.sin(mid);
     return `<g><title>${esc(b.label)}: ${b.count} wins (${Math.round(b.count/total*100)}%)</title>${shape}${safeImage(b.image,lx-w/2,ly-14,w,28)}</g>`;
   }).join('');
   return `<section class="nascar-chart-card"><h3>${title}</h3>${total?`<svg viewBox="0 0 220 220" class="nascar-win-pie" role="img" aria-label="${title}">${paths}</svg><p class="f1-data-note">${total} points-paying races with published results</p><ul class="nascar-chart-legend">${items.map(b=>`<li><span class="nascar-chart-dot" style="background:${b.color}"></span><span>${esc(b.label)}</span><strong>${b.count}</strong></li>`).join('')}</ul>`:'<p class="f1-data-note">Win charts will appear when the updated race data is imported.</p>'}</section>`;
 }
 function battle(el,rows,standings,series,profiles){
   const [size,total]=sizes[series],drivers=standings.slice().sort((a,b)=>Number(a.Position)-Number(b.Position)).filter(r=>Number(r.Position)>0&&Number(r.Position)<=size);
   const current=Math.max(0,...rows.filter(r=>valid(r['Chase Round'])).map(r=>Number(r['Chase Round'])));
   const snapshots=new Map();rows.forEach(r=>{if(!valid(r['Chase Round'])||!valid(r['Championship Points']))return;const round=Number(r['Chase Round']);if(round<0||round>total)return;if(!snapshots.has(round))snapshots.set(round,new Map());snapshots.get(round).set(String(r['Driver ID']),r);});
   const rounds=[...snapshots.keys()].filter(round=>[...snapshots.get(round).values()].some(r=>Number(r['Championship Position'])===1)).sort((a,b)=>a-b);
   const selected=new Set(drivers.slice(0,5).map(r=>String(r['Driver ID'])));
   const info=drivers.map((r,i)=>{const p=profiles.find(p=>p.id===String(r['Driver ID']));return {id:String(r['Driver ID']),name:p?.name||r['Driver Name'],number:r['Car Number'],image:p?.number===String(r['Car Number'])?p.numberUrl:'',color:palette[i]};});
   el.innerHTML=`<h3>Chase Battle</h3><p class="nascar-chase-round">${current?'After round '+current+' of '+total:'Chase · '+total+' rounds'}</p><p class="f1-data-note">Points behind the leader · Saved standings snapshots. Earlier rounds without snapshots are not reconstructed.</p><div class="nascar-chase-plot"></div><div class="nascar-chart-actions"><button type="button" data-chart-top>Top 5</button><button type="button" data-chart-all>Full grid</button></div><details class="nascar-driver-toggles"><summary>Choose drivers</summary>${info.map(d=>`<label><input type="checkbox" value="${esc(d.id)}"${selected.has(d.id)?' checked':''}><span class="nascar-chart-dot" style="background:${d.color}"></span>#${esc(d.number)} ${esc(d.name)}</label>`).join('')}</details><details class="nascar-chart-data"><summary>Points gaps by saved round</summary><div></div></details>`;
   const gap=(round,id)=>{const map=snapshots.get(round),r=map.get(id);return r?Number(r['Championship Points'])-Math.max(...[...map.values()].map(x=>Number(x['Championship Points']))):null;};
   function draw(){
     const shown=info.filter(d=>selected.has(d.id)),values=rounds.flatMap(r=>shown.map(d=>gap(r,d.id))).filter(v=>v!==null),min=Math.min(-10,...values),height=Math.max(235,shown.length*19+36),bottom=height-28;
     const x=r=>38+r/total*276,y=g=>18+g/min*(bottom-18);
     let svg=[0,.25,.5,.75,1].map(v=>`<path d="M38 ${18+v*(bottom-18)}H314" stroke="#ffffff18"/><text x="32" y="${22+v*(bottom-18)}" text-anchor="end">${Math.round(min*v)}</text>`).join('');
     for(let r=0;r<=total;r++)svg+=`<text x="${x(r)}" y="${height-7}" text-anchor="middle">${r}</text>`;
     const endpoints=[];
     shown.forEach(d=>{let path='',last=null,previous=null;for(const round of rounds){const g=gap(round,d.id);if(g===null){previous=null;continue;}path+=(previous!==null&&round===previous+1?'L':'M')+x(round)+' '+y(g)+' ';svg+=`<circle cx="${x(round)}" cy="${y(g)}" r="3" fill="${d.color}"><title>${esc(d.name)} · Round ${round}: ${g} points</title></circle>`;last={round,g};previous=round;}svg+=`<path d="${path}" fill="none" stroke="${d.color}" stroke-width="2.5" stroke-linejoin="round"/>`;if(last)endpoints.push({d,...last,py:y(last.g)});});
     endpoints.sort((a,b)=>a.py-b.py);endpoints.forEach((e,i)=>{const ly=Math.max(14,Math.min(bottom-(endpoints.length-1-i)*19,e.py));e.ly=Math.max(i?endpoints[i-1].ly+19:14,ly);svg+=`<path d="M${x(e.round)} ${e.py} L326 ${e.ly}" stroke="${e.d.color}" stroke-width="1" stroke-dasharray="2 3"/>`+(safeImage(e.d.image,329,e.ly-9,32,18)||`<text x="330" y="${e.ly+4}" fill="${e.d.color}">#${esc(e.d.number)}</text>`);});
     el.querySelector('.nascar-chase-plot').innerHTML=rounds.length&&shown.length?`<svg viewBox="0 0 380 ${height}" role="img" aria-label="Chase points gaps by round">${svg}</svg>${rounds.length===1?'<p class="f1-data-note">First snapshot saved. Lines appear as more rounds are recorded.</p>':''}`:`<p>${shown.length?'Awaiting the first Chase standings snapshot.':'Select at least one driver.'}</p>`;
     el.querySelector('.nascar-chart-data>div').innerHTML=rounds.map(r=>`<p><strong>Round ${r}</strong><br>${shown.filter(d=>gap(r,d.id)!==null).map(d=>esc(d.name)+': '+gap(r,d.id)).join(' · ')}</p>`).join('')||'<p>No snapshots yet.</p>';
     el.querySelectorAll('input').forEach(i=>i.checked=selected.has(i.value));
   }
   el.querySelector('[data-chart-top]').onclick=()=>{selected.clear();info.slice(0,5).forEach(d=>selected.add(d.id));draw();};el.querySelector('[data-chart-all]').onclick=()=>{info.forEach(d=>selected.add(d.id));draw();};el.querySelectorAll('input').forEach(i=>i.onchange=()=>{i.checked?selected.add(i.value):selected.delete(i.value);draw();});draw();
 }
 function render(el,series,rows,standings,profiles){
   el.innerHTML='<section class="nascar-chart-card nascar-battle"></section><div class="nascar-win-charts">'+[['driver','Wins by Driver'],['team','Wins by Team'],['manufacturer','Wins by Manufacturer']].map(([kind,title])=>pie(title,wins(rows,series,profiles,kind))).join('')+'</div>';
   battle(el.querySelector('.nascar-battle'),rows,standings,series,profiles);
   el.querySelectorAll('svg image').forEach(img=>img.addEventListener('error',()=>img.remove(),{once:true}));
 }
 return {render,wins};
})();
