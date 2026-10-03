import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fixtureLineupForMatch, formationPresentation, renderPredictionV2Sections } from "../js/pages/readings.js";

const root=process.cwd();
const esc=value=>String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
const teams=[{id:"home",name:"Casa"},{id:"away",name:"Ospiti"}];
const teamLogo=team=>`<span class="team-with-logo">${esc(team.name)}</span>`;
const range=(central=10)=>({min:central-2,central,max:central+2,interval:"p20-p80"});
const player=(overrides={})=>({
  name:"Giocatore Test",playerId:"test",team:"Casa",teamId:"home",role:"Centrocampista",detailedRole:"Mezzala",
  expectedMinutes:83.2,substitutionRisk:"medium",projectedShots:2.4,projectedShotsOnTarget:.8,allocationClass:"primary",
  shotProbabilities:{over05:.91,over15:.69,over25:.43},shotOnTargetProbabilities:{over05:.55,over15:.19},
  qualifiedOutsider:false,qualifiedSotOutsider:false,...overrides
});
const projection=(teamId,shotsLevel="elevated",sotLevel="normal")=>({
  teamId,expectedGoals:1.4,shotsTotal:range(13),shotsOnTarget:range(4.5),corners:range(5),fouls:range(12),cards:range(2),
  ownOffensiveInteraction:{shotsAdjustmentPct:5},
  opponentMatchupInteraction:{metricEvidence:{shots:{status:"active",level:shotsLevel},shotsOnTarget:{status:"active",level:sotLevel}},signalStability:{shots:.8,shotsOnTarget:.62}}
});
const fullPrediction={
  teamProjections:[projection("home"),projection("away","suppressed","suppressed")],
  shooters:{totalShots:[player()],shotsOnTarget:[player()],allPlayers:[player()],outsiders:[player({name:"Outsider Tiri",playerId:"out",qualifiedOutsider:true,outsiderConfidence:"high",projectedShots:1.2,shotProbabilities:{over05:.7,over15:.34,over25:.1},playerBaselineStability:{evidence:["Baseline individuale stabile."]}})],sotOutsiders:[]},
  likelyBooked:[]
};
const render=prediction=>renderPredictionV2Sections({prediction,teams,esc,teamLogo});
const allHtml=sections=>Object.values(sections).join("");

// 1. Prediction V2 completa.
const complete=render(fullPrediction),completeHtml=allHtml(complete);
for(const contract of ["La partita in numeri","Perché il modello vede la partita così","Possibili migliori tiratori","Outsider del modello","Disciplina e ammoniti"])assert(completeHtml.includes(contract),`V2: sezione mancante ${contract}`);

// 2. Prediction V1 senza campi V2: progressive enhancement, nessuna eccezione.
const legacy=render({teamProjections:[{teamId:"home",expectedGoals:1.1,shotsTotal:range(9)}],shooters:{totalShots:[{name:"Legacy",team:"Casa",role:"Attaccante",projectedShots:1.8}],shotsOnTarget:[]}});
assert(allHtml(legacy).includes("Classificazione outsider N/D"));

// 3-6. Minuti e probabilita presenti/assenti.
assert(complete.shooters.includes("83' attesi"));
const missingPlayer=render({...fullPrediction,shooters:{...fullPrediction.shooters,totalShots:[player({expectedMinutes:null,shotOnTargetProbabilities:null})],shotsOnTarget:[],allPlayers:[]}});
assert(missingPlayer.shooters.includes("Minuti attesi N/D"));
assert(complete.shooters.includes("69%"),"2+ tiri non renderizzato");
assert(complete.shooters.includes("19%"),"2+ SOT non renderizzato");
assert(missingPlayer.shooters.includes("N/D"),"probabilita SOT assente non gestita");

// 7-9. Outsider qualificati e zero outsider.
assert(complete.outsiders.includes("Outsider Tiri"));
assert(complete.outsiders.includes("Outsider SOT")&&complete.outsiders.includes("Nessun outsider qualificato"));
const zero=render({...fullPrediction,shooters:{...fullPrediction.shooters,outsiders:[],sotOutsiders:[]}}).outsiders;
assert.equal((zero.match(/Nessun outsider qualificato/g)||[]).length,2);

// 10-11. Ruolo dettagliato e stabilita mancanti.
const missingDetail=render({...fullPrediction,shooters:{...fullPrediction.shooters,totalShots:[player({detailedRole:null})],shotsOnTarget:[],allPlayers:[]}}).shooters;
assert(!missingDetail.includes("undefined"));
const noStability={...fullPrediction,teamProjections:[{...projection("home"),opponentMatchupInteraction:{metricEvidence:{shots:{status:"active",level:"normal"},shotsOnTarget:{status:"active",level:"normal"}}}}]};
assert(render(noStability).why.includes("Dati insufficienti"));

