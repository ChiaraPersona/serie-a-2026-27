import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPage } from "../js/pages/champions.js";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const app={innerHTML:""};
globalThis.location={search:"?match=ucl-2026-27-md01-06"};
globalThis.document={querySelector:selector=>selector==="#app"?app:null};
const esc=value=>String(value??"").replace(/[&<>\"]/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[character]));
const load=async name=>JSON.parse(fs.readFileSync(path.join(root,"data/normalized",name),"utf8"));

await createPage({esc,load}).render();
assert(app.innerHTML.includes("Real Madrid"));
assert(app.innerHTML.includes("Inter"));
assert(app.innerHTML.includes("Tiri totali"));
assert(app.innerHTML.includes("Michael Oliver"));
assert(app.innerHTML.includes("Gialli / gara"));
assert(app.innerHTML.includes("Probabili formazioni"));
assert(app.innerHTML.includes("Real Madrid · 4-2-3-1"));
assert(app.innerHTML.includes("Inter · 3-5-2"));
assert(app.innerHTML.includes("Proiezione editoriale · non ufficiale"));
assert(app.innerHTML.includes("Courtois"));
assert(app.innerHTML.includes("Alexander-Arnold"));
assert(app.innerHTML.includes("Josep Martínez"));
assert(app.innerHTML.includes("Carlos Augusto"));
assert(app.innerHTML.includes("Dimarco è indicato in dubbio"));
assert(app.innerHTML.indexOf("Courtois") < app.innerHTML.indexOf("Alexander-Arnold"));
for(const unavailableRole of ["Assistenti","IV ufficiale","VAR","AVAR"]){
  assert(!app.innerHTML.includes(`<dt>${unavailableRole}</dt>`),`Ruolo arbitrale non disponibile ancora visibile: ${unavailableRole}`);
}
assert(!app.innerHTML.includes("Over/Under"));
assert(!app.innerHTML.includes("Rose registrate UEFA"));
assert(!app.innerHTML.includes("Scenari e dipendenze"));
assert(!app.innerHTML.includes("prediction-decision-panel"));
for(const contract of ["reading-match-hero","reading-result-summary","reading-h2h-section","reading-referee-assignment","reading-info-grid","prediction-volume-section","prediction-match-volume","prediction-players-grid","prediction-booked-panel","prediction-mvp","reading-panel-grid","MyCombo"]){
  assert(app.innerHTML.includes(contract),`Struttura Lettura Serie A mancante: ${contract}`);
}
assert(app.innerHTML.includes("Ultimi 5 scontri diretti disponibili"));
assert.equal((app.innerHTML.match(/class="reading-h2h-match"/g)||[]).length,5);
for(const historicalEvent of ["Toni Kroos","Rodrygo","Achraf Hakimi","Karim Benzema","Roberto Baggio","Manuel Sanchís","Stefano Sensi"]){
  assert(app.innerHTML.includes(historicalEvent),`Evento storico Champions mancante: ${historicalEvent}`);
}
assert(app.innerHTML.includes("autogol"));
assert(app.innerHTML.includes("rigore"));
assert(app.innerHTML.includes("minuto N/D"));
const readingOrder=["reading-h2h-section","reading-referee-assignment","reading-info-grid","prediction-volume-section","reading-panel-grid"].map(contract=>app.innerHTML.indexOf(contract));
assert(readingOrder.every((position,index)=>position>=0&&(index===0||position>readingOrder[index-1])),"Ordine delle sezioni non allineato alla Lettura Serie A");
assert(!app.innerHTML.includes("champions-calendar"));
globalThis.location.search="?team=inter";
await createPage({esc,load}).render();
assert(app.innerHTML.includes("Scheda squadra"));
assert(app.innerHTML.includes("Convocati gara"));
assert(app.innerHTML.includes("Profili iniziali"));
assert(app.innerHTML.includes("Hakan Çalhanoğlu"));
assert(!app.innerHTML.includes("Numero di maglia"));
console.log("OK dettaglio lettura Champions");
