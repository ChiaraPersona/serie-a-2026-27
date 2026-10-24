'use strict';
const {ENGINE_VERSION,predictScenario}=require('../predictions/engine');
const {zonedLocalToUtc}=require('./complete-forecast-snapshots');
const finite=Number.isFinite;
const mean=a=>a.length?a.reduce((n,v)=>n+v,0)/a.length:null;
function summarize(values){
 const a=values.filter(finite).sort((a,b)=>a-b),m=mean(a);
 const q=p=>{const i=(a.length-1)*p,l=Math.floor(i);return a[l]+(a[Math.ceil(i)]-a[l])*(i-l);};
 return {matches:a.length,mean:m,sd:a.length?Math.sqrt(mean(a.map(v=>(v-m)**2))):null,p20:a.length?q(.2):null,p80:a.length?q(.8):null};
}
function recentStats(rows,metric){
 const selected=rows.slice(-8).reverse(),values=selected.map(r=>r.for[metric]);
 const observed=values.map((v,i)=>({v,w:.82**i})).filter(r=>finite(r.v));
 const weight=observed.reduce((n,r)=>n+r.w,0);
 return {...summarize(values),weightedMean:weight?observed.reduce((n,r)=>n+r.v*r.w,0)/weight:null};
}
function profileRows(source,team,cutoff){
 return source.matches.filter(m=>m.league===team.league&&m.coverage==='complete'&&m.date<cutoff&&m.source?.retrievedAt&&m.source.retrievedAt<cutoff)
 .flatMap(m=>{
  const side=String(m.home.providerTeamId)===String(team.espnTeamId)?'home':String(m.away.providerTeamId)===String(team.espnTeamId)?'away':null;
  if(!side)return [];
  const own=m[side],other=m[side==='home'?'away':'home'];
  return [{date:m.date,eventId:m.eventId,venue:side,for:{goals:own.score,...own.statistics},against:{goals:other.score,...other.statistics}}];
 }).sort((a,b)=>a.date.localeCompare(b.date)||String(a.eventId).localeCompare(String(b.eventId)));
}
function eligible(fixture,asOf){
 return fixture.status==='scheduled'&&Date.parse(zonedLocalToUtc(fixture.date,fixture.kickoff,'Europe/Rome'))>Date.parse(asOf);
}
// Adapt observed domestic data to one common league scale. No Elo-derived goals,
// guessed identities, copied lineups, or individual market publication.
function buildSharedScenarios({calendar,source,styles,odds,asOf,matchday=null}){
 if(!finite(Date.parse(asOf)))throw Error('Valid asOf required');
 const targets=calendar.fixtures.filter(f=>eligible(f,asOf)&&(matchday===null||f.matchday===matchday));
 const metrics=['goals','totalShots','shotsOnTarget','wonCorners'];
 const output=targets.map(f=>{
  const cutoff=[asOf,f.date].sort()[0],sides=[f.homeTeam,f.awayTeam];
  const teams=sides.map(name=>source.teams.find(t=>t.name===name));
  const rows=teams.map(t=>t?profileRows(source,t,cutoff):[]);
  const missing=[];
  const leagueRows=t=>t?source.matches.filter(m=>m.league===t.league&&m.coverage==='complete'&&m.date<cutoff&&m.source?.retrievedAt&&m.source.retrievedAt<cutoff):[];
  const leagues=teams.map(leagueRows);
  const baseline=(i,venue,metric)=>mean(leagues[i].map(m=>metric==='goals'?m[venue].score:m[venue].statistics?.[metric]).filter(finite));
  const target=(venue,metric)=>mean([0,1].map(i=>baseline(i,venue,metric)).filter(finite));
  const normalized=rows.map((rr,i)=>rr.map(r=>({...r,for:Object.fromEntries(metrics.map(k=>[k,finite(r.for[k])&&baseline(i,r.venue,k)>0?r.for[k]/baseline(i,r.venue,k)*target(r.venue,k):null])),against:Object.fromEntries(metrics.map(k=>{const other=r.venue==='home'?'away':'home';return [k,finite(r.against[k])&&baseline(i,other,k)>0?r.against[k]/baseline(i,other,k)*target(other,k):null];}))})));
  const covered=normalized.every(rr=>rr.length>=6&&['home','away'].every(v=>rr.filter(r=>r.venue===v&&finite(r.for.goals)&&finite(r.against.goals)).length>=2));
  const volumes=normalized.map(rr=>({venues:Object.fromEntries(['home','away','overall'].map(v=>[v,Object.fromEntries(metrics.slice(1).map(k=>[k,Object.fromEntries(['for','against'].map(side=>[side,summarize(rr.filter(r=>v==='overall'||r.venue===v).map(r=>r[side][k]))]))]))])),recent:Object.fromEntries(metrics.slice(1).map(k=>[k,{for:recentStats(rr,k)}]))}));
  const profiles=normalized.map((rr,i)=>{
   const style=styles.profiles.find(p=>p.teamId===teams[i]?.id)||{};
   const gf=mean(rr.map(r=>r.for.goals).filter(finite)),ga=mean(rr.map(r=>r.against.goals).filter(finite));
   const observed=rows[i];
   return {...style,competition:teams[i]?.leagueName,goalRatesOnTargetScale:true,derived:{...style.derived,goalsPerGame:gf},formation:{...style.formation,appearances:rr.length,goalsAgainst:ga*rr.length},summary:{...style.summary,appearances:rr.length,shotsPerGame:mean(rr.map(r=>r.for.totalShots).filter(finite))},modelInputs:{numeric:{...style.modelInputs?.numeric,yellowCardsPerGame:mean(observed.map(r=>r.for.yellowCards).filter(finite))}}};
  });
  // Lineup names in the calendar do not establish canonical player identity.
  // Until a fixture-scoped canonical adapter is available, keep this input absent.
  missing.push('Formazioni canoniche non integrate','xG comparabili non disponibili','Obiettivi e precedenti non integrati');
  const input={homeTeam:{id:teams[0]?.id},awayTeam:{id:teams[1]?.id},homeSquad:{players:[]},awaySquad:{players:[]},homeProfile:profiles[0],awayProfile:profiles[1],homeVolume:volumes[0],awayVolume:volumes[1],crossCompetitionBaseline:teams[0]?.league!==teams[1]?.league,
   leagueSummary:{homeGoalsPerMatch:target('home','goals'),awayGoalsPerMatch:target('away','goals')},
   oddsEvent:odds.events.find(e=>e.canonicalMatchId===f.id&&e.canonicalDate===f.date&&e.retrievedAt&&e.retrievedAt<=asOf),
   reading:{sections:{}},generatedAt:asOf};
  normalized.forEach((rr,i)=>{
   const side=i?'away':'home',venue=rr.filter(r=>r.venue===side);
   input[side+'Venue']={played:venue.length,goalsFor:venue.reduce((n,r)=>n+(r.for.goals??0),0),goalsAgainst:venue.reduce((n,r)=>n+(r.against.goals??0),0)};
   input[side+'Recent']={goalsFor:recentStats(rr,'goals').weightedMean,goalsAgainst:recentStats(rr.map(r=>({...r,for:r.against})),'goals').weightedMean,decay:.82,opponentAdjusted:false};
   const fouls=rows[i].map(r=>r.for.foulsCommitted).filter(finite);
   input[side+'Discipline']={rows:fouls.length?[{appearances:fouls.length,foulsAwardedAgainstPerAppearance:mean(fouls)}]:[]};
  });
  const result=covered?predictScenario(input):null;
  const projections=result?result.teamProjections.map((p,i)=>{
   const copy={...p};
   for(const [key,metric] of [['shotsTotal','totalShots'],['shotsOnTarget','shotsOnTarget'],['corners','wonCorners']]){
    const opponent=i?0:1,venue=i?'away':'home',opposite=i?'home':'away';
    if(volumes[i].venues[venue][metric].for.matches<2||volumes[opponent].venues[opposite][metric].against.matches<2)copy[key]=null;
   }
   return copy;
  }):teams.map((t,i)=>({teamId:t?.id??null,venue:i?'away':'home',expectedGoals:null,shotsTotal:null,shotsOnTarget:null,corners:null,cards:null,fouls:null}));
  const final=result?.final;
  return {fixtureId:f.id,matchday:f.matchday,date:f.date,kickoff:f.kickoff,homeTeam:f.homeTeam,awayTeam:f.awayTeam,
   engineVersion:ENGINE_VERSION,pipeline:'SHARED_SERIE_A_SCENARIO',status:covered?'preliminary':'insufficient-data',
   expectedGoals:result?{...result.expected,method:'Motore condiviso: attacco/difesa, forma, matchup e Poisson; tassi domestici normalizzati. Componenti non coperte disattivate.'}:{home:null,away:null,total:null},
   probabilities:{home:final?final[0]*100:null,draw:final?final[1]*100:null,away:final?final[2]*100:null},
   scoreForecast:result?.forecast??{display:[]},confidence:result?.confidenceResult??{value:null},surprise:result?.surprise??{value:null},teamProjections:projections,
   matchProjection:result?Object.fromEntries(['shotsTotal','shotsOnTarget','corners'].map(k=>[k,projections.every(p=>p[k])?result.matchProjection[k]:null])):null,
   cards:{central:projections.every(p=>finite(p.cards?.central))?projections.reduce((n,p)=>n+p.cards.central,0):null},
   dataQuality:{label:'Stima preliminare · '+(covered?'copertura parziale':'dati insufficienti'),completenessPct:result?Math.round(result.dataCompleteness*100):null,missing,teamSamples:rows.map(rr=>rr.length),latestMatchDates:rows.map(rr=>rr.at(-1)?.date??null)},
   provenance:{cutoff,teamIds:teams.map(t=>t?.id??null),normalization:'relative-to-domestic-league',recentDecay:.82,recentOpponentStrengthAdjustment:false,lineupsApplied:false,xgApplied:false,marketUsedForGoals:false}
  };
 });
 return {schemaVersion:1,pipeline:'SHARED_SERIE_A_SCENARIO',engineVersion:ENGINE_VERSION,generatedAt:asOf,fixtures:output};
}
module.exports={buildSharedScenarios,eligible,profileRows};

