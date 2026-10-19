// Pure reusable queries for future research. No production model dependency.
const {aggregate}=require('./reading-analysis');
const valid=v=>Number.isInteger(v)&&v>=0;
function select(matches,{before,season,competition,last,officialOnly=true}={}){
 const rows=matches.filter(r=>(!officialOnly||r.officialCompetition===true)&&(!before||r.date<before)&&(!season||r.season===season)&&(!competition||r.competition===competition)).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
 return Number.isInteger(last)?rows.slice(0,last):rows;
}
function rate(rows,key,predicate){const values=rows.filter(r=>valid(r[key])&&!r.disputedMetrics?.includes(key));const count=values.filter(r=>predicate(r[key])).length;return {count,n:values.length,frequency:values.length?count/values.length:null};}
function describe(rows){
 const paired=rows.filter(r=>valid(r.fouls)&&valid(r.yellowCards)&&!r.disputedMetrics?.some(k=>['fouls','yellowCards'].includes(k)));
 const f=paired.reduce((a,r)=>a+r.fouls,0),y=paired.reduce((a,r)=>a+r.yellowCards,0);
 const distribution=key=>Object.fromEntries([...new Set(rows.filter(r=>valid(r[key])).map(r=>r[key]))].sort((a,b)=>a-b).map(v=>[v,rate(rows,key,x=>x===v)]));
 const sides={};
 for(const side of ['home','away']){
  const sample=rows.flatMap(r=>{const normalized=r.observations?.find(o=>o.kind==='normalized-archive')?.original.teamStats?.[side];if(!normalized)return [];
   const mapped={yellowCards:normalized.yellowCards,directRedCards:normalized.straightRedCards,secondYellowCards:normalized.secondYellowCards,fouls:normalized.fouls,penaltiesAwarded:null};
   mapped.dismissals=valid(mapped.directRedCards)&&valid(mapped.secondYellowCards)?mapped.directRedCards+mapped.secondYellowCards:null;
   for(const k of Object.keys(mapped))if(r[k]===null||r.disputedMetrics?.includes(k))mapped[k]=null;
   return [mapped];
  });sides[side]={averages:aggregate(sample),matches:sample.length};
 }
 return {matches:rows.length,averages:aggregate(rows),dismissalFrequency:rate(rows,'dismissals',v=>v>0),yellowFrequency:rate(rows,'yellowCards',v=>v>0),yellowDistribution:distribution('yellowCards'),dismissalDistribution:distribution('dismissals'),foulYellowRatio:{n:paired.length,foulsPerYellow:y>0?f/y:null,yellowsPerFoul:f>0?y/f:null},homeAway:sides};
}
function profileStatistics(matches,{before,season='2026/27'}={}){
 const all=select(matches,{before}),byCompetition={};
 for(const competition of [...new Set(all.map(r=>r.competition).filter(Boolean))])byCompetition[competition]=describe(select(all,{competition}));
 const timeline={};for(const month of [...new Set(all.map(r=>r.date.slice(0,7)))].sort())timeline[month]=describe(all.filter(r=>r.date.startsWith(month)));
 return {before:before||null,season,all:describe(all),seasonal:describe(select(all,{season})),last5:describe(select(all,{last:5})),last10:describe(select(all,{last:10})),last20:describe(select(all,{last:20})),byCompetition,timeline};
}
module.exports={select,rate,describe,profileStatistics};
