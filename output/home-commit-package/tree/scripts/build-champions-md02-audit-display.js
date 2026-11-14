// Copies recorded audit outcomes into a read-only display archive. Never settles a bet.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const auditPath='output/reports/champions-post-match-audit-2026-10-15.json';
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const statusMap={VERDE:'won',ROSSO:'lost',GRIGIO:'pending',VOID:'void'};
function economics(selections){
  const count=status=>selections.filter(s=>s.settlement.status===status).length;
  const won=count('won'),lost=count('lost'),voided=count('void'),pending=count('pending'),stake=won+lost+voided;
  const grossCents=selections.reduce((n,s)=>n+(s.settlement.status==='won'?Math.round(s.forecast.odds*100):s.settlement.status==='void'?100:0),0);
  return {total:selections.length,won,lost,void:voided,pending,stakeEuro:stake,grossReturnEuro:grossCents/100,profitLossEuro:(grossCents-stake*100)/100,roiPct:stake?Number(((grossCents-stake*100)/stake).toFixed(4)):null,partial:true};
}
function build(){
  const audit=read(auditPath),operational=read('data/normalized/schedina-champions-md02.json');
  assert.equal(audit.rows.length,117);assert.equal(audit.fixtures.length,18);
  const contracts={},fixtures=[];
  for(const fixture of audit.fixtures){
    const current=operational.fixtures.find(f=>f.fixtureId===fixture.fixtureId);assert(current);
    const selections=audit.rows.filter(s=>s.matchId===fixture.fixtureId).map(row=>{
      assert.equal(row.audit.chronology,'PREMATCH_GIT');assert(statusMap[row.audit.outcome.status]);assert(!contracts[row.selectionId]);
      const {audit:provenance,...forecast}=row;
      const outcome=provenance.outcome;
      const entry={forecast,settlement:{status:statusMap[outcome.status],label:outcome.status,reason:outcome.reason,sourceUrl:outcome.source,sources:outcome.sources||[outcome.source].filter(Boolean),basis:outcome.basis,neededSource:outcome.neededSource||null,nonStarter:provenance.nonStarter,excludedFromFiltered:provenance.filtered,officiallySettled:false,auditSource:auditPath},snapshot:{commit:provenance.snapshotCommit,availableAt:provenance.snapshotTime,originalPayloadSha256:provenance.originalPayloadSha256}};
      contracts[row.selectionId]=entry;return entry;
    });
    fixtures.push({fixtureId:fixture.fixtureId,date:fixture.date,kickoff:current.kickoff,homeTeam:fixture.home,awayTeam:fixture.away,status:'finished',score:{home:fixture.score[0],away:fixture.score[1]},readingUrl:current.readingUrl,forecastSyncKey:current.forecastSyncKey,contractIds:selections.map(s=>s.forecast.selectionId),auditSummary:economics(selections)});
  }
  const values=Object.values(contracts),summary=economics(values),filteredSummary=economics(values.filter(s=>!s.settlement.excludedFromFiltered));
  assert.equal(summary.won,74);assert.equal(summary.lost,34);assert.equal(summary.pending,9);assert.equal(summary.void,0);
  assert.equal(summary.stakeEuro,108);assert.equal(summary.grossReturnEuro,116.30);assert.equal(filteredSummary.stakeEuro,104);assert.equal(filteredSummary.grossReturnEuro,115.05);
  // Contract records are indexed objects, not operational selection arrays. The
  // shared starter policy remains intact; only this historical renderer hydrates them.
  const data={schemaVersion:1,kind:'READ_ONLY_AUDITED_ARCHIVE',competition:'champions',season:'2026-27',matchday:2,auditDate:audit.date,source:{path:auditPath,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,auditPath))).digest('hex')},summary,filteredSummary,fixtures,contracts};
  fs.writeFileSync(path.join(root,'data/normalized/champions-md02-audit-display.json'),JSON.stringify(data,null,2)+'\n');
  console.log(JSON.stringify({fixtures:fixtures.length,...summary}));return data;
}
module.exports={build,economics};if(require.main===module)build();
