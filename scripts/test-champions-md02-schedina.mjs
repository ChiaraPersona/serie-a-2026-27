import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {createPersonalBetslipStore} from "../js/pages/personal-betslip-store.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=relative=>JSON.parse(fs.readFileSync(path.join(root,relative),"utf8"));
const data=read("data/normalized/schedina-champions-md02.json");
const integration=read("data/normalized/champions-md02-integration-2026-27.json");
const odds=read("data/normalized/odds/sisal/champions-league.json");
const individualSource=read("data/sources/champions-md02-individual-selection-2026-27.json");
const phase12d=read("data/sources/champions-md02-phase12d-additions-2026-27.json");
const outsiders=read("data/sources/champions-md02-phase12d-outsiders-2026-27.json");

assert.equal(data.matchday,2);
assert.equal(data.fixtures.length,18);
assert.equal(new Set(data.fixtures.map(fixture=>fixture.fixtureId)).size,18);
const selections=data.fixtures.flatMap(fixture=>fixture.selections);
assert.equal(selections.length,120);
assert.equal(new Set(selections.map(selection=>selection.selectionId)).size,120);
assert.equal(data.summary.clickableSelections,120);
assert.equal(data.summary.result1x2,9);
assert.equal(data.summary.doubleChance,9);
assert.equal(data.summary.phase12BPredictions,18);
assert.equal(data.summary.teamPredictions,42);
assert.equal(data.summary.phase12DTeamPredictions,17);
assert.equal(data.summary.phase12DIndividualPredictions,14);
assert.equal(data.summary.outsiderPredictions,26);
assert.equal(data.summary.outsiderTeamPredictions,7);
assert.equal(data.summary.outsiderIndividualPredictions,19);
assert.equal(data.summary.preferredPredictions,18);
assert.equal(data.summary.individualPredictions,78);
assert.equal(data.summary.individualShots,52);
assert.equal(data.summary.individualShotsOnTarget,26);
assert.equal(data.summary.teamGoals,13);
assert.equal(data.summary.teamCorners,5);
assert.equal(data.summary.teamShots,3);
assert.equal(data.summary.teamShotsOnTarget,3);
assert.equal(data.summary.mathematicallyEvaluable,42);
assert.equal(data.summary.pending,120);
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
    const sourcePick=[...individualSource.picks,...phase12d.individualPicks,...outsiders.individualPicks].find(pick=>pick.fixtureId===fixture.fixtureId&&pick.playerId===individual.player.canonicalPlayerId&&Number(pick.threshold)===individual.threshold&&((pick.metric==="shots"&&individual.marketCode==="28507")||(pick.metric==="shotsOnTarget"&&individual.marketCode==="28506")));
    assert(sourcePick,`${individual.selectionId}: proposta editoriale non tracciata`);
    assert.equal(source.teamPrediction.dataQuality.detailedVolumesAvailable,true,`${fixture.fixtureId}: forecast individuale senza volumi dettagliati`);
    const player=[...source.lineups.home.players,...source.lineups.away.players].find(item=>item.canonicalPlayerId===individual.player.canonicalPlayerId);
    const editorialPlayer=source.editorialLineups?[...source.editorialLineups.home.players,...source.editorialLineups.away.players].find(item=>item.canonicalPlayerId===individual.player.canonicalPlayerId):null;
    assert(player||editorialPlayer,`${individual.selectionId}: giocatore non presente nella XI corrente o editoriale`);
    const identityPlayer=player||editorialPlayer;
    assert.equal(identityPlayer.mappingStatus,"resolved");
    assert.equal(identityPlayer.dataStatus,"verified-history");
    const projectionKey=sourcePick.metric==="shots"?"projectedShots":"projectedShotsOnTarget";
    if(player){
      assert.equal(individual.player.lineupStatus,source.lineupStatus==="official"?"official-starter":"probable-starter");
      assert.equal(individual.betSelection.evaluation.individualForecast.mean,player[projectionKey]);
      if(source.lineupStatus==="official")assert(["CONFERMATO","AGGIORNATO"].includes(individual.reviewStatus));
    }else{
      assert.equal(source.lineupStatus,"official");
      const bench=[...(source.lineups.home.bench||[]),...(source.lineups.away.bench||[])];
      const confirmedBench=bench.some(item=>item.canonicalPlayerId===individual.player.canonicalPlayerId);
      assert.equal(individual.player.lineupStatus,confirmedBench?"official-bench":"official-non-starter");
      assert.equal(individual.dataQuality.benchStatus,confirmedBench?"confirmed":"not-listed");
      assert.equal(individual.reviewStatus,"DA_RIVEDERE");
      assert.equal(individual.player.expectedMinutes,null);
      assert.equal(individual.betSelection.evaluation.individualForecast.mean,null);
      assert.equal(individual.betSelection.operational.playability.status,"PLAYABLE");
      assert.equal(individual.odds,individual.betSelection.quote.decimal);
    }
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

  for(const teamPick of fixture.selections.filter(item=>item.betSelection.evaluation.status==="MODELLED_VALIDATED_TEAM_MARKET")){
    const sourcePick=[...phase12d.teamPicks,...outsiders.teamPicks].find(pick=>pick.selectionId===teamPick.selectionId);
    assert(sourcePick,`${teamPick.selectionId}: proposta squadra 12D non tracciata`);
    assert.equal(sourcePick.classification,"A");
    assert.equal(teamPick.classification,"A");
    assert(Number.isFinite(teamPick.modelProbabilityPct));
    assert(Number.isFinite(teamPick.fairOdds));
    assert(Number.isFinite(teamPick.expectedValuePct));
    assert.equal(teamPick.betSelection.quote.availability,"AVAILABLE_AT_SNAPSHOT");
    assert.equal(teamPick.betSelection.compatibility.status,"COMPATIBILE_CONTRATTO_ESATTO");
  }
}

