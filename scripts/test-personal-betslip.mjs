import assert from "node:assert/strict";
import {assessSelections,createPersonalBetslipStore,isCornerPeriodSelection,isIndividualPlayerFoulSelection,isPlayableUnder,personalBetslipSummary,PERSONAL_BETSLIP_STORAGE_KEY} from "../js/pages/personal-betslip-store.mjs";

function memoryStorage(){
  const values=new Map();
  return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),dump:()=>values.get(PERSONAL_BETSLIP_STORAGE_KEY)};
}

const context6={competition:"serie-a",season:"2026-27",matchday:6,label:"Serie A · 6ª giornata"};
const context7={competition:"serie-a",season:"2026-27",matchday:7,label:"Serie A · 7ª giornata"};
const championsContext={competition:"champions-league",season:"2026-27",matchday:6,label:"Champions League · 6ª giornata"};

function selection(id,{matchId="alpha-beta-2026-27-md-06",providerMarketId=`market-${id}`,market="MERCATO TEST",variant=null,outcome="OVER",label=`Scelta ${id}`,odds=1.8,verifiedAt="2026-10-09T10:43:00.203Z",availability="AVAILABLE_AT_SNAPSHOT",compatibilityStatus="COMPATIBILE",bookmakerCombinability,overlapKey=`overlap-${id}`,semanticKeys=[`semantic-${id}`],scenarioAnalysis=null,context=context6}={}){
  const selectionId=`bet:sisal:${matchId}:${id}`;
  return {selectionId,context,fixture:"Alpha - Beta",label,market,scenarioAnalysis,betSelection:{schemaVersion:1,selectionId,identity:{status:"VERIFIED_PROVIDER_IDS",matchId,provider:"sisal",providerMarketId,providerSelectionId:id},market:{name:market,variant,selection:outcome,bookmakerSemantics:{selectionName:outcome}},quote:{decimal:odds,verifiedAt,availability,source:{provider:"sisal",url:"https://example.test/quote"}},compatibility:{status:compatibilityStatus,bookmakerCombinability},overlap:{overlapKey,semanticKeys}}};
}

{
  const store=createPersonalBetslipStore({storage:memoryStorage()});
  store.setContext(context6);
  const foul=selection("foul",{market:"U/O FALLI COMMESSI GIOCATORE",label:"Giocatore almeno 2 falli"});
  assert.equal(isIndividualPlayerFoulSelection(foul),true,"mercato falli individuali non riconosciuto");
  assert.equal(store.add(foul).status,"INDIVIDUAL_FOUL_NOT_PLAYABLE","i falli individuali MD6 devono essere rifiutati");
  assert.equal(store.getSnapshot().selections.length,0,"un fallo individuale rifiutato non deve essere aggiunto");

  const storage=memoryStorage(),key="serie-a:2026-27:md06";
  storage.setItem(PERSONAL_BETSLIP_STORAGE_KEY,JSON.stringify({version:1,activeContext:key,contexts:{[key]:{context:context6,selections:[foul],updatedAt:"2026-10-09T12:00:00.000Z"}}}));
  const restored=createPersonalBetslipStore({storage});
  const snapshot=restored.getSnapshot();
  assert.equal(snapshot.selections.length,1,"una selezione falli già salvata deve essere conservata");
  assert(snapshot.assessment.issues.some(issue=>issue.type==="INDIVIDUAL_FOUL_NOT_PLAYABLE"),"la selezione falli salvata deve essere segnalata come non giocabile");
  assert.equal(snapshot.assessment.usableCombinedOdds,null,"una selezione falli salvata non deve entrare nella quota combinata");
  assert.equal(snapshot.assessment.theoreticalCombinedOdds,null,"una selezione falli storica non deve essere riattivata nella quota teorica");
}

