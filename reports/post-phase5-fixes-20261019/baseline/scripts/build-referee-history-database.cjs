// Full informational archive. No prediction/settlement input is written.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const {parseMatches}=require('./referee-stats/import-reading-history');
const {parseOfstats,parseDatasport,parseDetail}=require('./referee-stats/history-parsers.cjs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),valid=v=>Number.isInteger(v)&&v>=0,sum=(...v)=>v.every(valid)?v.reduce((a,b)=>a+b,0):null;
const source=read('data/sources/reading-referee-match-history.json');
const fixtures=read('data/normalized/matches.json').filter(m=>m.competition==='serie-a'&&m.matchday===7);
const refs=new Map(fixtures.map(m=>[m.refereeAssignment.referee.slug,m.refereeAssignment.referee.name]));
const slug=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const aliases={'ac-milan':'milan','hellas-verona':'verona','palermo-fc':'palermo','calcio-padova':'padova','mantova-1911':'mantova','sudtirol-alto-adige':'sudtirol','fc-sudtirol':'sudtirol','as-roma':'roma','inter-milan':'inter','internazionale':'inter','cesena-fc':'cesena','tobyl':'tobol','fk-tobol-kostanay':'tobol','tobol-kostanay':'tobol','fk-partizan':'partizan','qarabag':'qarabag','hapoel-beer-sheva':'hapoel-beer-sheva','sabah-fa':'sabah','sabah-fk':'sabah','atletico-madrid':'atletico-de-madrid','virtus-entella':'entella','venezia-fc':'venezia','nuova-cosenza':'cosenza'};
aliases['hapoel-be-er-sheva']='hapoel-beer-sheva';
Object.assign(aliases,{'bari-1908':'bari','cosenza-calcio':'cosenza','chievo-verona':'chievo','feralpi-salo':'feralpisalo'});
const teamId=n=>aliases[slug(n)]||slug(n);
const key=r=>[r.date.slice(0,10),teamId(r.home),teamId(r.away)].join('|');
const metricKeys=['yellowCards','directRedCards','secondYellowCards','dismissals','fouls','penaltiesAwarded'];
const validSeasonDate=m=>!m.season||m.date>=m.season.slice(0,4)+'-07-01'&&m.date<(m.season==='2019/20'?'2020-09-01':(Number(m.season.slice(0,4))+1)+'-07-01');
const groups=new Map(),files=[];
function add(refereeId,row,provenance,kind='profile'){
 if(!refs.has(refereeId)||!row.date||row.date.slice(0,10)>'2026-10-18')return;
 const date=row.date.slice(0,10),r={...row,date},k=key(r),id='ref-match-'+crypto.createHash('sha256').update(k).digest('hex').slice(0,24);
 if(!groups.has(refereeId))groups.set(refereeId,new Map());const map=groups.get(refereeId);
 if(!map.has(k))map.set(k,{id,refereeId,date,season:r.season?.replace(/^(\d{4})-(\d{2})$/,'$1/$2')||null,competition:r.competition||null,home:r.home,away:r.away,homeTeamId:teamId(r.home),awayTeamId:teamId(r.away),observations:[]});
 const g=map.get(k);if(!g.competition&&r.competition)g.competition=r.competition;
 const observation={kind,original:r,provenance};const serialized=JSON.stringify(observation);
 if(!g.observations.some(o=>JSON.stringify(o)===serialized))g.observations.push(observation);
}
// Reuse every available archived season, with no five/forty-row truncation.
for(const season of fs.readdirSync('data/normalized/referee-matches').filter(s=>/^\d{4}-\d{2}$/.test(s)))for(const file of fs.readdirSync(`data/normalized/referee-matches/${season}`).filter(f=>f.endsWith('.json')&&!f.includes('pilot'))){
 const archive=`data/normalized/referee-matches/${season}/${file}`;files.push(archive);
 for(const m of read(archive).matches||[]){if(!['STATUS_FULL_TIME','FT','AET','PEN'].includes(m.status)||!refs.has(m.referee?.slug))continue;
  const h=m.teamStats.home,a=m.teamStats.away;
  const providerYellowCards=sum(h.yellowCards,a.yellowCards),secondYellowCards=sum(h.secondYellowCards,a.secondYellowCards);
  add(m.referee.slug,{id:m.id,date:m.date,season:m.season,competition:m.competitionName,stage:m.stage,home:m.homeTeam.name,away:m.awayTeam.name,score:m.score,teamStats:m.teamStats,providerYellowCards,yellowCards:secondYellowCards===0?providerYellowCards:null,directRedCards:sum(h.straightRedCards,a.straightRedCards),secondYellowCards,dismissals:sum(h.straightRedCards,a.straightRedCards,h.secondYellowCards,a.secondYellowCards),fouls:sum(h.fouls,a.fouls),penaltiesAwarded:null}, {...m.source,archive,ordinaryYellowLimitation:'When a second-yellow dismissal exists, provider total yellows alone do not establish ordinary yellows; retained only as raw count unless another verified observation resolves it'},'normalized-archive');
 }
}
for(const p of source.profiles.filter(p=>refs.has(p.refereeSlug)))for(const m of p.matches)add(p.refereeSlug,m,p.source);
const manifestPath='data/raw/referee-stats/md07-history-2026-10-18/manifest.json',manifest=read(manifestPath);
for(const p of manifest.filter(p=>!p.error&&['calciotel','ofstats','datasport'].includes(p.provider))){
 const html=zlib.gunzipSync(fs.readFileSync(p.rawPath)).toString('utf8'),rows=p.provider==='calciotel'?parseMatches(html):p.provider==='ofstats'?parseOfstats(html):parseDatasport(html);
 for(const m of rows)add(p.refereeId,m,p);
}
const detailManifest='data/raw/referee-stats/md07-history-2026-10-18/details/manifest.json';
if(fs.existsSync(detailManifest))for(const p of read(detailManifest).filter(p=>!p.error)){
 const parsed=parseDetail(zlib.gunzipSync(fs.readFileSync(p.rawPath)).toString('utf8'));
 if(parsed.refereeId!==p.refereeId)continue; // Never attach another official's match.
 const map=groups.get(p.refereeId),g=[...(map?.values()||[])].find(m=>m.id===p.matchId||m.observations.some(o=>o.original.matchUrl===p.url));if(!g)continue;
 const base=g.observations[0].original;
 const blank=Object.fromEntries(metricKeys.map(k=>[k,null]));
 const row={...base,...blank,competition:parsed.competition||g.competition,season:parsed.season||base.season,fouls:parsed.fouls,providerYellowCards:parsed.providerYellowCards,providerRedCards:parsed.providerRedCards};
 add(p.refereeId,row,p,'match-detail');
 if(parsed.verifiedCards)add(p.refereeId,{...row,fouls:null,...parsed.cardCounts,events:parsed.events},p,'event-review');
}
// Curated verified fields win explicitly; preserve all alternatives, including disputed originals.
const crossChecks='data/sources/referee-history-cross-checks-md07.json';
if(fs.existsSync(crossChecks))for(const r of read(crossChecks).observations)add(r.refereeId,r.match,r.source,r.kind);
for(const f of source.fixtureAnalyses||[])for(const m of f.matches||[])add(f.refereeSlug,m,{...m.source,verification:m.verification||[],fixtureId:f.fixtureId},'curated-verified');
// Optional match-level event reviews, never an inference from aggregate reds.
const reviewPath='data/sources/referee-history-event-reviews-md07.json';
if(fs.existsSync(reviewPath))for(const r of read(reviewPath).observations||[])add(r.refereeId,r.match,r.source,'event-review');
const referees=[];
for(const [id,name] of refs){const matches=[...(groups.get(id)?.values()||[])];
 for(const m of matches){
  const preferred=m.observations.filter(o=>['curated-verified','event-review'].includes(o.kind));
  m.metrics={};m.discrepancies=[];
  for(const k of metricKeys){
   const observations=m.observations.filter(o=>valid(o.original[k])&&!o.original.disputedMetrics?.includes(k));
   const values=[...new Set(observations.map(o=>o.original[k]))];
   const approved=preferred.filter(o=>valid(o.original[k])&&!o.original.disputedMetrics?.includes(k)).at(-1);
   const disputed=preferred.some(o=>o.original.disputedMetrics?.includes(k))&&!approved;
 const selected=approved?approved.original[k]:disputed?null:values.length===1?values[0]:null;
   m[k]=selected;m.metrics[k]={status:approved?'CURATED_VERIFIED':disputed||values.length>1?'DISPUTED':values.length===1?(observations.length>1?'AGREED':'SINGLE_SOURCE'):'MISSING',observations:observations.length};
   if(values.length>1||disputed)m.discrepancies.push({metric:k,alternatives:m.observations.filter(o=>o.original[k]!==undefined||o.original.disputedMetrics?.includes(k)).map(o=>({value:o.original[k]??null,source:o.provenance.url,kind:o.kind})),resolution:approved?'Explicit event/curated review':'Unresolved; excluded from averages'});
  }
  // A known zero entails both dismissal types being zero; positive totals do not imply the split.
  if(m.dismissals===0)for(const k of ['directRedCards','secondYellowCards'])if(m[k]===null&&m.metrics[k].status!=='DISPUTED'){m[k]=0;m.metrics[k].status='VERIFIED_ZERO_TOTAL';}
  if(valid(m.directRedCards)&&valid(m.secondYellowCards)&&m.dismissals!==m.directRedCards+m.secondYellowCards){m.discrepancies.push({metric:'dismissals',resolution:'Component mismatch; all dismissal values excluded'});for(const k of ['dismissals','directRedCards','secondYellowCards']){m[k]=null;m.metrics[k].status='DISPUTED';}}
  const scores=m.observations.filter(o=>valid(o.original.score?.home)&&valid(o.original.score?.away));const scoreValues=[...new Set(scores.map(o=>JSON.stringify(o.original.score)))];
  m.score=scoreValues.length===1?JSON.parse(scoreValues[0]):null;m.scoreDisputed=scoreValues.length>1;
  m.source=m.observations[0].provenance;m.disputedMetrics=metricKeys.filter(k=>m.metrics[k].status==='DISPUTED');m.missingMetrics=metricKeys.filter(k=>m[k]===null);
  m.reliability=m.discrepancies.length?'HAS_DISCREPANCIES':m.observations.length>1?'MULTIPLE_OBSERVATIONS':'SINGLE_OBSERVATION';
  m.providerIds=[...new Set(m.observations.map(o=>o.original.id||o.original.matchUrl).filter(Boolean))];
  m.officialCompetition=m.competition?/friendl|amichevol/i.test(m.competition)?false:true:null;
 }
 matches.sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
 const dates=new Map();for(const m of matches)dates.set(m.date,(dates.get(m.date)||0)+1);
 const quarantinedMatches=matches.filter(m=>dates.get(m.date)>1||!validSeasonDate(m)).map(m=>({...m,quarantineReason:!validSeasonDate(m)?'Reported match date is outside its stated season; unresolved source date/season conflict; excluded from samples':'Different matches attributed to the same referee on the same date; unresolved identity/date conflict; excluded from statistical samples'}));
 const accepted=matches.filter(m=>dates.get(m.date)===1&&validSeasonDate(m));
 referees.push({refereeId:id,name,coverage:{status:'PARTIAL',completenessCertified:false,from:accepted.at(-1)?.date||null,to:accepted[0]?.date||null,seasons:[...new Set(accepted.map(m=>m.season).filter(Boolean))].sort(),competitions:[...new Set(accepted.map(m=>m.competition).filter(Boolean))].sort(),unknownCompetition:accepted.filter(m=>!m.competition).length,quarantinedMatches:quarantinedMatches.length,limitations:['Public profile match logs and available domestic archives only; no season completeness certification','Unknown values are null; provider observations and unresolved conflicts remain separate','ESPN penaltyKickShots is not a verified awarded-penalty count; excluded','Profile yellow/red semantics may differ; positive OFStats red totals retained as raw provider counts, not assumed dismissals','Different fixtures attributed on the same date are quarantined, never silently deduplicated by referee/date']},matches:accepted,quarantinedMatches});
}
const output={schemaVersion:1,asOf:'2026-10-18',informationalOnly:true,identity:{referee:'Canonical referee slug',match:'SHA256(date | exact normalized home team ID | exact normalized away team ID), stable across providers; explicit team aliases only'},policy:{coverage:'PARTIAL',observations:'All recovered records retained, no five-match or forty-match cap',cutoff:'Reading samples must exclude fixture date and later dates',cards:'Ordinary yellow cards + dismissals once; direct red / second yellow separate',sources:'Internal only'},archiveFiles:files,manifestPath,referees};
fs.mkdirSync('data/normalized/referee-history',{recursive:true});fs.writeFileSync('data/normalized/referee-history/md07-2026-27.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(referees.map(r=>({id:r.refereeId,matches:r.matches.length,quarantined:r.quarantinedMatches.length,unknown:r.coverage.unknownCompetition}))));
