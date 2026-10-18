import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPage } from "../js/pages/champions.js";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const app={innerHTML:""};
globalThis.location={search:"",pathname:"/champions-league.html"};
const elements=new Map();
globalThis.document={querySelector:selector=>{
  if(selector==="#app")return app;
  if(selector.startsWith("script["))return null;
  if(!elements.has(selector))elements.set(selector,{innerHTML:"",value:"all",addEventListener(){}});
  return elements.get(selector);
},querySelectorAll:()=>[]};
const esc=value=>String(value??"").replace(/[&<>\"]/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[character]));
const load=async name=>JSON.parse(fs.readFileSync(path.join(root,"data/normalized",name),"utf8"));

await createPage({esc,load}).render();
assert(!app.innerHTML.includes("champions-2026-27/motivazione.html"));
assert(!app.innerHTML.includes("champions-motivation-overview"));
assert(!fs.existsSync(path.join(root,"champions-2026-27/motivazione.html")));

location.search="?match=ucl-2026-27-md01-01";
location.pathname="/champions-league.html";
await createPage({esc,load}).render();
assert(app.innerHTML.includes("Motivation Index"));
assert(app.innerHTML.includes("Come è calcolato"));
assert(app.innerHTML.includes("QualificationImportance")||app.innerHTML.includes("qualificationImportance"));
assert(app.innerHTML.includes("AEK Athens"));
assert(app.innerHTML.includes("LASK"));
console.log("OK UI Motivation Champions: overview rimossa · dettaglio partita conservato · debug formula");
