/* OpenF1 adapter. No DOM dependencies; input contains full per-session snapshots.
 * The backend owns authentication, collection, live confirmation and caching.
 * Never treat the daily sessions timetable as proof of a live race.
 */
(function(root){
  'use strict';
  const number=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
  const timestamp=v=>Number.isFinite(Date.parse(v))?Date.parse(v):0;
  const sorted=rows=>[...(rows||[])].sort((a,b)=>timestamp(a.date)-timestamp(b.date));
  const latestBy=(rows,key='driver_number')=>new Map(sorted(rows).map(r=>[String(r[key]),r]));
  function eventType(r){
    const m=String(r.message||'').toUpperCase(),f=String(r.flag||'').toUpperCase();
    if(/VIRTUAL SAFETY CAR|\bVSC\b/.test(m))return [/ENDING/.test(m)?'VSC ending':'VSC','yellow'];
    if(/SAFETY CAR/.test(m))return [/IN THIS LAP|ENDING/.test(m)?'Safety car ending':'Safety car','yellow'];
    if(f==='RED'||/RED FLAG/.test(m))return ['Red flag','red'];
    if(f==='DOUBLE YELLOW')return ['Double yellow','yellow'];
    if(f==='YELLOW')return ['Yellow flag','yellow'];
    if(f==='GREEN'||/GREEN LIGHT|ALL CLEAR/.test(m))return ['Green flag','green'];
    if(/PENALTY/.test(m))return ['Penalty','red'];
    if(/INVESTIGAT|NOTED/.test(m))return ['Investigation','purple'];
    if(/DELETED/.test(m))return ['Lap deleted','neutral'];
    if(/TRACK LIMIT/.test(m))return ['Track limits','neutral'];
    return ['Race control','neutral'];
  }
  function trackStatus(events){
    let status='unknown';const yellowSectors=new Set();
    for(const e of sorted(events)){
      const m=String(e.message||'').toUpperCase(),f=String(e.flag||'').toUpperCase();
      if(e.scope==='Driver')continue;
      if(e.scope==='Sector'){
        if(f.includes('YELLOW'))yellowSectors.add(String(e.sector));
        if(f==='GREEN'||f==='CLEAR')yellowSectors.delete(String(e.sector));
        continue;
      }
      if(f==='CHEQUERED'||/SESSION (FINISHED|ENDED)/.test(m)){status='finished';continue;}
      if(status==='finished')continue;
      if(/SUSPENDED/.test(m)){status='suspended';continue;}
      if(f==='RED'||/RED FLAG/.test(m)){status='red_flag';continue;}
      if(/VIRTUAL SAFETY CAR|\bVSC\b/.test(m)){status='vsc';continue;}
      if(/SAFETY CAR/.test(m)&&!/WITHDRAWN|RETURNED/.test(m)){status='safety_car';continue;}
      if(f==='GREEN'||/GREEN LIGHT|ALL CLEAR|SAFETY CAR WITHDRAWN/.test(m)){status='green';yellowSectors.clear();continue;}
      if(f.includes('YELLOW')&&!['vsc','safety_car','red_flag','suspended'].includes(status))status='yellow';
    }
    return status==='green'&&yellowSectors.size?'yellow':status;
  }
  function normalize(raw){
    const meta=raw.meta||{},s=raw.session;
    if(!s)return {schemaVersion:1,mode:meta.mode||'live',updatedAt:meta.updatedAt||'',session:null,drivers:[],weather:null,events:[],fastestLap:null,feeds:meta.feeds||{}};
    const rows=key=>(raw[key]||[]).filter(r=>String(r.session_key)===String(s.session_key));
    const positions=latestBy(rows('position')),intervals=latestBy(rows('intervals'));
    const grid=new Map(rows('starting_grid').map(r=>[String(r.driver_number),r]));
    const stints=new Map([...rows('stints')].sort((a,b)=>a.stint_number-b.stint_number).map(r=>[String(r.driver_number),r]));
    const controls=sorted(rows('race_control'));
    const deleted=new Set();
    for(const r of controls){
      const m=String(r.message||'').toUpperCase(),lap=m.match(/LAP\s+(\d+)\s+TIME/);
      if(r.driver_number&&lap){const key=r.driver_number+':'+lap[1];if(/DELETED/.test(m))deleted.add(key);if(/REINSTATED/.test(m))deleted.delete(key);}
    }
    const laps=rows('laps').filter(r=>number(r.lap_duration)>0&&!deleted.has(r.driver_number+':'+r.lap_number));
    const drivers=rows('drivers').map(d=>{
      const id=String(d.driver_number),p=positions.get(id),i=intervals.get(id),stint=stints.get(id);
      const dl=laps.filter(l=>String(l.driver_number)===id).sort((a,b)=>a.lap_number-b.lap_number);
      const last=dl.at(-1),best=dl.length?Math.min(...dl.map(l=>Number(l.lap_duration))):null;
      const completed=last?number(last.lap_number):null,age=stint&&completed!==null&&number(stint.tyre_age_at_start)!==null?Math.max(0,completed-Number(stint.lap_start)+1)+Number(stint.tyre_age_at_start):null;
      const start=number(grid.get(id)?.position),pos=number(p?.position);
      return {id,number:id,abbreviation:d.name_acronym||id,name:d.full_name||id,team:d.team_name||'',color:/^[0-9a-f]{6}$/i.test(d.team_colour||'')?'#'+d.team_colour:'#9aa3ae',position:pos,gap:i?.gap_to_leader??null,interval:i?.interval??null,tyre:stint?.compound||null,tyreAge:age,lastLap:last?Number(last.lap_duration):null,bestLap:best,positionChange:start>0&&pos>0?start-pos:null,completedLaps:completed};
    }).sort((a,b)=>(a.position??999)-(b.position??999));
    const w=sorted(rows('weather')).at(-1),status=meta.status||trackStatus(controls);
    const fastest=[...laps].sort((a,b)=>a.lap_duration-b.lap_duration)[0];
    return {schemaVersion:1,mode:meta.mode||'live',updatedAt:meta.updatedAt||'',session:{id:String(s.session_key),series:'Formula 1',grandPrixName:meta.grandPrixName||s.meeting_name||'Formula 1',country:s.country_name||'',countryCode:meta.countryCode||'',circuitName:s.circuit_short_name||'',trackId:String(s.circuit_key||''),startTime:s.date_start,endTime:s.date_end,currentLap:number(meta.currentLap),totalLaps:number(meta.totalLaps),status,isLive:meta.liveConfirmed===true&&['Race','Sprint'].includes(s.session_name)&&!['finished','not_started'].includes(status)},drivers,weather:w?{updatedAt:w.date,air:number(w.air_temperature),track:number(w.track_temperature),humidity:number(w.humidity),windKmh:number(w.wind_speed)===null?null:Number(w.wind_speed)*3.6,windDirection:number(w.wind_direction),rain:w.rainfall===1?true:w.rainfall===0?false:null}:null,events:controls.map((r,i)=>{const [type,tone]=eventType(r);return {id:[s.session_key,r.date,r.message,r.driver_number,i].join('|'),timestamp:r.date,lap:number(r.lap_number),type,tone,message:String(r.message||''),driver:r.driver_number?String(r.driver_number):null};}).reverse(),fastestLap:fastest?{driverId:String(fastest.driver_number),name:drivers.find(d=>d.id===String(fastest.driver_number))?.name||String(fastest.driver_number),seconds:Number(fastest.lap_duration),lap:Number(fastest.lap_number)}:null,feeds:meta.feeds||{}};
  }
  root.RaceLiveAdapter={normalize,trackStatus,eventType};
})(globalThis);
