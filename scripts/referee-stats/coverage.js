const finite = value => typeof value === 'number' && Number.isFinite(value);
const identified = m => Boolean(m.referee?.name || m.referee?.providerName);
function datasetCoverage(matches) {
  const attributed=matches.filter(identified);
  return {matchesInDataset:matches.length,matchesWithIdentifiedReferee:attributed.length,
    matchesWithUsableYellowCoverage:attributed.filter(m=>finite(m.teamStats?.home?.yellowCards)&&finite(m.teamStats?.away?.yellowCards)).length,
    matchesWithUsableCardCoverage:attributed.filter(m=>['home','away'].every(side=>['yellowCards','secondYellowCards','straightRedCards'].every(field=>finite(m.teamStats?.[side]?.[field])))).length,
    missingRefereeMatches:matches.length-attributed.length,
    missingYellowTeamRecords:matches.flatMap(m=>[m.teamStats?.home,m.teamStats?.away]).filter(s=>!finite(s?.yellowCards)).length};
}
function preserveAggregateMissingness(rows,refereeTeams=false) {
  return rows.map(row=>{
    const factor=refereeTeams?1:2;
    const fields=refereeTeams?{yellowCards:'yellowCoverage',fouls:'foulCoverage',secondYellowCards:'secondYellowCoverage',straightRedCards:'straightRedCoverage',penaltiesFor:'penaltyCoverage',penaltiesAgainst:'penaltyCoverage'}:{yellowCards:'yellowCards',fouls:'fouls',secondYellowCards:'secondYellowCards',straightRedCards:'straightRedCards',penalties:'penalties'};
    const knownComponents={},missingComponents=[],next={...row};
    for(const [field,countKey] of Object.entries(fields)){
      const count=refereeTeams?row[countKey]:row.coverage?.[countKey];
      if(count>0)knownComponents[field]=row[field];
      if(count!==row.matches*factor)missingComponents.push(field);
      if(!count)next[field]=null;
    }
    return {...next,disciplinaryCoverage:{status:missingComponents.length?Object.keys(knownComponents).length?'PARTIAL':'UNAVAILABLE':'COMPLETE',knownComponents,missingComponents}};
  });
}
module.exports={datasetCoverage,preserveAggregateMissingness};
