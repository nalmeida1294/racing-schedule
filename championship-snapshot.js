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
  function open(series) {
    return withLoading(()=>series==='Formula 1'?renderF1Hub('standings'):nascarHubSeries.has(series)?renderNascarHub(series,'standings'):series==='Formula 2'?F2Hub.render('standings'):series==='F1 Academy'?AcademyHub.render('standings'):series==='WEC'?WECHub.render('standings'):renderSeriesHub(series),'Opening Standings…');
  }
  function render(now=new Date()) {
    const host=document.getElementById('championship-snapshot');if(!host)return;
    const series=seriesSettings.order.filter(s=>!seriesSettings.hidden.includes(s)&&SeasonTimeline.model(s,now));
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
      const label=protectedMode?'Spoiler Mode':useChampion?archive.season+' Champion':season.start>localIsoDate(now)?'Preseason':season.done===season.races.length?'Latest Standings · Season Completed':'Championship Leader'+(s==='WEC'?'s':'');
      button.innerHTML=`<span class="snapshot-brand">${seriesLogoMarkup(s)}<span>${escapeHtml(s)}</span></span><span class="snapshot-content"><span class="snapshot-label">${escapeHtml(label)}</span></span><span class="snapshot-end" aria-hidden="true">${useChampion?trophy:'›'}</span>`;
      const content=button.querySelector('.snapshot-content');
      if(useChampion){content.insertAdjacentHTML('beforeend',`<strong>${escapeHtml(archive.name)}</strong><small>Season Completed</small>`);button.title='Champion verified from the official series announcement';}
      else if(protectedMode)content.insertAdjacentHTML('beforeend','<strong>Standings Hidden</strong><small>Catch Up at Your Own Pace</small>');
      else if(leaders.length){leaders.forEach(el=>{
        const name=el.querySelector('p>strong')?.textContent||'',points=el.querySelector('p>small')?.textContent||'';
        const row=document.createElement('span');row.className='snapshot-leader';
        row.innerHTML=`<span>${s==='WEC'?`<small>${escapeHtml(el.querySelector('p>span')?.textContent.replace(' Championship Leaders','')||'')}</small>`:''}<strong>${escapeHtml(name)}</strong><small>${escapeHtml(points)}</small></span>`;
        const photo=el.querySelector('img.f1-home-portrait');if(photo){const copy=photo.cloneNode();copy.removeAttribute('class');copy.className='snapshot-portrait';copy.alt='';copy.onerror=()=>{copy.hidden=true;};row.appendChild(copy);}
        content.appendChild(row);
      });}
      else content.insertAdjacentHTML('beforeend',`<strong>${season.start>localIsoDate(now)?'Awaiting Season Start':'Standings Unavailable'}</strong><small>${season.start>localIsoDate(now)?escapeHtml(formatDate(season.start)):'Check the Series Hub for Updates'}</small>`);
      button.setAttribute('aria-label',`${s}: ${content.textContent}. Open ${useChampion?'series hub':'standings'}`);
      button.onclick=()=>useChampion?showSeries(s):open(s);grid.appendChild(button);
    });
  }
  return {render};
})();
