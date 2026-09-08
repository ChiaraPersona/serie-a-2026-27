const fs=require("fs"),path=require("path"),assert=require("assert"),root=path.resolve(__dirname,"..");
const data=JSON.parse(fs.readFileSync(path.join(root,"data/normalized/schedina-champions-md01.json"),"utf8"));
assert.deepEqual(data.slips.map(slip=>slip.legs.length),[8,8,10,4,4]);
assert.deepEqual(data.slips.map(slip=>slip.name),["Otto tiri e tiri in porta","Otto gol e assist","Multigol casa/ospite · 10 partite","Poker ammoniti 1","Poker ammoniti 2"]);
assert.deepEqual(data.slips.slice(0,3).map(slip=>slip.marketFamilies),[["Tiri giocatore","Tiri in porta giocatore"],["Assist giocatore","Marcatore","Gol o assist giocatore"],["Multigol casa/ospite"]]);
assert.deepEqual(data.exclusions,["risultati esatti","risultati esatti multiesito"]);
const legs=data.slips.flatMap(slip=>slip.legs);
assert.equal(legs.length,34);
assert.equal(new Set(legs.map(leg=>String(leg.providerSelectionId))).size,legs.length,"selezioni Sisal ripetute");
assert.ok(legs.every(leg=>leg.odds>=1.10&&Number.isFinite(leg.modelProbabilityPct)&&Number.isFinite(leg.expectedValuePct)));
assert.ok(legs.every(leg=>!/RISULTATO ESATTO/i.test(`${leg.marketName} ${leg.variantName}`)),"presente un risultato esatto escluso");
for(const slip of data.slips.slice(0,3))assert.equal(new Set(slip.legs.map(leg=>leg.matchId)).size,slip.legs.length,`${slip.name}: partita ripetuta`);
for(const slip of data.slips.slice(0,2)){assert.ok(slip.legs.every(leg=>leg.marketScope==="player"));assert.equal(new Set(slip.legs.map(leg=>leg.matchId)).size,8,`${slip.name}: partita ripetuta`)}
assert.ok(data.slips[2].legs.every(leg=>leg.marketCode==="30394"));
const cards=data.slips.slice(3).flatMap(slip=>{assert.equal(new Set(slip.legs.map(leg=>leg.matchId)).size,4);return slip.legs});
assert.equal(new Set(cards.map(leg=>leg.player)).size,8,"giocatori ripetuti nei poker");
assert.ok(cards.every(leg=>leg.marketCode==="28576"&&leg.replacementIncluded));
console.log("Schedina Champions: OK");
