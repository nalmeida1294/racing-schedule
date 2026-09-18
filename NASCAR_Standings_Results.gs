/** Add this COMPLETE file as NASCAR_Standings_Results.gs in the existing project.
 * Run syncNascarStandingsResults once, then installNascarStandingsResultsSync.
 * Requires NASCAR_SYNC.spreadsheetId. Creates three NEW automated tabs only.
 * Do not enter manual data in these tabs. Profile/track/review tabs are untouched.
 */
const NSR = {
  year:new Date().getFullYear(),
  names:{1:'NASCAR Cup Series',2:"O'Reilly Auto Parts Series",3:'Craftsman Truck Series'},
  standings:{name:'NASCAR Standings',headers:['Standing Key','Season','Series ID','Series','Driver ID','Driver Name','Car Number','Manufacturer','Position','Points','Behind Leader','Starts','Wins','Top 5','Top 10','Poles','Laps Led','Updated UTC','Stage Wins','Stage Points']},
  results:{name:'NASCAR Results',headers:['Result Key','Season','Series ID','Series','Race ID','Event','Race Date','Track ID','Driver ID','Driver Name','Team ID','Team Name','Car Number','Manufacturer','Position','Start','Laps','Laps Led','Points','Status','Disqualified','Updated UTC','Stage 1 Position','Stage 1 Points','Stage 2 Position','Stage 2 Points','Stage 3 Position','Stage 3 Points','Race Type','Chase Round','Championship Points','Championship Position']},
  status:{name:'NASCAR Competition Status',headers:['Dataset','Season','Series ID','Series','State','Last Attempt UTC','Last Success UTC','Message']}
};
function nsrFetch_(url) {
  const r=UrlFetchApp.fetch(url,{muteHttpExceptions:true});
  if(r.getResponseCode()!==200)throw new Error('Source returned HTTP '+r.getResponseCode());
  return JSON.parse(r.getContentText());
}
function nsrNumber_(value,label,integer) {
  if(value===null||value===undefined||String(value).trim()===''||!Number.isFinite(Number(value))||(integer&&!Number.isInteger(Number(value))))throw new Error('Invalid '+label);
  return Number(value);
}
function nsrStandings_(data,series,now) {
  if(!Array.isArray(data)||!data.length)throw new Error('Standings not published yet.');
  const seen=new Set();
  const rows=data.map(r=>{
    const id=String(r.driver_id||'');
    if(!id||!r.driver_name||seen.has(id))throw new Error('Missing or duplicate standings driver.');
    seen.add(id);
    const position=nsrNumber_(r.position,'position',true);
    if(position<1)throw new Error('Invalid standings position.');
    const num=k=>nsrNumber_(r[k],k,true);
    return [NSR.year+':'+series+':'+id,NSR.year,series,NSR.names[series],id,r.driver_name,String(r.car_no??''),r.manufacturer||'',position,num('points'),Math.abs(num('delta_leader')),num('starts'),num('wins'),num('top_5'),num('top_10'),num('poles'),num('laps_led'),now,num('stage_1_wins')+num('stage_2_wins')+num('stage_3_wins'),num('stage_points')];
  });
  if(!rows.some(r=>r[8]===1))throw new Error('Standings leader missing.');
  return rows.sort((a,b)=>a[8]-b[8]);
}
function nsrResults_(feed,race,series,now) {
  const detail=(feed.weekend_race||[]).find(r=>Number(r.race_id)===Number(race.race_id)&&Number(r.series_id)===series&&Number(r.race_season)===NSR.year);
  if(!detail||detail.inspection_complete!==true||!Array.isArray(detail.results)||!detail.results.length)throw new Error('Final results not available for '+race.race_id);
  const seen=new Set();
  const rows=detail.results.map(r=>{
    const id=String(r.driver_id||''),team=String(r.team_id||''),key=NSR.year+':'+series+':'+race.race_id+':'+id+':'+team;
    if(!id||!team||!r.driver_fullname||seen.has(key))throw new Error('Invalid or duplicate race entry.');
    seen.add(key);
    const num=k=>nsrNumber_(r[k],k,true);
    return [key,NSR.year,series,NSR.names[series],String(race.race_id),detail.race_name,String(detail.race_date||detail.date_scheduled||'').slice(0,10),String(detail.track_id),id,r.driver_fullname,team,r.team_name||'',String(r.car_number??''),r.car_make||'',num('finishing_position'),num('starting_position'),num('laps_completed'),num('laps_led'),num('points_earned'),r.finishing_status||'',r.disqualified===true?'TRUE':'FALSE',now,'','','','','','','','','',''];
  });
  if(!rows.some(r=>r[14]===1))throw new Error('Race winner missing.');
  const expected=Number(detail.number_of_cars_in_field);
  if(expected>0&&rows.filter(r=>r[14]>0).length<expected)throw new Error('Incomplete field for race '+race.race_id+'. Previous results retained.');
  return rows.sort((a,b)=>(a[14]||999)-(b[14]||999));
}
function nsrStages_(data,race,rows) {
  if(!Array.isArray(data)||!data.length)throw new Error('Stage results not published yet.');
  const stages=new Set();
  data.forEach(stage=>{
    const n=Number(stage.stage_number);
    if(String(stage.race_id)!==String(race.race_id)||![1,2,3].includes(n)||stages.has(n)||!Array.isArray(stage.results))throw new Error('Unexpected stage identity.');
    stages.add(n);
    const seen=new Set(),positions=new Set();
    stage.results.forEach(r=>{
      const pos=nsrNumber_(r.position,'stage position',true),points=nsrNumber_(r.stage_points,'stage points',true);
      const key=String(r.driver_id)+':'+String(r.vehicle_number);
      if(pos<1||points<0||points>10||seen.has(key)||positions.has(pos))throw new Error('Invalid stage result.');
      seen.add(key);positions.add(pos);
      const row=rows.find(x=>String(x[8])===String(r.driver_id)&&String(x[12])===String(r.vehicle_number));
      if(!row)throw new Error('Stage driver not found in race results.');
      row[22+(n-1)*2]=pos;row[23+(n-1)*2]=points;
    });
    if(stage.results.length&&!positions.has(1))throw new Error('Stage winner missing.');
  });
  return rows;
}
function nsrRead_(book,def) {
  const sheet=book.getSheetByName(def.name);
  if(!sheet||!sheet.getLastRow())return [];
  if(def===NSR.standings&&sheet.getLastColumn()===18&&sheet.getRange(1,1,1,18).getDisplayValues()[0].join('|')===def.headers.slice(0,18).join('|'))return sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,18).getValues().filter(r=>r[0]).map(r=>r.concat(['',''])):[];
  // Append-only migration of either prior Results layout.
  if(def===NSR.results&&[22,28].includes(sheet.getLastColumn())) {
    const width=sheet.getLastColumn();
    if(sheet.getRange(1,1,1,width).getDisplayValues()[0].join('|')===def.headers.slice(0,width).join('|'))return sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,width).getValues().filter(r=>r[0]).map(r=>r.concat(Array(def.headers.length-width).fill(''))):[];
  }
  if(sheet.getLastColumn()!==def.headers.length||sheet.getRange(1,1,1,def.headers.length).getDisplayValues()[0].join('|')!==def.headers.join('|'))throw new Error('Unexpected columns in '+def.name+'. No data changed.');
  return sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,def.headers.length).getValues().filter(r=>r[0]):[];
}
function nsrWrite_(book,def,rows) {
  const sheet=book.getSheetByName(def.name)||book.insertSheet(def.name),width=def.headers.length;
  if(sheet.getMaxColumns()<width)sheet.insertColumnsAfter(sheet.getMaxColumns(),width-sheet.getMaxColumns());
  if(sheet.getMaxRows()<rows.length+1)sheet.insertRowsAfter(sheet.getMaxRows(),rows.length+1-sheet.getMaxRows());
  const old=sheet.getLastRow();
  sheet.getRange(1,1,1,width).setValues([def.headers]).setBackground('#18222E').setFontColor('#FFFFFF').setFontWeight('bold').setWrap(true);
  if(rows.length)sheet.getRange(2,1,rows.length,width).setNumberFormat('@').setValues(rows.map(r=>r.map(v=>typeof v==='string'&&/^[=+@]/.test(v)?"'"+v:v))).setBackground('#D9EAF7');
  if(old>rows.length+1)sheet.getRange(rows.length+2,1,old-rows.length-1,width).clearContent();
  sheet.setFrozenRows(1);sheet.setFrozenColumns(1);sheet.setColumnWidths(1,width,145);sheet.getRange('A1').setNote('Automatically imported NASCAR data. Do not enter manual values in this tab.');
}
function nsrChartSnapshots_(results,races,completed,current,fresh,series) {
        const pointsCalendar=races.filter(r=>Number(r.race_type_id)===1).slice().sort((a,b)=>String(a.race_date||a.date_scheduled).localeCompare(String(b.race_date||b.date_scheduled)));
        const regular={1:26,2:24,3:18}[series];
        const completedPoints=pointsCalendar.filter(r=>completed.some(c=>String(c.race_id)===String(r.race_id)));
        const latest=completedPoints.at(-1);
        // Use starts from the same standings snapshot to avoid assigning stale points
        // to a newer result. Never reconstruct gaps by summing race points.
        const aligned=fresh&&current.length&&Math.max(...current.map(r=>Number(r[11])))===completedPoints.length;
        results.filter(r=>Number(r[1])===NSR.year&&Number(r[2])===series).forEach(row=>{
          const race=races.find(r=>String(r.race_id)===String(row[4]));if(!race)return;
          row[28]=Number(race.race_type_id);
          const index=pointsCalendar.findIndex(r=>String(r.race_id)===String(row[4]));
          row[29]=NSR.year===2026&&index>=regular-1?index+1-regular:'';
          if(aligned&&latest&&String(latest.race_id)===String(row[4])&&row[29]!==''&&Number(row[29])>=0) {
            const standing=current.find(r=>String(r[4])===String(row[8]));
            if(standing&&Number(standing[8])<={1:16,2:12,3:10}[series]&&Number(standing[9])>=2000){row[30]=standing[9];row[31]=standing[8];}
          }
        });
}
function syncNascarStandingsResults() {
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(1000)){console.log('Another sync is running. Next scheduled attempt will retry.');return;}
  try {
    const book=SpreadsheetApp.openById(NASCAR_SYNC.spreadsheetId),now=new Date().toISOString();
    let standings=nsrRead_(book,NSR.standings),results=nsrRead_(book,NSR.results),status=nsrRead_(book,NSR.status);
    const report=(dataset,series,error)=>{
      const match=r=>r[0]===dataset&&Number(r[1])===NSR.year&&Number(r[2])===series;
      const old=status.find(match);
      status=status.filter(r=>!match(r));status.push([dataset,NSR.year,series,NSR.names[series],error?'ERROR':'OK',now,error?(old?.[6]||''):now,error?String(error.message).slice(0,500):'Published source data loaded.']);
    };
    let calendar;
    try{calendar=nsrFetch_('https://cf.nascar.com/cacher/'+NSR.year+'/race_list_basic.json');}catch(e){calendar=null;}
    for(const series of [1,2,3]) {
      try {
        const incoming=nsrStandings_(nsrFetch_('https://cf.nascar.com/cacher/'+NSR.year+'/'+series+'/points-feed.json'),series,now);
        standings=standings.filter(r=>!(Number(r[1])===NSR.year&&Number(r[2])===series)).concat(incoming);report('Standings',series);
      }catch(e){report('Standings',series,e);}
      try {
        const races=calendar?.['series_'+series];
        if(!Array.isArray(races)||!races.length)throw new Error('Calendar unavailable. Previous results retained.');
        const completed=races.filter(r=>r.inspection_complete===true&&Number(r.winner_driver_id)>0&&r.total_race_time).sort((a,b)=>String(a.race_date||a.date_scheduled).localeCompare(String(b.race_date||b.date_scheduled)));
        const known=new Set(results.filter(r=>Number(r[1])===NSR.year&&Number(r[2])===series).filter(r=>r[22]!==''&&r[22]!==undefined).map(r=>String(r[4])));
        const recent=new Set(completed.slice(-2).map(r=>String(r.race_id)));
        // Backfill missing races; refresh the latest two each run for corrections.
        const pending=completed.filter(r=>!known.has(String(r.race_id))||recent.has(String(r.race_id)));
        let stageError=null;
        for(const race of pending) {
          if(Number(race.race_season)!==NSR.year||Number(race.series_id)!==series)throw new Error('Unexpected calendar identity.');
          const rows=nsrResults_(nsrFetch_('https://cf.nascar.com/cacher/'+NSR.year+'/'+series+'/'+race.race_id+'/weekend-feed.json'),race,series,now);
          try {
            if(Number(race.race_type_id)===1)nsrStages_(nsrFetch_('https://cf.nascar.com/cacher/'+NSR.year+'/'+series+'/'+race.race_id+'/live-stage-points.json'),race,rows);
          } catch(e) {
            stageError=new Error('Stage results for '+race.race_id+': '+e.message);
            rows.forEach(row=>{const old=results.find(r=>r[0]===row[0]);row.splice(22,6,...(old?old.slice(22,28):['','','','','','']));});
          }
          rows.forEach(row=>{const old=results.find(r=>r[0]===row[0]);if(old){row[30]=old[30];row[31]=old[31];}});
          results=results.filter(r=>!(Number(r[1])===NSR.year&&Number(r[2])===series&&String(r[4])===String(race.race_id))).concat(rows);
        }
        nsrChartSnapshots_(results,races,completed,standings.filter(r=>Number(r[1])===NSR.year&&Number(r[2])===series),status.some(r=>r[0]==='Standings'&&Number(r[1])===NSR.year&&Number(r[2])===series&&r[4]==='OK'&&r[5]===now),series);
        report('Results',series,stageError);
      }catch(e){report('Results',series,e);}
    }
    nsrWrite_(book,NSR.standings,standings);nsrWrite_(book,NSR.results,results);nsrWrite_(book,NSR.status,status);
    book.toast('Standings/results updated. Check NASCAR Competition Status for source availability.','NASCAR',10);
  } finally {lock.releaseLock();}
}
function installNascarStandingsResultsSync() {
  const handler='syncNascarStandingsResults';
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()===handler).forEach(t=>ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger(handler).timeBased().everyMinutes(15).create();
  console.log('NASCAR standings/results will refresh every 15 minutes. Other triggers unchanged.');
}
