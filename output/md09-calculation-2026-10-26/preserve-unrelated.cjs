const fs=require('fs'),{execFileSync}=require('child_process');
for(const f of ['champions-league.html','coppa-italia.html','index.html','statistiche-giocatori.html','statistiche-squadre.html']){
const old=execFileSync('git',['show','HEAD:'+f]);fs.writeFileSync(f+'.md09.tmp',old);fs.renameSync(f+'.md09.tmp',f);
}
// The broad historical suite contains assertions tied to the old current round.
// Keep it unchanged and use the fixture-scoped MD9 checks for this refresh.
const f='scripts/test-predictions.js';fs.writeFileSync(f+'.md09.tmp',execFileSync('git',['show','HEAD:'+f]));fs.renameSync(f+'.md09.tmp',f);