{
  const storage=memoryStorage(),store=createPersonalBetslipStore({storage,now:()=>"2026-10-09T12:00:00.000Z"});
  assert.equal(store.setContext(context6).status,"OK");
  const first=selection("one");
  assert.equal(store.add(first).status,"ADDED","aggiunta singola fallita");
  assert.equal(store.add({...first,label:"Stessa identità, altra etichetta"}).status,"DUPLICATE","deduplica non basata sul selectionId stabile");
  assert.equal(store.getSnapshot().selections.length,1,"il duplicato non deve creare una seconda riga");
  assert.equal(store.remove(first.selectionId).status,"REMOVED","rimozione fallita");
  assert.equal(store.getSnapshot().selections.length,0,"rimozione non applicata");

  const a=selection("a"),b=selection("b",{matchId:"gamma-delta-2026-27-md-06"});
  store.add(a);
  const batch=store.addMany([{...a,sourceSection:"mycombo-partita"},b]);
  assert.equal(batch.added,1,"aggiunta multipla deve aggiungere solo le selezioni nuove");
  assert.equal(batch.duplicates,1,"aggiunta multipla deve segnalare i duplicati");
  assert.ok(batch.assessment.issues.some(issue=>issue.type==="BOOKMAKER_COMBINABILITY_UNKNOWN"),"aggiunta multipla deve restituire le incompatibilità rilevate");
  assert.equal(store.getSnapshot().selections[0].selectionId,a.selectionId,"aggiunta multipla non deve sostituire la selezione esistente");
  assert.ok(storage.dump(),"stato versionato non salvato");

  const restored=createPersonalBetslipStore({storage});
  assert.equal(restored.getSnapshot().selections.length,2,"ripristino da localStorage fallito");
  restored.setContext(context7);
  assert.equal(restored.getSnapshot().selections.length,0,"le giornate devono avere bucket separati");
  restored.setContext(championsContext);
  assert.equal(restored.getSnapshot().selections.length,0,"le competizioni devono avere bucket separati");
  restored.setContext(context6);
  assert.equal(restored.getSnapshot().selections.length,2,"rientrando nella giornata va ripristinata la schedina corretta");
  assert.equal(restored.clear().removed,2,"svuotamento del contesto attivo fallito");
  assert.equal(restored.getSnapshot().selections.length,0,"lo svuotamento non deve lasciare selezioni");
}

{
  const store=createPersonalBetslipStore({storage:memoryStorage()});
  store.setContext(context6);
  assert.equal(store.add(selection("under",{outcome:"UNDER",label:"Under 2,5"})).status,"UNDER_NOT_PLAYABLE","gli Under MD6 devono essere rifiutati");
  assert.equal(isPlayableUnder(selection("under-label",{outcome:"TOTAL",label:"Duo + Under 3,5"})),true,"riconoscimento Under nell'etichetta fallito");
  assert.equal(store.getSnapshot().selections.length,0,"un Under rifiutato non deve essere memorizzato");
}

{
  const periodCorner=selection("corner-period",{market:"1 TEMPO: 1X2 CORNER",variant:"1T CORNER 1X2",outcome:"1",label:"Casa più corner nel primo tempo"});
  const fullMatchCorner=selection("corner-full",{market:"U/O CORNER",variant:"U/O 9.5 CORNER",outcome:"OVER",label:"Over 9,5 corner"});
  assert.equal(isCornerPeriodSelection(periodCorner),true,"corner del primo tempo non riconosciuto dalla semantica canonica");
  assert.equal(isCornerPeriodSelection(fullMatchCorner),false,"corner dell'intera partita classificato per errore come mercato per tempo");
  const store=createPersonalBetslipStore({storage:memoryStorage()});
  store.setContext(context6);
  assert.equal(store.add(periodCorner).status,"CORNER_PERIOD_NOT_PLAYABLE","i corner per tempo MD6 devono essere rifiutati");
  assert.equal(store.add(fullMatchCorner).status,"ADDED","i corner dell'intera partita devono restare aggiungibili");

  const storage=memoryStorage(),key="serie-a:2026-27:md06";
  storage.setItem(PERSONAL_BETSLIP_STORAGE_KEY,JSON.stringify({version:1,activeContext:key,contexts:{[key]:{context:context6,selections:[periodCorner],updatedAt:"2026-10-09T12:00:00.000Z"}}}));
  const restored=createPersonalBetslipStore({storage});
  const snapshot=restored.getSnapshot();
  assert.equal(snapshot.selections.length,1,"un corner per tempo già salvato deve essere conservato");
  assert(snapshot.assessment.issues.some(issue=>issue.type==="CORNER_PERIOD_NOT_PLAYABLE"),"il corner per tempo salvato deve essere segnalato come non giocabile");
  assert.equal(snapshot.assessment.usableCombinedOdds,null,"un corner per tempo salvato non deve entrare nella quota combinata");
  assert.equal(snapshot.assessment.theoreticalCombinedOdds,null,"un corner per tempo storico non deve entrare nella quota teorica");
  assert.equal(restored.remove(periodCorner.selectionId).status,"REMOVED","il corner per tempo conservato deve restare rimovibile manualmente");
  assert.equal(restored.getSnapshot().selections.length,0,"la rimozione del corner per tempo conservato non è stata applicata");
}

