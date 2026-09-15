/* Event identity and schedule lifecycle, independent of rendering/transport. */
(function(root){
 'use strict';
 function matches(race,session){
  if(!race||!session)return false;
  // A sprint/practice snapshot must never populate a Grand Prix race hub.
  if(session.sessionName && session.sessionName!=='Race')return false;
  if(String(race.trackId)!==String(session.trackId))return false;
  if(session.meetingId&&race.raceId&&/^\d+$/.test(String(race.raceId)))return String(race.raceId)===String(session.meetingId);
  const start=Date.parse(session.startTime),date=Date.parse(race.date+'T12:00:00Z');
  return Number.isFinite(start)&&Number.isFinite(date)&&Math.abs(start-date)<24*3600000;
 }
 function phase({race,session,start,now=Date.now(),fresh=false,hasResults=false}){
  const same=matches(race,session);
  if(hasResults||(same&&session.status==='finished'))return 'concluded';
  if(same&&session.isLive&&fresh)return 'live';
  if(Number.isFinite(start)){
   if(now<start-3600000)return 'before';
   if(now<start)return 'soon';
   // This is a discovery window, not an assertion that racing lasted six hours.
   if(now<=start+6*3600000)return 'waiting';
   return 'past';
  }
  const day=Date.parse(race?.date+'T12:00:00Z');
  if(Number.isFinite(day)&&now>day+36*3600000)return 'past';
  return 'unscheduled';
 }
 root.RaceLiveLifecycle={matches,phase};
})(globalThis);
