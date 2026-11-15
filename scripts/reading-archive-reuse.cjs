'use strict';
// Reuse presentation only, never canonical statistics or prediction engine inputs.
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function withoutPresentationDuels(dataset){
  if(!dataset)return dataset;
  const copy=structuredClone(dataset);
  for(const prediction of copy.predictions||[])for(const player of prediction.likelyBooked||[])delete player.readingDuels;
  return copy;
}
function canReuse({previous,match,readings,predictions,forecastDataset,officialFixtures}){
  if(match.status!=='finished'||!previous)return false;
  const stored=previous.matches?.find(f=>f.id===match.id);
  return equal(stored,match)&&equal(previous.readings,readings)&&
    equal(withoutPresentationDuels(previous.predictionDataset),{predictions})&&
    equal(previous.forecastDataset,forecastDataset)&&
    equal(previous.artifacts?.['data/sources/official-lineups-2026-27.json']?.fixtures,officialFixtures);
}
module.exports={canReuse};