{
  const contradiction=assessSelections([
    selection("home",{providerMarketId:"result",outcome:"1",label:"Vittoria casa"}),
    selection("away",{providerMarketId:"result",outcome:"2",label:"Vittoria ospite"}),
  ]);
  assert.ok(contradiction.issues.some(issue=>issue.type==="MARKET_CONTRADICTION"),"contraddizione dello stesso mercato non rilevata");
  assert.equal(contradiction.usableCombinedOdds,null,"una contraddizione non deve produrre quota totale");

  const overlap=assessSelections([
    selection("shots",{providerMarketId:"shots-a",overlapKey:"player-shots",semanticKeys:["player:alpha","shots"]}),
    selection("sot",{providerMarketId:"shots-b",overlapKey:"player-shots",semanticKeys:["player:alpha","sot"]}),
  ]);
  assert.ok(overlap.issues.some(issue=>issue.type==="LOGICAL_OVERLAP"),"sovrapposizione logica non rilevata");

  const scenarioIncompatibility=assessSelections([
    selection("score-a",{scenarioAnalysis:{scoreMask:"0x1",compatibleOutcomes:["1"]}}),
    selection("score-b",{scenarioAnalysis:{scoreMask:"0x2",compatibleOutcomes:["2"]}}),
  ]);
  assert.ok(scenarioIncompatibility.issues.some(issue=>issue.type==="SCENARIO_INCOMPATIBILITY"),"incompatibilità tra eventi di punteggio non rilevata");
  const store=createPersonalBetslipStore({storage:memoryStorage()});store.setContext(context6);
  assert.equal(store.add(selection("score-a",{scenarioAnalysis:{scoreMask:"0x1",compatibleOutcomes:["1"]}})).status,"ADDED");
  assert.equal(store.add(selection("score-b",{scenarioAnalysis:{scoreMask:"0x2",compatibleOutcomes:["2"]}})).status,"ADDED","un'alternativa logica non deve essere bloccata");
  assert.equal(store.getSnapshot().selections.length,2,"le alternative devono restare entrambe rimovibili");

  const implication=assessSelections([
    selection("subset",{scenarioAnalysis:{scoreMask:"0x1",compatibleOutcomes:["1"]}}),
    selection("superset",{scenarioAnalysis:{scoreMask:"0x3",compatibleOutcomes:["1","X"]}}),
  ]);
  assert.ok(implication.issues.some(issue=>issue.type==="LOGICAL_IMPLICATION"),"implicazione logica non distinta dalla correlazione");

  const correlated=assessSelections([
    selection("overlap-a",{scenarioAnalysis:{scoreMask:"0x3",compatibleOutcomes:["1","X"]}}),
    selection("overlap-b",{scenarioAnalysis:{scoreMask:"0x6",compatibleOutcomes:["X","2"]}}),
  ]);
  assert.ok(correlated.issues.some(issue=>issue.type==="LOGICAL_OVERLAP"),"correlazione tra eventi sovrapposti non rilevata");

  const unknownCombination=assessSelections([selection("c"),selection("d",{matchId:"gamma-delta-2026-27-md-06"})]);
  assert.ok(unknownCombination.issues.some(issue=>issue.type==="BOOKMAKER_COMBINABILITY_UNKNOWN"),"combinabilità bookmaker non verificata non segnalata");
  assert.equal(unknownCombination.usableCombinedOdds,null,"senza conferma bookmaker la quota totale non deve apparire");
  assert.equal(unknownCombination.theoreticalCombinedOdds,3.24,"la quota teorica deve restare distinta dalla combinabilità bookmaker");

  const sameMatch=assessSelections([
    selection("same-a",{odds:1.7}),
    selection("same-b",{odds:2.1}),
  ]);
  assert.equal(sameMatch.theoreticalCombinedOdds,3.57,"la quota teorica deve moltiplicare anche due selezioni della stessa partita");
  assert.equal(sameMatch.theoreticalQuoteCount,2,"il conteggio quote teoriche deve includere entrambe le selezioni valide");

  const partial=assessSelections([
    selection("valid",{odds:1.75}),
    selection("invalid",{odds:null}),
  ]);
  assert.equal(partial.theoreticalCombinedOdds,1.75,"la quota teorica parziale deve usare soltanto quote numeriche valide");
  assert.equal(partial.theoreticalExcludedCount,1,"la quota teorica parziale deve dichiarare le selezioni escluse");

  const confirmed=assessSelections([
    selection("e",{bookmakerCombinability:"CONFIRMED",odds:2}),
    selection("f",{matchId:"gamma-delta-2026-27-md-06",bookmakerCombinability:"CONFIRMED",odds:1.5}),
  ]);
  assert.equal(confirmed.usableCombinedOdds,3,"la quota totale verificata deve usare le ultime quote disponibili");

  for(const problematic of [
    selection("duo",{compatibilityStatus:"INCOMPATIBILE_DUO",bookmakerCombinability:"CONFIRMED"}),
    selection("missing-quote",{odds:null,bookmakerCombinability:"CONFIRMED"}),
    selection("closed",{availability:"NOT_AVAILABLE",bookmakerCombinability:"CONFIRMED"}),
  ])assert.equal(assessSelections([problematic]).usableCombinedOdds,null,"una selezione non giocabile non deve produrre quota totale");
}

