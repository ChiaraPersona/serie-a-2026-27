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

export function starterScenarioContext(model,evidence){
 const ids=[model.home.id,model.away.id];
 const history=(evidence.analysis?.matches||[]).filter(m=>m.competition==='serie-a'&&m.status==='finished'&&m.matchday<model.fixture.matchday&&m.date<model.fixture.date&&(ids.includes(m.homeTeam)||ids.includes(m.awayTeam))).map(m=>[m.id,m.date,m.homeTeam,m.awayTeam,['home','away'].map(side=>(m.playerStats?.[side]||[]).map(p=>[p.playerId,p.minutes,p.starter,p.shots,p.shotsOnTarget]))]);
 const rosters=(evidence.squadFiles||[]).map(f=>[f?.id,(f?.squad||[]).map(p=>[p.id,p.role,p.detailedRole,p.previousSeason?.totals])]);
 return JSON.stringify(['if-starting-v1',benchContext(model,evidence),rosters,history]);
}

// Hypothetical starts are a separate, read-only attachment, never bench minutes.
export function connectStarterScenarios(model,evidence,players){
 if(model.competition!=='serie-a')return players;
 const f=evidence.starterScenarios,valid=f?.fixtureId===model.fixture.id&&f?.competition==='serie-a'&&f.context===starterScenarioContext(model,evidence);
 for(const p of players){if(p.lineupStatus!=='bench')continue;const matches=valid&&p.id?f.players.filter(r=>r.playerId===p.id&&r.team===p.team):[];p.starterScenario=matches.length===1?matches[0]:null;}
 return players;
}
