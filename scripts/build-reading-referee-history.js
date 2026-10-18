// Presentation-only projection of existing archives. Never consumed by prediction builders.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const finite=v=>Number.isInteger(v)&&v>=0;
const sum=(...values)=>values.every(finite)?values.reduce((a,b)=>a+b,0):null;
const clean=s=>s.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
function recentMatches(rows,date){
 const seen=new Set();
 return rows.filter(r=>r.date&&r.date.slice(0,10)<date).sort((a,b)=>b.date.localeCompare(a.date)).filter(r=>{
  const key=[r.date.slice(0,10),r.competition,r.home,r.away].join('|');if(seen.has(key))return false;seen.add(key);return true;
 }).slice(0,5);
}
function summary(rows){
 const complete=key=>rows.length&&rows.every(r=>finite(r[key]));
 return {matches:rows.length,yellowCardsAverage:complete('yellowCards')?rows.reduce((n,r)=>n+r.yellowCards,0)/rows.length:null,dismissalsTotal:complete('dismissals')?rows.reduce((n,r)=>n+r.dismissals,0):null,penaltiesTotal:complete('penaltiesAwarded')?rows.reduce((n,r)=>n+r.penaltiesAwarded,0):null};
}
function build(){
 const curated=read('data/sources/reading-referee-match-history.json'),historical=new Map();
 for(const season of ['2023-24','2024-25','2025-26'])for(const file of fs.readdirSync(path.join(root,'data/normalized/referee-matches',season)).filter(f=>f.endsWith('.json')&&!f.includes('pilot'))){
  for(const m of read(`data/normalized/referee-matches/${season}/${file}`).matches||[]){
   if(!m.referee?.slug||!['STATUS_FULL_TIME','FT','AET','PEN'].includes(m.status))continue;
   const h=m.teamStats.home,a=m.teamStats.away;
   const row={id:m.id,date:m.date.slice(0,10),competition:m.competitionName,home:m.homeTeam.name,away:m.awayTeam.name,score:m.score,yellowCards:sum(h.yellowCards,a.yellowCards),dismissals:sum(h.secondYellowCards,h.straightRedCards,a.secondYellowCards,a.straightRedCards),secondYellowCards:sum(h.secondYellowCards,a.secondYellowCards),directRedCards:sum(h.straightRedCards,a.straightRedCards),penaltiesAwarded:null,source:{...m.source,archive:`data/normalized/referee-matches/${season}/${file}`,limitations:['penaltyKickShots does not verify penalties awarded; not used']}};
   if(!historical.has(m.referee.slug))historical.set(m.referee.slug,[]);historical.get(m.referee.slug).push(row);
  }
 }
 const domestic=new Map(curated.profiles.map(p=>[p.refereeSlug,p.matches.map(m=>({...m,source:p.source}))]));
 const european=new Map();
 const history=read('data/normalized/champions-referee-history-2026-10-13.json');
 for(const p of history.referees){
  const rawPath=`data/raw/champions-referees/2026-10-13/footymetrics/${p.source.providerRefereeId}.html.gz`;
  if(!fs.existsSync(path.join(root,rawPath)))continue;
  const html=zlib.gunzipSync(fs.readFileSync(path.join(root,rawPath))).toString('utf8');
  const table=html.slice(html.indexOf('Last 20 refereed')).match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/)?.[1]||'';
  const tr=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)];
  const rows=(p.last10?.matchLog||[]).map((m,i)=>{
   const raw=tr[i]?.[1]||'',date=clean(raw.match(/<td[^>]*>([\s\S]*?)<\/td>/)?.[1]||'');
   if(date!==m.dateLabel)throw Error(`FootyMetrics row mismatch: ${p.refereeId} ${i}`);
   const competition=raw.match(/<img\b[^>]*alt="([^"]+)"/)?.[1]||null;
   const href=raw.match(/href="(\/fixtures\/[^"?#]+)"/)?.[1]||null;
   return {id:href,date:m.date,competition,home:m.homeTeamCode,away:m.awayTeamCode,score:{home:m.homeGoals,away:m.awayGoals},yellowCards:m.yellowCards,dismissals:m.redCards,secondYellowCards:m.redCards===0?0:null,directRedCards:m.redCards===0?0:null,penaltiesAwarded:m.penalties,source:{...p.source,rawPath,matchUrl:href?'https://www.footymetrics.com'+href:null,limitations:['Positive dismissal totals are not classified as direct red; a verified zero total entails zero of either type']}};
  });
  european.set(p.refereeId,rows);
 }
 const fixtures=[];
 for(const m of read('data/normalized/matches.json').filter(m=>m.competition==='serie-a')){
  const official=m.refereeAssignment?.referee;
  const enrichment=curated.fixtureAnalyses?.find(e=>e.fixtureId===m.id&&e.refereeSlug===official?.slug);
  const archived=enrichment?.historyRef?read(enrichment.historyRef).referees.find(r=>r.refereeId===official?.slug)?.matches.filter(r=>r.officialCompetition===true):null;
  const sample=archived||enrichment?.matches||domestic.get(official?.slug)||historical.get(official?.slug)||[];
  const rows=recentMatches(sample,m.date||'').map(r=>archived?Object.fromEntries(['id','date','season','competition','home','away','score','yellowCards','dismissals','secondYellowCards','directRedCards','fouls','penaltiesAwarded','disputedMetrics','missingMetrics','source'].map(k=>[k,r[k]])):r);
  const analysis=enrichment?require('./referee-stats/reading-analysis').analyze(sample,m.date):null;
  if(archived){analysis.showPercentComparison=true;analysis.limitations='Campione disponibile parziale. —: dato mancante o discordante.';analysis.counting='Gialli ordinari; espulsioni conteggiate una sola volta. Δ recente/stagionale; base zero: —.';analysis.seasonLabel='2026/27 · campione disponibile parziale';}
  fixtures.push({fixtureId:m.id,competition:'serie-a',cutoffDate:m.date,refereeId:official?.slug||null,refereeName:official?.name||null,rows,summary:summary(rows),...(analysis?{analysis}:{})});
 }
 const checks=new Map(history.officialVerification.checks.map(c=>[c.fixtureId,c.refereeId]));
 for(const m of read('data/normalized/champions-league-2026-27.json').fixtures){
  const id=checks.get(m.id),rows=recentMatches(european.get(id)||[],m.date||'');
  fixtures.push({fixtureId:m.id,competition:'champions',cutoffDate:m.date,refereeId:id||null,refereeName:m.refereeAssignment?.referee||null,rows,summary:summary(rows)});
 }
 const output={schemaVersion:1,informationalOnly:true,asOf:curated.asOf,policy:{cutoff:'Strictly before reading fixture date; same-day games excluded',selection:'Latest five available verified games; incomplete values remain null',yellowCards:'Provider yellow-card count retained separately; second-yellow dismissals are never added to it',dismissals:'Total dismissals once; secondYellowCards and directRedCards remain separate nullable components',penalties:'Awarded in match; shootout kicks and penalty attempts never substituted',sources:'Internal metadata only; not rendered'},fixtures};
 fs.writeFileSync(path.join(root,'data/generated/reading-referee-history.json'),JSON.stringify(output,null,2)+'\n');
 console.log(JSON.stringify({fixtures:fixtures.length,withFive:fixtures.filter(f=>f.rows.length===5).length,serieA:fixtures.filter(f=>f.competition==='serie-a'&&f.rows.length).length,champions:fixtures.filter(f=>f.competition==='champions'&&f.rows.length).length,missingDomestic:curated.missing}));
 return output;
}
module.exports={recentMatches,summary,build};
if(require.main===module)build();
