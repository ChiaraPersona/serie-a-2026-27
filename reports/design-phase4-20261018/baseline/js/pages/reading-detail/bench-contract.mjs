// A cached bench forecast is usable only for exactly the same lineup and team model.
export function benchContext(model,evidence){
 return JSON.stringify([model.competition,model.fixture.id,model.fixture.date,model.fixture.kickoff||evidence.analysis.match?.kickoff,
  evidence.lineups.map(l=>[l.side.id,l.side.name,l.status,l.players.map(p=>[p.id,p.name,p.source?.expectedMinutes,p.source?.projectedShots,p.source?.projectedShotsOnTarget]),(l.benchPlayers||[]).map(p=>[p.id,p.name])]),
  model.prediction?.teamProjections,
  (model.prediction?.shooters?.allPlayers||[]).map(p=>[p.playerId,p.teamId,p.expectedMinutes,p.projectedShots,p.projectedShotsOnTarget])]);
}
export function connectBenchForecasts(model,evidence,players){
 const fixture=evidence.benchForecasts?.fixtures?.find(f=>f.fixtureId===model.fixture.id&&f.competition===model.competition);
 const valid=!!fixture&&fixture.context===benchContext(model,evidence);
 for(const p of players){
  if(p.lineupStatus!=='bench')continue;
  const matches=valid&&p.id?fixture.players.filter(r=>r.playerId===p.id&&r.team===p.team):[];
  p.benchForecast=matches.length===1?matches[0]:null;
 }
 return players;
}
