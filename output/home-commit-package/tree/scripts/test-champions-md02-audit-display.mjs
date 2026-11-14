import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {championsAuditDisplay} from '../js/pages/champions-audit-display.mjs';
const require=createRequire(import.meta.url),policy=require('../js/official-starter-policy.js');
const {economics}=require('./build-champions-md02-audit-display.js');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const audit=read('output/reports/champions-post-match-audit-2026-10-15.json');
const archive=read('data/normalized/champions-md02-audit-display.json');
const operational=read('data/normalized/schedina-champions-md02.json');
policy.configure(read('data/normalized/official-starter-registry.json'));
const display=championsAuditDisplay(policy.filter(operational),policy.filter(archive));
assert.equal(display.fixtures.length,18);
const selections=display.fixtures.flatMap(f=>f.selections);
assert.equal(selections.length,113);assert.equal(new Set(selections.map(s=>s.selectionId)).size,113);
const status={VERDE:'won',ROSSO:'lost',GRIGIO:'pending',VOID:'void'};
for(const row of audit.rows){
  if(!policy.eligible(row)){assert(!selections.some(s=>s.selectionId===row.selectionId));continue;}
  const rendered=selections.find(s=>s.selectionId===row.selectionId);assert(rendered);
  const {audit:unused,...original}=row;
  const {settlement,auditDisplayOnly,...forecast}=rendered;
  assert.deepEqual(forecast,original,`${row.selectionId}: contratto originale alterato`);
  assert.equal(settlement.status,status[row.audit.outcome.status]);assert.equal(settlement.reason,row.audit.outcome.reason);
  assert.equal(auditDisplayOnly,true);assert.equal(settlement.nonStarter,row.audit.nonStarter);
}
for(const fixture of display.fixtures){
  const original=audit.rows.filter(r=>r.matchId===fixture.fixtureId&&policy.eligible(r)),decided=original.filter(r=>['VERDE','ROSSO'].includes(r.audit.outcome.status));
  const cents=decided.reduce((n,r)=>n+(r.audit.outcome.status==='VERDE'?Math.round(r.odds*100):r.audit.outcome.status==='VOID'?100:0),0);
  assert.equal(fixture.auditSummary.stakeEuro,decided.length);
  assert.equal(Math.round(fixture.auditSummary.grossReturnEuro*100),cents);
  assert.equal(fixture.auditSummary.pending,original.length-decided.length);
}
assert.equal(display.auditSummary.stakeEuro,104);assert.equal(display.auditSummary.won,73);assert.equal(display.auditSummary.lost,31);assert.equal(display.auditSummary.pending,9);assert.equal(display.auditSummary.void,0);assert.equal(display.auditSummary.grossReturnEuro,115.05);assert.equal(display.auditSummary.profitLossEuro,11.05);
assert.equal(display.filteredAuditSummary,null);
assert.equal(selections.filter(s=>s.settlement.nonStarter).length,0);
assert.equal(policy.filter(operational).fixtures.flatMap(f=>f.selections).length,113,'Nessuna riattivazione operativa');
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(archive.source.path)).digest('hex'),archive.source.sha256);
const example=(status,odds=2)=>({settlement:{status},forecast:{odds}});
assert.deepEqual(economics([example('pending',100)]),{total:1,won:0,lost:0,void:0,pending:1,stakeEuro:0,grossReturnEuro:0,profitLossEuro:0,roiPct:null,partial:true});
const voidAndPending=economics([example('void'),example('pending',100)]);
assert.equal(voidAndPending.stakeEuro,1);assert.equal(voidAndPending.grossReturnEuro,1);assert.equal(voidAndPending.roiPct,0);
console.log('OK archivio audit MD2: 113 contratti identici, 73/31/9/0, 18 riepiloghi; filtro operativo invariato.');
