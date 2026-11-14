import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPage } from "../js/pages/champions.js";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const app={innerHTML:""};
globalThis.location={search:""};
globalThis.CSS={escape:value=>String(value)};
globalThis.document={querySelector:selector=>selector==="#app"?app:null};
const esc=value=>String(value??"").replace(/[&<>\"]/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[character]));
const load=async name=>JSON.parse(fs.readFileSync(path.join(root,"data/normalized",name),"utf8"));

const calendar=await load("champions-league-2026-27.json");
const refereeHistory=await load("champions-referee-history-2026-10-13.json");
const refereeChecks=new Map(refereeHistory.officialVerification.checks.map(check=>[check.fixtureId,check]));
const profiles=new Map(refereeHistory.referees.map(profile=>[profile.refereeId,profile]));
const fixtures=calendar.fixtures.filter(fixture=>fixture.matchday===2);

assert.equal(fixtures.length,18);
for(const fixture of fixtures){
  const check=refereeChecks.get(fixture.id);
  const profile=profiles.get(check?.refereeId);
  assert.ok(profile,`${fixture.id}: profilo canonico mancante`);
  globalThis.location.search=`?match=${fixture.id}`;
  await createPage({esc,load}).render();
  assert.equal((app.innerHTML.match(/id="lettura-referee"/g)||[]).length,1,`${fixture.id}: sezione arbitro duplicata o assente`);
  assert.ok(app.innerHTML.includes(`data-referee-id="${profile.refereeId}"`),`${fixture.id}: ID arbitro errato`);
  assert.ok(app.innerHTML.includes(profile.name),`${fixture.id}: nome arbitro assente`);
  assert.ok(app.innerHTML.includes(profile.country),`${fixture.id}: nazionalità assente`);
  assert.ok(app.innerHTML.includes("Partite arbitrate"),`${fixture.id}: numerosità carriera assente`);
  assert.ok(app.innerHTML.includes("Gialli / gara"),`${fixture.id}: media gialli assente`);
  assert.ok(app.innerHTML.includes("Rossi / gara"),`${fixture.id}: media rossi assente`);
  assert.ok(app.innerHTML.includes("Falli / gara"),`${fixture.id}: media falli assente`);
  assert.ok(app.innerHTML.includes(`Over carriera · n=${profile.career.matches}`),`${fixture.id}: campione Over carriera assente`);
  assert.ok(app.innerHTML.includes(`Ultime ${profile.last10.matches} gare`),`${fixture.id}: sintesi ultime gare assente`);
  assert.ok(app.innerHTML.includes("Fonte statistiche:"),`${fixture.id}: fonte assente`);
  const careerOverMarkup=app.innerHTML.slice(app.innerHTML.indexOf("Over carriera"),app.innerHTML.indexOf("Ultime 10 gare"));
  assert.ok(!careerOverMarkup.includes("Over 3,5"),`${fixture.id}: Over 3,5 carriera mancante ricostruito artificialmente`);
}

console.log("Champions MD2 referee reading pages: PASS (18/18)");
