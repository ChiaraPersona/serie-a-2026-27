"use strict";
// Secondary totals are kept separate from match evidence: never distribute a season total over games.
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const {analysis,rawRoot}=require('./recover-champions-season-shots.cjs');
const {normalize}=require('./build-champions-player-stats');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const gz=p=>JSON.parse(zlib.gunzipSync(fs.readFileSync(p)));
const save=(p,d)=>fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n');
const decode=s=>s.replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n));
const clean=s=>decode(s.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const competitionMap={2:'uefa.champions',8:'eng.1',27:'eng.league_cup',564:'esp.1',3412:'fifa.cwc',444:'nor.1',82:'ger.1',208:'bel.1',384:'ita.1',600:'tur.1',72:'ned.1',181:'aut.1',301:'fra.1',462:'por.1',609:'ukr.1'};
function main(){
 const candidate=read(path.join(analysis,'shooting-candidate.json'));
 const base=path.join(rawRoot,'secondary');
 const errors=[],secondary=[],official=[];
 for(const teamId of new Set(candidate.players.map(p=>p.teamId))){
   const files=[`statz-${teamId}-retry.json.gz`,`statz-${teamId}.json.gz`].map(f=>path.join(base,f));
   let raw,props;
   for(const file of files.filter(fs.existsSync)){raw=gz(file);const match=/data-page="([^"]+)"/.exec(raw.body||'');if(match){props=JSON.parse(decode(match[1])).props;break;}}
   if(!props?.rows)continue;
   if(props.currentSeason!=='2026/2027'||!/^2026-/.test(props.seo?.date_modified||'')||props.seo.date_modified>'2026-10-20'){errors.push({teamId,reason:'SECONDARY_SEASON_OR_CUTOFF_UNVERIFIED'});continue;}
   for(const c of props.competitions||[]){
     const file=path.join(base,`statz-${teamId}-competition-${c.id}.json.gz`);if(!fs.existsSync(file))continue;
     const sliced=gz(file),league=competitionMap[c.id];if(!league){errors.push({teamId,competition:c.id,reason:'COMPETITION_MAPPING_MISSING'});continue;}
     // The provider includes the previous Club World Cup in some current-page totals.
     // It has no dated 2026/27 club evidence here and must not enter this season.
     if(league==='fifa.cwc')continue;
     for(const row of sliced.payload.rows||[]){
       const exact=candidate.players.filter(p=>p.teamId===teamId&&normalize(p.name)===normalize(row.name));
       if(exact.length!==1)continue;
       if(!Number.isInteger(row.sh)||!Number.isInteger(row.sot)||row.sh<0||row.sot<0||row.sot>row.sh||!(row.apps>0)){errors.push({teamId,name:row.name,reason:'SECONDARY_NUMBERS_INVALID'});continue;}
       const p=exact[0],primary=p.competitions.find(c=>c.league===league&&c.providerTeamId===p.providerTeamId);
       const comparison=!primary?'new-competition-evidence':primary.appearances!==row.apps?'appearance-count-differs':primary.shots===null||primary.shotsOnTarget===null?'fills-missing-shooting-total':primary.shots===row.sh&&primary.shotsOnTarget===row.sot?'agrees':'shooting-total-conflict';
       const value={teamId,playerId:p.playerId,name:p.name,provider:'Statz/Sportmonks',providerPlayerId:String(row.id),providerTeamId:String(row.team_id),league,competition:c.name,appearances:row.apps,minutes:row.mins,shots:row.sh,shotsOnTarget:row.sot,asOf:props.seo.date_modified,sourceUrl:sliced.url,retrievedAt:sliced.retrievedAt,comparison,primary:primary?{appearances:primary.appearances,shots:primary.shots,shotsOnTarget:primary.shotsOnTarget}:null};
       secondary.push(value);
     }
   }
 }
 const tableRaw=gz(path.join(base,'slavia-team-shooting.json.gz'));
 for(const table of tableRaw.body.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/g)){
   const headers=[...table[1].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map(m=>/title="([^"]+)"/.exec(m[1])?.[1]||clean(m[1]));
   const sh=headers.indexOf('Střely'),sot=headers.indexOf('Střely na branku'),app=headers.indexOf('Počet odehraných zápasů');if(sh<0||sot<0||app<0)continue;
   for(const row of table[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)){
     const cells=[...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m=>m[1]);if(cells.length!==headers.length)continue;
     const name=clean(cells[1]),targets=candidate.players.filter(p=>p.teamId==='slavia-praha'&&normalize(p.name)===normalize(name));if(targets.length!==1)continue;
     const int=i=>/^\d+$/.test(clean(cells[i]))?Number(clean(cells[i])):null;
     if(int(sh)===null||int(sot)===null||int(sot)>int(sh)||!(int(app)>0))continue;
     secondary.push({teamId:'slavia-praha',playerId:targets[0].playerId,name,provider:'Chance Liga',providerPlayerId:/\/hrac\/(\d+)/.exec(cells[1])?.[1]||null,providerTeamId:'5',league:'cze.1',competition:'Chance Liga',appearances:int(app),shots:int(sh),shotsOnTarget:int(sot),asOf:'2026-10-20',sourceUrl:tableRaw.url,retrievedAt:tableRaw.retrievedAt,comparison:'new-competition-evidence',primary:null});
   }
 }
 const officialDir=path.join(base,'slavia-players');
 for(const file of fs.readdirSync(officialDir)){
   const raw=gz(path.join(officialDir,file)),b=raw.body;
   const name=clean(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(b)?.[1]||'').replace(/^#\d+\s*/, '');
   const exact=candidate.players.filter(p=>p.teamId==='slavia-praha'&&normalize(p.name)===normalize(name));if(exact.length!==1)continue;
   for(const table of b.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/g)){
     const headers=[...table[1].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map(m=>/title="([^"]+)"/.exec(m[1])?.[1]||clean(m[1]));
     const shotHeader=headers.indexOf('Střely celkem'),sotHeader=headers.indexOf('Střely na branku');
     if(shotHeader<0||sotHeader<0)continue;
     // The Utkani header spans date and fixture, so data cells after it have one extra column.
     for(const row of table[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)){
       const cells=[...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m=>m[1]);if(cells.length<5)continue;
       const dm=/^(\d{2})\.(\d{2})\.(\d{4})$/.exec(clean(cells[0]));if(!dm)continue;
       const date=`${dm[3]}-${dm[2]}-${dm[1]}`,matchId=/\/zapas\/(\d+)-/.exec(cells[1])?.[1];
       if(date<'2026-07-01'||date>'2026-10-20'||!matchId)continue;
       const parse=s=>/^\d+$/.test(clean(s||''))?Number(clean(s)):null;
       const shots=parse(cells[shotHeader+1]),sot=parse(cells[sotHeader+1]);
       if(shots===null||sot===null||sot>shots)continue;
       official.push({teamId:'slavia-praha',playerId:exact[0].playerId,name:exact[0].name,provider:'Chance Liga',providerPlayerId:path.basename(file,'.json.gz'),matchId,date,league:'cze.1',shots,shotsOnTarget:sot,sourceUrl:raw.url,retrievedAt:raw.retrievedAt});
     }
   }
 }
 save(path.join(analysis,'secondary-season-totals.json'),secondary);
 save(path.join(analysis,'official-czech-performances.json'),official);
 save(path.join(analysis,'secondary-validation.json'),{rows:secondary.length,comparisons:Object.fromEntries([...Map.groupBy(secondary,r=>r.comparison)].map(([key,rows])=>[key,rows.length])),officialCzechPerformances:official.length,errors});
 console.log(JSON.stringify({secondaryRows:secondary.length,comparisons:Object.fromEntries([...Map.groupBy(secondary,r=>r.comparison)].map(([key,rows])=>[key,rows.length])),officialCzechPerformances:official.length}));
}
main();