const targetedFixtureIds=new Set(["ucl-2026-27-md02-03","ucl-2026-27-md02-04","ucl-2026-27-md02-05","ucl-2026-27-md02-06","ucl-2026-27-md02-07","ucl-2026-27-md02-08","ucl-2026-27-md02-09"]);
const untouchedFixtures=data.fixtures.filter(fixture=>!targetedFixtureIds.has(fixture.fixtureId));
const baselineSchedina=JSON.parse(execFileSync("git",["show","HEAD:data/normalized/schedina-champions-md02.json"],{cwd:root,encoding:"utf8",maxBuffer:64*1024*1024}));
assert.equal(
  crypto.createHash("sha256").update(JSON.stringify(untouchedFixtures)).digest("hex").toUpperCase(),
  crypto.createHash("sha256").update(JSON.stringify(baselineSchedina.fixtures.filter(fixture=>!targetedFixtureIds.has(fixture.fixtureId)))).digest("hex").toUpperCase(),
  "Le 11 gare fuori ambito della Schedina Champions sono cambiate"
);
assert.equal(data.fixtures.find(fixture=>fixture.fixtureId==="ucl-2026-27-md02-01").selections.length,6);
assert.equal(data.fixtures.find(fixture=>fixture.fixtureId==="ucl-2026-27-md02-02").selections.length,2);

assert.equal(data.fixtures.find(fixture=>fixture.fixtureId==="ucl-2026-27-md02-02").selections.filter(item=>item.marketScope==="player").length,0,"Sabah-Slavia non deve ricevere forecast individuali");
assert(new Set(data.fixtures.map(fixture=>fixture.selections.length)).size>2,"Non deve esserci un numero fisso di proposte per partita");

