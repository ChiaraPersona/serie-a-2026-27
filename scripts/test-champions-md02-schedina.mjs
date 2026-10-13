import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createPersonalBetslipStore} from "../js/pages/personal-betslip-store.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=relative=>JSON.parse(fs.readFileSync(path.join(root,relative),"utf8"));
const data=read("data/normalized/schedina-champions-md02.json");
const integration=read("data/normalized/champions-md02-integration-2026-27.json");
const odds=read("data/normalized/odds/sisal/champions-league.json");
const individualSource=read("data/sources/champions-md02-individual-selection-2026-27.json");

assert.equal(data.matchday,2);
assert.equal(data.fixtures.length,18);
assert.equal(new Set(data.fixtures.map(fixture=>fixture.fixtureId)).size,18);
const selections=data.fixtures.flatMap(fixture=>fixture.selections);
assert.equal(selections.length,63);
assert.equal(new Set(selections.map(selection=>selection.selectionId)).size,63);
assert.equal(data.summary.clickableSelections,63);
assert.equal(data.summary.result1x2,9);
assert.equal(data.summary.doubleChance,9);
assert.equal(data.summary.phase12BPredictions,18);
assert.equal(data.summary.individualPredictions,45);
assert.equal(data.summary.individualShots,27);
assert.equal(data.summary.individualShotsOnTarget,18);
assert.equal(data.summary.mathematicallyEvaluable,18);
assert.equal(data.summary.pending,63);
assert.equal(data.summary.stakeEuro,0);
assert.equal(data.summary.grossReturnEuro,null);
assert.equal(data.summary.roiPct,null);
assert.equal(data.summary.profitLossEuro,null);

for(const fixture of data.fixtures){
  const source=integration.fixtures.find(item=>item.fixtureId===fixture.fixtureId);
  assert(source,`${fixture.fixtureId}: fixture integrazione mancante`);
  const selection=fixture.selections.find(item=>item.marketScope!=="player");
  assert(selection,`${fixture.fixtureId}: verdetto 12B mancante`);
  const providerEvent=odds.events.find(event=>event.canonicalMatchId===fixture.fixtureId);
  const providerMarket=providerEvent.markets.find(market=>market.providerMarketId===selection.providerMarketId);
  const providerSelection=providerMarket.selections.find(item=>item.providerSelectionId===selection.providerSelectionId);
  assert.equal(selection.selection,source.teamPrediction.verdict.outcome,`${fixture.fixtureId}: verdetto divergente`);
  assert.equal(selection.modelProbabilityPct,source.teamPrediction.verdict.probabilityPct,`${fixture.fixtureId}: probabilità divergente`);
  assert.equal(selection.betSelection.identity.matchId,fixture.fixtureId);
  assert.equal(selection.betSelection.identity.status,"VERIFIED_PROVIDER_IDS");
  assert.equal(selection.betSelection.quote.availability,"AVAILABLE_AT_SNAPSHOT");
  assert.equal(selection.betSelection.quote.decimal,selection.odds);
  assert.equal(selection.odds,providerSelection.odds,`${fixture.fixtureId}: quota Sisal alterata`);
  assert.equal(selection.betSelection.quote.oddsRaw,providerSelection.oddsRaw,`${fixture.fixtureId}: quota raw Sisal alterata`);
  assert.equal(providerSelection.status,"open",`${fixture.fixtureId}: selezione provider non aperta`);
  assert.equal(selection.betSelection.market.modifiers.periodScope,"full-match");
  assert.equal(selection.betSelection.market.modifiers.replacementIncluded,false);
  assert.equal(selection.betSelection.market.modifiers.woodworkIncluded,false);
  assert.match(fixture.readingUrl,new RegExp(`match=${fixture.fixtureId}$`));

  for(const individual of fixture.selections.filter(item=>item.marketScope==="player")){
    const sourcePick=individualSource.picks.find(pick=>pick.fixtureId===fixture.fixtureId&&pick.playerId===individual.player.canonicalPlayerId&&Number(pick.threshold)===individual.threshold&&((pick.metric==="shots"&&individual.marketCode==="28507")||(pick.metric==="shotsOnTarget"&&individual.marketCode==="28506")));
    assert(sourcePick,`${individual.selectionId}: proposta editoriale non tracciata`);
    assert.equal(source.teamPrediction.dataQuality.detailedVolumesAvailable,true,`${fixture.fixtureId}: forecast individuale senza volumi dettagliati`);
    const player=[...source.lineups.home.players,...source.lineups.away.players].find(item=>item.canonicalPlayerId===individual.player.canonicalPlayerId);
    assert(player,`${individual.selectionId}: giocatore non presente nei probabili titolari`);
    assert.equal(player.mappingStatus,"resolved");
    assert.equal(player.dataStatus,"verified-history");
    assert.equal(individual.player.lineupStatus,"probable-starter");
    const projectionKey=sourcePick.metric==="shots"?"projectedShots":"projectedShotsOnTarget";
    assert.equal(individual.betSelection.evaluation.individualForecast.mean,player[projectionKey]);
    assert.equal(individual.betSelection.evaluation.status,"NOT_MODELLED");
    assert.equal(individual.modelProbabilityPct,null);
    assert.equal(individual.fairOdds,null);
    assert.equal(individual.expectedValuePct,null);
    assert.equal(individual.betSelection.evaluation.modelProbabilityPct,null);
    assert.equal(individual.betSelection.evaluation.fairOdds,null);
    assert.equal(individual.betSelection.evaluation.expectedValuePct,null);
    const providerPlayerMarket=source.oddsEvent.playerMarkets.find(market=>market.providerMarketId===individual.providerMarketId);
    const providerPlayerSelection=providerPlayerMarket?.selections.find(item=>item.providerSelectionId===individual.providerSelectionId);
    assert(providerPlayerMarket&&providerPlayerSelection,`${individual.selectionId}: contratto provider mancante`);
    assert.equal(providerPlayerSelection.name,"OVER");
    assert.equal(providerPlayerSelection.interfaceSelectable,true);
    assert.equal(individual.odds,providerPlayerSelection.odds);
    assert.equal(individual.betSelection.quote.oddsRaw,providerPlayerSelection.oddsRaw);
    assert.deepEqual(individual.modifiers,providerPlayerMarket.modifiers);
    assert.equal(individual.modifiers.replacementIncluded,true);
    assert.equal(individual.betSelection.market.bookmakerSemantics.duo,true);
    assert.equal(individual.betSelection.market.bookmakerSemantics.postsAndCrossbarIncluded,individual.marketCode==="28506");
    assert.equal(individual.betSelection.identity.canonicalPlayerIds[0],individual.player.canonicalPlayerId);
  }
}

