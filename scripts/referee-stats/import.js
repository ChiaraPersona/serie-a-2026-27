const fs=require("fs"),path=require("path");
const {loadConfig}=require("./config"),{createProvider}=require("./providers"),{normalizeBundle}=require("./normalize"),{generateAggregates}=require("./aggregate");
const args=process.argv.slice(2),option=(name,fallback)=>{const index=args.indexOf(`--${name}`);return index>=0?args[index+1]:fallback},flag=name=>args.includes(`--${name}`),ensure=dir=>fs.mkdirSync(dir,{recursive:true}),write=(file,value)=>{ensure(path.dirname(file));fs.writeFileSync(file,JSON.stringify(value,null,2)+"\n")};
const requiredPaths=["competition","season","matchday","date","homeTeam.id","homeTeam.name","awayTeam.id","awayTeam.name","score.home","score.away","referee.name","teamStats.home.fouls","teamStats.home.yellowCards","teamStats.home.secondYellowCards","teamStats.home.straightRedCards","teamStats.home.penaltiesFor","teamStats.home.penaltiesAgainst","teamStats.away.fouls","teamStats.away.yellowCards","teamStats.away.secondYellowCards","teamStats.away.straightRedCards","teamStats.away.penaltiesFor","teamStats.away.penaltiesAgainst","source.fixtureId","source.url","source.retrievedAt"];
const missingRequired=match=>requiredPaths.filter(pathName=>{const value=pathName.split(".").reduce((current,key)=>current?.[key],match);return value===null||value===undefined||value===""});

async function main(){
  const config=loadConfig(),provider=createProvider(config),season=option("season",config.season),limit=Number(option("limit","10")),selected=option("competition","all"),pilot=flag("pilot"),retrievedAt=new Date().toISOString(),seasonYear=Number(season.slice(0,4));
  if(!Number.isInteger(limit)||limit<1)throw new Error("--limit deve essere un intero positivo.");
  const competitionIds=selected==="all"?["serie-a","serie-b"]:[selected],allMatches=[],report={provider:provider.id,season,limit,pilot,retrievedAt,competitions:[],missingFields:{}};
  for(const competitionId of competitionIds){
    const competition=config.competitions[competitionId];if(!competition)throw new Error(`Competizione sconosciuta: ${competitionId}`);
    const listed=await provider.listFixtures({competition,competitionId,leagueId:competition.apiFootballLeagueId,seasonYear,limit}),normalized=[];
    for(const fixture of listed.fixtures){
      const bundle=await provider.fetchFixtureBundle(fixture),fixtureId=String(bundle.source?.fixtureId||fixture.fixture?.id||fixture.id||fixture.providerFixtureId);
      write(path.join(config.rawRoot,provider.id,season,competitionId,`${fixtureId}.json`),{provider:provider.id,competition:competitionId,season,retrievedAt,listSourceUrl:listed.sourceUrl,bundle});
      const match=normalizeBundle(bundle,{provider:provider.id,competition,season,retrievedAt});match.missingFields=[...new Set([...(match.missingFields||[]),...missingRequired(match)])];normalized.push(match);allMatches.push(match);for(const field of match.missingFields)report.missingFields[field]=(report.missingFields[field]||0)+1;
    }
    write(path.join(config.normalizedRoot,season,`${competitionId}${pilot?"-pilot":""}.json`),{provider:provider.id,competition:competitionId,season,retrievedAt,matches:normalized});
    report.competitions.push({competition:competitionId,requested:limit,imported:normalized.length,fixtureIds:normalized.map(match=>match.providerFixtureId)});
  }
  const aggregates=generateAggregates(allMatches,retrievedAt);write(path.join(config.generatedRoot,season,`aggregates${pilot?"-pilot":""}.json`),aggregates);write(path.join(config.generatedRoot,season,`import-report${pilot?"-pilot":""}.json`),report);console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(`Import arbitri fallito: ${error.message}`);process.exitCode=1});
