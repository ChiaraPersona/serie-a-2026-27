const fs=require("fs"),path=require("path"),assert=require("assert"),root=path.resolve(__dirname,"..");
const data=JSON.parse(fs.readFileSync(path.join(root,"data/normalized/schedina-champions-md01.json"),"utf8"));
assert.deepEqual(data.slips.map(slip=>slip.legs.length),[3,3,5,8,8,10,4,4]);
assert.deepEqual(data.slips.map(slip=>slip.name),["Tripla esiti e tiri in porta","Tripla gol, esiti e tiri","Cinquina mercati misti","Otto giocate sui calciatori 1","Otto giocate sui calciatori 2","Multigol casa/ospite · 10 partite","Poker ammoniti 1","Poker ammoniti 2"]);
assert.deepEqual(data.slips.slice(0,6).map(slip=>slip.marketFamilies),[
  ["Vince o quasi","Esito","Tiri in porta giocatore"],
  ["Under/Over","Esito","Tiri giocatore"],
  ["Tiri totali","Corner","Tiri in porta","Cartellini","Esito"],
  ["Tiri giocatore","Tiri in porta giocatore","Gol o assist giocatore","Assist giocatore","Marcatore"],
  ["Tiri giocatore","Tiri in porta giocatore","Gol o assist giocatore","Assist giocatore","Marcatore"],
  ["Multigol casa/ospite"]
]);
assert.deepEqual(data.exclusions,["risultati esatti","risultati esatti multiesito"]);
const legs=data.slips.flatMap(slip=>slip.legs);
assert.equal(legs.length,45);
assert.equal(new Set(legs.map(leg=>String(leg.providerSelectionId))).size,legs.length,"selezioni Sisal ripetute");
assert.ok(legs.every(leg=>leg.odds>=1.10&&Number.isFinite(leg.modelProbabilityPct)&&Number.isFinite(leg.expectedValuePct)));
assert.ok(legs.every(leg=>!/RISULTATO ESATTO/i.test(`${leg.marketName} ${leg.variantName}`)),"presente un risultato esatto escluso");
for(const slip of data.slips.slice(0,3))assert.equal(new Set(slip.legs.map(leg=>leg.matchId)).size,slip.legs.length,`${slip.name}: partita ripetuta`);
for(const slip of data.slips.slice(3,5)){assert.ok(slip.legs.every(leg=>leg.marketScope==="player"));assert.equal(new Set(slip.legs.map(leg=>leg.matchId)).size,8,`${slip.name}: partita ripetuta`)}
assert.ok(data.slips[5].legs.every(leg=>leg.marketCode==="30394"));
const cards=data.slips.slice(6).flatMap(slip=>{assert.equal(new Set(slip.legs.map(leg=>leg.matchId)).size,4);return slip.legs});
assert.equal(new Set(cards.map(leg=>leg.player)).size,8,"giocatori ripetuti nei poker");
assert.ok(cards.every(leg=>leg.marketCode==="28576"&&leg.replacementIncluded));
console.log("Schedina Champions: OK");
