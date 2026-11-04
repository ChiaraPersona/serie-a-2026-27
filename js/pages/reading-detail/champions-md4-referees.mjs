// Fixture-scoped descriptive data. Never feed these aggregates into forecasts.
export function descriptiveRefereeAssignment(assignment,profile){
 if(!assignment||!profile||profile.status!=='AVAILABLE'||profile.name!==assignment.referee?.name||profile.refereeId!==(assignment.refereeId||null))return assignment;
 const career=profile.career;
 const metrics={yellowCardsPerMatch:career.yellowCards?.perMatch,redCardsPerMatch:career.redCards?.perMatch,foulsPerMatch:career.fouls?.perMatch,penaltiesPerMatch:career.penalties?.perMatch};
 return {...assignment,statistics:Object.fromEntries(Object.entries(metrics).map(([key,value])=>[key,{display:Number.isFinite(value)?value.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2}):'N/D'}])),statisticsSample:`${profile.sampleNote} Campione: ${career.matches} gare. Periodo completo non certificato. Rossi diretti e seconde ammonizioni non separabili. Dati esclusi dai pronostici.`};
}
