const fs=require("fs"),path=require("path"),zlib=require("zlib");
const root=path.resolve(__dirname,"../.."),args=process.argv.slice(2),seasonIndex=args.indexOf("--season"),season=seasonIndex>=0?args[seasonIndex+1]:null;
if(!/^20\d{2}-\d{2}$/.test(season||""))throw new Error("Specificare --season YYYY-YY");
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),"utf8")),write=(file,value)=>{const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(value,null,2)+"\n")};
const seasonRoot=`data/normalized/referee-matches/${season}`,generatedRoot=`data/generated/referee-stats/${season}`,regular={"serie-a":read(`${seasonRoot}/serie-a.json`).matches,"serie-b":read(`${seasonRoot}/serie-b.json`).matches},aggregates=read(`${generatedRoot}/aggregates.json`),importReport=read(`${generatedRoot}/import-report.json`);
const postseasonFiles=fs.readdirSync(path.join(root,seasonRoot)).filter(name=>name.startsWith("serie-b-")&&name.endsWith(".json")&&!name.includes("unknown")),postseason=postseasonFiles.flatMap(name=>read(`${seasonRoot}/${name}`).matches),checks=[];
function check(name,ok,details){checks.push({name,ok,details});if(!ok)process.exitCode=1}
for(const [competition,matches] of Object.entries(regular)){
  const perMatchday=Array.from({length:38},(_,i)=>matches.filter(row=>row.matchday===i+1).length),fixtureIds=new Set(matches.map(row=>row.providerFixtureId));
  check(`${competition}: 380 gare regolari`,matches.length===380,{actual:matches.length,expected:380});
  check(`${competition}: fixture univoche`,fixtureIds.size===matches.length,{duplicates:matches.length-fixtureIds.size});
  check(`${competition}: 38 giornate complete`,perMatchday.every(count=>count===10),{perMatchday});
  check(`${competition}: fonti tracciate`,matches.every(row=>row.source?.fixtureId&&row.source?.url&&row.source?.retrievedAt),{missing:matches.filter(row=>!row.source?.fixtureId||!row.source?.url||!row.source?.retrievedAt).length});
}
check("Serie B: postseason separata",postseason.every(row=>row.stage!=="regular-season"),{total:postseason.length,files:postseasonFiles});
check("Import: join calendario completa",importReport.calendarJoin?.matched===760&&importReport.calendarJoin?.unmatched===0,importReport.calendarJoin);
check("Aggregati: stagione coerente",aggregates.referees.every(row=>row.season===season)&&aggregates.refereeTeams.every(row=>row.season===season),{referees:aggregates.referees.length,refereeTeams:aggregates.refereeTeams.length});
const verifiedEspnFixtures=[];
for(const [competition,matches] of Object.entries(regular))for(const match of matches.slice(0,5)){
  const rawFile=path.join(root,`data/raw/referee-stats/espn/${season}/${competition}/${match.providerFixtureId}.json.gz`),snapshot=JSON.parse(zlib.gunzipSync(fs.readFileSync(rawFile))),event=snapshot.bundle.event,summary=snapshot.bundle.summary,official=summary.gameInfo?.officials?.[0]?.fullName||null;
  verifiedEspnFixtures.push({competition,fixtureId:match.providerFixtureId,url:match.source.url,teamsMatch:event.competitions?.[0]?.competitors?.some(row=>row.homeAway==="home"&&row.team?.displayName===match.homeTeam.providerName)&&event.competitions?.[0]?.competitors?.some(row=>row.homeAway==="away"&&row.team?.displayName===match.awayTeam.providerName),refereeMatch:official===match.referee.providerName,statsTeams:summary.boxscore?.teams?.length||0,retrievedAt:match.source.retrievedAt});
}
check("10 fixture ESPN confrontate con i raw",verifiedEspnFixtures.length===10&&verifiedEspnFixtures.every(row=>row.teamsMatch&&row.refereeMatch&&row.statsTeams===2),verifiedEspnFixtures);
const allRegular=[...regular["serie-a"],...regular["serie-b"]],missingFields={matchday:allRegular.filter(row=>row.matchday==null).length,referee:allRegular.filter(row=>!row.referee.name).length},report={season,generatedAt:new Date().toISOString(),status:checks.every(row=>row.ok)?"validated":"failed",checks,missingFields,providerMissingFields:importReport.missingFields||{},verifiedEspnFixtures,sources:{espn:"Fixture, statistiche e pagine partita ESPN",calendars:"Calendari stagionali normalizzati con join casa-trasferta e controllo 38 x 10"}};
write(`${generatedRoot}/validation-report.json`,report);
console.log(JSON.stringify({season,status:report.status,regularSeason:{serieA:regular["serie-a"].length,serieB:regular["serie-b"].length},postseason:postseason.length,missingFields,checks:checks.map(row=>({name:row.name,ok:row.ok}))},null,2));
