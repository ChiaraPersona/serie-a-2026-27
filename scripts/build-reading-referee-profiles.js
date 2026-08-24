const fs=require("fs"),path=require("path"),zlib=require("zlib");
const root=path.resolve(__dirname,"..");
const read=relative=>JSON.parse(fs.readFileSync(path.join(root,relative),"utf8"));
const round=(value,digits=2)=>Number.isFinite(value)?Number(value.toFixed(digits)):null;
const competitions=["serie-a","serie-b"];
const normalized=competitions.flatMap(competition=>read(`data/normalized/referee-matches/2025-26/${competition}.json`).matches.filter(match=>(match.stage||"regular-season")==="regular-season"));
const pool={matches:normalized.length,yellowCards:0};
const profiles=new Map();
const reasonLabels={"a bad foul":"fallo imprudente","handball":"fallo di mano","excessive celebration":"esultanza eccessiva","dangerous play":"gioco pericoloso"};
const ensure=match=>{const key=match.referee.slug;if(!profiles.has(key))profiles.set(key,{referee:match.referee.name,refereeSlug:key,season:"2025-26",matches:0,competitions:{"serie-a":0,"serie-b":0},totals:{fouls:0,yellowCards:0,secondYellowCards:0,straightRedCards:0,penalties:0},coverage:{fouls:0,yellowCards:0,redCards:0,penalties:0},venue:{homeYellowCards:0,awayYellowCards:0},events:{yellowCards:0,firstHalf:0,secondHalf:0,after60:0,bands:{"1-15":0,"16-30":0,"31-45+":0,"46-60":0,"61-75":0,"76+":0},reasons:{documented:0,unspecified:0,counts:{}}},sources:[]});return profiles.get(key)};
const addSide=(profile,side,venue)=>{if(Number.isFinite(side.fouls)){profile.totals.fouls+=side.fouls;profile.coverage.fouls++}if(Number.isFinite(side.yellowCards)){profile.totals.yellowCards+=side.yellowCards;profile.coverage.yellowCards++;profile.venue[venue]+=side.yellowCards}if(Number.isFinite(side.secondYellowCards)&&Number.isFinite(side.straightRedCards)){profile.totals.secondYellowCards+=side.secondYellowCards;profile.totals.straightRedCards+=side.straightRedCards;profile.coverage.redCards++}if(Number.isFinite(side.penaltiesFor)){profile.totals.penalties+=side.penaltiesFor;profile.coverage.penalties++}};
const minuteBand=minute=>minute<=15?"1-15":minute<=30?"16-30":minute<=45?"31-45+":minute<=60?"46-60":minute<=75?"61-75":"76+";
for(const match of normalized){
  if(!match.referee?.slug)continue;
  const profile=ensure(match);profile.matches++;profile.competitions[match.competition]++;
  addSide(profile,match.teamStats.home,"homeYellowCards");addSide(profile,match.teamStats.away,"awayYellowCards");
  pool.yellowCards+=(match.teamStats.home.yellowCards||0)+(match.teamStats.away.yellowCards||0);
  if(match.source?.url)profile.sources.push({fixtureId:match.providerFixtureId,url:match.source.url});
  const rawPath=path.join(root,`data/raw/referee-stats/espn/2025-26/${match.competition}/${match.providerFixtureId}.json.gz`);
  if(!fs.existsSync(rawPath))continue;
  const raw=JSON.parse(zlib.gunzipSync(fs.readFileSync(rawPath))),events=raw.bundle?.summary?.keyEvents||[];
  for(const event of events){
    if(event.type?.type!=="yellow-card")continue;
    const minute=Math.max(1,Math.ceil((event.clock?.value||0)/60)),period=event.period?.number;
    profile.events.yellowCards++;profile.events.bands[minuteBand(minute)]++;
    if(period===1)profile.events.firstHalf++;else if(period===2)profile.events.secondHalf++;
    if(minute>60)profile.events.after60++;
    const reason=(event.text||"").match(/yellow card(?: to [^.]*)? for (.+?)(?:\.|$)/i)?.[1]?.toLowerCase()||null;
    if(reason){profile.events.reasons.documented++;profile.events.reasons.counts[reason]=(profile.events.reasons.counts[reason]||0)+1}else profile.events.reasons.unspecified++;
  }
}
const datasetAverage=round(pool.yellowCards/pool.matches);
const rows=[...profiles.values()].map(profile=>{
  const perMatch={fouls:profile.coverage.fouls?round(profile.totals.fouls/profile.matches):null,yellowCards:profile.coverage.yellowCards?round(profile.totals.yellowCards/profile.matches):null,redCards:profile.coverage.redCards===profile.matches*2?round((profile.totals.secondYellowCards+profile.totals.straightRedCards)/profile.matches):null,penalties:profile.coverage.penalties?round(profile.totals.penalties/profile.matches):null};
  const eventTotal=profile.events.yellowCards,secondHalfSharePct=eventTotal?round(profile.events.secondHalf/eventTotal*100,1):null,after60SharePct=eventTotal?round(profile.events.after60/eventTotal*100,1):null,venueTotal=profile.venue.homeYellowCards+profile.venue.awayYellowCards,homeSharePct=venueTotal?round(profile.venue.homeYellowCards/venueTotal*100,1):null;
  const topBand=Object.entries(profile.events.bands).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]||null;
  const reasons=Object.entries(profile.events.reasons.counts).map(([reason,count])=>({reason,label:reasonLabels[reason]||reason,count,shareOfDocumentedPct:round(count/profile.events.reasons.documented*100,1)})).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,"it"));
  const tendencies=[];
  if(eventTotal>=10){const timingLabel=secondHalfSharePct>=60?"Più cartellini nella ripresa":secondHalfSharePct<=40?"Più cartellini nel primo tempo":"Distribuzione simile tra i due tempi";tendencies.push({kind:"timing",label:timingLabel,evidence:`${profile.events.secondHalf}/${eventTotal} gialli-evento nella ripresa (${secondHalfSharePct}%).`});if(topBand?.[1])tendencies.push({kind:"band",label:`Fascia più frequente: ${topBand[0]}'`,evidence:`${topBand[1]} gialli-evento; ${profile.events.after60} dopo il 60' (${after60SharePct}%).`})}
  if(venueTotal>=10){const venueLabel=homeSharePct>=55?"Più ammonizioni alle squadre di casa":homeSharePct<=45?"Più ammonizioni alle squadre in trasferta":"Distribuzione casa/trasferta equilibrata";tendencies.push({kind:"venue",label:venueLabel,evidence:`Casa ${profile.venue.homeYellowCards}, trasferta ${profile.venue.awayYellowCards} (${homeSharePct}% alla squadra di casa).`})}
  if(profile.events.reasons.documented>=5&&reasons[0])tendencies.push({kind:"reason",label:`Motivo registrato più spesso: ${reasons[0].label}`,evidence:`${reasons[0].count}/${profile.events.reasons.documented} motivazioni esplicitate (${reasons[0].shareOfDocumentedPct}%).`});
  return {...profile,perMatch,datasetComparison:{yellowCardsPerMatch:datasetAverage,differencePct:perMatch.yellowCards===null?null:round((perMatch.yellowCards-datasetAverage)/datasetAverage*100,1)},events:{...profile.events,secondHalfSharePct,after60SharePct,reasons:{...profile.events.reasons,counts:undefined,ranking:reasons}},tendencies,reliability:profile.matches<5?"campione insufficiente":profile.matches<10?"indicazione moderata":"confronto più significativo"};
}).sort((a,b)=>a.referee.localeCompare(b.referee,"it"));
const output={generatedAt:new Date().toISOString(),season:"2025-26",provider:"ESPN",methodology:{scope:"Serie A e Serie B 2025/26, stagione regolare.",statistics:"Totali di squadra normalizzati per le gare dirette dall'arbitro.",tendencies:"Descrizione del campione osservato per tempo, fascia di minuto, casa/trasferta e motivazione ESPN quando esplicitata; non indica causalità né favoritismi.",minimumEventSample:10,unknownPolicy:"Le motivazioni non esplicitate dal provider restano non specificate."},datasetAverage:{matches:pool.matches,yellowCardsPerMatch:datasetAverage},profiles:rows};
const target=path.join(root,"data/generated/reading-referee-profiles-2025-26.json");fs.writeFileSync(target,JSON.stringify(output,null,2)+"\n");
console.log(`OK profili arbitri Letture: ${rows.length}, media dataset ${datasetAverage} gialli/gara`);
