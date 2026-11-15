'use strict';
const fs=require('node:fs'),path=require('node:path');
function scope(root,files){
  const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
  const serieA=read('data/normalized/matches.json').filter(f=>f.competition==='serie-a');
  const champions=read('data/normalized/champions-league-2026-27.json').fixtures;
  const finishedIds=new Set(serieA.filter(f=>f.status==='finished').map(f=>f.id));
  const closedDays=fixtures=>new Set([...new Set(fixtures.map(f=>f.matchday))].filter(day=>fixtures.filter(f=>f.matchday===day).every(f=>f.status==='finished')));
  const saDays=closedDays(serieA),clDays=closedDays(champions),result=new Map();
  for(const file of files){
    const match=file.match(/^data\/generated\/(?:readings\/(?:matches|catalogs)|reading-bench-starter-scenarios)\/([^/]+)\.json$/);
    if(match&&finishedIds.has(match[1])){result.set(file,'serie-a');continue;}
    const day=file.match(/^data\/normalized\/(?:schedina|predictions)-md(\d{2})\.json$/);
    if(day&&saDays.has(Number(day[1]))){result.set(file,'serie-a');continue;}
    const cl=file.match(/^data\/normalized\/(?:champions-[^/]*|schedina-champions-)md(\d{2})[^/]*\.json$/);
    if(cl&&clDays.has(Number(cl[1]))){result.set(file,'champions');continue;}
    if(file.startsWith('data/derived/champions-md03/')&&file.endsWith('.json')&&clDays.has(3))result.set(file,'champions');
  }
  return result;
}
module.exports={scope};