const phase12dIds=new Set([...phase12d.teamPicks,...phase12d.individualPicks].map(pick=>pick.selectionId));
const outsiderIds=new Set([...outsiders.teamPicks,...outsiders.individualPicks].map(pick=>pick.selectionId));
const preferredIds=new Set(outsiders.preferredPicks.map(pick=>pick.selectionId));
assert.equal(outsiderIds.size,26,"La fonte editoriale outsider deve contenere 26 selectionId unici");
assert.equal(outsiders.preferredPicks.length,18,"La fonte editoriale deve contenere 18 preferiti");
assert.equal(preferredIds.size,18,"I preferiti devono avere 18 selectionId unici");
assert.equal(new Set(outsiders.preferredPicks.map(pick=>pick.fixtureId)).size,18,"Serve un preferito editoriale per partita");
assert.deepEqual(new Set(selections.filter(selection=>selection.isOutsider===true).map(selection=>selection.selectionId)),outsiderIds,"I flag outsider devono derivare esattamente dalla fonte editoriale");
assert.deepEqual(new Set(selections.filter(selection=>selection.isPreferred===true).map(selection=>selection.selectionId)),preferredIds,"I flag preferito devono derivare esattamente dalla fonte editoriale");
for(const fixture of data.fixtures){
  const preferred=fixture.selections.filter(selection=>selection.isPreferred===true);
  assert.equal(preferred.length,1,`${fixture.fixtureId}: deve esserci esattamente un preferito`);
  const sourcePreferred=outsiders.preferredPicks.find(pick=>pick.fixtureId===fixture.fixtureId);
  assert.equal(preferred[0].selectionId,sourcePreferred.selectionId,`${fixture.fixtureId}: mapping preferito divergente`);
  assert.equal(preferred[0].editorial.preferred.reason,sourcePreferred.reason,`${fixture.fixtureId}: motivazione preferito non tracciata`);
  assert.equal(preferred[0].editorial.preferred.curatedAt,outsiders.preferredCuratedAt,`${fixture.fixtureId}: timestamp preferito non tracciato`);
  assert.equal(preferred[0].editorial.preferred.evaluationClass,"A",`${fixture.fixtureId}: preferito non matematicamente valutabile`);
}
const baselineIds=selections.filter(selection=>!phase12dIds.has(selection.selectionId)&&!outsiderIds.has(selection.selectionId)).map(selection=>selection.selectionId).sort();
assert.equal(baselineIds.length,63);
assert.equal(crypto.createHash("sha256").update(JSON.stringify(baselineIds)).digest("hex").toUpperCase(),phase12d.baseline.selectionIdsSha256,"I 63 selectionId delle Fasi 12B/12C sono cambiati");
const preOutsiderIds=selections.filter(selection=>!outsiderIds.has(selection.selectionId)).map(selection=>selection.selectionId).sort();
assert.equal(preOutsiderIds.length,94);
assert.equal(crypto.createHash("sha256").update(JSON.stringify(preOutsiderIds)).digest("hex").toUpperCase(),outsiders.baseline.selectionIdsSha256,"I 94 selectionId pre-outsider sono cambiati");
for(const pick of [...phase12d.teamPicks,...phase12d.individualPicks]){
  const fixture=data.fixtures.find(item=>item.fixtureId===pick.fixtureId);
  const kickoff=new Date(`${fixture.date}T${fixture.kickoff}:00+02:00`);
  assert(new Date(phase12d.generatedAt)<kickoff,`${pick.fixtureId}: proposta 12D non prepartita`);
}
for(const pick of [...outsiders.teamPicks,...outsiders.individualPicks]){
  const fixture=data.fixtures.find(item=>item.fixtureId===pick.fixtureId);
  const kickoff=new Date(`${fixture.date}T${fixture.kickoff}:00+02:00`);
  assert(new Date(outsiders.generatedAt)<kickoff,`${pick.fixtureId}: proposta outsider non prepartita`);
}

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

console.log("OK card Champions MD2 finale: 18 partite, 120 pronostici, 26 outsider, 18 preferiti, 42 valutabili e 120 quote cliccabili");
