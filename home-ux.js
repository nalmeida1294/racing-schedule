/* Shared display helpers. Times use Eastern civil time (EST/EDT), never the device zone. */
const RaceDisplay = (() => {
  const zone = 'America/New_York';
  function time(value){const text=String(value||'Time TBD');return /\d{1,2}:\d{2}\s*(AM|PM)$/i.test(text)?text+' ET':text;}
  function fromVenue(date,timeValue,sourceZone){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!sourceZone)return null;
    const match=String(timeValue||'').match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);if(!match)return null;
    let hour=Number(match[1]);const minute=Number(match[2]);if(match[3]){if(hour<1||hour>12)return null;hour=hour%12+(/PM/i.test(match[3])?12:0);}if(hour>23||minute>59)return null;
    try{
      const [y,m,d]=date.split('-').map(Number),wall=Date.UTC(y,m-1,d,hour,minute);
      const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:sourceZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
      const parts=ms=>Object.fromEntries(fmt.formatToParts(new Date(ms)).map(p=>[p.type,p.value]));
      let instant=wall;for(let i=0;i<3;i++){const p=parts(instant);instant+=wall-Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);}
      const p=parts(instant);if(`${p.year}-${p.month}-${p.day}`!==date||+p.hour!==hour||+p.minute!==minute)return null;
      const value=new Date(instant);return {date:new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(value),time:value.toLocaleTimeString('en-US',{timeZone:zone,hour:'numeric',minute:'2-digit'})+' ET'};
    }catch{return null;}
  }
  function timetable(text,sourceZone){return String(text||'').split(/\r?\n/).map(line=>{
    const date=line.match(/Local Date:\s*(\d{4}-\d{2}-\d{2})/),timeValue=line.match(/Local Time:\s*(\d{1,2}:\d{2}(?:\s*(?:AM|PM))?)/i),converted=date&&timeValue?fromVenue(date[1],timeValue[1],sourceZone):null;
    // Leave informal source prose intact rather than guess its dates or time zone.
    return converted?line.replace(date[0],'Eastern Date: '+converted.date).replace(timeValue[0],'Eastern Time: '+converted.time):line+(line.trim()?' [Source Timetable · Venue Local Time]':'');
  }).join('\n');}
  function checked(value) {
    const date = new Date(value);
    return value && Number.isFinite(date.getTime()) ? date.toLocaleString('en-US', {timeZone:zone,month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' ET' : '';
  }
  function coverage(events, results) {
    const completed = events.filter(e=>results.some(r=>String(r['Event ID'])===String(e['Event ID'])&&Number(r.Position)>0&&/race|feature|sprint/i.test(r.Session||r['Session Type']||'')));
    completed.sort((a,b)=>Number(a.Round)-Number(b.Round)||String(a['Start Date']||'').localeCompare(String(b['Start Date']||'')));
    return completed.at(-1)?.Event || '';
  }
  function feedNote(status, events, results) {
    const latest=coverage(events,results), time=checked(status?.['Updated UTC']);
    return [latest?'Latest Race Results: '+latest:'Race Results: Awaiting Published Classification',time?'Feed Last Synced: '+time:'',status&&status.State!=='OK'?'Some sessions may be missing; available classifications are shown.':''].filter(Boolean).join(' · ');
  }
  function disclosure(host, list, key, limit=4) {
    const items=[...list.children];if(items.length<=limit)return;
    let expanded=false;try{expanded=localStorage.getItem('rc-expanded-'+key)==='true';}catch{}
    const button=document.createElement('button');button.type='button';button.className='home-summary-toggle';
    list.id=key+'-items';button.setAttribute('aria-controls',list.id);
    const update=()=>{items.forEach((item,i)=>item.hidden=!expanded&&i>=limit);button.setAttribute('aria-expanded',String(expanded));button.textContent=expanded?'Show Less':'Show All '+items.length+' Followed Series';};
    button.onclick=()=>{expanded=!expanded;try{localStorage.setItem('rc-expanded-'+key,String(expanded));}catch{}update();};
    host.appendChild(button);update();
  }
  return {time,fromVenue,timetable,checked,coverage,feedNote,disclosure};
})();
