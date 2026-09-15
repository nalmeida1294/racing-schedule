/* Direct, unauthenticated SignalR Core connection. Standard WebSocket transport;
 * no negotiation request, proxy, credentials, or security overrides.
 * Snapshot and delta normalization are separate from the UI.
 */
(function(root){
 'use strict';
 const topics=['Heartbeat','SessionInfo','SessionStatus','TrackStatus','LapCount','DriverList','TimingData','TimingAppData','WeatherData','RaceControlMessages'];
 const num=v=>v===undefined||v===null||v===''?null:Number.isFinite(Number(v))?Number(v):null;
 const utc=s=>typeof s==='string'?s.replace(/(\.\d{3})\d+/,'$1')+(/Z$|[+-]\d\d:\d\d$/.test(s)?'':'Z'):'';
 const lap=s=>{if(!s)return null;const parts=String(s).split(':').map(Number);return parts.every(Number.isFinite)?parts.reduce((a,b)=>a*60+b,0):null;};
 function merge(target,patch){
  if(patch===null||typeof patch!=='object')return patch;
  if(!target||typeof target!=='object')target=Array.isArray(patch)?[]:{};
  for(const key of Object.keys(patch)){
   if(['__proto__','constructor','prototype','_kf'].includes(key))continue;
   target[key]=merge(target[key],patch[key]);
  }
  return target;
 }
 function normalize(raw,received={},now=Date.now()){
  const info=raw.SessionInfo,heartbeat=utc(raw.Heartbeat?.Utc),hb=Date.parse(heartbeat);
  const base={schemaVersion:1,mode:'live',updatedAt:heartbeat,session:null,drivers:[],weather:null,events:[],fastestLap:null,feeds:{}};
  for(const topic of topics)base.feeds[topic]={updatedAt:received[topic]||null,error:raw[topic]===undefined?'Unavailable':null};
  if(!info?.Key)return base;
  const m=info.Meeting||{},ss=raw.SessionStatus?.Status||info.SessionStatus;
  const finished=['Ends','Finished','Finalised'].includes(ss)||info.SessionStatus==='Finalised';
  const started=ss==='Started',suspended=['Aborted','Suspended'].includes(ss);
  const flags={'1':'green','2':'yellow','4':'safety_car','5':'red_flag','6':'vsc','7':'vsc'};
  const status=finished?'finished':suspended?'suspended':!started?'not_started':flags[String(raw.TrackStatus?.Status)]||'unknown';
  const recent=Number.isFinite(hb)&&now-hb<45000&&now-hb>=-10000;
  const offset=String(info.GmtOffset||'00:00:00').slice(0,5);
  const start=info.StartDate?info.StartDate+(/Z$|[+-]\d\d:\d\d$/.test(info.StartDate)?'':(offset.startsWith('-')?'':'+')+offset):'';
  const withinSession=Number.isFinite(Date.parse(start))&&now>=Date.parse(start)&&now-Date.parse(start)<18*3600000;
  base.session={id:String(info.Key),meetingId:String(m.Key||''),sessionName:info.Name||'',series:'Formula 1',grandPrixName:m.Name||'Formula 1',country:m.Country?.Name||'',countryCode:m.Country?.Code||'',circuitName:m.Circuit?.ShortName||m.Location||'',trackId:String(m.Circuit?.Key||''),startTime:start,currentLap:num(raw.LapCount?.CurrentLap),totalLaps:num(raw.LapCount?.TotalLaps),status,isLive:info.Type==='Race'&&!finished&&(started||suspended)&&recent&&withinSession};
  const lines=raw.TimingData?.Withheld?{}:raw.TimingData?.Lines||{};
  const driverList=raw.DriverList||{};
  base.drivers=Object.entries(driverList).filter(([id,d])=>/^\d+$/.test(id)&&d).map(([id,d])=>{
   const t=lines[id]||{},a=raw.TimingAppData?.Lines?.[id]||{};
   const stints=Object.entries(a.Stints||{}).filter(([k,v])=>/^\d+$/.test(k)&&v).sort((a,b)=>Number(a[0])-Number(b[0]));
   const st=stints.at(-1)?.[1],position=num(t.Position),grid=num(a.GridPos);
   return {id,number:id,abbreviation:d.Tla||id,name:d.FullName||d.BroadcastName||id,team:d.TeamName||'',color:/^[0-9a-f]{6}$/i.test(d.TeamColour||'')?'#'+d.TeamColour:'#9aa3ae',position,gap:t.GapToLeader??null,interval:t.IntervalToPositionAhead?.Value??null,tyre:st?.Compound||null,tyreAge:st?num(st.TotalLaps):null,lastLap:lap(t.LastLapTime?.Value),bestLap:lap(t.BestLapTime?.Value),positionChange:position>0&&grid>0?grid-position:null,completedLaps:num(t.NumberOfLaps),retired:t.Retired===true,inPit:t.InPit===true,bestLapNumber:num(t.BestLapTime?.Lap)};
  }).sort((a,b)=>(a.position??999)-(b.position??999));
  if(raw.TimingData?.Withheld)base.feeds.TimingData.error='Timing withheld by provider';
  const best=base.drivers.filter(d=>d.bestLap>0).sort((a,b)=>a.bestLap-b.bestLap)[0];
  if(best)base.fastestLap={driverId:best.id,name:best.name,seconds:best.bestLap,lap:best.bestLapNumber};
  const w=raw.WeatherData;
  if(w)base.weather={updatedAt:received.WeatherData||null,air:num(w.AirTemp),track:num(w.TrackTemp),humidity:num(w.Humidity),windKmh:num(w.WindSpeed)===null?null:Number(w.WindSpeed)*3.6,windDirection:num(w.WindDirection),rain:String(w.Rainfall)==='1'?true:String(w.Rainfall)==='0'?false:null};
  base.events=Object.entries(raw.RaceControlMessages?.Messages||{}).filter(([id,e])=>e&&e.Message).map(([id,e])=>{
   const [type,tone]=root.RaceLiveAdapter.eventType({message:e.Message,flag:e.Flag});
   return {id:String(info.Key)+':'+id,timestamp:utc(e.Utc),lap:num(e.Lap),type,tone,message:e.Message,driver:e.RacingNumber?String(e.RacingNumber):null};
  }).sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp));
  return base;
 }
 class Client {
  constructor(onUpdate){this.onUpdate=onUpdate;this.raw={};this.received={};this.connection='idle';this.attempt=0;this.stopped=true;}
  publish(){this.onUpdate(normalize(this.raw,this.received),this.connection);}
  start(){if(!this.stopped)return;this.stopped=false;this.connect();}
  stop(){this.stopped=true;clearTimeout(this.retry);clearTimeout(this.watchdog);clearInterval(this.ping);clearTimeout(this.renderTimer);this.ws?.close();this.ws=null;}
  connect(){
   if(this.stopped)return;
   this.connection='connecting';this.publish();let handshaken=false,buffer='';
   const ws=this.ws=new WebSocket('wss://livetiming.formula1.com/signalrcore');
   const send=msg=>{if(ws.readyState===1)ws.send(JSON.stringify(msg)+'\x1e');};
   const watchdog=()=>{clearTimeout(this.watchdog);this.watchdog=setTimeout(()=>ws.close(),35000);};
   watchdog();
   ws.onopen=()=>send({protocol:'json',version:1});
   ws.onmessage=e=>{
    if(this.ws!==ws||this.stopped)return;
    watchdog();buffer+=String(e.data);
    const parts=buffer.split('\x1e');buffer=parts.pop();
    if(buffer.length>2000000){ws.close();return;}
    for(const part of parts){
     if(!part)continue;let msg;try{msg=JSON.parse(part);}catch{continue;}
     if(!handshaken){if(msg.error){ws.close();return;}handshaken=true;send({type:1,invocationId:'1',target:'Subscribe',arguments:[topics]});this.ping=setInterval(()=>send({type:6}),15000);continue;}
     if(msg.type===7||msg.error){ws.close();return;}
     if(msg.type===3&&msg.invocationId==='1'){
      if(!msg.result||typeof msg.result!=='object'){ws.close();return;}
      this.raw=merge({},msg.result);this.received={};
      const hb=utc(this.raw.Heartbeat?.Utc)||null;
      for(const topic of topics)if(this.raw[topic])this.received[topic]=hb;
      this.connection='connected';this.attempt=0;
     }else if(msg.type===1&&String(msg.target).toLowerCase()==='feed'){
      const [topic,patch,time]=msg.arguments||[];
      if(!topics.includes(topic)||!patch||typeof patch!=='object')continue;
      if(topic==='SessionInfo'&&patch.Key&&String(patch.Key)!==String(this.raw.SessionInfo?.Key)){this.raw={};this.received={};ws.close();return;}
      this.raw[topic]=patch._kf?merge({},patch):merge(this.raw[topic],patch);
      this.received[topic]=utc(time)||utc(this.raw.Heartbeat?.Utc)||null;
     }else continue;
     // Batch rapid topic changes; individual DOM regions are reconciled by the UI.
     if(!this.renderTimer)this.renderTimer=setTimeout(()=>{this.renderTimer=null;this.publish();},250);
    }
   };
   ws.onerror=()=>ws.close();
   ws.onclose=()=>{
    clearTimeout(this.watchdog);clearInterval(this.ping);
    if(this.ws!==ws||this.stopped)return;
    this.connection='unavailable';this.publish();
    this.retry=setTimeout(()=>this.connect(),Math.min(60000,2000*2**Math.min(this.attempt++,5)));
   };
  }
 }
 root.RaceLiveSignalR={Client,normalize,merge,lap,utc};
})(globalThis);
