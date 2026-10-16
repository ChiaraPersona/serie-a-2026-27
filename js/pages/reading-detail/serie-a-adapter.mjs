import {createReadingView} from './view-model.mjs';
import {sharedForecastsForMatch} from '../shared-forecast-contract.mjs';

export function adaptSerieAReading({match,teams,teamDirectory,prediction,marketCatalog,formation}){
  const side=id=>{
    const team=teams.find(t=>t.id===id),meta=teamDirectory?.teams?.find(t=>t.id===id);
    return {id,name:team?.name,logo:team?.logo||meta?.logo||null};
  };
  const homeMeta=teamDirectory?.teams?.find(t=>t.id===match.homeTeam);
  return createReadingView({competition:'serie-a',
    fixture:{id:match.id,matchday:match.matchday,date:match.date,kickoff:match.kickoff,status:match.status,score:match.score??null,stadium:homeMeta?.stadium??null},
    home:side(match.homeTeam),away:side(match.awayTeam),
    forecasts:sharedForecastsForMatch(marketCatalog,match.id),prediction,formation,quality:prediction?.dataQuality??null
  });
}