{
  const store=createPersonalBetslipStore({storage:memoryStorage(),now:()=>"2026-10-09T12:00:00.000Z"});
  store.setContext(context6);
  const original=selection("quote",{odds:1.8,verifiedAt:"2026-10-09T10:00:00.000Z"});
  const missing=selection("missing");
  store.add(original);store.add(missing);
  const refreshed=selection("quote",{odds:1.95,verifiedAt:"2026-10-09T11:00:00.000Z"});
  const result=store.reconcile([refreshed]);
  assert.equal(result.missing,1,"una selezione scomparsa dai dati correnti deve essere contata");
  const snapshot=store.getSnapshot(),updated=snapshot.selections.find(row=>row.selectionId===original.selectionId),retained=snapshot.selections.find(row=>row.selectionId===missing.selectionId);
  assert.equal(updated.betSelection.quote.decimal,1.95,"riconciliazione non usa l'ultima quota verificata");
  assert.equal(updated.quoteChanged,true,"variazione quota non segnalata");
  assert.equal(updated.addedQuote,1.8,"quota al momento dell'aggiunta non conservata");
  assert.equal(retained.dataStatus,"MISSING_FROM_CURRENT_DATA","selezione scomparsa non conservata con avviso");
  assert.ok(snapshot.assessment.issues.some(issue=>issue.type==="MISSING_FROM_CURRENT_DATA"),"assenza dai dati correnti non esposta nella valutazione");
  const summary=personalBetslipSummary(snapshot);
  assert.match(summary,/Quota combinata teorica:/);
  assert.match(summary,/combinabilità bookmaker resta una verifica separata/);
  assert.doesNotMatch(summary,/\blive\b/i,"il riepilogo non deve presentare le quote come live");
}

{
  const brokenStorage={getItem(){throw new Error("lettura negata")},setItem(){throw new Error("scrittura negata")}};
  const store=createPersonalBetslipStore({storage:brokenStorage});
  assert.match(store.getSnapshot().storageError,/Ripristino non riuscito/);
  store.setContext(context6);
  assert.match(store.getSnapshot().storageError,/Salvataggio locale non riuscito/);
}

{
  const corruptStorage={getItem:()=>"{non-json",setItem:()=>{}};
  assert.match(createPersonalBetslipStore({storage:corruptStorage}).getSnapshot().storageError,/Ripristino non riuscito/,"JSON locale corrotto non gestito");
}

console.log("OK schedina personale: store, deduplica, compatibilità, quote, contesti e persistenza");
