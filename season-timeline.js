/* Compact schedule progress; never fetches an extra feed or exposes results. */
const SeasonTimeline = (() => {
  const history = new Map();
  const chaseSeries = new Set(['NASCAR Cup Series', "O'Reilly Auto Parts Series", 'Craftsman Truck Series']);
  function remember(races) {
    races.forEach(r => history.set([r.series, r.raceId || r.event, r.date].join('|'), {...r}));
  }
  function seasonOf(r) {
    if (r.season) return String(r.season);
    const year = Number(r.date.slice(0, 4));
    return r.series === 'Formula E' ? String(year - (Number(r.date.slice(5, 7)) < 8 ? 1 : 0)) : String(year);
  }
  function model(series, now = new Date()) {
    const current = allRaces.filter(r => r.series === series);
    const seasons = new Map();
    // Keep a replaced Formula E season available during the offseason.
    const retained = [...history.values()].filter(r => r.series === series && !current.some(c => usableRaceDate(c.date) && seasonOf(c) === seasonOf(r)));
    const seen = new Set();
    [...retained, ...current].filter(r => usableRaceDate(r.date) && !/cancelled|canceled/i.test(r.status || r.notes || '')).sort((a,b) => raceStartTime(a)-raceStartTime(b) || a.date.localeCompare(b.date)).forEach(r => {
      const key = [r.raceId || r.event, r.date].join('|');
      if (seen.has(key)) return; seen.add(key);
      const season = seasonOf(r); if (!seasons.has(season)) seasons.set(season, []); seasons.get(season).push(r);
    });
    const groups = [...seasons.entries()].map(([season,races]) => ({season,races:races.sort((a,b)=>a.date.localeCompare(b.date)||raceStartTime(a)-raceStartTime(b))})).sort((a,b)=>a.races[0].date.localeCompare(b.races[0].date));
    if (!groups.length) return null;
    const today = localIsoDate(now), upcoming = groups.find(g => g.races[0].date > today);
    let selected = groups.filter(g => g.races[0].date <= today).at(-1);
    if (upcoming && (!selected || upcoming.races[0].date <= addDays(today,30))) selected = upcoming;
    selected ||= groups[0];
    const {races,season} = selected, start=races[0].date, end=races.at(-1).date;
    const complete = races.map(r => {
      if (r.completed === true) return true;
      if (typeof AcademyHub!=='undefined' && series==='F1 Academy' && AcademyHub.raceCompleted(r)) return true;
      if (typeof F2Hub!=='undefined' && series==='Formula 2' && F2Hub.raceCompleted(r)) return true;
      if (typeof WECHub!=='undefined' && series==='WEC' && WECHub.raceCompleted(r)) return true;
      if (typeof NascarCompetition!=='undefined' && chaseSeries.has(series) && NascarCompetition.raceCompleted(r)) return true;
      if (series === 'Formula 1' && typeof f1Store !== 'undefined' && f1Store.results.rows.some(x => x['Race Date UTC'] === r.date && Number(x.Position)>0)) return true;
      // Date-only schedules are conservative: today's race stays unfilled.
      // Endurance races must also have passed their scheduled duration.
      const startTime = raceStartTime(r);
      const finish = (Number.isFinite(startTime) ? startTime : raceStartTime({...r,date:addDays(r.date,1),time:'12:00 AM'})) + Number(r.durationHours || 0)*3600000;
      return r.date < today && (!Number(r.durationHours) || (Number.isFinite(finish) && finish <= now.getTime()));
    });
    const done=complete.filter(Boolean).length, pre=start>today;
    const label=pre ? (start<=addDays(today,30) ? 'Season Begins '+formatDate(start) : 'Offseason · Next Season '+formatDate(start)) : done===races.length ? 'Season Completed' : '';
    return {races,complete,done,start,end,season,label,chase:races.findIndex(r=>chaseSeries.has(series)&&/\bchase\b/i.test(r.round||''))};
  }
  function render(now = new Date()) {
    const host=document.getElementById('season-timeline'); if(!host)return;
    const items=seriesSettings.order.filter(s=>!seriesSettings.hidden.includes(s)).map(series=>({series,data:model(series,now)})).filter(x=>x.data);
    host.hidden=!items.length;
    host.innerHTML='<div class="timeline-heading"><h2 id="timeline-heading">Season Timeline</h2><p>Your Series at a Glance</p></div><div class="timeline-list"></div><p class="timeline-note">One bar per scheduled race · Progress follows published results where available, otherwise past race dates.</p>';
    const list=host.querySelector('.timeline-list');
    items.forEach(({series,data:d})=>{
      const button=document.createElement('button');button.type='button';button.className='timeline-row';button.style.setProperty('--series-color',themeFor(series)[0]);
      const season=series==='Formula E'?d.season+'/'+String(Number(d.season)+1).slice(-2):d.season;
      button.setAttribute('aria-label',`${series}, ${season}: ${d.done} of ${d.races.length} races completed. ${d.label}. Open series hub`);
      button.innerHTML=`<span class="timeline-logo">${seriesLogoMarkup(series)}</span><span class="timeline-info"><strong>${escapeHtml(series)}</strong><small>${escapeHtml(season)} · ${escapeHtml(formatDate(d.start).replace(/, \d{4}$/, ''))} – ${escapeHtml(formatDate(d.end).replace(/, \d{4}$/, ''))}</small>${d.label?`<small class="timeline-status">${escapeHtml(d.label)}</small>`:''}</span><span class="timeline-progress"><span class="timeline-chase-track" aria-hidden="true">${d.chase>=0?`<span style="margin-left:${d.chase/d.races.length*100}%;width:${(d.races.length-d.chase)/d.races.length*100}%">The Chase</span>`:''}</span><span class="timeline-bars" aria-hidden="true">${d.races.map((r,i)=>`<i class="${d.complete[i]?'is-complete ':''}${d.chase>=0&&i>=d.chase?'is-chase':''}" title="${escapeHtml(r.event)} · ${escapeHtml(formatDate(r.date))}"></i>`).join('')}</span></span><span class="timeline-count">${d.done}<span>/${d.races.length}</span></span><span class="timeline-arrow" aria-hidden="true">›</span>`;
      button.onclick=()=>showSeries(series);list.appendChild(button);
    });
  }
  return {render,model,remember};
})();
