import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPage } from "../js/pages/betting.js";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const app={innerHTML:""};
globalThis.location={search:""};
globalThis.document={querySelector:selector=>selector==="#app"?app:null};
const esc=value=>String(value??"").replace(/[&<>\"]/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[character]));
const load=async name=>JSON.parse(fs.readFileSync(path.join(root,"data/normalized",name),"utf8"));
const hero=(eyebrow,title,description)=>`<section><span>${eyebrow}</span><h1>${title}</h1><p>${description}</p></section>`;
const dateOnly=value=>String(value||"").slice(0,10);

await createPage({esc,load,hero,dateOnly}).render();
assert(app.innerHTML.includes("betting-archive-card--champions"));
assert(app.innerHTML.indexOf("betting-archive-card--champions")<app.innerHTML.indexOf("1ª giornata"));
assert(app.innerHTML.includes("Champions League"));

globalThis.location.search="?competizione=champions";
await createPage({esc,load,hero,dateOnly}).render();
assert(app.innerHTML.includes("Otto schedine costruite dal modello"));
assert.equal((app.innerHTML.match(/<article class="betting-slip betting-slip--champions /g)||[]).length,8);
assert(app.innerHTML.includes("Scintilla"));
assert(app.innerHTML.includes("Costellazione"));
assert(app.innerHTML.includes("Poker ammoniti 2"));
assert(app.innerHTML.includes("escluse soltanto le schedine a risultato esatto"));
assert(!app.innerHTML.includes("RISULTATO ESATTO MULTI"));
console.log("OK pagina Schedina Champions");
