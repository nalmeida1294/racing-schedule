/* Verified completed-season records. Keep season keys explicit: never carry a
 * champion forward as the leader of a new season. Sources checked Oct 1, 2026. */
const ChampionshipSnapshot = (() => {
  const champions = {
    INDYCAR: {season:'2026',name:'Alex Palou',source:'https://www.indycar.com/news/2026/08/08-30-palou-champ-facts'},
    'Indy NXT': {season:'2026',name:'Nikita Johnson',source:'https://www.indycar.com/news/2026/09/09-07-victory-lap'},
    'Formula 3': {season:'2026',name:'Ugo Ugochukwu',source:'https://www.fiaformula3.com/en/latest/article/feature-race-2-taponen-wins-as-ugochukwu-seals-2026-drivers-title.jm4Hry2loJFe2zvcLFPWK'},
    'Formula E': {season:'2025/26',name:'Pascal Wehrlein',source:'https://www.fiaformulae.com/en/news/analysis/report-wehrlein-navigates-the-chaos-to-seal-drivers-title-as-barnard-wins-in-london'}
  };
  const trophy='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M7 3h10v6a5 5 0 0 1-10 0V3Zm0 2H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4M12 14v5m-5 2h10m-9-2h8"/></svg>';
  const silhouette='<svg class="snapshot-silhouette" viewBox="0 0 80 110" aria-hidden="true"><circle cx="40" cy="28" r="18" fill="currentColor"/><path d="M8 110V80c0-22 14-32 32-32s32 10 32 32v30Z" fill="currentColor"/></svg>';
  function gap(series) {
    let rows=[];
    if(series==='Formula 1'&&typeof f1Rows==='function')rows=f1Rows('standings');
    else if(series==='Formula 2'&&typeof F2Hub!=='undefined')rows=F2Hub.snapshotStandings?.()||[];
    else if(series==='F1 Academy'&&typeof AcademyHub!=='undefined')rows=AcademyHub.snapshotStandings?.()||[];
    else if(typeof NascarCompetition!=='undefined')rows=NascarCompetition.snapshotStandings?.(series)||[];
    const first=rows.find(r=>Number(r.Position)===1),second=rows.find(r=>Number(r.Position)===2);
    if(!first||!second||first.Points===''||second.Points===''||!Number.isFinite(Number(first.Points))||!Number.isFinite(Number(second.Points)))return '';
    return '+'+Number((Number(first.Points)-Number(second.Points)).toFixed(2))+' pts to 2nd';
  }
  function open(series) {
    return withLoading(()=>series==='CARS Tour'?CARSHub.render('standings'):series==='Formula 1'?renderF1Hub('standings'):nascarHubSeries.has(series)?renderNascarHub(series,'standings'):series==='Formula 2'?F2Hub.render('standings'):series==='F1 Academy'?AcademyHub.render('standings'):series==='IMSA'?IMSAHub.render('standings'):series==='WEC'?WECHub.render('standings'):renderSeriesHub(series),'Opening Standings…');
  }
  function render(now=new Date()) {
    const host=document.getElementById('championship-snapshot');if(!host)return;
    const series=seriesSettings.order.filter(s=>!seriesSettings.hidden.includes(s)&&!['WEC','IMSA'].includes(s)&&SeasonTimeline.model(s,now));
    host.hidden=!series.length;
    host.innerHTML=`<div class="snapshot-heading">${trophy}<div><h2 id="snapshot-heading">Championship Snapshot</h2><p>Leaders Across Your Series</p></div></div><div class="snapshot-grid"></div>`;
    const grid=host.querySelector('.snapshot-grid');
    series.forEach(s=>{
      const protectedMode=typeof Spoilers!=='undefined'&&Spoilers.protected(s);
      const season=SeasonTimeline.model(s,now);
      const archive=champions[s];
      const archiveSeason=s==='Formula E'?'2025':archive?.season;
      const useChampion=!protectedMode&&archive&&now.getFullYear()===2026&&(season.season===archiveSeason||(s==='Formula E'&&season.start>addDays(localIsoDate(now),30)));
      const card=[...document.querySelectorAll('#schedule .home-series-card')].find(c=>c.dataset.series===s);
      // Reuse the same rendered standings summaries as the full homepage cards.
      // These already apply the hub's identity overrides and feed scoping.
      const leaders=protectedMode||useChampion?[]:[...(card?.querySelectorAll('.f1-home-leader')||[])].filter(el=>!/constructor|teams[’']? championship/i.test(el.querySelector('p>span')?.textContent||''));
      const button=document.createElement('button');button.type='button';button.className='snapshot-card'+(useChampion?' snapshot-champion':'');button.style.setProperty('--series-color',themeFor(s)[0]);button.dataset.snapshotSeries=s;
      const label=protectedMode?'Spoiler Mode':useChampion?archive.season+' Champion':season.start>localIsoDate(now)?'Preseason':season.done===season.races.length?'Latest Standings · Season Completed':'Championship Leader'+(['WEC','IMSA','CARS Tour'].includes(s)?'s':'');
      button.innerHTML=`<span class="snapshot-brand">${seriesLogoMarkup(s)}<span class="snapshot-title"><strong>${escapeHtml(s)}</strong><span class="snapshot-label">${escapeHtml(label)}</span></span></span><span class="snapshot-content"></span>`;
      const content=button.querySelector('.snapshot-content');
      if(useChampion){content.insertAdjacentHTML('beforeend',`<span class="snapshot-photo">${silhouette}</span><span class="snapshot-champion-detail"><strong>${escapeHtml(archive.name)}</strong><span class="snapshot-trophy">${trophy}</span><small>Season Champion</small></span>`);button.title='Champion verified from the official series announcement';}
      else if(protectedMode)content.insertAdjacentHTML('beforeend','<strong>Standings Hidden</strong><small>Catch Up at Your Own Pace</small>');
      else if(leaders.length){content.classList.toggle('snapshot-multiclass',leaders.length>1);leaders.forEach(el=>{
        const name=el.querySelector('p>strong')?.textContent||'',points=el.querySelector('p>small')?.textContent||'';
        const row=document.createElement('span');row.className='snapshot-leader';
        row.innerHTML=`<span>${['WEC','IMSA','CARS Tour'].includes(s)?`<small>${escapeHtml(el.querySelector('p>span')?.textContent.replace(' Championship Leaders','')||'')}</small>`:''}<strong>${escapeHtml(name)}</strong><small>${escapeHtml(points.replace(/ · Round.*$/,''))}</small>${leaders.length===1&&gap(s)?`<small class="snapshot-gap">${escapeHtml(gap(s))}</small>`:''}</span>`;
        const frame=document.createElement('span');frame.className='snapshot-photo';frame.innerHTML=silhouette;row.prepend(frame);const photo=el.querySelector('img.f1-home-portrait');if(photo){const copy=photo.cloneNode();copy.removeAttribute('class');copy.className='snapshot-portrait';copy.alt='';copy.onerror=()=>{copy.hidden=true;};frame.replaceChildren(copy);copy.onerror=()=>{frame.innerHTML=silhouette;};}
        content.appendChild(row);
      });}
      else content.insertAdjacentHTML('beforeend',`<strong>${season.start>localIsoDate(now)?'Awaiting Season Start':'Standings Unavailable'}</strong><small>${season.start>localIsoDate(now)?escapeHtml(formatDate(season.start)):'Check the Series Hub for Updates'}</small>`);
      button.setAttribute('aria-label',`${s}: ${content.textContent}. Open ${useChampion?'series hub':'standings'}`);
      button.onclick=()=>useChampion?showSeries(s):open(s);grid.appendChild(button);
    });
    // Use the rendered champion state, including spoiler protection and season checks.
    [...grid.children].sort((a,b)=>Number(a.classList.contains('snapshot-champion'))-Number(b.classList.contains('snapshot-champion'))).forEach(card=>grid.appendChild(card));
    RaceDisplay.disclosure(host,grid,'championship');
  }
  return {render};
})();
