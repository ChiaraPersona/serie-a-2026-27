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
assert(app.innerHTML.includes("Over/Under gol"));
assert(app.innerHTML.includes("Rose registrate UEFA"));
assert(!app.innerHTML.includes("champions-calendar"));
globalThis.location.search="?team=inter";
await createPage({esc,load}).render();
assert(app.innerHTML.includes("Scheda squadra"));
assert(app.innerHTML.includes("Convocati gara"));
assert(app.innerHTML.includes("Profili iniziali"));
assert(app.innerHTML.includes("Hakan Çalhanoğlu"));
assert(!app.innerHTML.includes("Numero di maglia"));
console.log("OK dettaglio lettura Champions");
