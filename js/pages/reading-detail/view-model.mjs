// Presentation only. Source objects and bookmaker contracts are never mutated.
export const PILOT_FIXTURES=Object.freeze({
  'serie-a':'atalanta-venezia-2026-27-md-06',
  champions:'ucl-2026-27-md02-05'
});

export function isReadingPilot(competition,id,search=''){
  return (PILOT_FIXTURES[competition]===id||(competition==='serie-a'&&id==='milan-atalanta-2026-27-md-07'))&&new URLSearchParams(search).get('layout')!=='legacy';
}

export function createReadingView({competition,fixture,home,away,forecasts=[],prediction=null,formation=null,quality=null,analysis=null,sources=null}){
  if(!fixture?.id||!home?.name||!away?.name)throw new Error('Reading identity unavailable');
  return Object.freeze({
    competition,
    theme:competition==='champions'?'champions':'serie-a',
    fixture:Object.freeze({...fixture}),
    home:Object.freeze({...home}),away:Object.freeze({...away}),
    // Retain references, including absent properties and explicit nulls.
    forecasts:Object.freeze([...forecasts]),prediction,formation,quality,analysis,sources
  });
}