assert.equal(data.fixtures.find(fixture=>fixture.fixtureId==="ucl-2026-27-md02-02").selections.length,1,"Sabah-Slavia non deve ricevere forecast individuali");
assert(new Set(data.fixtures.map(fixture=>fixture.selections.length)).size>2,"Non deve esserci un numero fisso di proposte per partita");

const memory=new Map();
const storage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};
const context={competition:"champions",season:"2026-27",matchday:2};
const first=createPersonalBetslipStore({storage,now:()=>"2026-10-13T13:00:00.000Z"});
assert.equal(first.setContext(context).status,"OK");
const firstIndividual=selections.find(selection=>selection.marketScope==="player");
assert.equal(first.add(firstIndividual).status,"ADDED");
assert.equal(first.getSnapshot().selections[0].betSelection.quote.decimal,firstIndividual.odds);
assert.deepEqual(first.getSnapshot().selections[0].betSelection.market.modifiers,firstIndividual.modifiers);
assert.equal(first.remove(firstIndividual.selectionId).status,"REMOVED");
assert.equal(first.add(firstIndividual).status,"ADDED");
const restored=createPersonalBetslipStore({storage});
restored.setContext(context);
assert.equal(restored.getSnapshot().selections.length,1);
assert.deepEqual(restored.getSnapshot().selections[0].betSelection.market.modifiers,firstIndividual.modifiers);

assert.equal(integration.fixtures.find(fixture=>fixture.fixtureId==="ucl-2026-27-md02-02").teamPrediction.dataQuality.detailedVolumesAvailable,false);
const viking=integration.fixtures.find(fixture=>fixture.fixtureId==="ucl-2026-27-md02-08");
assert(viking.lineups.home.players.some(player=>player.suppliedName==="Haugen"&&player.canonicalPlayerId===null&&player.mappingStatus==="unresolved"));

console.log("OK card Champions MD2: 18 partite, 18 verdetti + 45 individuali, quote/ID/modificatori e persistenza verificati");
