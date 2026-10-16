import {createReadingView} from './view-model.mjs';

export function adaptChampionsReading({fixture,calendarFixture,branding,publishedSelections=[],analysis=null,sources=null}){
  const side=name=>{const team=branding.get(name);return {id:team?.id??null,name,logo:team?.logo??null,colors:team?.colors};};
  return createReadingView({competition:'champions',
    fixture:{id:fixture.fixtureId,matchday:calendarFixture?.matchday??null,date:fixture.date,kickoff:fixture.kickoff,status:fixture.status,score:fixture.score??null,stadium:calendarFixture?.stadium??null},
    home:side(fixture.homeTeam),away:side(fixture.awayTeam),
    forecasts:publishedSelections,prediction:fixture,formation:fixture.probableFormation?.status??null,quality:fixture.dataQuality??null,analysis,sources
  });
}