// 12-13. Stato formazioni data-driven.
const match={id:"home-away-md06",homeTeam:"home",awayTeam:"away"};
const directory=status=>({teams:teams.map(team=>({id:team.id,probableLineup:{status,matchId:status==="official"?match.id:null}}))});
assert.equal(formationPresentation(match,directory("probable")).label,"FORMAZIONI PROBABILI");
assert.equal(formationPresentation(match,directory("official")).label,"FORMAZIONI UFFICIALI");
const currentDirectory=JSON.parse(fs.readFileSync(path.join(root,"data/teams/index.json"),"utf8"));
const canonicalOfficial=JSON.parse(fs.readFileSync(path.join(root,"data/sources/official-lineups-2026-27.json"),"utf8"));
for(const fixture of canonicalOfficial.fixtures)for(const team of fixture.teams){
  const selected=fixtureLineupForMatch({id:fixture.matchId,matchday:fixture.matchday},currentDirectory.teams.find(entry=>entry.id===team.teamId),currentDirectory);
  assert.equal(selected.status,"official",`${fixture.matchId}:${team.teamId}: la nuova giornata non deve sostituire la distinta ufficiale`);
  assert.deepEqual(selected.players,team.players.map(player=>player.currentName||player.sourceName));
}

// 14-16. Arbitro/candidati, range e probabilita SOT assenti non diventano zero.
assert(render({...fullPrediction,likelyBooked:null}).discipline.includes("Candidati ammonizione N/D"));
assert(render({...fullPrediction,teamProjections:[{...projection("home"),corners:null}]}).numbers.includes('prediction-v2-missing">N/D'));
assert(!missingPlayer.shooters.includes(">0%<"));

// 17. Contratto responsive: tabella desktop e card mobile senza mega-scroll obbligatorio.
const responsive=fs.readFileSync(path.join(root,"css","responsive.css"),"utf8");
assert(responsive.includes(".prediction-v2-shooter-table{display:none}")&&responsive.includes(".prediction-v2-player-cards{display:grid"));

// 18-20. Escaping, valori non finiti e gate outsider (caso Kaiki-like).
const malicious=player({name:'<img src=x onerror="alert(1)">',playerId:"evil"});
const escaped=render({...fullPrediction,shooters:{totalShots:[malicious],shotsOnTarget:[],allPlayers:[],outsiders:[],sotOutsiders:[]}}).shooters;
assert(escaped.includes("&lt;img")&&!escaped.includes("<img src=x"));
const nonFinite=render({...fullPrediction,teamProjections:[{...projection("home"),expectedGoals:NaN,shotsTotal:{min:0,central:Infinity,max:4}}],shooters:{totalShots:[player({expectedMinutes:Infinity,projectedShots:NaN})],shotsOnTarget:[],allPlayers:[],outsiders:[],sotOutsiders:[]}});
assert(!/undefined|NaN|Infinity/.test(allHtml(nonFinite)));
const kaiki=player({name:"Kaiki",playerId:"kaiki",qualifiedOutsider:false,outsiderScore:75});
const guarded=render({...fullPrediction,shooters:{...fullPrediction.shooters,outsiders:[kaiki],sotOutsiders:[]}}).outsiders;
assert(!guarded.includes("Kaiki")&&guarded.includes("Nessun outsider qualificato"));

// 21. Tiri e SOT non vengono uniformati (Cagliari-like).
const splitA=render({...fullPrediction,teamProjections:[projection("home","elevated","normal")]}).why;
assert(splitA.includes("↑ favorevole")&&splitA.includes("→ neutro"));

// 22. SOT favorevole con tiri neutri (Fiorentina-like).
const splitB=render({...fullPrediction,teamProjections:[projection("home","normal","elevated")]}).why;
assert(splitB.includes("Volume tiri</span><strong class=\"signal-neutral\">→ neutro")&&splitB.includes("Tiri nello specchio</span><strong class=\"signal-favourable\">↑ favorevole"));

// 23. Nessun segnale individuale SOT viene creato con baseline insufficiente.
const insufficient=player({name:"Baseline insufficiente",playerId:"weak",qualifiedSotOutsider:false,shotOnTargetProbabilities:null});
const guardedSot=render({...fullPrediction,shooters:{totalShots:[insufficient],shotsOnTarget:[],allPlayers:[],outsiders:[],sotOutsiders:[insufficient]}});
assert(!guardedSot.outsiders.includes("Baseline insufficiente")&&guardedSot.shooters.includes("N/D"));

// 24. Fixture reale Como-Roma: valori V2 letti dal JSON, mai hardcodati nel renderer.
const dataset=JSON.parse(fs.readFileSync(path.join(root,"data","normalized","predictions.json"),"utf8"));
const comoRoma=dataset.predictions.find(item=>item.matchId==="como-roma-2026-27-md-06");
assert(comoRoma,"Como-Roma assente dal dataset");
const realTeams=[{id:"como",name:"Como"},{id:"roma",name:"Roma"}],real=renderPredictionV2Sections({prediction:comoRoma,teams:realTeams,esc,teamLogo});
for(const projection of comoRoma.teamProjections)for(const metric of ["shotsTotal","shotsOnTarget","corners"]){
  const value=projection[metric].central.toLocaleString("it-IT",{minimumFractionDigits:1,maximumFractionDigits:1});
  assert(real.numbers.includes(value),`Como-Roma: valore JSON ${value} non renderizzato`);
}
assert(real.why.includes("signal-unfavourable")&&real.why.includes("signal-favourable")&&real.why.includes("signal-neutral"),"Como-Roma: contrasto matchup tiri/SOT incompleto");

console.log("OK Lettura Prediction V2: 24 contratti UI/data");
